import { workflowSummaryService } from './src/services/intelligence/workflow-summary.service';
import { logger } from './src/infrastructure/observability/logger';

async function testSummary() {
  try {
    console.log("Triggering summary generation for post 12...");
    const res = await workflowSummaryService.generateSummaryIdempotent(12);
    console.log("Result:", res);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

testSummary();
