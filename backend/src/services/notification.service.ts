import prisma from '../config/db';

export const createNotification = async (
  userId: number,
  type: string,
  message: string
) => {
  await prisma.notification.create({
    data: { userId, type, message },
  });
};
