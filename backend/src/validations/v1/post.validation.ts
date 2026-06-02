import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(1, 'Description is required'),
    category: z.enum(['BUG', 'FEATURE', 'IMPROVEMENT', 'SUGGESTION', 'IDEA', 'DISCUSSION']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    assigneeId: z.number().int().positive().optional().nullable(),
    tags: z.array(z.string()).optional(),
  }).strict()
});

export const updatePostStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\\d+$/, 'ID must be numeric'),
  }).strict(),
  body: z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED']),
  }).strict()
});

export const reactToPostSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\\d+$/, 'ID must be numeric'),
  }).strict(),
  body: z.object({
    emoji: z.string().min(1, 'Emoji is required'),
  }).strict()
});
