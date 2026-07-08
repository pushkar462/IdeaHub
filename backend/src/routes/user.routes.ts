import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { successResponse } from '../utils/response.util';
import { AppError } from '../utils/AppError';
import prisma from '../config/db';
import { StatusCodes } from 'http-status-codes';

const router = Router();

/* ---------- GET USER PROFILE ---------- */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) throw new AppError('Invalid user ID', StatusCodes.BAD_REQUEST);

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      bio: true,
      avatarUrl: true,
      createdAt: true,
      _count: { select: { posts: true, comments: true } },
    },
  });

  if (!user) throw new AppError('User not found', StatusCodes.NOT_FOUND);

  return successResponse(res, 'User retrieved', user);
});

/* ---------- GET USER POSTS (ALL STATUSES) ---------- */
router.get('/:id/posts', authenticate, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) throw new AppError('Invalid user ID', StatusCodes.BAD_REQUEST);

  const posts = await prisma.post.findMany({
    where: { authorId: id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      section: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { id: true, name: true, avatarUrl: true, role: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      department: { select: { id: true, name: true, slug: true } },
      reactions: true,
      attachments: true,
      _count: { select: { comments: true, reactions: true } },
    },
  });

  return successResponse(res, 'User posts retrieved', posts);
});

/* ---------- GET USER CONTRIBUTIONS ---------- */
// Factual record only — no scores, no ranking. Self + Admin/Founder access.
//   raised    — posts this user authored
//   resolved  — posts this user OWNS that reached RESOLVED with a substantive outcome
//   answered  — posts (not their own) they commented on that later resolved as ANSWERED
router.get('/:id/contributions', authenticate, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) throw new AppError('Invalid user ID', StatusCodes.BAD_REQUEST);

  const requester = req.user!;
  const isSelf = requester.id === id;
  const isPrivileged = requester.role === 'ADMIN' || requester.role === 'FOUNDER';
  if (!isSelf && !isPrivileged) {
    throw new AppError('Contributions are private to the user, Admin, and Founder', StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }

  // Handbook Section 10: factual layer. Optional `since` narrows the window
  // (e.g. weekly-digest recognition). ISO date; missing/invalid → all-time.
  let sinceDate: Date | undefined;
  const sinceRaw = typeof req.query.since === 'string' ? req.query.since : undefined;
  if (sinceRaw) {
    const parsed = new Date(sinceRaw);
    if (!isNaN(parsed.getTime())) sinceDate = parsed;
  }
  const CONTRIB_LIMIT = 100;

  const postSelect = {
    id: true,
    postNumber: true,
    title: true,
    type: true,
    section: true,
    status: true,
    resolution: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  const [raised, resolved, answeredPostIdsRaw] = await Promise.all([
    prisma.post.findMany({
      where: {
        authorId: id,
        ...(sinceDate && { createdAt: { gte: sinceDate } }),
      },
      orderBy: { createdAt: 'desc' },
      take: CONTRIB_LIMIT,
      select: postSelect,
    }),
    prisma.post.findMany({
      where: {
        ownerId: id,
        status: 'RESOLVED',
        resolution: { in: ['ANSWERED', 'FIXED', 'APPROVED', 'RULE_DECIDED'] },
        ...(sinceDate && { updatedAt: { gte: sinceDate } }),
      },
      orderBy: { updatedAt: 'desc' },
      take: CONTRIB_LIMIT,
      select: postSelect,
    }),
    prisma.comment.findMany({
      where: {
        authorId: id,
        post: {
          status: 'RESOLVED',
          resolution: 'ANSWERED',
          NOT: { authorId: id },
          ...(sinceDate && { updatedAt: { gte: sinceDate } }),
        },
      },
      select: { postId: true },
      distinct: ['postId'],
      take: CONTRIB_LIMIT,
    }),
  ]);

  const answeredIds = answeredPostIdsRaw.map((c) => c.postId);
  const answered = answeredIds.length
    ? await prisma.post.findMany({
        where: { id: { in: answeredIds } },
        orderBy: { updatedAt: 'desc' },
        select: postSelect,
      })
    : [];

  return successResponse(res, 'Contributions retrieved', {
    raised,
    resolved,
    answered,
    counts: {
      raised: raised.length,
      resolved: resolved.length,
      answered: answered.length,
    },
    since: sinceDate ? sinceDate.toISOString() : null,
    limit: CONTRIB_LIMIT,
  });
});

export default router;
