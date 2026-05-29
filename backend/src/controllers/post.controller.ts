import { Request, Response } from 'express';
import prisma from '../config/db';
import { extractMentions } from '../utils/mention';
import { createNotification } from '../services/notification.service';

/* ---------- CREATE POST ---------- */
export const createPost = async (req: Request, res: Response) => {
  const { title, description, category, tags, priority, assigneeId } = req.body;
  const authorId = req.user!.id;

  if (!title || !description || !category) {
    return res.status(400).json({ message: 'title, description, category are required' });
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
      status: 'OPEN',
    },
    include: { author: { select: { id: true, name: true, role: true, avatarUrl: true } } },
  });

  // Notify mentioned users
  const mentions = extractMentions(description);
  for (const username of mentions) {
    const mentioned = await prisma.user.findUnique({ where: { name: username } });
    if (mentioned && mentioned.id !== authorId) {
      await createNotification(
        mentioned.id,
        'tag',
        `${req.user!.name} mentioned you in "${title}"`
      );
    }
  }

  // Notify assignee
  if (assigneeId && Number(assigneeId) !== authorId) {
    await createNotification(
      Number(assigneeId),
      'assignment',
      `${req.user!.name} assigned you to "${title}"`
    );
  }

  return res.status(201).json(post);
};

/* ---------- GET FEED ---------- */
export const getFeed = async (req: Request, res: Response) => {
  const { search, status, category, priority, assigneeId } = req.query;

  const where: any = {};

  if (search) {
    where.OR = [
      { title: { contains: String(search), mode: 'insensitive' } },
      { description: { contains: String(search), mode: 'insensitive' } },
    ];
  }
  if (status) where.status = String(status);
  if (category) where.category = String(category);
  if (priority) where.priority = String(priority);
  if (assigneeId) where.assigneeId = Number(assigneeId);

  const posts = await prisma.post.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      assignee: { select: { id: true, name: true, role: true, avatarUrl: true } },
      reactions: true,
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(posts);
};

/* ---------- GET SINGLE POST ---------- */
export const getPost = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      assignee: { select: { id: true, name: true, role: true, avatarUrl: true } },
      reactions: true,
      attachments: true,
      comments: {
        where: { parentId: null },
        include: {
          author: { select: { id: true, name: true, role: true, avatarUrl: true } },
          reactions: true,
          replies: {
            include: {
              author: { select: { id: true, name: true, role: true, avatarUrl: true } },
              reactions: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!post) return res.status(404).json({ message: 'Post not found' });
  return res.json(post);
};

/* ---------- UPDATE POST STATUS ---------- */
export const updateStatus = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  const post = await prisma.post.update({
    where: { id },
    data: { status },
  });

  if (post.assigneeId && post.assigneeId !== req.user!.id) {
    await createNotification(
      post.assigneeId,
      'status_change',
      `Post "${post.title}" status changed to ${status}`
    );
  }

  return res.json(post);
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
    return res.json({ removed: true });
  } else {
    const reaction = await prisma.reaction.create({
      data: { userId, postId, emoji },
    });
    return res.status(201).json(reaction);
  }
};

/* ---------- DELETE POST ---------- */
export const deletePost = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (post.authorId !== req.user!.id && req.user!.role !== 'FOUNDER' && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  await prisma.post.delete({ where: { id } });
  return res.status(204).send();
};
