import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { successResponse } from '../utils/response.util';
import { notificationService } from '../services/notification.service';

function requireAdmin(req: Request) {
  const role = req.user!.role;
  if (role !== 'ADMIN' && role !== 'FOUNDER') {
    throw new AppError('Admin/Founder only', StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }
}

const campaignSelect = {
  id: true, title: true, prompt: true, themeTag: true,
  startsAt: true, endsAt: true, status: true, closedAt: true,
  createdAt: true, updatedAt: true,
  createdBy: { select: { id: true, name: true, avatarUrl: true, role: true } },
  winner: { select: { id: true, postNumber: true, title: true } },
  _count: { select: { posts: true } },
} as const;

/* ---------- LIST CAMPAIGNS ---------- */
// Any authenticated user. Optional ?status=ACTIVE|CLOSED filter.
export const listCampaigns = async (req: Request, res: Response) => {
  const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;
  const where: any = {};
  if (statusFilter === 'ACTIVE' || statusFilter === 'CLOSED') where.status = statusFilter;

  const rows = await prisma.campaign.findMany({
    where,
    orderBy: [{ status: 'asc' }, { endsAt: 'desc' }],
    select: campaignSelect,
  });
  return successResponse(res, 'Campaigns retrieved', rows);
};

/* ---------- GET CAMPAIGN (with top voted posts) ---------- */
export const getCampaign = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Invalid campaign ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }

  const [campaign, topPosts] = await Promise.all([
    prisma.campaign.findUnique({ where: { id }, select: campaignSelect }),
    prisma.post.findMany({
      where: { campaignId: id },
      orderBy: [{ votes: { _count: 'desc' } }, { createdAt: 'desc' }],
      take: 25,
      select: {
        id: true, postNumber: true, title: true, description: true,
        type: true, status: true, section: true,
        createdAt: true, updatedAt: true,
        author: { select: { id: true, name: true, avatarUrl: true, role: true } },
        _count: { select: { comments: true, votes: true } },
      },
    }),
  ]);
  if (!campaign) throw new AppError('Campaign not found', StatusCodes.NOT_FOUND, 'CAMPAIGN_NOT_FOUND');

  return successResponse(res, 'Campaign retrieved', {
    ...campaign,
    posts: topPosts.map((p) => ({
      ...p,
      voteCount:    p._count.votes,
      commentCount: p._count.comments,
    })),
  });
};

/* ---------- CREATE CAMPAIGN (admin) ---------- */
export const createCampaign = async (req: Request, res: Response) => {
  requireAdmin(req);
  const { title, prompt, themeTag, endsAt, startsAt } = req.body ?? {};
  if (typeof title !== 'string' || title.trim().length < 3) {
    throw new AppError('title must be at least 3 characters', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR');
  }
  if (typeof prompt !== 'string' || prompt.trim().length < 5) {
    throw new AppError('prompt must be at least 5 characters', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR');
  }
  if (!endsAt) {
    throw new AppError('endsAt is required (ISO date)', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR');
  }
  const ends = new Date(endsAt);
  if (isNaN(ends.getTime()) || ends.getTime() <= Date.now()) {
    throw new AppError('endsAt must be a valid future ISO date', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR');
  }
  const starts = startsAt ? new Date(startsAt) : new Date();
  if (startsAt && (isNaN(starts.getTime()) || starts.getTime() > ends.getTime())) {
    throw new AppError('startsAt must be before endsAt', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR');
  }

  const created = await prisma.campaign.create({
    data: {
      title:       title.trim(),
      prompt:      prompt.trim(),
      themeTag:    typeof themeTag === 'string' && themeTag.trim() ? themeTag.trim().slice(0, 40) : null,
      startsAt:    starts,
      endsAt:      ends,
      createdById: req.user!.id,
    },
    select: campaignSelect,
  });
  return successResponse(res, 'Campaign created', created, {}, StatusCodes.CREATED);
};

/* ---------- CLOSE CAMPAIGN (admin) ---------- */
export const closeCampaign = async (req: Request, res: Response) => {
  requireAdmin(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Invalid campaign ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }
  const existing = await prisma.campaign.findUnique({ where: { id }, select: { status: true } });
  if (!existing) throw new AppError('Campaign not found', StatusCodes.NOT_FOUND, 'CAMPAIGN_NOT_FOUND');
  if (existing.status === 'CLOSED') return successResponse(res, 'Already closed', { alreadyClosed: true });

  const updated = await prisma.campaign.update({
    where: { id },
    data:  { status: 'CLOSED', closedAt: new Date() },
    select: campaignSelect,
  });
  return successResponse(res, 'Campaign closed', updated);
};

/* ---------- PICK WINNER (admin) ---------- */
// Sets Campaign.winnerId and notifies the winning post's author. Handbook B8
// step 4: "winning idea is shipped and its contributor recognised."
export const pickWinner = async (req: Request, res: Response) => {
  requireAdmin(req);
  const id = Number(req.params.id);
  const postId = Number(req.body?.postId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Invalid campaign ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }
  if (!Number.isInteger(postId) || postId <= 0) {
    throw new AppError('postId (positive integer) is required', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR');
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, campaignId: true, authorId: true },
  });
  if (!post) throw new AppError('Post not found', StatusCodes.NOT_FOUND, 'POST_NOT_FOUND');
  if (post.campaignId !== id) {
    throw new AppError('Post is not part of this campaign', StatusCodes.BAD_REQUEST, 'POST_NOT_IN_CAMPAIGN');
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data:  { winnerId: postId },
    select: campaignSelect,
  });

  // Fire-and-forget notification. Errors are logged, not surfaced to the actor.
  if (post.authorId !== req.user!.id) {
    notificationService
      .createNotification(
        { userId: post.authorId, type: 'POST_UPDATE', actorId: req.user!.id, postId: post.id },
        undefined,
      )
      .catch((e) => console.warn('Winner-pick notification failed:', e));
  }

  return successResponse(res, 'Winner picked', updated);
};
