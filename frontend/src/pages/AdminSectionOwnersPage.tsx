import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, Save } from 'lucide-react';
import api from '@/api/axios';
import { useAuthStore } from '@/stores/auth.store';
import { User } from '@/types';
import Loader from '@/components/shared/Loader';
import Avatar from '@/components/shared/Avatar';
import toast from 'react-hot-toast';

interface OwnerRow {
  section: string;
  owner: { id: number; name: string; role: string; avatarUrl?: string | null } | null;
}

const AdminSectionOwnersPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'FOUNDER';

  const [rows, setRows] = useState<OwnerRow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      api.get('/admin/section-owners'),
      api.get('/auth/users', { params: { limit: 200 } }),
    ])
      .then(([ownersRes, usersRes]) => {
        setRows((ownersRes.data as any) as OwnerRow[]);
        setUsers(Array.isArray(usersRes.data) ? (usersRes.data as User[]) : []);
      })
      .catch(() => toast.error('Failed to load section owners'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (loading) return <div className="pt-20"><Loader /></div>;

  const save = async (section: string) => {
    const ownerId = Number(pending[section]);
    if (!Number.isInteger(ownerId) || ownerId <= 0) {
      toast.error('Pick a user first');
      return;
    }
    setSavingSection(section);
    try {
      const res = await api.patch(`/admin/section-owners/${section}`, { ownerId });
      const updated = res.data as unknown as OwnerRow;
      setRows((prev) => prev.map((r) => (r.section === section ? updated : r)));
      setPending((p) => { const { [section]: _, ...rest } = p; return rest; });
      toast.success(`${section} owner updated`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update owner');
    } finally {
      setSavingSection(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users size={18} className="text-brand-primary" /> Section owners
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Handbook B7 · every section has one owner responsible for responding within the SLA.
          Reassigning here only affects <em>new</em> posts — in-flight owners stay put.
        </p>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-surface-border">
            <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 w-32">Section</th>
              <th className="px-4 py-3">Current owner</th>
              <th className="px-4 py-3 w-72">Reassign to…</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.section} className="border-b border-surface-border last:border-b-0">
                <td className="px-4 py-3 font-mono font-semibold text-gray-800">{row.section}</td>
                <td className="px-4 py-3">
                  {row.owner ? (
                    <div className="flex items-center gap-2">
                      <Avatar user={row.owner as any} size="sm" />
                      <span className="text-gray-800 font-medium">{row.owner.name}</span>
                      <span className="text-xs text-gray-400">{row.owner.role?.replace('_', '/')}</span>
                    </div>
                  ) : (
                    <span className="text-xs italic text-gray-400">— unassigned —</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    className="input bg-gray-50 focus:bg-white text-sm"
                    value={pending[row.section] ?? ''}
                    onChange={(e) => setPending((p) => ({ ...p, [row.section]: e.target.value }))}
                  >
                    <option value="">Select user…</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} · {u.role?.replace('_', '/')}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => save(row.section)}
                    disabled={savingSection === row.section || !pending[row.section]}
                    className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40 flex items-center gap-1"
                  >
                    <Save size={12} />
                    {savingSection === row.section ? '…' : 'Save'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSectionOwnersPage;
