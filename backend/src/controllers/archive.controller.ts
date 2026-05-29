import { Request, Response } from 'express';
import prisma from '../config/db';

/* ---------- GET ARCHIVE ---------- */
export const getArchive = async (req: Request, res: Response) => {
  const { search, category } = req.query;

  const where: any = { status: 'ARCHIVED' };

  if (search) {
    where.OR = [
      { title: { contains: String(search), mode: 'insensitive' } },
      { description: { contains: String(search), mode: 'insensitive' } },
    ];
  }
  if (category) where.category = String(category);

  const posts = await prisma.post.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      _count: { select: { comments: true, reactions: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return res.json(posts);
};

/* ---------- ARCHIVE A POST ---------- */
export const archivePost = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return res.status(404).json({ message: 'Post not found' });

  // Only FOUNDER, ADMIN or author can archive
  if (post.authorId !== req.user!.id && req.user!.role !== 'FOUNDER' && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only the author, Founder, or Admin can archive this post' });
  }

  const updated = await prisma.post.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });
  return res.json(updated);
};
