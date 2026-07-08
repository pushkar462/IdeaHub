import { cleanEnv, str, port } from 'envalid';
import dotenv from 'dotenv';

dotenv.config();

export const config = cleanEnv(process.env, {
  DATABASE_URL: str({ desc: 'PostgreSQL connection string' }),
  JWT_SECRET: str({ desc: 'Secret key for signing JWTs' }),
  PORT: port({ default: 4000, desc: 'API port' }),
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  GROQ_API_KEY: str({ default: '', desc: 'Groq API key for AI summarization / duplicate check / draft response' }),
  CORS_ORIGIN: str({ default: '', desc: 'Comma-separated list of allowed frontend origins (e.g. https://app.vercel.app). Empty = allow all (dev only).' }),
  STORAGE_PROVIDER: str({ choices: ['local', 'supabase'], default: 'local', desc: 'File storage backend' }),
  SUPABASE_URL: str({ default: '', desc: 'Supabase project URL (required when STORAGE_PROVIDER=supabase)' }),
  SUPABASE_SERVICE_ROLE_KEY: str({ default: '', desc: 'Supabase service role key (required when STORAGE_PROVIDER=supabase)' }),
  SUPABASE_STORAGE_BUCKET: str({ default: 'uploads', desc: 'Supabase Storage bucket name' }),
  // Handbook C4 · shared secret for the n8n weekly-digest consumer. Empty
  // disables the endpoint entirely (safer default). Rotate quarterly.
  DIGEST_TOKEN: str({ default: '', desc: 'Bearer token n8n sends via X-Digest-Token when fetching /api/digest/weekly' }),
  // Handbook Phase 2 · P4 · pgvector embeddings. Selection of the embedding
  // provider. `noop` (default) keeps Loop standalone with no external calls.
  // `openai` requires OPENAI_API_KEY.
  EMBED_PROVIDER: str({ choices: ['noop', 'openai'], default: 'noop', desc: 'Semantic-search embedding provider' }),
  OPENAI_API_KEY: str({ default: '', desc: 'OpenAI API key (only used when EMBED_PROVIDER=openai)' }),
});
