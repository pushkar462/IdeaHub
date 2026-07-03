import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../config/db';
import { successResponse } from '../utils/response.util';
import { AppError } from '../utils/AppError';

/* ---------- GET ARCHIVE ---------- */
export const getArchive = async (req: Request, res: Response) => {
  const { search, type, section } = req.query;

  const where: any = { status: 'RESOLVED' };

  if (search) {
    where.OR = [
      { title: { contains: String(search), mode: 'insensitive' } },
      { description: { contains: String(search), mode: 'insensitive' } },
    ];
  }
  if (type) where.type = String(type);
  if (section) where.section = String(section);

  const posts = await prisma.post.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      _count: { select: { comments: true, reactions: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return successResponse(res, 'Archive retrieved', posts);
};

/* ---------- ARCHIVE A POST ---------- */
export const archivePost = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    throw new AppError('Post not found', StatusCodes.NOT_FOUND, 'POST_NOT_FOUND');
  }

  // Only FOUNDER, ADMIN or author can archive
  if (post.authorId !== req.user!.id && req.user!.role !== 'FOUNDER' && req.user!.role !== 'ADMIN') {
    throw new AppError('Only the author, Founder, or Admin can archive this post', StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }

  const updated = await prisma.post.update({
    where: { id },
    data: { status: 'RESOLVED' },
  });
  return successResponse(res, 'Post archived', updated);
};
