import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['ADMIN', 'FOUNDER', 'DEVOPS', 'FRONTEND', 'BACKEND', 'AI_ML']).optional(),
    bio: z.string().optional(),
  }).strict() // Reject unknown fields to prevent payload injection
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }).strict()
});

export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be numeric'),
  }).strict(),
  body: z.object({
    role: z.enum(['ADMIN', 'FOUNDER', 'DEVOPS', 'FRONTEND', 'BACKEND', 'AI_ML']),
  }).strict(),
});
