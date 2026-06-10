import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(1, 'Description is required'),
    category: z.enum(['BUG', 'FEATURE', 'IMPROVEMENT', 'SUGGESTION', 'IDEA', 'DISCUSSION', 'PROBLEM']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    assigneeId: z.preprocess((val) => (val ? Number(val) : undefined), z.number().int().positive().optional().nullable()),
    departmentId: z.preprocess((val) => (val ? Number(val) : undefined), z.number().int().positive().optional().nullable()),
    tags: z.preprocess((val) => {
      if (!val) return [];
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [val];
        } catch {
          return val.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
      return Array.isArray(val) ? val : [String(val)];
    }, z.array(z.string()).optional()),
  }).strict()
});

export const updatePostStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be numeric'),
  }).strict(),
  body: z.object({
    status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']).optional(),
    assigneeId: z.number().int().positive().optional().nullable(),
  }).strict()
});

export const reactToPostSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be numeric'),
  }).strict(),
  body: z.object({
    emoji: z.string().min(1, 'Emoji is required'),
  }).strict()
});
