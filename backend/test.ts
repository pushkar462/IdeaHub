import prisma from './src/config/db';

async function main() {
  const allPosts = await prisma.post.findMany({ select: { id: true, title: true, status: true, category: true } });
  console.log('All Posts:', allPosts);
  
  const notDoneCount = await prisma.post.count({ where: { status: { not: 'DONE' } } });
  console.log('Not DONE Count:', notDoneCount);
}
main().catch(console.error).finally(() => prisma.$disconnect());
