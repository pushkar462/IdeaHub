import { EmbeddingProvider } from './embedding.provider.interface';
import { logger } from '../../infrastructure/observability/logger';

// OpenAI text-embedding-3-small (1536 dims). No new npm dep — uses fetch.
// Activated only when EMBED_PROVIDER=openai AND OPENAI_API_KEY is set.
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly dim = 1536;
  readonly enabled = true;

  constructor(private readonly apiKey: string, private readonly model = 'text-embedding-3-small') {}

  async embed(text: string): Promise<number[] | null> {
    const trimmed = text.trim();
    if (!trimmed) return null;
    // OpenAI hard-caps input at 8192 tokens; ~24k chars is a safe soft cap.
    const input = trimmed.length > 24000 ? trimmed.slice(0, 24000) : trimmed;

    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body:    JSON.stringify({ model: this.model, input }),
      });
      if (!res.ok) {
        logger.warn({ status: res.status, body: await res.text().catch(() => '') }, 'openai embed non-2xx');
        return null;
      }
      const data = (await res.json()) as { data?: Array<{ embedding: number[] }> };
      const vec = data.data?.[0]?.embedding;
      if (!Array.isArray(vec) || vec.length !== this.dim) return null;
      return vec;
    } catch (err) {
      logger.warn({ err }, 'openai embed threw');
      return null;
    }
  }
}
