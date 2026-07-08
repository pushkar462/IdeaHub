import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import api from '@/api/axios';

interface SimilarHit {
  id: number;
  postNumber: string | null;
  title: string;
  similarity: number;
}
interface SimilarPayload {
  enabled: boolean;
  hits: SimilarHit[];
}

// Handbook Phase 2 · P4 — semantic-neighbours widget. Silently hides itself
// when embeddings are disabled (EMBED_PROVIDER=noop) so the page stays clean.
const SimilarPosts: React.FC<{ postId: number }> = ({ postId }) => {
  const [data, setData] = useState<SimilarPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get(`/search/posts/${postId}/similar`)
      .then((res) => { if (!cancelled) setData(res.data as unknown as SimilarPayload); })
      .catch(()   => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId]);

  if (loading || !data) return null;
  // Embedding provider disabled or no neighbours yet — stay quiet.
  if (!data.enabled || data.hits.length === 0) return null;

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-brand-primary" /> Similar posts
      </h3>
      <ul className="space-y-2">
        {data.hits.map((h) => (
          <li key={h.id}>
            <Link
              to={`/post/${h.id}`}
              className="flex items-center gap-3 py-1.5 hover:bg-gray-50 rounded-md px-2 -mx-2 transition-colors"
            >
              <span className="text-[11px] font-mono text-brand-primary shrink-0">{h.postNumber ?? `#${h.id}`}</span>
              <span className="text-sm text-gray-800 truncate flex-1">{h.title}</span>
              <span className="text-[10px] text-gray-400 shrink-0">{Math.round(h.similarity * 100)}%</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SimilarPosts;
