-- Athwart Loop · Handbook v5 · Phase 2 · P1 · Voting
-- One vote per user per post (composite PK enforces it). Voting UI surfaces
-- on Ideas but the model is post-agnostic — any post can be voted on if the
-- UI chooses to expose it.

CREATE TABLE IF NOT EXISTS "Vote" (
  "postId"    INTEGER     NOT NULL,
  "userId"    INTEGER     NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Vote_pkey"     PRIMARY KEY ("postId", "userId"),
  CONSTRAINT "Vote_post_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE,
  CONSTRAINT "Vote_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Vote_postId_idx" ON "Vote" ("postId");
CREATE INDEX IF NOT EXISTS "Vote_userId_idx" ON "Vote" ("userId");
