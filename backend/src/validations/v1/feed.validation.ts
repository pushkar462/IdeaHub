import { z } from 'zod';
import { decodeCursor } from '../../utils/pagination.util';

// Reusable limit schema ensuring we don't fetch more than 50 at a time
export const feedLimitSchema = z
  .union([z.string(), z.number()])
  .optional()
  .transform((val) => {
    const num = Number(val);
    if (isNaN(num) || num < 1) return 20; // Default
    if (num > 50) return 50; // Hard max limit
    return num;
  });

export const cursorSchema = z.string().optional().refine((val) => {
  if (!val) return true;
  return decodeCursor(val) !== null;
}, 'Invalid cursor format');

export const getFeedSchema = z.object({
  query: z.object({
    cursor: cursorSchema,
    limit: feedLimitSchema,
    type: z.enum(['QUESTION', 'PROBLEM', 'IDEA']).optional(),
    section: z.enum(['BILLS', 'INVOICING', 'PATIENTS', 'CASES', 'PARTNERS', 'HOSPITALS', 'DOCTORS', 'WHATSAPP', 'PLATFORM', 'GENERAL']).optional(),
    status: z.enum(['OPEN', 'DISCUSSING', 'RESOLVED', 'ALL']).optional(),
    search: z.string().optional(), // Left in for now, ILIKE search
    ownerId: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : undefined),
    authorId: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : undefined),
    // Handbook D1: "Open / needs response" — restrict to OPEN posts that have not
    // been acknowledged by an owner yet. Client sends `needResponse=true`.
    needResponse: z.union([z.string(), z.boolean()]).optional().transform(val => val === 'true' || val === true),
    // Handbook B8 · scope the board to a campaign's posts.
    campaignId: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : undefined),
  }).strict()
});

export const getCommentsSchema = z.object({
  query: z.object({
    cursor: cursorSchema,
    limit: feedLimitSchema,
  }).strict(),
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Post ID must be numeric').transform(Number)
  }).strict()
});

export const getRepliesSchema = z.object({
  query: z.object({
    cursor: cursorSchema,
    limit: feedLimitSchema,
  }).strict(),
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Comment ID must be numeric').transform(Number)
  }).strict()
});
