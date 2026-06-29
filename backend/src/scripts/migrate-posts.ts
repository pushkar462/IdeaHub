import { PrismaClient, Section, Resolution, Status } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration...');

  const posts = await prisma.post.findMany();

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    
    // Generate postNumber: LOOP-YYYY-NNNN
    const year = post.createdAt.getFullYear();
    const seq = String(i + 1).padStart(4, '0');
    const postNumber = `LOOP-${year}-${seq}`;

    // Resolution backfill if RESOLVED
    let resolution = post.resolution;
    if (post.status === Status.RESOLVED && !resolution) {
      resolution = Resolution.FIXED;
    }

    await prisma.post.update({
      where: { id: post.id },
      data: {
        postNumber,
        section: post.section || Section.GENERAL, // default if not set
        resolution
      }
    });
  }

  console.log(`Migration complete. Updated ${posts.length} posts.`);
}

main()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
