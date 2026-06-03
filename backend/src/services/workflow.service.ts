import { WorkflowStatus } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { eventBus, INTERNAL_EVENTS } from './events/internal.emitter';
import prisma from '../config/db';
import { auditService } from './audit.service';

export class WorkflowService {
  /**
   * Deterministic transition rules for Workflow states.
   * Key: Current Status, Value: Array of allowed Next Statuses
   */
  private readonly TRANSITION_MAP: Record<WorkflowStatus, WorkflowStatus[]> = {
    [WorkflowStatus.BACKLOG]: [WorkflowStatus.TODO, WorkflowStatus.DONE],
    [WorkflowStatus.TODO]: [WorkflowStatus.IN_PROGRESS, WorkflowStatus.BACKLOG, WorkflowStatus.DONE],
    [WorkflowStatus.IN_PROGRESS]: [WorkflowStatus.IN_REVIEW, WorkflowStatus.BLOCKED, WorkflowStatus.TODO],
    [WorkflowStatus.IN_REVIEW]: [WorkflowStatus.DONE, WorkflowStatus.IN_PROGRESS],
    [WorkflowStatus.BLOCKED]: [WorkflowStatus.IN_PROGRESS, WorkflowStatus.TODO, WorkflowStatus.BACKLOG],
    [WorkflowStatus.DONE]: [WorkflowStatus.IN_PROGRESS], // Reopening
  };

  /**
   * Safely transitions a post's workflow status if mathematically allowed.
   */
  public async transitionStatus(
    postId: number,
    newStatus: WorkflowStatus,
    actorId: number
  ) {
    // 1. Fetch current status
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { status: true, departmentId: true, assigneeId: true },
    });

    if (!post) {
      throw new AppError('Post not found', StatusCodes.NOT_FOUND, 'POST_NOT_FOUND');
    }

    const currentStatus = post.status;

    // 2. Validate Transition
    if (currentStatus !== newStatus) {
      const allowedNext = this.TRANSITION_MAP[currentStatus];
      if (!allowedNext.includes(newStatus)) {
        throw new AppError(
          `Invalid workflow transition from ${currentStatus} to ${newStatus}`,
          StatusCodes.BAD_REQUEST,
          'INVALID_WORKFLOW_TRANSITION'
        );
      }
    }

    // 3. Update DB transactionally with Audit Log
    const updateOp = prisma.post.update({
      where: { id: postId },
      data: { status: newStatus },
    });

    const auditOp = auditService.buildStatusChangeAudit(actorId, postId, {
      from: currentStatus,
      to: newStatus,
    });

    const [updatedPost, auditLog] = await prisma.$transaction([updateOp, auditOp]);

    // 4. Emit decoupled internal event for Realtime broadcast
    eventBus.emit(INTERNAL_EVENTS.POST_UPDATED, {
      postId,
      departmentId: post.departmentId,
      assigneeId: post.assigneeId,
      actorId,
      changes: { status: newStatus },
      auditLog, // Pass the raw audit log so socket.events can map it to a DTO
    });

    return updatedPost;
  }
}

export const workflowService = new WorkflowService();
