import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { successResponse } from '../utils/response.util';
import { storageService } from '../services/storage/storage.service';
import { mentionService } from '../services/mention.service';

/* ---------- CREATE POST ---------- */
export const createPost = async (req: Request, res: Response) => {
  const { title, description, category, tags, priority, assigneeId, departmentId } = req.body;
  const authorId = req.user!.id;

  let attachmentData = null;
  if (req.file) {
    try {
      const result = await storageService.upload(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'POST_ATTACHMENT',
        false
      );
      attachmentData = {
        url: result.url,
        filename: req.file.originalname,
      };
    } catch (storageErr: any) {
      console.error('Storage upload failed:', storageErr);
      throw new AppError(
        storageErr?.message || 'Upload failed. Please try again.',
        StatusCodes.BAD_REQUEST,
        'UPLOAD_FAILED'
      );
    }
  }

  const post = await prisma.post.create({
    data: {
      title,
      description,
      category,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
      priority: priority || 'MEDIUM',
      authorId,
      assigneeId: assigneeId ? Number(assigneeId) : undefined,
      departmentId: departmentId ? Number(departmentId) : undefined,
      status: 'BACKLOG',
      attachments: attachmentData ? {
        create: [{
          url: attachmentData.url,
          filename: attachmentData.filename,
          mimeType: req.file!.mimetype,
        }]
      } : undefined
    },
    include: { author: { select: { id: true, name: true, role: true, avatarUrl: true } }, attachments: true },
  });

  // Fire-and-forget side effects — never let these crash the main response
  Promise.all([
    mentionService.processMentions({ text: description, authorId, postId: post.id }).catch(e =>
      console.warn('processMentions failed:', e)
    ),
    assigneeId && Number(assigneeId) !== authorId
      ? notificationService.createNotification({
          userId: Number(assigneeId),
          type: 'ASSIGNMENT',
          actorId: authorId,
          postId: post.id,
        }, undefined).catch(e => console.warn('assignee notification failed:', e))
      : Promise.resolve(),
  ]).catch(() => {});

  return successResponse(res, 'Post created successfully', post, {}, StatusCodes.CREATED);
};

import { feedService } from '../services/feed.service';
import { getFeedSchema, getCommentsSchema } from '../validations/v1/feed.validation';

/* ---------- GET FEED ---------- */
export const getFeed = async (req: Request, res: Response) => {
  // We already validate this in the route using our middleware, but type casting is nice.
  // Actually, since we're using validate middleware, req.query is already parsed correctly!
  const query = req.query as any;

  const result = await feedService.getFeed({
    cursor: query.cursor,
    limit: query.limit,
    category: query.category,
    status: query.status,
    priority: query.priority,
    assigneeId: query.assigneeId,
    authorId: query.authorId,
    search: query.search,
  });

  return successResponse(res, 'Feed retrieved', result.items, {
    nextCursor: result.nextCursor,
    hasMore: result.hasMore
  });
};

/* ---------- GET SINGLE POST ---------- */
export const getPost = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  
  if (isNaN(id)) {
    throw new AppError('Invalid post ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }

  // We explicitly AVOID fetching recursive comments here to prevent payload explosion
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      assignee: { select: { id: true, name: true, role: true, avatarUrl: true } },
      reactions: true,
      attachments: true,
      department: { select: { id: true, name: true, slug: true } },
      workflowMetrics: { select: { slaStatus: true, totalTimeBlocked: true, aiSummaryCache: true } },
      _count: { select: { comments: { where: { parentId: null } } } }
    },
  });

  if (!post) {
    throw new AppError('Post not found', StatusCodes.NOT_FOUND, 'POST_NOT_FOUND');
  }
  
  return successResponse(res, 'Post retrieved', post);
};

import { notificationService } from '../services/notification.service';

import { workflowService } from '../services/workflow.service';
import { auditService } from '../services/audit.service';
import { eventBus, INTERNAL_EVENTS } from '../services/events/internal.emitter';
import { WorkflowStatus } from '@prisma/client';

/* ---------- UPDATE POST STATUS (AND ASSIGNEE) ---------- */
export const updateStatus = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status, assigneeId } = req.body;
  const actorId = req.user!.id;

  if (isNaN(id)) {
    throw new AppError('Invalid post ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }

  // Fetch current post to check assignment idempotency
  const currentPost = await prisma.post.findUnique({
    where: { id },
    select: { assigneeId: true, departmentId: true }
  });

  if (!currentPost) {
    throw new AppError('Post not found', StatusCodes.NOT_FOUND, 'POST_NOT_FOUND');
  }

  let post: any = currentPost;

  // 1. Guarded Workflow Transition
  if (status) {
    // This will throw if the transition is mathematically invalid
    post = await workflowService.transitionStatus(id, status as WorkflowStatus, actorId);
  }

  // 2. Assigment Logic
  if (assigneeId !== undefined && assigneeId !== null && assigneeId !== currentPost.assigneeId) {
    const parsedAssigneeId = Number(assigneeId);
    const assignmentOp = prisma.post.update({
      where: { id },
      data: { assigneeId: parsedAssigneeId }
    });

    const auditOp = auditService.buildAssignmentChangeAudit(actorId, id, {
      fromAssigneeId: currentPost.assigneeId,
      toAssigneeId: parsedAssigneeId,
    });

    let auditLog;
    [post, auditLog] = await prisma.$transaction([assignmentOp, auditOp]);

    // Phase 3A: Decoupled notification & realtime
    eventBus.emit(INTERNAL_EVENTS.POST_UPDATED, {
      postId: id,
      departmentId: currentPost.departmentId,
      assigneeId: parsedAssigneeId,
      actorId,
      changes: { assigneeId: parsedAssigneeId },
      auditLog
    });

    if (parsedAssigneeId !== actorId) {
      await notificationService.createNotification({
        userId: parsedAssigneeId,
        type: 'ASSIGNMENT',
        actorId,
        postId: id,
      }, undefined);
    }
  }

  return successResponse(res, 'Post updated successfully', post);
};

/* ---------- UPDATE POST CONTENT ---------- */
export const updatePost = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { title, description, category, tags, priority, assigneeId, departmentId } = req.body;
  const userId = req.user!.id;

  if (isNaN(id)) {
    throw new AppError('Invalid post ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }

  const existing = await prisma.post.findUnique({
    where: { id },
    include: { attachments: true },
  });

  if (!existing) {
    throw new AppError('Post not found', StatusCodes.NOT_FOUND, 'POST_NOT_FOUND');
  }

  if (existing.authorId !== userId) {
    throw new AppError('Forbidden. You can only edit your own posts.', StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }

  // Handle attachment removal (supports single or multiple IDs from multipart form)
  const rawRemoveIds = req.body.removeAttachmentId;
  const removeIds: number[] = Array.isArray(rawRemoveIds)
    ? rawRemoveIds.map(Number)
    : rawRemoveIds
      ? [Number(rawRemoveIds)]
      : [];

  for (const attId of removeIds) {
    const attachment = existing.attachments.find((a) => a.id === attId);
    if (attachment) {
      const key = attachment.url.replace(/^\/uploads\//, '');
      await storageService.delete(key).catch((e) => console.warn('Failed to delete attachment file:', e));
      await prisma.attachment.delete({ where: { id: attachment.id } });
    }
  }

  // Handle new attachment upload
  if (req.file) {
    try {
      const result = await storageService.upload(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'POST_ATTACHMENT',
        false
      );
      await prisma.attachment.create({
        data: {
          url: result.url,
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
          postId: id,
        },
      });
    } catch (storageErr: any) {
      throw new AppError(
        storageErr?.message || 'Upload failed. Please try again.',
        StatusCodes.BAD_REQUEST,
        'UPLOAD_FAILED'
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (category !== undefined) updateData.category = category;
  if (tags !== undefined) updateData.tags = tags;
  if (priority !== undefined) updateData.priority = priority;
  if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
  if (departmentId !== undefined) updateData.departmentId = departmentId;

  const post = await prisma.post.update({
    where: { id },
    data: updateData,
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      assignee: { select: { id: true, name: true, role: true, avatarUrl: true } },
      attachments: true,
      department: { select: { id: true, name: true, slug: true } },
      reactions: true,
      _count: { select: { comments: { where: { parentId: null } }, reactions: true } },
    },
  });

  if (description !== undefined) {
    mentionService.processMentions({ text: description, authorId: userId, postId: id }).catch((e) =>
      console.warn('processMentions failed:', e)
    );
  }

  return successResponse(res, 'Post updated successfully', post);
};

/* ---------- GET POST COMMENTS (PAGINATED) ---------- */
export const getPostComments = async (req: Request, res: Response) => {
  const postId = Number(req.params.id);
  const query = req.query as any;

  if (isNaN(postId)) {
    throw new AppError('Invalid post ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }

  const result = await feedService.getPostComments(postId, query.cursor, query.limit);

  return successResponse(res, 'Comments retrieved', result.items, {
    nextCursor: result.nextCursor,
    hasMore: result.hasMore
  });
};


/* ---------- REACT TO POST ---------- */
export const reactToPost = async (req: Request, res: Response) => {
  const postId = Number(req.params.id);
  const { emoji } = req.body;
  const userId = req.user!.id;

  const existing = await prisma.reaction.findUnique({
    where: { userId_postId_emoji: { userId, postId, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return successResponse(res, 'Reaction removed', { removed: true });
  } else {
    const reaction = await prisma.reaction.create({
      data: { userId, postId, emoji },
    });
    return successResponse(res, 'Reaction added', reaction, {}, StatusCodes.CREATED);
  }
};

/* ---------- DELETE POST ---------- */
export const deletePost = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const post = await prisma.post.findUnique({
    where: { id },
    include: { attachments: true },
  });
  
  if (!post) {
    throw new AppError('Post not found', StatusCodes.NOT_FOUND, 'POST_NOT_FOUND');
  }
  
  if (post.authorId !== req.user!.id && req.user!.role !== 'FOUNDER' && req.user!.role !== 'ADMIN') {
    throw new AppError('Forbidden. You cannot delete this post.', StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }

  // Clean up attachment files from storage
  for (const attachment of post.attachments) {
    const key = attachment.url.replace(/^\/uploads\//, '');
    await storageService.delete(key).catch((e) =>
      console.warn(`Failed to delete attachment file ${key}:`, e)
    );
  }
  
  await prisma.post.delete({ where: { id } });
  return successResponse(res, 'Post deleted successfully');
};

/* ---------- GET STATS ---------- */
export const getStats = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [totalActive, myActiveTasks, needReview, completed] = await Promise.all([
    // Total active posts across the entire platform
    prisma.post.count({ where: { status: { not: 'DONE' } } }),
    // Tasks assigned to me that are not DONE
    prisma.post.count({ where: { assigneeId: userId, status: { not: 'DONE' } } }),
    // Posts waiting for review
    prisma.post.count({ where: { status: 'IN_REVIEW' } }),
    // Total posts I have authored or been assigned to that are DONE
    prisma.post.count({
      where: {
        status: 'DONE',
        OR: [{ authorId: userId }, { assigneeId: userId }],
      },
    }),
  ]);

  return successResponse(res, 'Stats retrieved', {
    totalActive,
    myActiveTasks,
    needReview,
    completed,
  });
};
