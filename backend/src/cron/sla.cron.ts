import cron from 'node-cron';
import prisma from '../config/db';
import { Status, SLAStatus } from '@prisma/client';
import { notificationService } from '../services/notification.service';

/**
 * SLA Engine Cron Job.
 * Evaluates SLA breaches (e.g., Time to Acknowledge > 48h).
 * In a real environment, this might run every hour (0 * * * *).
 */
export const startSlaCron = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('[SLA Engine] Starting SLA evaluation cron job...');
    
    try {
      // 1. Identify posts that are currently OPEN and have breached 48 hours.
      // 48 hours = 48 * 60 * 60 = 172800 seconds.
      // We check posts whose active duration + accumulated duration > 172800.
      
      const twoDaysAgo = new Date(Date.now() - 172800 * 1000);
      
      // Only pick up NEW breaches (HEALTHY → BREACHED). Anything already BREACHED
      // has already notified the owner; the cron must not re-notify on every hourly tick.
      const breachedMetrics = await prisma.workflowMetrics.findMany({
        where: {
          slaStatus: SLAStatus.HEALTHY,
          post: {
            status: Status.OPEN,
            acknowledgedAt: null,
          },
          currentStatusStartedAt: {
            lt: twoDaysAgo
          }
        },
        include: { post: true }
      });

      if (breachedMetrics.length > 0) {
        console.log(`[SLA Engine] Found ${breachedMetrics.length} newly breached posts.`);

        for (const metric of breachedMetrics) {
          // Atomically flip HEALTHY → BREACHED. updateMany with the guard on slaStatus
          // means a concurrent cron/handler cannot double-fire the notification.
          const flipped = await prisma.workflowMetrics.updateMany({
            where: { id: metric.id, slaStatus: SLAStatus.HEALTHY },
            data: { slaStatus: SLAStatus.BREACHED }
          });
          if (flipped.count === 0) continue; // someone else flipped it first

          if (metric.post.ownerId) {
            await notificationService.createNotification({
              userId: metric.post.ownerId,
              type: 'MENTION',
              actorId: metric.post.authorId,
              postId: metric.post.id,
            }, undefined).catch(e => console.warn('Failed to send SLA breach notification:', e));
          }
        }
      }
      
      console.log('[SLA Engine] Evaluation complete.');
    } catch (error) {
      console.error('[SLA Engine] Error during evaluation:', error);
    }
  });
};
