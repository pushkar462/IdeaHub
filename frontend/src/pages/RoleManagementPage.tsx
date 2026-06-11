import React, { useEffect, useState } from 'react';
import api from '@/api/axios';
import { useAuthStore } from '@/stores/auth.store';
import { User, UserRole } from '@/types';
import Loader from '@/components/shared/Loader';
import Avatar from '@/components/shared/Avatar';
import toast from 'react-hot-toast';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'FRONTEND', label: 'User (Frontend)' },
  { value: 'BACKEND', label: 'User (Backend)' },
  { value: 'DEVOPS', label: 'User (DevOps)' },
  { value: 'AI_ML', label: 'User (AI/ML)' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'FOUNDER', label: 'Founder' },
];

const roleLabel = (role: UserRole) =>
  ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role.replace('_', '/');

const RoleManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const isAuthorized = user?.role === 'FOUNDER' || user?.role === 'ADMIN';

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/users/manage');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) fetchUsers();
  }, [isAuthorized]);

  if (!isAuthorized) return null;

  const handleRoleChange = async (userId: number, role: UserRole) => {
    setUpdatingId(userId);
    try {
      const { data } = await api.patch(`/auth/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...data } : u)));
      toast.success('Role updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Role Management</h2>
        <p className="text-sm text-gray-500 mt-1">Assign roles to team members. Only founders and admins can access this page.</p>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">User</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Current Role</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Change Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-surface-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar user={u} size="sm" />
                        <span className="font-medium text-gray-800">{u.name}</span>
                        {u.id === user?.id && (
                          <span className="text-xs text-gray-400">(you)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-surface text-gray-600">{roleLabel(u.role)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.id === user?.id ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <select
                          className="input py-1 text-xs w-auto"
                          value={u.role}
                          disabled={updatingId === u.id}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagementPage;
