import prisma from '../../config/db';
import { eventBus, INTERNAL_EVENTS } from '../events/internal.emitter';
import { Status } from '@prisma/client';

export class WorkflowMetricsService {
  constructor() {
    this.registerListeners();
  }

  private registerListeners() {
    eventBus.subscribe(INTERNAL_EVENTS.POST_UPDATED, this.handlePostUpdated.bind(this));
  }

  private async handlePostUpdated(payload: any) {
    // Only care about status changes for metrics
    if (!payload.changes.status || !payload.auditLog) {
      return;
    }

    const { postId } = payload;
    const { from, to } = payload.auditLog.metadata;
    const transitionTime = new Date(payload.auditLog.createdAt);

    await this.processStatusTransition(postId, from as Status, to as Status, transitionTime);
  }

  /**
   * Idempotent duration calculation and metric upsert.
   */
  public async processStatusTransition(
    postId: number,
    fromStatus: Status,
    toStatus: Status,
    transitionTime: Date
  ) {
    // Use an explicit transaction to ensure atomic upsert and lock for idempotency
    await prisma.$transaction(async (tx) => {
      // 1. Fetch existing metrics (with lock if possible, but Prisma doesn't natively support FOR UPDATE well without raw sql, 
      // however serial processing via node event loop + transactional isolation usually suffices for a single entity)
      let metrics = await tx.workflowMetrics.findUnique({
        where: { postId }
      });

      if (!metrics) {
        // First ever transition/bootstrap
        // Assume the post was created and immediately in 'fromStatus' from its createdAt
        const post = await tx.post.findUnique({ where: { id: postId }, select: { createdAt: true } });
        metrics = await tx.workflowMetrics.create({
          data: {
            postId,
            currentStatusStartedAt: post?.createdAt || transitionTime
          }
        });
      }

      // If the currentStatusStartedAt is newer than this transitionTime, we might be replaying an old event.
      // Idempotency guard: ignore outdated events.
      if (metrics.currentStatusStartedAt && metrics.currentStatusStartedAt > transitionTime) {
        return; 
      }

      // 2. Calculate duration spent in the previous status
      let durationSeconds = 0;
      if (metrics.currentStatusStartedAt) {
        durationSeconds = Math.max(0, Math.floor((transitionTime.getTime() - metrics.currentStatusStartedAt.getTime()) / 1000));
      }

      // 3. Accumulate duration
      const updateData: any = {
        currentStatusStartedAt: transitionTime
      };

      if (fromStatus === Status.OPEN) {
        updateData.totalTimeInOpen = { increment: durationSeconds };
      } else if (fromStatus === Status.DISCUSSING) {
        updateData.totalTimeInDiscussing = { increment: durationSeconds };
      }

      // Special Timestamps
      if (toStatus === Status.DISCUSSING && !metrics.firstResponseAt) {
        updateData.firstResponseAt = transitionTime;
      }
      
      if (toStatus === Status.RESOLVED) {
        updateData.completedAt = transitionTime;
      } else if (fromStatus === Status.RESOLVED) {
        // Reopened
        updateData.completedAt = null;
      }

      // 4. Upsert changes
      await tx.workflowMetrics.update({
        where: { id: metrics.id },
        data: updateData
      });
    });
  }
}

export const workflowMetricsService = new WorkflowMetricsService();
