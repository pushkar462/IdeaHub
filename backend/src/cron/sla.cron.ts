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
      
      const breachedMetrics = await prisma.workflowMetrics.findMany({
        where: {
          slaStatus: SLAStatus.HEALTHY,
          post: {
            status: Status.OPEN,
          },
          currentStatusStartedAt: {
            lt: twoDaysAgo // Simple heuristic: if it's been in OPEN since > 2 days ago without transition
          }
        },
        include: { post: true }
      });

      if (breachedMetrics.length > 0) {
        console.log(`[SLA Engine] Found ${breachedMetrics.length} breached posts.`);
        
        for (const metric of breachedMetrics) {
          // Update SLA Status
          await prisma.workflowMetrics.update({
            where: { id: metric.id },
            data: { slaStatus: SLAStatus.BREACHED }
          });

          // Notify Owner
          if (metric.post.ownerId) {
            await notificationService.createNotification({
              userId: metric.post.ownerId,
              type: 'MENTION', // Could be 'SLA_BREACH' if enum supported it
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
