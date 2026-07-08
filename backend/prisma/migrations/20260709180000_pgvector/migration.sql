-- Athwart Loop · Handbook v5 · Phase 2 · P4 · pgvector infrastructure
-- Enables the vector extension and adds a nullable 1536-dim embedding column
-- on Post plus an HNSW index for cosine-distance nearest-neighbour queries.
-- The embedding source is pluggable (see backend/src/services/embedding/*).
-- Column is nullable — until an EmbeddingProvider is enabled, posts stay unindexed.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- HNSW gives good recall/latency at our scale. `ef_construction=64, m=16` are
-- sensible defaults for corpora under ~1M rows. Cosine ops match how OpenAI's
-- text-embedding-3-* models are consumed.
CREATE INDEX IF NOT EXISTS "Post_embedding_hnsw_idx"
  ON "Post"
  USING hnsw ("embedding" vector_cosine_ops);
