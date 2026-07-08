import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Section } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { successResponse } from '../utils/response.util';
import { kbNominationService } from '../services/intelligence/kb-nomination.service';

function requireAdmin(req: Request) {
  const role = req.user!.role;
  if (role !== 'ADMIN' && role !== 'FOUNDER') {
    throw new AppError('Admin/Founder only', StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }
}

const SECTIONS: Section[] = [
  'BILLS', 'INVOICING', 'PATIENTS', 'CASES', 'PARTNERS',
  'HOSPITALS', 'DOCTORS', 'WHATSAPP', 'PLATFORM', 'GENERAL',
];

/* ---------- SECTION OWNERSHIP (handbook B7) ---------- */

export const listSectionOwners = async (req: Request, res: Response) => {
  requireAdmin(req);
  const rows = await prisma.sectionOwnership.findMany({
    include: { owner: { select: { id: true, name: true, role: true, avatarUrl: true } } },
  });
  const bySection = new Map(rows.map((r) => [r.section, r]));
  const items = SECTIONS.map((s) => {
    const r = bySection.get(s);
    return {
      section: s,
      owner:   r?.owner ?? null,
    };
  });
  return successResponse(res, 'Section owners retrieved', items);
};

export const setSectionOwner = async (req: Request, res: Response) => {
  requireAdmin(req);
  const section = req.params.section as Section;
  if (!SECTIONS.includes(section)) {
    throw new AppError('Unknown section', StatusCodes.BAD_REQUEST, 'INVALID_SECTION');
  }
  const ownerId = Number(req.body?.ownerId);
  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    throw new AppError('ownerId must be a positive integer', StatusCodes.BAD_REQUEST, 'INVALID_OWNER');
  }
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, name: true } });
  if (!owner) throw new AppError('User not found', StatusCodes.NOT_FOUND, 'USER_NOT_FOUND');

  const row = await prisma.sectionOwnership.upsert({
    where:  { section },
    create: { section, ownerId },
    update: { ownerId },
    include: { owner: { select: { id: true, name: true, role: true, avatarUrl: true } } },
  });

  return successResponse(res, `Section ${section} owner updated`, {
    section: row.section,
    owner:   row.owner,
  });
};

/* ---------- KB SWEEP (handbook B6) ---------- */

export const listKbCandidates = async (req: Request, res: Response) => {
  requireAdmin(req);
  const items = await prisma.post.findMany({
    where: {
      isUseCase: true,
      status:    'RESOLVED',
      sweptToKb: false,
    },
    orderBy: { updatedAt: 'asc' },
    take:    100,
    select: {
      id: true, postNumber: true, title: true, description: true,
      section: true, type: true, resolution: true,
      updatedAt: true,
      owner:  { select: { id: true, name: true } },
      author: { select: { id: true, name: true } },
    },
  });
  return successResponse(res, 'KB candidates retrieved', items);
};

/* ---------- KB NOMINATIONS (P5 · LLM-suggested Use Cases) ---------- */
// Scans recent RESOLVED posts, asks Groq which ones look like they became
// rules, and returns nominations. The lead flags graduation by hand — this
// endpoint never mutates.
export const kbNominations = async (req: Request, res: Response) => {
  requireAdmin(req);
  const nominations = await kbNominationService.nominateCandidates();
  return successResponse(res, 'KB nominations generated', nominations);
};

export const sweepToKb = async (req: Request, res: Response) => {
  requireAdmin(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Invalid post ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }
  const actorId = req.user!.id;
  const landedAt = typeof req.body?.landedAt === 'string' ? req.body.landedAt.slice(0, 500) : null;

  const post = await prisma.post.findUnique({
    where:  { id },
    select: { id: true, isUseCase: true, status: true, sweptToKb: true },
  });
  if (!post) throw new AppError('Post not found', StatusCodes.NOT_FOUND, 'POST_NOT_FOUND');
  if (!post.isUseCase || post.status !== 'RESOLVED') {
    throw new AppError('Only resolved Use Cases can be swept', StatusCodes.BAD_REQUEST, 'NOT_SWEEPABLE');
  }
  if (post.sweptToKb) {
    return successResponse(res, 'Already swept', { id, alreadySwept: true });
  }

  const now = new Date();
  const [updated] = await prisma.$transaction([
    prisma.post.update({
      where: { id },
      data:  { sweptToKb: true, sweptAt: now },
      select: { id: true, sweptToKb: true, sweptAt: true },
    }),
    prisma.auditLog.create({
      data: {
        actorId,
        postId: id,
        actionType: 'KB_SWEPT',
        entityType: 'POST',
        entityId:   id,
        metadata: landedAt ? { landedAt } : undefined,
      },
    }),
  ]);

  return successResponse(res, 'Post swept to KB', updated);
};
