import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Clock, Users } from 'lucide-react';
import api from '@/api/axios';
import Loader from '@/components/shared/Loader';
import EmptyState from '@/components/shared/EmptyState';

export interface CampaignRow {
  id: number;
  title: string;
  prompt: string;
  themeTag?: string | null;
  status: 'ACTIVE' | 'CLOSED';
  startsAt: string;
  endsAt: string;
  closedAt?: string | null;
  createdBy: { id: number; name: string; role: string };
  winner?: { id: number; postNumber: string; title: string } | null;
  _count?: { posts: number };
}

const CampaignsPage: React.FC = () => {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/campaigns')
      .then((res) => setRows((res.data as unknown as CampaignRow[]) ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="pt-20"><Loader /></div>;

  const active = rows.filter((c) => c.status === 'ACTIVE');
  const closed = rows.filter((c) => c.status === 'CLOSED');

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Megaphone size={18} className="text-brand-primary" /> Campaigns
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Handbook B8 · time-boxed, themed prompts. Post an Idea against the current campaign to help shape what ships next.
        </p>
      </div>

      <section>
        <h3 className="text-sm font-bold text-gray-800 mb-3">Active</h3>
        {active.length === 0 ? (
          <EmptyState icon="📣" title="No active campaign" description="The founder hasn't opened a themed ask yet." />
        ) : (
          <div className="space-y-3">
            {active.map((c) => <CampaignCard key={c.id} c={c} />)}
          </div>
        )}
      </section>

      {closed.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-3">Past campaigns</h3>
          <div className="space-y-3">
            {closed.map((c) => <CampaignCard key={c.id} c={c} />)}
          </div>
        </section>
      )}
    </div>
  );
};

const CampaignCard: React.FC<{ c: CampaignRow }> = ({ c }) => {
  const closingIn = Math.round((new Date(c.endsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return (
    <Link
      to={`/campaigns/${c.id}`}
      className="card p-5 block hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="min-w-0">
          <h4 className="text-base font-bold text-gray-900">{c.title}</h4>
          {c.themeTag && (
            <span className="badge bg-brand-light text-brand-primary text-[10px] mt-1">#{c.themeTag}</span>
          )}
        </div>
        <span className={`badge text-[10px] ${
          c.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'
        }`}>
          {c.status}
        </span>
      </div>
      <p className="text-sm text-gray-600 line-clamp-2">{c.prompt}</p>
      <div className="mt-3 pt-3 border-t border-surface-border flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1"><Users size={12} />{c._count?.posts ?? 0} ideas</span>
        {c.status === 'ACTIVE' ? (
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {closingIn > 0 ? `closes in ${closingIn}d` : 'closing today'}
          </span>
        ) : (
          <span className="flex items-center gap-1"><Clock size={12} />closed {new Date(c.closedAt ?? c.endsAt).toLocaleDateString()}</span>
        )}
        {c.winner && (
          <span className="flex items-center gap-1 text-brand-primary font-semibold">
            🏆 Winner: {c.winner.postNumber}
          </span>
        )}
        <span className="ml-auto text-gray-400">By {c.createdBy.name}</span>
      </div>
    </Link>
  );
};

export default CampaignsPage;
