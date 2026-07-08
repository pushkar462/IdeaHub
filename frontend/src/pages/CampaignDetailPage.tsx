import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Award, Clock, Users, ArrowBigUp, MessageSquare } from 'lucide-react';
import api from '@/api/axios';
import { useAuthStore } from '@/stores/auth.store';
import Loader from '@/components/shared/Loader';
import toast from 'react-hot-toast';

interface CampaignPost {
  id: number;
  postNumber: string;
  title: string;
  description: string;
  type: string;
  status: string;
  section: string;
  createdAt: string;
  author: { id: number; name: string };
  voteCount: number;
  commentCount: number;
}
interface CampaignDetail {
  id: number;
  title: string;
  prompt: string;
  themeTag?: string | null;
  status: 'ACTIVE' | 'CLOSED';
  endsAt: string;
  closedAt?: string | null;
  createdBy: { id: number; name: string };
  winner?: { id: number; postNumber: string; title: string } | null;
  posts: CampaignPost[];
}

const CampaignDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'FOUNDER';
  const [c, setC] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api.get(`/campaigns/${id}`)
      .then((res) => setC(res.data as unknown as CampaignDetail))
      .catch(() => setC(null))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  if (loading) return <div className="pt-20"><Loader /></div>;
  if (!c) return <div className="text-center text-gray-500 py-10">Campaign not found</div>;

  const closingIn = Math.round((new Date(c.endsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));

  const close = async () => {
    if (!confirm('Close this campaign? Contributors can no longer tag new posts to it.')) return;
    setActing(true);
    try { await api.patch(`/campaigns/${c.id}/close`); toast.success('Campaign closed'); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Failed to close'); }
    finally { setActing(false); }
  };
  const pickWinner = async (postId: number) => {
    if (!confirm('Mark this idea as the winning contribution?')) return;
    setActing(true);
    try { await api.patch(`/campaigns/${c.id}/winner`, { postId }); toast.success('Winner picked'); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Failed to pick winner'); }
    finally { setActing(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <button onClick={() => navigate('/campaigns')} className="text-sm font-medium text-gray-500 hover:text-brand-primary flex items-center gap-2">
        <ArrowLeft size={16} /> Back to campaigns
      </button>

      <div className="card p-6 lg:p-8">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={`badge text-[10px] ${
            c.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'
          }`}>{c.status}</span>
          {c.themeTag && <span className="badge bg-brand-light text-brand-primary text-[10px]">#{c.themeTag}</span>}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{c.title}</h1>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{c.prompt}</p>

        <div className="mt-4 pt-4 border-t border-surface-border flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1"><Users size={12} />{c.posts.length} ideas</span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {c.status === 'ACTIVE'
              ? (closingIn > 0 ? `closes in ${closingIn}d` : 'closing today')
              : `closed ${new Date(c.closedAt ?? c.endsAt).toLocaleDateString()}`}
          </span>
          <span className="ml-auto">By {c.createdBy.name}</span>
        </div>

        {isAdmin && c.status === 'ACTIVE' && (
          <div className="mt-4 pt-4 border-t border-surface-border flex justify-end">
            <button onClick={close} disabled={acting} className="btn-ghost text-xs">Close campaign</button>
          </div>
        )}
      </div>

      {c.winner && (
        <div className="card p-4 border-l-4 border-l-yellow-400 bg-yellow-50/50">
          <div className="flex items-center gap-2 text-sm font-bold text-yellow-800">
            <Award size={16} /> Winner
          </div>
          <Link to={`/post/${c.winner.id}`} className="mt-1 block font-semibold text-gray-900 hover:text-brand-primary">
            {c.winner.postNumber} · {c.winner.title}
          </Link>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3">Ideas · ranked by votes</h3>
        {c.posts.length === 0 ? (
          <div className="card p-6 text-sm text-gray-500 text-center">No ideas yet.</div>
        ) : (
          <ul className="space-y-3">
            {c.posts.map((p) => (
              <li key={p.id} className="card p-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center min-w-[52px]">
                    <ArrowBigUp size={22} className="text-brand-primary" />
                    <span className="text-lg font-bold text-gray-900 leading-none">{p.voteCount}</span>
                    <span className="text-[10px] text-gray-500 mt-1">votes</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/post/${p.id}`} className="font-semibold text-gray-900 hover:text-brand-primary">
                      {p.title}
                    </Link>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1">{p.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500">
                      <span className="font-mono">{p.postNumber}</span>
                      <span>· {p.section}</span>
                      <span>· by {p.author.name}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={11} />{p.commentCount}</span>
                    </div>
                  </div>
                  {isAdmin && c.status === 'ACTIVE' && (
                    <button
                      onClick={() => pickWinner(p.id)}
                      disabled={acting}
                      className="btn-secondary text-xs py-1 px-2 whitespace-nowrap"
                    >
                      Pick winner
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CampaignDetailPage;
