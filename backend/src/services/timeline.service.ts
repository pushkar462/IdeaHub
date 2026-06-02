import prisma from '../config/db';
import { decodeCursor, buildPaginatedResult } from '../utils/pagination.util';
import { AppError } from '../utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { AuditLog } from '@prisma/client';

export type ActivityTimelineDTO = {
  id: string;
  actionType: string;
  entityType: string;
  metadata: any;
  createdAt: Date;
  actor: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
};

export class TimelineService {
  /**
   * Fetches paginated activity timeline for a given post.
   * Ensures the user is authorized to view this timeline by validating department ownership.
   */
  public async getPostTimeline(
    postId: number,
    userId: number,
    cursor?: string,
    limit: number = 20
  ) {
    // 1. Authorization: Fetch the post and user's department
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { departmentId: true }
    });

    if (!post) {
      throw new AppError('Post not found', StatusCodes.NOT_FOUND, 'POST_NOT_FOUND');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true, role: true }
    });

    const isGlobalAdmin = user?.role === 'ADMIN' || user?.role === 'FOUNDER';
    if (!isGlobalAdmin && user?.departmentId !== post.departmentId) {
      throw new AppError('Forbidden. You cannot view timelines outside your department.', StatusCodes.FORBIDDEN, 'FORBIDDEN_TIMELINE');
    }

    // 2. Fetch Audit Logs
    const cursorObj = cursor ? decodeCursor(cursor) : null;
    const maxLimit = Math.min(limit, 50);

    const logs = await prisma.auditLog.findMany({
      where: { postId },
      take: maxLimit + 1,
      ...(cursorObj
        ? {
            cursor: {
              id: cursorObj.id as string, // CUIDs are strings
            },
            skip: 1,
          }
        : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        actor: { select: { id: true, name: true, avatarUrl: true } }
      }
    });

    // 3. Reuse common pagination utilities
    const paginated = buildPaginatedResult(logs, maxLimit, (log) => ({ createdAt: log.createdAt, id: log.id }));

    // 4. Map to DTO (Never expose raw audit logs directly)
    const items: ActivityTimelineDTO[] = paginated.results.map((log) => ({
      id: log.id,
      actionType: log.actionType,
      entityType: log.entityType,
      metadata: log.metadata,
      createdAt: log.createdAt,
      actor: log.actor
    }));

    return {
      items,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
    };
  }
}

export const timelineService = new TimelineService();
