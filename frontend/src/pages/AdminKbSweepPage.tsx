import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BookOpen, Check } from 'lucide-react';
import api from '@/api/axios';
import { useAuthStore } from '@/stores/auth.store';
import Loader from '@/components/shared/Loader';
import toast from 'react-hot-toast';

interface Candidate {
  id: number;
  postNumber: string;
  title: string;
  description: string;
  section: string;
  type: string;
  resolution: string | null;
  updatedAt: string;
  owner:  { id: number; name: string } | null;
  author: { id: number; name: string } | null;
}

const AdminKbSweepPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'FOUNDER';

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [landedAt, setLandedAt] = useState<Record<number, string>>({});
  const [sweeping, setSweeping] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    api.get('/admin/kb-candidates')
      .then((res) => setCandidates(res.data as unknown as Candidate[]))
      .catch(() => toast.error('Failed to load KB candidates'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (loading) return <div className="pt-20"><Loader /></div>;

  const sweep = async (id: number) => {
    setSweeping(id);
    try {
      await api.patch(`/admin/posts/${id}/sweep`, { landedAt: landedAt[id]?.trim() || undefined });
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setLandedAt((prev) => { const { [id]: _, ...rest } = prev; return rest; });
      toast.success('Swept to KB');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to sweep');
    } finally {
      setSweeping(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen size={18} className="text-brand-primary" /> KB sweep
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Handbook B6 · resolved Use Cases waiting to be swept into a section knowledge base.
          Record where each one landed (e.g. "Bills KB · not_eligible") — that note lands on the audit log.
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">
          No Use Cases waiting to be swept. Nice.
        </div>
      ) : (
        <ul className="space-y-3">
          {candidates.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span className="font-mono font-semibold text-brand-primary">{c.postNumber}</span>
                    <span>·</span>
                    <span>{c.type}</span>
                    <span>·</span>
                    <span>{c.section}</span>
                    {c.resolution && (
                      <>
                        <span>·</span>
                        <span className="text-green-600 font-semibold">{c.resolution}</span>
                      </>
                    )}
                  </div>
                  <Link to={`/post/${c.id}`} className="text-sm font-bold text-gray-900 hover:text-brand-primary line-clamp-1">
                    {c.title}
                  </Link>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{c.description}</p>
                </div>
                <div className="text-[10px] text-gray-400 whitespace-nowrap">
                  resolved {new Date(c.updatedAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-surface-border">
                <input
                  className="input bg-gray-50 focus:bg-white text-sm flex-1"
                  placeholder="Where did it land? e.g. Bills KB · not_eligible"
                  value={landedAt[c.id] ?? ''}
                  onChange={(e) => setLandedAt((p) => ({ ...p, [c.id]: e.target.value }))}
                />
                <button
                  onClick={() => sweep(c.id)}
                  disabled={sweeping === c.id}
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-1 disabled:opacity-60"
                >
                  <Check size={14} />
                  {sweeping === c.id ? 'Sweeping…' : 'Mark swept'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminKbSweepPage;
