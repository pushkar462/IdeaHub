import { Request, Response } from 'express';
import prisma from '../config/db';
import { successResponse } from '../utils/response.util';

/* ---------- GET USER NOTIFICATIONS ---------- */
export const getMyNotifications = async (req: Request, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    include: {
      actor: { select: { name: true } },
      post: { select: { title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = notifications.map(n => {
    let message = 'You have a new notification';
    const actorName = n.actor?.name || 'Someone';
    
    switch (n.type) {
      case 'MENTION':
        message = `${actorName} mentioned you in a comment.`;
        break;
      case 'ASSIGNMENT':
        message = `${actorName} assigned you to a post.`;
        break;
      case 'COMMENT_REPLY':
        message = `${actorName} replied to your comment.`;
        break;
      case 'POST_UPDATE':
        message = `${actorName} updated a post.`;
        break;
    }

    return {
      id: n.id,
      type: n.type,
      message,
      read: n.readAt !== null,
      createdAt: n.createdAt,
      userId: n.userId,
    };
  });

  return successResponse(res, 'Notifications retrieved', formatted);
};

/* ---------- MARK NOTIFICATION AS READ ---------- */
export const markAsRead = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const notif = await prisma.notification.findUnique({ where: { id } });

  if (!notif) return res.status(404).json({ message: 'Notification not found' });
  if (notif.userId !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });

  const notification = await prisma.notification.update({
    where: { id: Number(req.params.id) },
    data: { readAt: new Date() },
  });

  return successResponse(res, 'Notification marked as read', notification);
};

/* ---------- MARK ALL AS READ ---------- */
export const markAllAsRead = async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  return successResponse(res, 'All notifications marked as read', { marked: true });
};
