import { PrismaClient, NotificationType } from '@prisma/client';
import { eventBus, INTERNAL_EVENTS } from './events/internal.emitter';

type CreateNotificationDTO = {
  userId: number;
  type: NotificationType;
  metadata?: any;
  actorId?: number;
  postId?: number;
  commentId?: number;
};

export class NotificationService {
  /**
   * Standardizes creation of a single notification.
   * Accepts an optional transaction client to maintain consistency.
   */
  public async createNotification(
    dto: CreateNotificationDTO,
    txClient: any // Passing Prisma transaction client or default prisma
  ) {
    const db = txClient || require('../config/db').default;

    const notification = await db.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        metadata: dto.metadata || null,
        actorId: dto.actorId,
        postId: dto.postId,
        commentId: dto.commentId,
      },
    });

    // Emit internal event for real-time delivery
    eventBus.emit(INTERNAL_EVENTS.NOTIFICATION_CREATED, {
      userId: dto.userId,
      notification: {
        id: notification.id,
        type: notification.type,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
        actorId: notification.actorId,
        postId: notification.postId,
        commentId: notification.commentId,
      },
    });

    return notification;
  }
}

export const notificationService = new NotificationService();
