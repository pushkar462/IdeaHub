import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/AppError';
import { successResponse } from '../utils/response.util';
import { assignmentRecommendationService } from '../services/intelligence/assignment-recommendation.service';
import { workflowSummaryService } from '../services/intelligence/workflow-summary.service';
import { duplicateCheckService } from '../services/intelligence/duplicate-check.service';
import { draftResponseService } from '../services/intelligence/draft-response.service';
import { autoTagService } from '../services/intelligence/auto-tag.service';
import prisma from '../config/db';

/* ---------- RECOMMEND ASSIGNEE ---------- */
export const recommendAssignee = async (req: Request, res: Response) => {
  const departmentId = Number(req.params.departmentId);

  if (isNaN(departmentId)) {
    throw new AppError('Invalid department ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }

  const recommendation = await assignmentRecommendationService.recommendAssignee(departmentId);

  if (!recommendation) {
    return successResponse(res, 'No recommendation available', null);
  }

  return successResponse(res, 'Assignment recommendation generated', recommendation);
};

/* ---------- TRIGGER WORKFLOW SUMMARY ---------- */
export const triggerSummary = async (req: Request, res: Response) => {
  const postId = Number(req.params.postId);

  if (isNaN(postId)) {
    throw new AppError('Invalid post ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }

  // Check if post exists and user has access to its department
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { departmentId: true, updatedAt: true }
  });

  if (!post) {
    throw new AppError('Post not found', StatusCodes.NOT_FOUND, 'NOT_FOUND');
  }

  // Basic RBAC/Scope check: if post is in a department, user must be in it or be Admin
  if (post.departmentId && req.user!.role !== 'ADMIN' && req.user!.role !== 'FOUNDER' && (req.user as any).departmentId !== post.departmentId) {
    throw new AppError('Forbidden', StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }

  // Check if we can instantly return a cached version without queuing
  const metrics = await prisma.workflowMetrics.findUnique({ where: { postId } });
  if (
    metrics?.aiSummaryCache && 
    metrics.aiSummaryGeneratedAt && 
    metrics.aiSummaryGeneratedAt.getTime() >= post.updatedAt.getTime()
  ) {
    return successResponse(res, 'Summary retrieved from cache', metrics.aiSummaryCache);
  }

  // Trigger AI Summary Generation in the background (fire-and-forget)
  // The service handles its own deduplication (in-memory lock) and caching.
  workflowSummaryService.generateSummaryIdempotent(postId).catch((err) => {
    // Errors are logged inside the service. No need to crash the request here.
  });

  return successResponse(res, 'Summary generation queued', null, {}, StatusCodes.ACCEPTED);
};

/* ---------- DUPLICATE CHECK ---------- */
export const checkDuplicate = async (req: Request, res: Response) => {
  const { title, body } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return successResponse(res, 'No duplicates found', { found: false });
  }

  const result = await duplicateCheckService.checkForDuplicates(title, body);
  return successResponse(res, 'Duplicate check completed', result);
};

/* ---------- CLASSIFY (Phase 2 · P5 auto-tag) ---------- */
// Non-blocking: hint the composer with a suggested type + section. Any
// authenticated user; result is a suggestion, never applied server-side.
export const classifyPost = async (req: Request, res: Response) => {
  const { title, body } = req.body ?? {};
  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return successResponse(res, 'Not enough text to classify', {
      type: null, section: null, confidence: 'none', reasoning: null,
    });
  }
  const result = await autoTagService.classify(title, typeof body === 'string' ? body : '');
  return successResponse(res, 'Classification complete', result);
};

/* ---------- DRAFT RESPONSE (E2) ---------- */
// Owner-only. Retrieval-grounded draft the owner reads, edits, and posts as
// their own comment. Model cannot post or resolve — that's a hard guardrail.
export const draftResponse = async (req: Request, res: Response) => {
  const postId = Number(req.params.postId);
  if (isNaN(postId)) {
    throw new AppError('Invalid post ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { ownerId: true, status: true },
  });
  if (!post) {
    throw new AppError('Post not found', StatusCodes.NOT_FOUND, 'NOT_FOUND');
  }

  const requester = req.user!;
  const isOwner = post.ownerId === requester.id;
  const isPrivileged = requester.role === 'ADMIN' || requester.role === 'FOUNDER';
  if (!isOwner && !isPrivileged) {
    throw new AppError('Only the assigned owner can generate a draft response', StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }

  if (post.status === 'RESOLVED') {
    // Nothing to draft — post is closed.
    return successResponse(res, 'Post already resolved', { draft: null, sources: [], confidence: 'none' });
  }

  const result = await draftResponseService.draftForPost(postId);
  return successResponse(res, 'Draft generated', result);
};
