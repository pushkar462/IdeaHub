import cron from 'node-cron';
import prisma from '../config/db';
import { Status, SLAStatus } from '@prisma/client';
import { notificationService } from '../services/notification.service';

/**
 * SLA Engine Cron Job (handbook B5 · C4).
 *
 * Runs hourly. Three transitions:
 *   1. OPEN + un-acknowledged, >24h and <48h  →  HEALTHY → AT_RISK   (silent)
 *   2. OPEN + un-acknowledged, ≥48h            →  * → BREACHED       (notify owner)
 *   3. DISCUSSING with no status change, ≥7d   →  * → BREACHED       (notify owner)
 *
 * Every flip uses an `updateMany` guard so concurrent runs cannot double-fire
 * notifications or step past a state the app already advanced.
 */
export const startSlaCron = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('[SLA Engine] Starting SLA evaluation cron job…');

    try {
      const now = Date.now();
      const dayAgo    = new Date(now - 24  * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now - 48  * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

      // ── 1. OPEN + un-acknowledged + 24h < age < 48h → AT_RISK ─────────────
      const atRiskCandidates = await prisma.workflowMetrics.findMany({
        where: {
          slaStatus: SLAStatus.HEALTHY,
          post: {
            status: Status.OPEN,
            acknowledgedAt: null,
          },
          currentStatusStartedAt: { lt: dayAgo, gte: twoDaysAgo },
        },
        select: { id: true, post: { select: { id: true } } },
      });
      let atRiskFlipped = 0;
      for (const m of atRiskCandidates) {
        const flipped = await prisma.workflowMetrics.updateMany({
          where: { id: m.id, slaStatus: SLAStatus.HEALTHY },
          data:  { slaStatus: SLAStatus.AT_RISK },
        });
        atRiskFlipped += flipped.count;
      }
      if (atRiskFlipped > 0) console.log(`[SLA Engine] AT_RISK: ${atRiskFlipped}`);

      // ── 2. OPEN + un-acknowledged ≥ 48h → BREACHED (notify) ──────────────
      const breachedOpen = await prisma.workflowMetrics.findMany({
        where: {
          slaStatus: { in: [SLAStatus.HEALTHY, SLAStatus.AT_RISK] },
          post: {
            status: Status.OPEN,
            acknowledgedAt: null,
          },
          currentStatusStartedAt: { lt: twoDaysAgo },
        },
        include: { post: true },
      });
      for (const m of breachedOpen) {
        const flipped = await prisma.workflowMetrics.updateMany({
          where: { id: m.id, slaStatus: { in: [SLAStatus.HEALTHY, SLAStatus.AT_RISK] } },
          data:  { slaStatus: SLAStatus.BREACHED },
        });
        if (flipped.count === 0) continue;
        if (m.post.ownerId) {
          await notificationService
            .createNotification(
              { userId: m.post.ownerId, type: 'MENTION', actorId: m.post.authorId, postId: m.post.id },
              undefined,
            )
            .catch((e) => console.warn('SLA breach notify failed:', e));
        }
      }
      if (breachedOpen.length) console.log(`[SLA Engine] BREACHED (open ≥48h): ${breachedOpen.length}`);

      // ── 3. DISCUSSING with no status change ≥ 7d → BREACHED (notify) ─────
      const breachedDiscussing = await prisma.workflowMetrics.findMany({
        where: {
          slaStatus: { in: [SLAStatus.HEALTHY, SLAStatus.AT_RISK] },
          post: { status: Status.DISCUSSING },
          currentStatusStartedAt: { lt: sevenDaysAgo },
        },
        include: { post: true },
      });
      for (const m of breachedDiscussing) {
        const flipped = await prisma.workflowMetrics.updateMany({
          where: { id: m.id, slaStatus: { in: [SLAStatus.HEALTHY, SLAStatus.AT_RISK] } },
          data:  { slaStatus: SLAStatus.BREACHED },
        });
        if (flipped.count === 0) continue;
        if (m.post.ownerId) {
          await notificationService
            .createNotification(
              { userId: m.post.ownerId, type: 'MENTION', actorId: m.post.authorId, postId: m.post.id },
              undefined,
            )
            .catch((e) => console.warn('SLA discussing-breach notify failed:', e));
        }
      }
      if (breachedDiscussing.length) console.log(`[SLA Engine] BREACHED (discussing ≥7d): ${breachedDiscussing.length}`);

      console.log('[SLA Engine] Evaluation complete.');
    } catch (error) {
      console.error('[SLA Engine] Error during evaluation:', error);
    }
  });
};
