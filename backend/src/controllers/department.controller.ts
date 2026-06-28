import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { successResponse } from '../utils/response.util';
import { feedSearchService } from '../services/search/feed-search.service';

export const getDepartmentFeed = async (req: Request, res: Response) => {
  const slug = req.params.slug;
  const query = req.query as any;
  const user = req.user!;

  // 1. Resolve slug to Department ID
  const department = await prisma.department.findUnique({
    where: { slug },
    select: { id: true, name: true }
  });

  if (!department) {
    throw new AppError('Department not found', StatusCodes.NOT_FOUND, 'DEPARTMENT_NOT_FOUND');
  }

  // 2. Strict Authorization Boundary (Prevent Cross-Team Leakage)
  const isGlobalAdmin = user.role === 'ADMIN' || user.role === 'FOUNDER';
  const belongsToDepartment = (user as any).departmentId === department.id;

  if (!isGlobalAdmin && !belongsToDepartment) {
    throw new AppError('Forbidden. You do not have access to this department feed.', StatusCodes.FORBIDDEN, 'FORBIDDEN_DEPARTMENT');
  }

  // 3. Fetch Feed using advanced search module
  const result = await feedSearchService.searchFeed({
    cursor: query.cursor,
    limit: query.limit,
    departmentId: department.id,
    status: query.status,
    ownerId: query.assigneeId, // or ownerId
    search: query.search,
    sortBy: query.sortBy,
    startDate: query.startDate,
    endDate: query.endDate,
  });

  return successResponse(res, `Retrieved ${department.name} feed`, result.items, {
    nextCursor: result.nextCursor,
    hasMore: result.hasMore
  });
};

export const listDepartments = async (_req: Request, res: Response) => {
  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
    },
    orderBy: { name: 'asc' },
  });
  return successResponse(res, 'Departments retrieved successfully', departments);
};
