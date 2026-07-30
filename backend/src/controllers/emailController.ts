import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { emailQueue } from '../services/bullmq';



interface ScheduleRequest {
  subject: string;
  body: string;
  recipientEmails: string[];
  startTime: string;
  delayBetweenEmails: number;
  maxEmailsPerHour?: number;
  senderIdentity: string;
}

export const scheduleEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      subject,
      body,
      recipientEmails,
      startTime,
      delayBetweenEmails,
      maxEmailsPerHour,
      senderIdentity,
    } = req.body as ScheduleRequest;

    if (!subject || !body || !recipientEmails || !Array.isArray(recipientEmails) || !startTime || delayBetweenEmails === undefined || !senderIdentity) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // 1. Create Campaign
    const campaign = await prisma.campaign.create({
      data: {
        subject,
        body,
        senderIdentity,
        startTime: new Date(startTime),
        delayBetweenEmails,
        maxEmailsPerHour,
      },
    });

    // 2. Generate EmailJobs and calculate scheduledAt
    const startTimestamp = new Date(startTime).getTime();
    let currentTimestamp = startTimestamp;
    let emailsInCurrentHour = 0;
    let currentHourWindow = new Date(startTimestamp).setMinutes(0, 0, 0);

    const jobsToCreate = [];

    for (let i = 0; i < recipientEmails.length; i++) {
      const email = recipientEmails[i];
      
      // Check if we need to advance to the next hour based on maxEmailsPerHour
      if (maxEmailsPerHour) {
        const jobHourWindow = new Date(currentTimestamp).setMinutes(0, 0, 0);
        
        if (jobHourWindow > currentHourWindow) {
          // Moved naturally to next hour
          currentHourWindow = jobHourWindow;
          emailsInCurrentHour = 0;
        }

        if (emailsInCurrentHour >= maxEmailsPerHour) {
          // Exceeded hour limit, jump to the start of the next hour
          currentHourWindow += 60 * 60 * 1000;
          currentTimestamp = currentHourWindow;
          emailsInCurrentHour = 0;
        }
      }

      jobsToCreate.push({
        campaignId: campaign.id,
        recipientEmail: email,
        scheduledAt: new Date(currentTimestamp),
        status: 'PENDING' as any,
      });

      // Increment counters
      emailsInCurrentHour++;
      currentTimestamp += delayBetweenEmails * 1000;
    }

    // 3. Bulk insert jobs
    await prisma.emailJob.createMany({
      data: jobsToCreate,
    });

    // Fetch the inserted jobs to get their IDs
    const createdJobs = await prisma.emailJob.findMany({
      where: { campaignId: campaign.id },
      orderBy: { scheduledAt: 'asc' },
    });

    // 4. Enqueue to BullMQ
    const bullMqJobs = createdJobs.map((job: any) => {
      const delay = Math.max(0, job.scheduledAt.getTime() - Date.now());
      return {
        name: 'send-email',
        data: {
          id: job.id,
          recipientEmail: job.recipientEmail,
          subject,
          body,
          senderIdentity,
        },
        opts: {
          jobId: job.id,
          delay,
          removeOnComplete: true,
        },
      };
    });

    const addedJobs = await emailQueue.addBulk(bullMqJobs);

    // 5. Update DB with BullMQ Job IDs and set to QUEUED
    // Since prisma updateMany doesn't support updating different values per row easily in MySQL,
    // we use a transaction with multiple updates.
    await prisma.$transaction(
      addedJobs.map((job: any, index: number) =>
        prisma.emailJob.update({
          where: { id: createdJobs[index].id },
          data: {
            status: 'QUEUED' as any,
            bullMqJobId: job.id!,
          },
        })
      )
    );

    res.status(201).json({
      message: 'Emails scheduled successfully',
      campaignId: campaign.id,
      totalScheduled: recipientEmails.length,
    });
  } catch (error) {
    console.error('Error scheduling emails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getScheduledEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobs = await prisma.emailJob.findMany({
      where: {
        status: {
          in: ['PENDING', 'QUEUED', 'PROCESSING'],
        },
      },
      include: {
        campaign: {
          select: { subject: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching scheduled emails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSentEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobs = await prisma.emailJob.findMany({
      where: {
        status: {
          in: ['SENT', 'FAILED'],
        },
      },
      include: {
        campaign: {
          select: { subject: true },
        },
      },
      orderBy: { sentAt: 'desc' },
    });
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching sent emails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
