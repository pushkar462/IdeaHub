import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    include: {
      author: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream('posts_with_authors.pdf'));

  doc.fontSize(20).text(`Posts with Authors (Total: ${posts.length})`, { align: 'center' });
  doc.moveDown();

  posts.forEach((post, index) => {
    doc.fontSize(14).text(`Post #${index + 1}: ${post.title}`);
    doc.fontSize(12).text(`Author: ${post.author.name} (${post.author.email})`);
    doc.fontSize(10).text(`Status: ${post.status} | Section: ${post.section} | Type: ${post.type}`);
    doc.fontSize(10).text(`Content: ${post.description.replace(/\n/g, ' ').substring(0, 200)}${post.description.length > 200 ? '...' : ''}`);
    doc.moveDown();
  });

  doc.end();
  console.log(`Generated PDF with ${posts.length} posts.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
