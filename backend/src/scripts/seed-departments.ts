import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding departments...');

  const departments = [
    { name: 'Engineering', slug: 'engineering', description: 'Software Development & IT' },
    { name: 'Product', slug: 'product', description: 'Product Management & Design' },
    { name: 'Design', slug: 'design', description: 'UI/UX Design' },
    { name: 'Marketing', slug: 'marketing', description: 'Marketing & Sales' },
    { name: 'Operations', slug: 'operations', description: 'Operations & Support' }
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { slug: dept.slug },
      update: {},
      create: dept,
    });
  }

  console.log('Departments seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
