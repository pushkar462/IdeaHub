import { z } from 'zod';
import { cursorSchema, feedLimitSchema } from './feed.validation';
import { Status } from '@prisma/client';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export const advancedSearchSchema = z.object({
  query: z.object({
    cursor: cursorSchema,
    limit: feedLimitSchema,
    type: z.enum(['QUESTION', 'PROBLEM', 'IDEA']).optional(),
    section: z.enum(['BILLS', 'INVOICING', 'PATIENTS', 'CASES', 'PARTNERS', 'HOSPITALS', 'DOCTORS', 'WHATSAPP', 'PLATFORM', 'GENERAL']).optional(),
    status: z.nativeEnum(Status).optional(),
    search: z.string().max(100, 'Search query too long').optional(),
    ownerId: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : undefined),
    
    // Strict Whitelisting for Sorts
    sortBy: z.enum(['createdAt', 'status']).optional().default('createdAt'),
    
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
