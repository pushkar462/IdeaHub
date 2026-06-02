import prisma from '../../config/db';
import { AppError } from '../../utils/AppError';
import { StatusCodes } from 'http-status-codes';

const MAX_ANALYTICS_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export class ProductivityAnalyticsService {
  /**
   * Retrieves department productivity metrics bounded by a date range.
   * Prevents expensive full table scans.
   */
  public async getDepartmentProductivity(departmentId: number, startDate: Date, endDate: Date) {
    this.validateDateRange(startDate, endDate);

    // 1. Fetch Aggregated Metrics via Prisma Aggregation
    const aggregations = await prisma.workflowMetrics.aggregate({
      where: {
        post: {
          departmentId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      },
      _avg: {
        totalTimeInTodo: true,
        totalTimeInProgress: true,
        totalTimeInReview: true,
        totalTimeBlocked: true
      },
      _count: {
        postId: true
      }
    });

    // 2. Fetch Completion Stats
    const completedCount = await prisma.workflowMetrics.count({
      where: {
        completedAt: { not: null },
        post: {
          departmentId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }
    });

    // 3. Fetch Assignee Workload Distribution
    const assigneeWorkloadRaw = await prisma.post.groupBy({
      by: ['assigneeId'],
      where: {
        departmentId,
        status: { notIn: ['DONE', 'BACKLOG'] },
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        assigneeId: { not: null }
      },
      _count: {
        id: true
      }
    });

    // Format workload mapping safely
    const workloadDistribution = assigneeWorkloadRaw.map(stat => ({
      assigneeId: stat.assigneeId,
      activeTasks: stat._count.id
    }));

    return {
      departmentId,
      timeWindow: { startDate, endDate },
      throughput: {
        totalIssues: aggregations._count.postId,
        completedIssues: completedCount,
      },
      averageTimes: {
        todo: aggregations._avg.totalTimeInTodo,
        inProgress: aggregations._avg.totalTimeInProgress,
        inReview: aggregations._avg.totalTimeInReview,
        blocked: aggregations._avg.totalTimeBlocked,
      },
      workloadDistribution
    };
  }

  private validateDateRange(startDate: Date, endDate: Date) {
    const diff = endDate.getTime() - startDate.getTime();
    if (diff < 0) {
      throw new AppError('End date must be after start date', StatusCodes.BAD_REQUEST, 'INVALID_DATE_RANGE');
    }
    if (diff > MAX_ANALYTICS_WINDOW_MS) {
      throw new AppError('Analytics query cannot exceed 90 days', StatusCodes.BAD_REQUEST, 'ANALYTICS_WINDOW_EXCEEDED');
    }
  }
}

export const productivityAnalyticsService = new ProductivityAnalyticsService();
