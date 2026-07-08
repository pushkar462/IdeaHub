-- Athwart Loop · Handbook v5 · Increment I4
-- Optional GitHub-issue handoff link on resolved Problems / Ideas (handbook C6).
-- Nullable — only set when the resolver captured a build handoff URL.

ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "buildIssueUrl" TEXT;
