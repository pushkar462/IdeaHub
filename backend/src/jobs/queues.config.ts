import { Queue } from 'bullmq';
import { redisClient } from '../infrastructure/redis/redis.client';

/**
 * High reliability, fast execution, aggressive retries.
 * Used for SLA checks, Notifications, and Webhooks.
 */
export const operationalQueue = new Queue('operational-tasks', {
  connection: redisClient as any,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 1000,
  }
});

/**
 * Cost-aware, strictly throttled, capped retries.
 * Used for AI generation (Grok) to protect API keys and budgets.
 */
export const aiQueue = new Queue('ai-tasks', {
  connection: redisClient as any,
  defaultJobOptions: {
    attempts: 2, // Do NOT retry aggressively to avoid massive bills
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  }
});
