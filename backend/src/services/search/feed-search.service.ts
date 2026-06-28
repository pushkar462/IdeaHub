import { Prisma } from '@prisma/client';
import prisma from '../../config/db';
import { decodeCursor, encodeCursor } from '../../utils/pagination.util';

export type FeedSearchParams = {
  cursor?: string;
  limit?: number;
  type?: any;
  section?: any;
  status?: any;
  ownerId?: number;
  authorId?: number;
  departmentId?: number;
  search?: string;
  sortBy?: 'createdAt' | 'status'; // strictly whitelisted
  startDate?: Date; // Bounded to max 90 days
  endDate?: Date;
};

/**
 * Modular Search Layer for Feed.
 * Prepares architecture for future Postgres Full Text Search (FTS).
 */
export class FeedSearchService {
  public async searchFeed(params: FeedSearchParams) {
    const { 
      cursor, 
      limit = 20, 
      type, 
      section,
      status, 
      ownerId,
      authorId,
      departmentId, 
      search, 
      sortBy = 'createdAt',
      startDate,
      endDate
    } = params;

    const cursorObj = params.cursor ? decodeCursor(params.cursor) : undefined;

    // Build exactly the WHERE clause needed
    const where: Prisma.PostWhereInput = {};
    if (type) where.type = type;
    if (section) where.section = section;
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;
    if (authorId) where.authorId = authorId;
    if (departmentId) where.departmentId = departmentId;
    
    // Date ranges
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    if (search) {
      // Convert space-separated words to a Postgres tsquery string (e.g. "foo | bar")
      const formattedSearch = search.trim().split(/\s+/).join(' | ');
      where.OR = [
        { title: { search: formattedSearch } },
        { description: { search: formattedSearch } },
      ];
    }

    const maxLimit = Math.min(limit, 50);

    // Whitelisted sort order
    const orderBy: Prisma.PostOrderByWithRelationInput[] = [];
    if (sortBy === 'status') orderBy.push({ status: 'asc' });
    orderBy.push({ createdAt: 'desc' }); // Always fallback to chronological
    orderBy.push({ id: 'desc' }); // Tie-breaker

    // Bounded Payload (WorkflowCardDTO)
    const items = await prisma.post.findMany({
      where,
      take: maxLimit + 1,
      skip: cursorObj ? 1 : 0,
      cursor: cursorObj
        ? {
            createdAt_id: {
              createdAt: cursorObj.createdAt as Date,
              id: cursorObj.id as number,
            },
          }
        : undefined,
      orderBy,
      select: {
        id: true,
        postNumber: true,
        title: true,
        type: true,
        section: true,
        status: true,
        resolution: true,
        createdAt: true,
        updatedAt: true,
        departmentId: true,
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        owner: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: {
          select: { comments: true, reactions: true },
        },
      },
    });

    const hasMore = items.length > maxLimit;
    const paginatedItems = hasMore ? items.slice(0, maxLimit) : items;
    
    let nextCursor = null;
    if (paginatedItems.length > 0) {
      const last = paginatedItems[paginatedItems.length - 1];
      nextCursor = encodeCursor({ createdAt: last.createdAt, id: last.id });
    }

    return {
      items: paginatedItems,
      nextCursor,
      hasMore,
    };
  }
}

export const feedSearchService = new FeedSearchService();
