import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { successResponse } from '../utils/response.util';

import { feedService } from '../services/feed.service';

/* ---------- GET COMMENT REPLIES (PAGINATED) ---------- */
export const getCommentReplies = async (req: Request, res: Response) => {
  const commentId = Number(req.params.id);
  const query = req.query as any;

  if (isNaN(commentId)) {
    throw new AppError('Invalid comment ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }

  const result = await feedService.getCommentReplies(commentId, query.cursor, query.limit);

  return successResponse(res, 'Replies retrieved', result.items, {
    nextCursor: result.nextCursor,
    hasMore: result.hasMore
  });
};

import { mentionService } from '../services/mention.service';
import { notificationService } from '../services/notification.service';

/* ---------- CREATE COMMENT ---------- */
export const createComment = async (req: Request, res: Response) => {
  const { postId, content, parentId } = req.body;
  const authorId = req.user!.id;

  const comment = await prisma.comment.create({
    data: {
      postId, // Zod transforms this to Number
      authorId,
      content,
      parentId, // Zod transforms this to Number or undefined
    },
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      reactions: true,
    },
  });

  // Phase 3A: Process mentions safely using transactions and deduplication
  await mentionService.processMentions({
    text: content,
    authorId,
    commentId: comment.id,
  });

  // Phase 3A: Notify parent comment author if this is a reply
  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId } });
    if (parent && parent.authorId !== authorId) {
      await notificationService.createNotification({
        userId: parent.authorId,
        type: 'COMMENT_REPLY',
        actorId: authorId,
        commentId: comment.id,
      }, undefined);
    }
  } else {
    // Notify post author if this is a top-level comment
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (post && post.authorId !== authorId) {
      await notificationService.createNotification({
        userId: post.authorId,
        type: 'COMMENT_REPLY', // Top level comments are treated as replies to the post author
        actorId: authorId,
        postId: post.id,
        commentId: comment.id,
      }, undefined);
    }
  }

  return successResponse(res, 'Comment created successfully', comment, {}, StatusCodes.CREATED);
};

/* ---------- UPDATE COMMENT ---------- */
export const updateComment = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { content, isCanonical } = req.body;

  const comment = await prisma.comment.findUnique({ 
    where: { id },
    include: { post: true }
  });
  
  if (!comment) {
    throw new AppError('Comment not found', StatusCodes.NOT_FOUND, 'COMMENT_NOT_FOUND');
  }
  
  // Checking permissions
  const isAuthor = comment.authorId === req.user!.id;
  const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'FOUNDER';
  const isPostOwner = comment.post.ownerId === req.user!.id;

  if (content !== undefined && !isAuthor && !isAdmin) {
    throw new AppError('Forbidden. You cannot edit this comment.', StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }

  if (isCanonical !== undefined && !isPostOwner && !isAdmin) {
    throw new AppError('Forbidden. Only post owners can mark comments as canonical.', StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: { 
      ...(content !== undefined && { content }),
      ...(isCanonical !== undefined && { isCanonical })
    },
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
    },
  });

  return successResponse(res, 'Comment updated', updated);
};

/* ---------- DELETE COMMENT ---------- */
export const deleteComment = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const comment = await prisma.comment.findUnique({ where: { id } });
  
  if (!comment) {
    throw new AppError('Comment not found', StatusCodes.NOT_FOUND, 'COMMENT_NOT_FOUND');
  }
  
  if (comment.authorId !== req.user!.id && req.user!.role !== 'FOUNDER' && req.user!.role !== 'ADMIN') {
    throw new AppError('Forbidden. You cannot delete this comment.', StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }
  
  await prisma.comment.delete({ where: { id } });
  return successResponse(res, 'Comment deleted successfully');
};

/* ---------- REACT TO COMMENT ---------- */
export const reactToComment = async (req: Request, res: Response) => {
  const commentId = Number(req.params.id);
  const { emoji } = req.body;
  const userId = req.user!.id;

  const existing = await prisma.reaction.findUnique({
    where: { userId_commentId_emoji: { userId, commentId, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return successResponse(res, 'Reaction removed', { removed: true });
  } else {
    const reaction = await prisma.reaction.create({
      data: { userId, commentId, emoji },
    });
    return successResponse(res, 'Reaction added', reaction, {}, StatusCodes.CREATED);
  }
};
