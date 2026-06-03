import { PrismaClient } from '@prisma/client';
import { updatePostStatusSchema } from './src/validations/v1/post.validation';
import { workflowService } from './src/services/workflow.service';
import jwt from 'jsonwebtoken';

async function run() {
  console.log("Testing Zod Schema:");
  const testPayload = { params: { id: "1" }, body: { status: "TODO" } };
  try {
    const res = updatePostStatusSchema.parse(testPayload);
    console.log("Zod parsing successful:", res);
  } catch (e) {
    console.error("Zod parsing failed:", e);
  }
}

run();
