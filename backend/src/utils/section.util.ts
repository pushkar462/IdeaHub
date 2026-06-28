import { Section, Role } from '@prisma/client';
import prisma from '../config/db';

export async function getSectionOwner(section: Section): Promise<number | null> {
  const ownership = await prisma.sectionOwnership.findUnique({
    where: { section }
  });

  if (ownership) {
    return ownership.ownerId;
  }

  // Fallback to FOUNDER if no owner configured
  const founder = await prisma.user.findFirst({
    where: { role: Role.FOUNDER }
  });

  return founder ? founder.id : null;
}
