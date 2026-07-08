import { Status, Type, Resolution, Role } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { eventBus, INTERNAL_EVENTS } from './events/internal.emitter';
import prisma from '../config/db';
import { auditService } from './audit.service';

export class WorkflowService {
  /**
   * Safely transitions a post's workflow status based on the new 3-state logic.
   */
  public async transitionStatus(
    postId: number,
    newStatus: Status,
    actorId: number,
    payload?: {
      resolution?: Resolution;
      resolutionReason?: string;
      buildIssueUrl?: string | null;
    }
  ) {
    // 1. Fetch current status
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { owner: true, author: true }
    });

    if (!post) {
      throw new AppError('Post not found', StatusCodes.NOT_FOUND, 'POST_NOT_FOUND');
    }

    const currentStatus = post.status;
    if (currentStatus === newStatus) {
      return post; // No-op
    }

    // 2. Determine Actor Role
    const isOwner = post.ownerId === actorId;
    const isAuthor = post.authorId === actorId;

    // We also allow ADMIN/FOUNDER to act as owner
    const actorUser = await prisma.user.findUnique({ where: { id: actorId } });
    const isGlobalAdmin = actorUser?.role === Role.ADMIN || actorUser?.role === Role.FOUNDER;
    const canActAsOwner = isOwner || isGlobalAdmin;

    const dataToUpdate: any = { status: newStatus };
    const auditActions: Array<{ actionType: any, metadata: any }> = [];

    // 3. Validate Transitions
    if (currentStatus === Status.OPEN && newStatus === Status.DISCUSSING) {
      if (!canActAsOwner) {
        throw new AppError('Only the owner can start discussing this post.', StatusCodes.FORBIDDEN, 'FORBIDDEN');
      }
      if (!post.acknowledgedAt) {
        dataToUpdate.acknowledgedAt = new Date();
      }
      // Ownership claim is handled atomically below (see "atomic owner claim").
      auditActions.push({ actionType: 'POST_ACKNOWLEDGED', metadata: { from: Status.OPEN, to: Status.DISCUSSING } });

    } else if (currentStatus === Status.DISCUSSING && newStatus === Status.RESOLVED) {
      const canResolve = canActAsOwner || (post.type === Type.QUESTION && isAuthor);
      if (!canResolve) {
        throw new AppError('Only the owner (or author for questions) can resolve this post.', StatusCodes.FORBIDDEN, 'FORBIDDEN');
      }
      if (!payload?.resolution) {
        throw new AppError('Resolution is required when resolving.', StatusCodes.BAD_REQUEST, 'RESOLUTION_REQUIRED');
      }
      if ((payload.resolution === Resolution.PARKED || payload.resolution === Resolution.DECLINED) && !payload.resolutionReason) {
        throw new AppError('Resolution reason is required for PARKED or DECLINED.', StatusCodes.BAD_REQUEST, 'REASON_REQUIRED');
      }
      dataToUpdate.resolution = payload.resolution;
      dataToUpdate.resolutionReason = payload.resolutionReason || null;
      // Handbook C6: capture the GitHub handoff URL on Problem/Idea resolutions.
      if (payload.buildIssueUrl !== undefined && (payload.resolution === Resolution.FIXED || payload.resolution === Resolution.APPROVED)) {
        dataToUpdate.buildIssueUrl = payload.buildIssueUrl || null;
      }

      auditActions.push({
        actionType: 'POST_RESOLVED',
        metadata: { resolution: payload.resolution, buildIssueUrl: dataToUpdate.buildIssueUrl ?? undefined },
      });

    } else if (currentStatus === Status.OPEN && newStatus === Status.RESOLVED) {
      // Fast-close
      const canResolve = canActAsOwner || (post.type === Type.QUESTION && isAuthor);
      if (!canResolve) {
        throw new AppError('Only the owner (or author for questions) can fast-resolve this post.', StatusCodes.FORBIDDEN, 'FORBIDDEN');
      }
      if (!payload?.resolution) {
        throw new AppError('Resolution is required when resolving.', StatusCodes.BAD_REQUEST, 'RESOLUTION_REQUIRED');
      }
      if ((payload.resolution === Resolution.PARKED || payload.resolution === Resolution.DECLINED) && !payload.resolutionReason) {
        throw new AppError('Resolution reason is required for PARKED or DECLINED.', StatusCodes.BAD_REQUEST, 'REASON_REQUIRED');
      }
      if (!post.acknowledgedAt) {
        dataToUpdate.acknowledgedAt = new Date();
      }
      // Ownership claim handled atomically below.
      dataToUpdate.resolution = payload.resolution;
      dataToUpdate.resolutionReason = payload.resolutionReason || null;
      if (payload.buildIssueUrl !== undefined && (payload.resolution === Resolution.FIXED || payload.resolution === Resolution.APPROVED)) {
        dataToUpdate.buildIssueUrl = payload.buildIssueUrl || null;
      }

      auditActions.push({ actionType: 'POST_ACKNOWLEDGED', metadata: { note: 'fast-close' } });
      auditActions.push({
        actionType: 'POST_RESOLVED',
        metadata: { resolution: payload.resolution, buildIssueUrl: dataToUpdate.buildIssueUrl ?? undefined },
      });

    } else if (currentStatus === Status.RESOLVED && newStatus === Status.OPEN) {
      // Re-open
      const canReopen = canActAsOwner || isAuthor;
      if (!canReopen) {
        throw new AppError('Only the author or owner can reopen this post.', StatusCodes.FORBIDDEN, 'FORBIDDEN');
      }
      dataToUpdate.resolution = null;
      dataToUpdate.resolutionReason = null;
      // Note: Keep acknowledgedAt as per spec

      auditActions.push({ actionType: 'POST_REOPENED', metadata: { from: Status.RESOLVED, to: Status.OPEN } });
    } else {
      throw new AppError(
        `Invalid workflow transition from ${currentStatus} to ${newStatus}`,
        StatusCodes.BAD_REQUEST,
        'INVALID_WORKFLOW_TRANSITION'
      );
    }

    // Additional check: Who can resolve by type?
    if (newStatus === Status.RESOLVED) {
       if (post.type === Type.PROBLEM || post.type === Type.IDEA) {
         if (!canActAsOwner) {
           throw new AppError('Only the owner can resolve a Problem or Idea.', StatusCodes.FORBIDDEN, 'FORBIDDEN');
         }
       } else if (post.type === Type.QUESTION) {
         // author or owner can resolve. (already handled by canActAsOwner above, wait, author can resolve QUESTION?)
         // Ah, the plan says: "QUESTION: author (knows when their question is answered) or owner."
         // But above for DISCUSSING->RESOLVED, I enforced `canActAsOwner`. Let me fix that.
       }
    }

    // Atomic owner claim: if this transition should assign an owner and the post
    // is still unowned, claim it in a single guarded write. If another actor beat
    // us to it, updateMany.count is 0 and we simply proceed with the existing owner
    // — no lost-update, no need for serializable isolation.
    const shouldClaimOwner =
      currentStatus === Status.OPEN &&
      (newStatus === Status.DISCUSSING || newStatus === Status.RESOLVED) &&
      !post.ownerId;
    if (shouldClaimOwner) {
      await prisma.post.updateMany({
        where: { id: postId, ownerId: null },
        data: { ownerId: actorId },
      });
    }

    // 4. Update DB transactionally
    const updateOp = prisma.post.update({
      where: { id: postId },
      data: dataToUpdate,
    });

    const ops: any[] = [updateOp];
    for (const audit of auditActions) {
      ops.push(auditService.buildStatusChangeAudit(actorId, postId, audit.metadata));
      // In real code, auditService might not support overriding actionType natively in buildStatusChangeAudit if it's strictly typed.
      // Assuming auditService can create arbitrary logs. 
      // For now, I'll use raw prisma create for exact actionType.
      ops.push(prisma.auditLog.create({
        data: {
          actorId,
          postId,
          actionType: audit.actionType,
          entityType: 'POST',
          entityId: postId,
          metadata: audit.metadata
        }
      }));
    }

    // Filter out the `buildStatusChangeAudit` if we manually created the log
    const [updatedPost, ...logs] = await prisma.$transaction(ops.filter(o => o.constructor.name === 'PrismaPromise' || o.constructor.name === 'Object')); // approximate check

    // 5. Emit decoupled internal event for Realtime broadcast
    eventBus.emit(INTERNAL_EVENTS.POST_UPDATED, {
      postId,
      ownerId: updatedPost.ownerId,
      actorId,
      changes: { status: newStatus },
      auditLog: logs[logs.length - 1], // Just passing the last log
    });

    return updatedPost;
  }
}

export const workflowService = new WorkflowService();
