import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(1, 'Description is required'),
    type: z.enum(['QUESTION', 'PROBLEM', 'IDEA']),
    section: z.enum(['BILLS', 'INVOICING', 'PATIENTS', 'CASES', 'PARTNERS', 'HOSPITALS', 'DOCTORS', 'WHATSAPP', 'PLATFORM', 'GENERAL']),
    isUseCase: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional()),
    linkedEntityType: z.string().optional(),
    linkedEntityId: z.string().optional(),
    departmentId: z.preprocess((val) => (val ? Number(val) : undefined), z.number().int().positive().optional().nullable()),
  }).strict()
});

export const updatePostStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be numeric'),
  }).strict(),
  body: z.object({
    status: z.enum(['OPEN', 'DISCUSSING', 'RESOLVED']).optional(),
    assigneeId: z.number().int().positive().optional().nullable(),
    resolution: z.enum(['ANSWERED', 'FIXED', 'PARKED', 'DECLINED']).optional(),
    resolutionReason: z.string().optional(),
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

export const updatePostSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be numeric'),
  }).strict(),
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').optional(),
    description: z.string().min(1, 'Description is required').optional(),
    type: z.enum(['QUESTION', 'PROBLEM', 'IDEA']).optional(),
    section: z.enum(['BILLS', 'INVOICING', 'PATIENTS', 'CASES', 'PARTNERS', 'HOSPITALS', 'DOCTORS', 'WHATSAPP', 'PLATFORM', 'GENERAL']).optional(),
    isUseCase: z.preprocess((val) => {
      if (val === undefined || val === null) return undefined;
      return val === 'true' || val === true;
    }, z.boolean().optional()),
    linkedEntityType: z.string().optional(),
    linkedEntityId: z.string().optional(),
    departmentId: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().int().positive().optional().nullable()),
    removeAttachmentId: z.preprocess((val) => {
      if (!val) return undefined;
      if (Array.isArray(val)) return val.map(Number);
      return Number(val);
    }, z.union([z.number().int().positive(), z.array(z.number().int().positive())]).optional()),
  }).strict(),
});
