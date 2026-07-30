import { prisma } from '../utils/prisma';
import { emailQueue } from '../services/bullmq';

/**
 * Reconciles DB state with BullMQ on startup.
 * Handles cases where the server crashed after saving to DB but before enqueueing to BullMQ,
 * or if a job was stuck in PROCESSING state during a crash.
 */
export const runReconciler = async () => {
  console.log('Starting startup reconciliation process...');

  try {
    // Find all jobs that shouldn't be 'stuck'
    const stuckJobs = await prisma.emailJob.findMany({
      where: {
        status: {
          in: ['PENDING', 'QUEUED', 'PROCESSING'],
        },
      },
      include: {
        campaign: true,
      },
    });

    console.log(`Found ${stuckJobs.length} potentially stuck jobs to reconcile.`);

    let reEnqueuedCount = 0;

    for (const job of stuckJobs) {
      let isActuallyInQueue = false;

      if (job.bullMqJobId) {
        // Check if it exists in BullMQ
        const bullJob = await emailQueue.getJob(job.bullMqJobId);
        if (bullJob) {
          const state = await bullJob.getState();
          // If it's active, waiting, or delayed, BullMQ still knows about it
          if (['active', 'waiting', 'delayed', 'prioritized'].includes(state as string)) {
            isActuallyInQueue = true;
          }
        }
      }

      if (!isActuallyInQueue) {
        // Re-enqueue the job
        const now = Date.now();
        const scheduledTime = job.scheduledAt.getTime();
        const delay = Math.max(0, scheduledTime - now); // if in past, delay is 0

        const bullMqJob = await emailQueue.add(
          'send-email',
          {
            id: job.id,
            recipientEmail: job.recipientEmail,
            subject: job.campaign.subject,
            body: job.campaign.body,
            senderIdentity: job.campaign.senderIdentity,
          },
          {
            jobId: job.id, // Enforce uniqueness in BullMQ
            delay,
            removeOnComplete: true,
          }
        );

        // Update DB
        await prisma.emailJob.update({
          where: { id: job.id },
          data: {
            status: 'QUEUED',
            bullMqJobId: bullMqJob.id,
          },
        });

        reEnqueuedCount++;
      }
    }

    console.log(`Reconciliation complete. Re-enqueued ${reEnqueuedCount} jobs.`);
  } catch (error) {
    console.error('Error during reconciliation:', error);
  }
};
