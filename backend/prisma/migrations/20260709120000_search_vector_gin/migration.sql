-- Athwart Loop · Handbook v5 · Increment I3
-- Explicit tsvector column with a GIN index. Search-first (handbook C4) uses
-- title (weight A), linkedEntityId (B, simple config so IDs aren't stemmed),
-- and description (C). Generated STORED so it stays in sync automatically.

ALTER TABLE "Post"
  ADD COLUMN IF NOT EXISTS "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')),          'A') ||
    setweight(to_tsvector('simple',  coalesce("linkedEntityId", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("description", '')),    'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS "Post_searchVector_gin_idx"
  ON "Post" USING GIN ("searchVector");
