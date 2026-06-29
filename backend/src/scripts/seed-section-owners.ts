import { PrismaClient, Section, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting SectionOwnership seeding...');

  // Ensure FOUNDER exists
  let founder = await prisma.user.findFirst({ where: { role: Role.FOUNDER } });
  if (!founder) {
    founder = await prisma.user.create({
      data: {
        email: 'founder@athwartloop.com',
        passwordHash: 'hashed_password', // In real life, use proper hash
        name: 'System Founder',
        role: Role.FOUNDER
      }
    });
  }

  // Ensure AI_ML lead exists
  let aiLead = await prisma.user.findFirst({ where: { role: Role.AI_ML } });
  if (!aiLead) {
    aiLead = await prisma.user.create({
      data: {
        email: 'ai_lead@athwartloop.com',
        passwordHash: 'hashed_password',
        name: 'AI/ML Lead',
        role: Role.AI_ML
      }
    });
  }

  // Define routing table
  const routing = [
    { section: Section.PLATFORM, ownerId: aiLead.id },
    { section: Section.WHATSAPP, ownerId: aiLead.id },
    { section: Section.BILLS, ownerId: founder.id },
    { section: Section.INVOICING, ownerId: founder.id },
    { section: Section.CASES, ownerId: founder.id },
    { section: Section.PATIENTS, ownerId: founder.id },
    { section: Section.PARTNERS, ownerId: founder.id },
    { section: Section.HOSPITALS, ownerId: founder.id },
    { section: Section.DOCTORS, ownerId: founder.id },
    { section: Section.GENERAL, ownerId: founder.id },
  ];

  for (const route of routing) {
    await prisma.sectionOwnership.upsert({
      where: { section: route.section },
      update: { ownerId: route.ownerId },
      create: { section: route.section, ownerId: route.ownerId }
    });
  }

  console.log('SectionOwnership seeding complete.');
}

main()
  .catch(e => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
