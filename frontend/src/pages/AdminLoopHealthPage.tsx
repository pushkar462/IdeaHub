import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Activity, AlertTriangle, CheckCircle2, Clock, Inbox } from 'lucide-react';
import api from '@/api/axios';
import { useAuthStore } from '@/stores/auth.store';
import Loader from '@/components/shared/Loader';

interface LoopHealth {
  openTotal: number;
  needResponseCount: number;
  blackHoleCount: number;
  blackHoleRate: number;
  blackHoleRate30d: number;
  slaStatusCounts: { HEALTHY: number; AT_RISK: number; BREACHED: number };
  avgTimeToAcknowledgeMs: number | null;
  avgTimeToResolveMs: number | null;
  ackSampleSize: number;
  resolveSampleSize: number;
  perSection: Array<{ section: string; total: number; open: number; breached: number }>;
  generatedAt: string;
}

const formatDuration = (ms: number | null) => {
  if (ms === null) return '—';
  const hours = ms / (60 * 60 * 1000);
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
};

const StatCard: React.FC<{
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<any>;
  tone?: 'default' | 'warn' | 'bad' | 'ok';
}> = ({ label, value, hint, icon: Icon, tone = 'default' }) => {
  const toneClasses: Record<string, string> = {
    default: 'bg-white',
    ok:      'bg-green-50 border-green-200',
    warn:    'bg-amber-50 border-amber-200',
    bad:     'bg-red-50 border-red-200',
  };
  const iconTone: Record<string, string> = {
    default: 'text-brand-primary',
    ok:      'text-green-600',
    warn:    'text-amber-600',
    bad:     'text-red-600',
  };
  return (
    <div className={`card p-5 ${toneClasses[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        <Icon size={14} />
        <span className={iconTone[tone]}>{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </div>
  );
};

const AdminLoopHealthPage: React.FC = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<LoopHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'FOUNDER';

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    api.get<LoopHealth>('/admin/loop-health')
      .then((res) => {
        if (!cancelled) setData(res.data as unknown as LoopHealth);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load Loop health');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (loading) return <div className="pt-20"><Loader /></div>;
  if (error) return (
    <div className="card p-6 text-sm text-red-600 border border-red-200 bg-red-50">
      {error}
    </div>
  );
  if (!data) return null;

  const blackHolePct = (data.blackHoleRate * 100).toFixed(1);
  const blackHolePct30d = (data.blackHoleRate30d * 100).toFixed(1);
  const maxSectionOpen = Math.max(1, ...data.perSection.map((s) => s.open));

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Loop health</h2>
          <p className="text-xs text-gray-500 mt-1">
            Handbook C4 · black-hole rate is the health metric.
            Generated {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Open"
          value={String(data.openTotal)}
          hint={`${data.needResponseCount} need a response`}
          icon={Inbox}
        />
        <StatCard
          label="Black-hole rate"
          value={`${blackHolePct}%`}
          hint={`${data.blackHoleCount} open post(s) past 48h`}
          icon={AlertTriangle}
          tone={data.blackHoleRate > 0.1 ? 'bad' : data.blackHoleRate > 0 ? 'warn' : 'ok'}
        />
        <StatCard
          label="Avg time to acknowledge"
          value={formatDuration(data.avgTimeToAcknowledgeMs)}
          hint={`Last ${data.ackSampleSize} acknowledged posts`}
          icon={Clock}
        />
        <StatCard
          label="Avg time to resolve"
          value={formatDuration(data.avgTimeToResolveMs)}
          hint={`Last ${data.resolveSampleSize} resolved (30d)`}
          icon={CheckCircle2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard label="Healthy"  value={String(data.slaStatusCounts.HEALTHY)}  icon={Activity} tone="ok"   />
        <StatCard label="At risk"  value={String(data.slaStatusCounts.AT_RISK)}  icon={Activity} tone="warn" />
        <StatCard label="Breached" value={String(data.slaStatusCounts.BREACHED)} icon={Activity} tone="bad"  />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">Open posts by section</h3>
          <span className="text-xs text-gray-500">
            30d black-hole rate: <span className="font-semibold text-gray-700">{blackHolePct30d}%</span>
          </span>
        </div>
        {data.perSection.length === 0 ? (
          <p className="text-sm text-gray-500">No posts yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.perSection.map((row) => {
              const widthPct = Math.round((row.open / maxSectionOpen) * 100);
              return (
                <li key={row.section} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-700 w-24 shrink-0">{row.section}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden relative">
                    <div
                      className="h-full bg-brand-primary/80 rounded-full transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-2 text-[11px] font-semibold text-gray-800">
                      {row.open} open · {row.breached} breached · {row.total} total
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminLoopHealthPage;
