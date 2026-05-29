import { Request, Response } from 'express';
import prisma from '../config/db';

/* ---------- GET USER NOTIFICATIONS ---------- */
export const getUserNotifications = async (req: Request, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return res.json(notifications);
};

/* ---------- MARK SINGLE AS READ ---------- */
export const markAsRead = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) return res.status(404).json({ message: 'Notification not found' });
  if (notif.userId !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });
  return res.json(updated);
};

/* ---------- MARK ALL AS READ ---------- */
export const markAllAsRead = async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, read: false },
    data: { read: true },
  });
  return res.json({ message: 'All notifications marked as read' });
};
