import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, getRedisClient } from '../services/bullmq';
import { prisma } from '../utils/prisma';
import { sendEmail } from '../services/emailService';

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
const MAX_EMAILS_PER_HOUR = parseInt(process.env.MAX_EMAILS_PER_HOUR || '100', 10);
const redisClient = getRedisClient();

interface JobData {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  senderIdentity: string;
}

export const emailWorker = new Worker<JobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job) => {
    const { id, recipientEmail, subject, body, senderIdentity } = job.data;
    
    // 1. Atomic status check and update to prevent double-sends
    // We use Prisma's updateMany which translates to UPDATE ... WHERE status = 'QUEUED'
    const updateResult = await prisma.emailJob.updateMany({
      where: {
        id,
        status: 'QUEUED',
      },
      data: {
        status: 'PROCESSING',
      },
    });

    if (updateResult.count === 0) {
      console.log(`Job ${id} is not in QUEUED state, ignoring...`);
      return; // Already processed or not meant to be processed now
    }

    try {
      // 2. Rate limiting check per sender per hour window
      const now = new Date();
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime();
      const rateLimitKey = `rate_limit:${senderIdentity}:${currentHour}`;
      
      const currentCountStr = await redisClient.get(rateLimitKey);
      const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

      if (currentCount >= MAX_EMAILS_PER_HOUR) {
        // Limit exceeded, we need to push it to the next hour
        console.log(`Rate limit exceeded for ${senderIdentity}. Re-delaying job ${id}.`);
        
        // Revert status back to QUEUED so it can be picked up again
        await prisma.emailJob.update({
          where: { id },
          data: { status: 'QUEUED' },
        });

        // Delay until the start of the next hour
        const nextHour = new Date(currentHour + 60 * 60 * 1000);
        const delay = nextHour.getTime() - Date.now();
        
        await job.moveToDelayed(delay, job.token!);
        return; // Stop processing this job for now
      }

      // Increment rate limit counter and set expiry if it's the first time
      const newCount = await redisClient.incr(rateLimitKey);
      if (newCount === 1) {
        // Expire slightly after the hour ends to be safe
        await redisClient.expire(rateLimitKey, 60 * 60 + 60); 
      }

      // 3. Send email
      await sendEmail(recipientEmail, subject, body);

      // 4. Update success status
      await prisma.emailJob.update({
        where: { id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      console.log(`Successfully processed job ${id} for ${recipientEmail}`);
    } catch (error: any) {
      console.error(`Failed to process job ${id}:`, error);
      
      // Revert status on failure
      await prisma.emailJob.update({
        where: { id },
        data: {
          status: 'FAILED',
          failureReason: error.message || 'Unknown error',
        },
      });
      
      throw error; // Let BullMQ know it failed (might retry based on config)
    }
  },
  {
    connection: redisClient,
    concurrency: CONCURRENCY,
  }
);

emailWorker.on('completed', (job) => {
  // console.log(`Job ${job.id} has completed!`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});
