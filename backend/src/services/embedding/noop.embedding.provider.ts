import { EmbeddingProvider } from './embedding.provider.interface';

// Default provider — no external calls, no cost, no vectors. Semantic-search
// endpoints route through this until ops flips EMBED_PROVIDER.
export class NoopEmbeddingProvider implements EmbeddingProvider {
  readonly dim = 1536;
  readonly enabled = false;
  async embed(_text: string): Promise<number[] | null> {
    return null;
  }
}
