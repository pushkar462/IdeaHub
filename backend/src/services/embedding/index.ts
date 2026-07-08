import { config } from '../../config/env.config';
import { logger } from '../../infrastructure/observability/logger';
import { EmbeddingProvider } from './embedding.provider.interface';
import { NoopEmbeddingProvider } from './noop.embedding.provider';
import { OpenAIEmbeddingProvider } from './openai.embedding.provider';

// Factory + module-level singleton. Selection is process-lifetime; changing
// EMBED_PROVIDER requires a restart. Defaults to noop so a fresh deploy is
// silent unless ops opts in explicitly.
function build(): EmbeddingProvider {
  const provider = (config.EMBED_PROVIDER || 'noop').toLowerCase();
  if (provider === 'openai') {
    if (!config.OPENAI_API_KEY) {
      logger.warn('EMBED_PROVIDER=openai but OPENAI_API_KEY is empty — falling back to noop');
      return new NoopEmbeddingProvider();
    }
    logger.info({ provider: 'openai' }, 'embedding: provider active');
    return new OpenAIEmbeddingProvider(config.OPENAI_API_KEY);
  }
  logger.info({ provider: 'noop' }, 'embedding: provider inactive (default)');
  return new NoopEmbeddingProvider();
}

export const embeddingProvider: EmbeddingProvider = build();
export type { EmbeddingProvider } from './embedding.provider.interface';
