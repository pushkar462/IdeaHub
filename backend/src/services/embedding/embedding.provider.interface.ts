// Handbook Phase 2 · P4 — pluggable embedding provider.
// Loop stays standalone by default (noop). Ops can flip EMBED_PROVIDER to
// activate an external model without touching call sites.

export interface EmbeddingProvider {
  /** Vector length this provider emits — must match the pgvector column. */
  readonly dim: number;

  /**
   * Return a vector for the given text, or `null` when the provider is
   * intentionally disabled or the input is empty. Callers must handle null
   * as "no embedding today" and skip storing / querying.
   */
  embed(text: string): Promise<number[] | null>;

  /**
   * Whether the provider actually computes embeddings (true) or is a
   * placeholder that always returns null (false). Used by callers to
   * skip fire-and-forget work quickly.
   */
  readonly enabled: boolean;
}
