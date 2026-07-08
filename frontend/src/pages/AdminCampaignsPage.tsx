import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Megaphone, Plus } from 'lucide-react';
import api from '@/api/axios';
import { useAuthStore } from '@/stores/auth.store';
import Loader from '@/components/shared/Loader';
import toast from 'react-hot-toast';
import type { CampaignRow } from './CampaignsPage';

const AdminCampaignsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'FOUNDER';

  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    prompt: '',
    themeTag: '',
    endsAt: '', // yyyy-mm-dd
  });

  useEffect(() => {
    if (!isAdmin) return;
    api.get('/campaigns')
      .then((res) => setRows((res.data as unknown as CampaignRow[]) ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (loading) return <div className="pt-20"><Loader /></div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.prompt.trim() || !form.endsAt) {
      toast.error('Title, prompt, and end date are all required');
      return;
    }
    // Interpret the date as end-of-day UTC to avoid closing during the workday.
    const endsAtIso = new Date(form.endsAt + 'T23:59:59Z').toISOString();
    setSaving(true);
    try {
      const res = await api.post('/campaigns', {
        title:    form.title.trim(),
        prompt:   form.prompt.trim(),
        themeTag: form.themeTag.trim() || undefined,
        endsAt:   endsAtIso,
      });
      const created = res.data as unknown as CampaignRow;
      setRows((prev) => [created, ...prev]);
      setForm({ title: '', prompt: '', themeTag: '', endsAt: '' });
      setShowNew(false);
      toast.success('Campaign opened');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone size={18} className="text-brand-primary" /> Campaigns
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Handbook B8 · one themed prompt per month keeps ideas focused.
          </p>
        </div>
        <button onClick={() => setShowNew((v) => !v)} className="btn-primary text-sm px-4 py-2 flex items-center gap-1">
          <Plus size={14} /> New campaign
        </button>
      </div>

      {showNew && (
        <form onSubmit={submit} className="card p-5 space-y-4 animate-in">
          <div>
            <label className="label">Title *</label>
            <input
              className="input"
              placeholder="This month: cut bill-verification time in half"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
              maxLength={140}
            />
          </div>
          <div>
            <label className="label">Prompt *</label>
            <textarea
              className="input min-h-[120px]"
              placeholder="What's the concrete problem you want ideas on?"
              value={form.prompt}
              onChange={(e) => setForm((p) => ({ ...p, prompt: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Theme tag (optional)</label>
              <input
                className="input"
                placeholder="bill-speed"
                value={form.themeTag}
                onChange={(e) => setForm((p) => ({ ...p, themeTag: e.target.value }))}
                maxLength={40}
              />
            </div>
            <div>
              <label className="label">Ends on *</label>
              <input
                type="date"
                className="input"
                value={form.endsAt}
                onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowNew(false)} className="btn-ghost text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm px-6">
              {saving ? 'Opening…' : 'Open campaign'}
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {rows.map((c) => (
          <li key={c.id} className="card p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge text-[10px] ${
                  c.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'
                }`}>{c.status}</span>
                {c.themeTag && <span className="badge bg-brand-light text-brand-primary text-[10px]">#{c.themeTag}</span>}
              </div>
              <Link to={`/campaigns/${c.id}`} className="mt-1 block font-semibold text-gray-900 hover:text-brand-primary">
                {c.title}
              </Link>
              <div className="text-[11px] text-gray-500 mt-1">
                {c._count?.posts ?? 0} ideas · ends {new Date(c.endsAt).toLocaleDateString()}
                {c.winner && ` · 🏆 ${c.winner.postNumber}`}
              </div>
            </div>
            <Link to={`/campaigns/${c.id}`} className="btn-ghost text-xs">Manage</Link>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="card p-6 text-sm text-gray-500 text-center">No campaigns yet. Open one above.</li>
        )}
      </ul>
    </div>
  );
};

export default AdminCampaignsPage;
