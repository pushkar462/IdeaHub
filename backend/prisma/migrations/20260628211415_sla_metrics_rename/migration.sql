/*
  Warnings:

  - You are about to drop the column `totalTimeBlocked` on the `WorkflowMetrics` table. All the data in the column will be lost.
  - You are about to drop the column `totalTimeInProgress` on the `WorkflowMetrics` table. All the data in the column will be lost.
  - You are about to drop the column `totalTimeInReview` on the `WorkflowMetrics` table. All the data in the column will be lost.
  - You are about to drop the column `totalTimeInTodo` on the `WorkflowMetrics` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WorkflowMetrics" DROP COLUMN "totalTimeBlocked",
DROP COLUMN "totalTimeInProgress",
DROP COLUMN "totalTimeInReview",
DROP COLUMN "totalTimeInTodo",
ADD COLUMN     "totalTimeInDiscussing" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTimeInOpen" INTEGER NOT NULL DEFAULT 0;
