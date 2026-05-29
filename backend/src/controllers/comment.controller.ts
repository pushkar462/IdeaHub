import { Request, Response } from 'express';
import prisma from '../config/db';
import { extractMentions } from '../utils/mention';
import { createNotification } from '../services/notification.service';

/* ---------- CREATE COMMENT ---------- */
export const createComment = async (req: Request, res: Response) => {
  const { postId, content, parentId } = req.body;
  const authorId = req.user!.id;

  if (!postId || !content) {
    return res.status(400).json({ message: 'postId and content are required' });
  }

  const comment = await prisma.comment.create({
    data: {
      postId: Number(postId),
      authorId,
      content,
      parentId: parentId ? Number(parentId) : undefined,
    },
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      reactions: true,
    },
  });

  // Mention notifications
  const mentions = extractMentions(content);
  for (const username of mentions) {
    const mentioned = await prisma.user.findUnique({ where: { name: username } });
    if (mentioned && mentioned.id !== authorId) {
      await createNotification(
        mentioned.id,
        'tag',
        `${req.user!.name} mentioned you in a comment`
      );
    }
  }

  // Notify post author
  const post = await prisma.post.findUnique({ where: { id: Number(postId) } });
  if (post && post.authorId !== authorId) {
    await createNotification(
      post.authorId,
      'reply',
      `${req.user!.name} commented on your post "${post.title}"`
    );
  }

  // Notify parent comment author if this is a reply
  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: Number(parentId) } });
    if (parent && parent.authorId !== authorId) {
      await createNotification(
        parent.authorId,
        'reply',
        `${req.user!.name} replied to your comment`
      );
    }
  }

  return res.status(201).json(comment);
};

/* ---------- UPDATE COMMENT ---------- */
export const updateComment = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { content } = req.body;

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return res.status(404).json({ message: 'Comment not found' });
  if (comment.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: { content },
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
    },
  });

  return res.json(updated);
};

/* ---------- DELETE COMMENT ---------- */
export const deleteComment = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return res.status(404).json({ message: 'Comment not found' });
  if (comment.authorId !== req.user!.id && req.user!.role !== 'FOUNDER' && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  await prisma.comment.delete({ where: { id } });
  return res.status(204).send();
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
    return res.json({ removed: true });
  } else {
    const reaction = await prisma.reaction.create({
      data: { userId, commentId, emoji },
    });
    return res.status(201).json(reaction);
  }
};
