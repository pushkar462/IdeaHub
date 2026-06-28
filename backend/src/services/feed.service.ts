import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { FeedCardDTO, CommentDTO, mapToFeedCardDTO, mapToCommentDTO } from '../dtos/feed.dto';
import { CursorObj, buildPaginatedResult, encodeCursor, decodeCursor } from '../utils/pagination.util';

export type PaginatedFeedResult = {
  items: FeedCardDTO[];
  nextCursor?: string | null;
  hasMore: boolean;
  total: number;
};

export type PaginatedCommentResult = {
  items: CommentDTO[];
  nextCursor?: string;
  hasMore: boolean;
};

export class FeedService {
  /**
   * Fetch the main chronological post feed
   */
  public async getFeed(params: {
    cursor?: string;
    limit?: number;
    type?: any;
    section?: any;
    status?: any;
    ownerId?: number;
    authorId?: number;
    departmentId?: number;
    search?: string;
  }): Promise<PaginatedFeedResult> {
    const { cursor: nextCursor, limit = 20, type, section, status, ownerId, authorId, departmentId, search } = params;

    const cursorObj = nextCursor ? decodeCursor(nextCursor) : undefined;
    if (nextCursor && !cursorObj) throw new AppError('Invalid nextCursor format', 400);

    const where: any = {};
    if (type) where.type = type;
    if (section) where.section = section;
    if (status && status !== 'ALL') {
      where.status = status;
    } else if (status !== 'ALL') {
      // By default, exclude archived/completed posts from the main feed
      where.status = { not: 'RESOLVED' };
    }
    if (ownerId) where.ownerId = ownerId;
    if (authorId) where.authorId = authorId;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      const formattedSearch = search.trim().split(/\s+/).join(' | ');
      where.OR = [
        { title: { search: formattedSearch } },
        { description: { search: formattedSearch } },
      ];
    }

    const maxLimit = Math.min(limit, 50);

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        take: maxLimit + 1,
        skip: cursorObj ? 1 : 0,
        cursor: cursorObj
          ? {
              createdAt_id: {
                createdAt: cursorObj.createdAt,
                id: Number(cursorObj.id),
              },
            }
          : undefined,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          postNumber: true,
          title: true,
          description: true,
          type: true,
          section: true,
          status: true,
          resolution: true,
          createdAt: true,
          updatedAt: true,
          departmentId: true,
          authorId: true,
          author: {
            select: { id: true, name: true, role: true, avatarUrl: true },
          },
          owner: {
            select: { id: true, name: true, role: true, avatarUrl: true },
          },
          attachments: {
            select: { id: true, url: true, filename: true, mimeType: true },
          },
          department: {
            select: { id: true, name: true, slug: true },
          },
          workflowMetrics: {
            select: { slaStatus: true },
          },
          _count: {
            select: { comments: true, reactions: true },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    const hasMore = items.length > maxLimit;
    const paginatedItems = hasMore ? items.slice(0, maxLimit) : items;
    const nextCursorString =
      paginatedItems.length > 0
        ? encodeCursor({
            createdAt: paginatedItems[paginatedItems.length - 1].createdAt,
            id: paginatedItems[paginatedItems.length - 1].id,
          })
        : null;

    return {
      items: paginatedItems.map(mapToFeedCardDTO as any),
      nextCursor: nextCursorString,
      hasMore,
      total,
    };
  }

  /**
   * Fetch top-level comments for a specific post
   */
  public async getPostComments(postId: number, cursorStr: string | undefined, limit: number): Promise<PaginatedCommentResult> {
    const cursor = cursorStr ? decodeCursor(cursorStr) : undefined;
    const args: any = {
      where: { postId, parentId: null },
      take: limit + 1,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      include: {
        author: { select: { id: true, name: true, role: true, avatarUrl: true } },
        _count: { select: { replies: true } },
      }
    };

    if (cursor) {
      args.cursor = {
        createdAt_id: {
          createdAt: cursor.createdAt,
          id: Number(cursor.id),
        },
      };
      args.skip = 1;
    }

    const comments = await prisma.comment.findMany(args);

    const paginated = buildPaginatedResult(comments, limit, (c: any) => ({ createdAt: c.createdAt, id: c.id }));

    return {
      items: paginated.results.map(mapToCommentDTO as any),
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
    };
  }

  /**
   * Fetch replies for a specific comment
   */
  public async getCommentReplies(parentId: number, cursorStr: string | undefined, limit: number): Promise<PaginatedCommentResult> {
    const cursor = cursorStr ? decodeCursor(cursorStr) : undefined;
    const args: any = {
      where: { parentId },
      take: limit + 1,
      orderBy: [
        { createdAt: 'asc' }, // Usually replies are ascending (oldest first)
        { id: 'asc' }
      ],
      include: {
        author: { select: { id: true, name: true, role: true, avatarUrl: true } },
        _count: { select: { replies: true } },
      }
    };

    if (cursor) {
      args.cursor = {
        createdAt_id: {
          createdAt: cursor.createdAt,
          id: Number(cursor.id),
        },
      };
      args.skip = 1;
    }

    const replies = await prisma.comment.findMany(args);

    const paginated = buildPaginatedResult(replies, limit, (c: any) => ({ createdAt: c.createdAt, id: c.id }));

    return {
      items: paginated.results.map(mapToCommentDTO as any),
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
    };
  }
}

export const feedService = new FeedService();
