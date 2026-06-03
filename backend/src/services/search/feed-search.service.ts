import { Prisma } from '@prisma/client';
import prisma from '../../config/db';
import { decodeCursor, encodeCursor } from '../../utils/pagination.util';

export type FeedSearchParams = {
  cursor?: string;
  limit?: number;
  category?: any;
  status?: any;
  priority?: any;
  assigneeId?: number;
  departmentId?: number;
  search?: string;
  sortBy?: 'createdAt' | 'priority' | 'status'; // strictly whitelisted
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
      category, 
      status, 
      priority, 
      assigneeId, 
      departmentId, 
      search, 
      sortBy = 'createdAt',
      startDate,
      endDate
    } = params;

    const cursorObj = params.cursor ? decodeCursor(params.cursor) : undefined;

    // Build exactly the WHERE clause needed
    const where: Prisma.PostWhereInput = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (departmentId) where.departmentId = departmentId;
    
    // Date ranges
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    if (search) {
      // Future FTS replacement target:
      // This will become a tsvector query (e.g. @@to_tsquery)
      // instead of expensive ILIKE scans.
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const maxLimit = Math.min(limit, 50);

    // Whitelisted sort order
    const orderBy: Prisma.PostOrderByWithRelationInput[] = [];
    if (sortBy === 'priority') orderBy.push({ priority: 'desc' });
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
        title: true,
        category: true,
        status: true,
        priority: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        departmentId: true,
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        assignee: {
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
