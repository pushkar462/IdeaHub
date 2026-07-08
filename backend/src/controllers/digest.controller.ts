import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { successResponse } from '../utils/response.util';
import { config } from '../config/env.config';
import { logger } from '../infrastructure/observability/logger';

// Handbook Section 6 · The weekly digest is delivered by n8n over the same
// WhatsApp / email path Athwart already uses. This endpoint is the contract:
// n8n reads it every Friday and formats the message. Keep the payload small
// and PII-light — first names only in named recognition.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ACK_WINDOW_MS = 48 * 60 * 60 * 1000;
const DISCUSSING_STALE_MS = 7 * 24 * 60 * 60 * 1000;

function firstName(name?: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

export const getWeeklyDigest = async (req: Request, res: Response) => {
  // Header auth: n8n sends the shared secret. When DIGEST_TOKEN is unset the
  // endpoint is intentionally 503'd so a misconfigured deploy can't leak data.
  if (!config.DIGEST_TOKEN) {
    throw new AppError(
      'Digest endpoint is not configured. Set DIGEST_TOKEN.',
      StatusCodes.SERVICE_UNAVAILABLE,
      'DIGEST_DISABLED',
    );
  }
  const provided = req.header('x-digest-token');
  if (!provided || provided !== config.DIGEST_TOKEN) {
    logger.warn({ ip: req.ip }, 'digest: rejected — missing or wrong X-Digest-Token');
    throw new AppError('Unauthorized', StatusCodes.UNAUTHORIZED, 'UNAUTHORIZED');
  }
  logger.info({ ip: req.ip, ua: req.header('user-agent') }, 'digest: weekly requested');

  const now = Date.now();
  const weekAgo         = new Date(now - WEEK_MS);
  const ackCutoff       = new Date(now - ACK_WINDOW_MS);
  const discussingStale = new Date(now - DISCUSSING_STALE_MS);

  const [newTotal, topNew, resolvedInWindow, awaitingQuestions, stalledDiscussing, recognitionRaw] = await Promise.all([
    // 1. new-posts total (last 7d)
    prisma.post.count({ where: { createdAt: { gte: weekAgo } } }),
    // 2. top-3 by comment count in the window
    prisma.post.findMany({
      where: { createdAt: { gte: weekAgo } },
      orderBy: { comments: { _count: 'desc' } },
      take: 3,
      select: {
        id: true, postNumber: true, title: true, type: true, section: true, status: true,
        _count: { select: { comments: true } },
      },
    }),
    // 3. resolved this week — include resolver (owner or admin who closed it)
    prisma.post.findMany({
      where: {
        status: 'RESOLVED',
        updatedAt: { gte: weekAgo },
      },
      orderBy: { updatedAt: 'desc' },
      take: 25,
      select: {
        id: true, postNumber: true, title: true, type: true, section: true,
        resolution: true, updatedAt: true,
        owner: { select: { id: true, name: true } },
      },
    }),
    // 4. awaiting-owner Questions (OPEN + un-acknowledged past 48h)
    prisma.post.findMany({
      where: {
        type: 'QUESTION',
        status: 'OPEN',
        acknowledgedAt: null,
        createdAt: { lt: ackCutoff },
      },
      orderBy: { createdAt: 'asc' },
      take: 25,
      select: {
        id: true, postNumber: true, title: true, section: true, createdAt: true,
        owner: { select: { id: true, name: true } },
      },
    }),
    // 5. Ideas stalled in DISCUSSING > 7d
    prisma.post.findMany({
      where: {
        type: 'IDEA',
        status: 'DISCUSSING',
        workflowMetrics: { currentStatusStartedAt: { lt: discussingStale } },
      },
      orderBy: { updatedAt: 'asc' },
      take: 25,
      select: {
        id: true, postNumber: true, title: true, section: true, updatedAt: true,
        owner: { select: { id: true, name: true } },
      },
    }),
    // 6. named recognition — top 1 resolver by count in the window
    prisma.post.groupBy({
      by: ['ownerId'],
      where: {
        status: 'RESOLVED',
        updatedAt: { gte: weekAgo },
        ownerId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { ownerId: 'desc' } },
      take: 1,
    }),
  ]);

  let namedRecognition: { userId: number; firstName: string | null; resolvedCount: number } | null = null;
  if (recognitionRaw.length > 0 && recognitionRaw[0].ownerId) {
    const winner = recognitionRaw[0];
    const user = await prisma.user.findUnique({
      where: { id: winner.ownerId! },
      select: { id: true, name: true },
    });
    namedRecognition = {
      userId: winner.ownerId!,
      firstName: firstName(user?.name),
      resolvedCount: winner._count._all,
    };
  }

  return successResponse(res, 'Weekly digest generated', {
    windowStart: weekAgo.toISOString(),
    windowEnd:   new Date(now).toISOString(),
    newPosts: {
      total: newTotal,
      top:   topNew.map((p) => ({
        id: p.id, postNumber: p.postNumber, title: p.title,
        type: p.type, section: p.section, status: p.status,
        commentCount: p._count.comments,
      })),
    },
    resolved: resolvedInWindow.map((p) => ({
      id: p.id, postNumber: p.postNumber, title: p.title,
      type: p.type, section: p.section, resolution: p.resolution,
      resolvedAt: p.updatedAt.toISOString(),
      resolverFirstName: firstName(p.owner?.name),
    })),
    awaiting: {
      questions: awaitingQuestions.map((p) => ({
        id: p.id, postNumber: p.postNumber, title: p.title, section: p.section,
        openedAt: p.createdAt.toISOString(),
        ownerFirstName: firstName(p.owner?.name),
      })),
      ideas: stalledDiscussing.map((p) => ({
        id: p.id, postNumber: p.postNumber, title: p.title, section: p.section,
        discussingSince: p.updatedAt.toISOString(),
        ownerFirstName: firstName(p.owner?.name),
      })),
    },
    namedRecognition,
    generatedAt: new Date(now).toISOString(),
  });
};
