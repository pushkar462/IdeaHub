import { eventBus, INTERNAL_EVENTS } from './internal.emitter';
import { logger } from '../../infrastructure/observability/logger';
import { slaPredictionService } from '../intelligence/sla-prediction.service';

const slaThrottleMap = new Map<number, NodeJS.Timeout>();

export const startInternalEventHandlers = () => {
  // Listen to post updates and throttle/dedupe SLA risk evaluations
  eventBus.subscribe(INTERNAL_EVENTS.POST_UPDATED, (payload: any) => {
    try {
      const postId = payload.postId;

      // BUG 4 FIX: Skip SLA re-evaluation if this event was emitted by the SLA service itself.
      // The SLA service emits POST_UPDATED with { changes: { slaStatus } } when it updates the status.
      // Without this guard, it creates an infinite loop: SLA change → event → SLA re-eval → SLA change → ...
      const changes = payload.changes || {};
      if (changes.slaStatus && !changes.status) {
        return; // This is an SLA-internal event, not a real workflow change
      }

      // Clear existing timeout if any (Debounce)
      if (slaThrottleMap.has(postId)) {
        clearTimeout(slaThrottleMap.get(postId)!);
      }

      // Set new timeout
      const timeoutId = setTimeout(() => {
        slaThrottleMap.delete(postId);
        slaPredictionService.predictPostRisk(postId).catch((err) => {
          logger.error({ err, postId }, 'Failed to process SLA prediction');
        });
      }, 5000); // 5 seconds debounce

      slaThrottleMap.set(postId, timeoutId);
    } catch (err) {
      logger.error({ err }, 'Failed to handle POST_UPDATED internally');
    }
  });

  // Example: bridging POST_CREATED to recommend assignment or generate initial summary, etc.
};
