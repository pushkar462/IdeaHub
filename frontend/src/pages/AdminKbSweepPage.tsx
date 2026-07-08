import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BookOpen, Check, Sparkles } from 'lucide-react';
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

  // Handbook P5 · LLM-nominated Use Cases.
  interface Nomination {
    postId: number;
    postNumber: string | null;
    title: string;
    section: string;
    resolution: string | null;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  }
  const [nominations, setNominations] = useState<Nomination[] | null>(null);
  const [nominating, setNominating] = useState(false);
  const [graduatingId, setGraduatingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    api.get('/admin/kb-candidates')
      .then((res) => setCandidates(res.data as unknown as Candidate[]))
      .catch(() => toast.error('Failed to load KB candidates'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (loading) return <div className="pt-20"><Loader /></div>;

  const scanNominations = async () => {
    setNominating(true);
    try {
      const res = await api.post('/admin/kb-nominations');
      const list = (res.data as unknown as Nomination[]) ?? [];
      setNominations(list);
      if (list.length === 0) toast('No new Use Case nominations right now.', { icon: '📝' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to run nominations');
    } finally {
      setNominating(false);
    }
  };

  const graduate = async (postId: number) => {
    setGraduatingId(postId);
    try {
      const payload = new FormData();
      payload.append('isUseCase', 'true');
      await api.patch(`/posts/${postId}`, payload);
      // Refresh both lists (the graduated post now becomes a KB sweep candidate).
      setNominations((prev) => (prev ?? []).filter((n) => n.postId !== postId));
      const listRes = await api.get('/admin/kb-candidates');
      setCandidates((listRes.data as unknown as Candidate[]) ?? []);
      toast.success('Graduated to Use Case');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to graduate');
    } finally {
      setGraduatingId(null);
    }
  };

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
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen size={18} className="text-brand-primary" /> KB sweep
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Handbook B6 · resolved Use Cases waiting to be swept into a section knowledge base.
            Record where each one landed (e.g. "Bills KB · not_eligible") — that note lands on the audit log.
          </p>
        </div>
        <button
          onClick={scanNominations}
          disabled={nominating}
          className="btn-secondary text-xs py-2 px-3 flex items-center gap-1 whitespace-nowrap"
          title="Ask Loop AI which recent resolutions look like new rules"
        >
          <Sparkles size={12} />
          {nominating ? 'Scanning…' : 'Suggest use cases'}
        </button>
      </div>

      {nominations && nominations.length > 0 && (
        <div className="card p-5 border-l-4 border-l-brand-primary bg-brand-light/30">
          <h3 className="text-sm font-bold text-brand-primary mb-1 flex items-center gap-2">
            <Sparkles size={14} /> Loop AI nominations
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Resolutions that read like new rules. Graduate the ones you agree with — the model never toggles the flag itself.
          </p>
          <ul className="space-y-2">
            {nominations.map((n) => (
              <li key={n.postId} className="flex items-start gap-3 p-3 rounded-lg bg-white border border-brand-primary/15">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-0.5 flex-wrap">
                    <span className="font-mono font-semibold text-brand-primary">{n.postNumber ?? `#${n.postId}`}</span>
                    <span>·</span><span>{n.section}</span>
                    {n.resolution && (<><span>·</span><span className="text-green-600 font-semibold">{n.resolution}</span></>)}
                    <span>·</span><span className="uppercase tracking-wide text-[10px] text-gray-400">{n.confidence}</span>
                  </div>
                  <Link to={`/post/${n.postId}`} className="text-sm font-semibold text-gray-900 hover:text-brand-primary line-clamp-1">{n.title}</Link>
                  <p className="text-xs text-gray-600 mt-1 italic">{n.reason}</p>
                </div>
                <button
                  onClick={() => graduate(n.postId)}
                  disabled={graduatingId === n.postId}
                  className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
                >
                  {graduatingId === n.postId ? 'Graduating…' : 'Graduate'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
