import prisma from './src/config/db';

async function main() {
  const userId = 1;
  try {
    const r1 = await prisma.post.count({ where: { status: { not: 'DONE' } } });
    console.log('r1', r1);
    const r2 = await prisma.post.count({ where: { assigneeId: userId, status: { not: 'DONE' } } });
    console.log('r2', r2);
    const r3 = await prisma.post.count({ where: { status: 'IN_REVIEW' } });
    console.log('r3', r3);
    const r4 = await prisma.post.count({
      where: {
        status: 'DONE',
        OR: [{ authorId: userId }, { assigneeId: userId }],
      },
    });
    console.log('r4', r4);
  } catch (err) {
    console.error(err);
  }
}
main().finally(() => prisma.$disconnect());
