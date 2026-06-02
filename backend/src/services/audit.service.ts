import { AuditActionType, AuditEntityType, Prisma } from '@prisma/client';
import prisma from '../config/db';

/**
 * Type-safe definition for bounded metadata deltas.
 * We strictly forbid storing full entity snapshots or large text bodies.
 */
export type StatusDeltaMetadata = {
  from: string;
  to: string;
};

export type AssignmentDeltaMetadata = {
  fromAssigneeId: number | null;
  toAssigneeId: number | null;
};

/**
 * The Audit Service is responsible for constructing immutable audit records.
 * 
 * ARCHITECTURE RULE:
 * This service returns Prisma.PrismaPromise objects so that they can be 
 * executed inside the SAME `prisma.$transaction` as the actual state mutation.
 * This guarantees that an audit log is NEVER written if the state change fails,
 * and state NEVER changes without an audit log.
 */
export class AuditService {
  /**
   * Generates a Prisma operation to log a workflow status transition.
   */
  public buildStatusChangeAudit(
    actorId: number,
    postId: number,
    delta: StatusDeltaMetadata
  ): Prisma.PrismaPromise<any> {
    return prisma.auditLog.create({
      data: {
        actorId,
        postId,
        actionType: AuditActionType.STATUS_CHANGED,
        entityType: AuditEntityType.WORKFLOW,
        entityId: postId,
        metadata: delta as any, // Prisma Json type
      }
    });
  }

  /**
   * Generates a Prisma operation to log an assignment change.
   */
  public buildAssignmentChangeAudit(
    actorId: number,
    postId: number,
    delta: AssignmentDeltaMetadata
  ): Prisma.PrismaPromise<any> {
    const actionType = delta.toAssigneeId ? AuditActionType.ASSIGNED : AuditActionType.UNASSIGNED;
    return prisma.auditLog.create({
      data: {
        actorId,
        postId,
        actionType,
        entityType: AuditEntityType.POST,
        entityId: postId,
        metadata: delta as any,
      }
    });
  }

  // Future helpers: buildPostCreatedAudit, buildCommentCreatedAudit...
}

export const auditService = new AuditService();
