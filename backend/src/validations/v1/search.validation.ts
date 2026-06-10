import { z } from 'zod';
import { cursorSchema, feedLimitSchema } from './feed.validation';
import { WorkflowStatus } from '@prisma/client';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export const advancedSearchSchema = z.object({
  query: z.object({
    cursor: cursorSchema,
    limit: feedLimitSchema,
    category: z.enum(['BUG', 'IMPROVEMENT', 'SUGGESTION', 'FEATURE', 'IDEA', 'DISCUSSION', 'PROBLEM']).optional(),
    status: z.nativeEnum(WorkflowStatus).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    search: z.string().max(100, 'Search query too long').optional(),
    assigneeId: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : undefined),
    
    // Strict Whitelisting for Sorts
    sortBy: z.enum(['createdAt', 'priority', 'status']).optional().default('createdAt'),
    
    // Bounded Date Ranges (Max 90 days)
    startDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
    endDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  }).strict().refine((data) => {
    if (data.startDate && data.endDate) {
      const diff = data.endDate.getTime() - data.startDate.getTime();
      if (diff < 0) return false;
      if (diff > NINETY_DAYS_MS) return false;
    }
    return true;
  }, {
    message: "Date range must be valid and cannot exceed 90 days.",
    path: ["endDate"]
  })
});
