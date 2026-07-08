import prisma from '../../config/db';
import { Prisma } from '@prisma/client';
import { logger } from '../../infrastructure/observability/logger';
import { embeddingProvider } from '../embedding';

// Handbook Phase 2 · P4 — semantic search over pgvector.
// Authorization filtering (departmentId) MUST happen BEFORE the vector query.
// Never retrieve embeddings globally and filter post-hoc.

export interface SemanticHit {
  id: number;
  postNumber: string | null;
  title: string;
  similarity: number;
}

class SemanticSearchService {
  /**
   * Rank Post rows by cosine similarity to `query`. Optional `departmentId`
   * clamps the search to that department. Returns [] when embeddings are
   * disabled (noop provider) or the query is empty.
   */
  public async searchPosts(params: {
    query: string;
    limit?: number;
    departmentId?: number;
    excludePostId?: number;
  }): Promise<SemanticHit[]> {
    if (!embeddingProvider.enabled) return [];
    const q = params.query.trim();
    if (!q) return [];
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 50);

    const vector = await embeddingProvider.embed(q);
    if (!vector) return [];

    // pgvector needs the embedding as a literal string like `[0.1,0.2,...]`.
    const vectorLiteral = `[${vector.join(',')}]`;

    // Two variants to keep the query planner honest — `id = ANY(...)` when
    // scoped, unconditional when not.
    if (typeof params.departmentId === 'number') {
      return prisma.$queryRaw<SemanticHit[]>`
        SELECT id, "postNumber", title,
               1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
        FROM "Post"
        WHERE embedding IS NOT NULL
          AND "departmentId" = ${params.departmentId}
          AND (${params.excludePostId ?? null}::int IS NULL OR id <> ${params.excludePostId ?? null}::int)
        ORDER BY embedding <=> ${vectorLiteral}::vector
        LIMIT ${limit}
      `;
    }
    return prisma.$queryRaw<SemanticHit[]>`
      SELECT id, "postNumber", title,
             1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "Post"
      WHERE embedding IS NOT NULL
        AND (${params.excludePostId ?? null}::int IS NULL OR id <> ${params.excludePostId ?? null}::int)
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${limit}
    `;
  }

  /**
   * Return posts similar to a given post (by its stored embedding). Cheaper
   * than re-embedding: reuses the row's vector as the query.
   */
  public async findSimilarByPostId(postId: number, limit = 5): Promise<SemanticHit[]> {
    if (!embeddingProvider.enabled) return [];
    const cap = Math.min(Math.max(limit, 1), 20);
    // A single raw SQL that filters + orders by cosine distance against the
    // stored vector of the source post. If the source has no embedding, the
    // result set is empty (the subquery returns null, `<=> null` is null).
    return prisma.$queryRaw<SemanticHit[]>`
      SELECT id, "postNumber", title,
             1 - (embedding <=> (SELECT embedding FROM "Post" WHERE id = ${postId})) AS similarity
      FROM "Post"
      WHERE embedding IS NOT NULL
        AND id <> ${postId}
        AND (SELECT embedding FROM "Post" WHERE id = ${postId}) IS NOT NULL
      ORDER BY embedding <=> (SELECT embedding FROM "Post" WHERE id = ${postId})
      LIMIT ${cap}
    `;
  }

  /**
   * Fire-and-forget: compute and persist an embedding for a post. Safe to
   * call from a controller after create/update — never surfaces errors.
   */
  public async indexPostAsync(postId: number, text: string): Promise<void> {
    if (!embeddingProvider.enabled) return;
    try {
      const vec = await embeddingProvider.embed(text);
      if (!vec) return;
      const literal = `[${vec.join(',')}]`;
      // Prisma's Unsupported column requires raw casting.
      await prisma.$executeRaw(
        Prisma.sql`UPDATE "Post" SET embedding = ${literal}::vector WHERE id = ${postId}`,
      );
    } catch (err) {
      logger.warn({ err, postId }, 'semantic-search: indexPostAsync failed');
    }
  }
}

export const semanticSearchService = new SemanticSearchService();
