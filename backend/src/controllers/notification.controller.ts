import { Request, Response } from 'express';
import prisma from '../config/db';
import { successResponse } from '../utils/response.util';

/* ---------- GET USER NOTIFICATIONS ---------- */
export const getMyNotifications = async (req: Request, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  return successResponse(res, 'Notifications retrieved', notifications);
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
