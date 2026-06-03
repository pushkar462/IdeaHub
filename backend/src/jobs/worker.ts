import { Worker, Job } from 'bullmq';
import { redisClient } from '../infrastructure/redis/redis.client';
import { logger } from '../infrastructure/observability/logger';
import { slaPredictionService } from '../services/intelligence/sla-prediction.service';
import { workflowSummaryService } from '../services/intelligence/workflow-summary.service';

/**
 * CAUTION: STRICT IDEMPOTENCY REQUIRED.
 * Queues replay. Workers retry. Redis reconnects.
 * Every job handler MUST tolerate duplicate execution without data corruption.
 */
export const startWorker = () => {
  // 1. Operational Worker (High concurrency)
  const opWorker = new Worker('operational-tasks', async (job: Job) => {
    const childLogger = logger.child({ jobId: job.id, jobName: job.name });
    
    try {
      if (job.name === 'score-sla') {
        const { postId } = job.data;
        await slaPredictionService.predictPostRisk(postId);
      }
    } catch (error) {
      childLogger.error({ error }, 'Operational Job failed.');
      throw error;
    }
  }, { 
    connection: redisClient as any,
    concurrency: 20 // High concurrency for fast operational tasks
  });

  opWorker.on('ready', () => logger.info('✅ Operational BullMQ Worker Ready'));
  opWorker.on('error', (err) => logger.error({ err }, '❌ Operational Worker Error'));

  // 2. AI Worker (Low concurrency to protect API rate limits)
  const aiWorker = new Worker('ai-tasks', async (job: Job) => {
    const childLogger = logger.child({ jobId: job.id, jobName: job.name });
    
    try {
      if (job.name === 'generate-summary') {
        const { postId } = job.data;
        // Strictly idempotent AI processing
        await workflowSummaryService.generateSummaryIdempotent(postId);
      }
    } catch (error) {
      childLogger.error({ error }, 'AI Job failed. Degraded state active.');
      throw error;
    }
  }, {
    connection: redisClient as any,
    concurrency: 2 // Capped concurrency for external AI APIs
  });

  aiWorker.on('ready', () => logger.info('✅ AI BullMQ Worker Ready'));
  aiWorker.on('error', (err) => logger.error({ err }, '❌ AI Worker Error'));

  return { opWorker, aiWorker };
};
