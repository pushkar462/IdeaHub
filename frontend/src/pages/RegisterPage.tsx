import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

const ROLES = [
  { value: 'FOUNDER',  label: '👑 Founder' },
  { value: 'FRONTEND', label: '🎨 Frontend' },
  { value: 'BACKEND',  label: '⚙️ Backend' },
  { value: 'DEVOPS',   label: '🛠️ DevOps' },
  { value: 'AI_ML',    label: '🤖 AI/ML' },
];

const RegisterPage: React.FC = () => {
  const { register, loading } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'FRONTEND', bio: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100
                    flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center
                          text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
            C
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join CollabHub</h1>
          <p className="text-gray-500 mt-1">Create your team account</p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg
                            px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                id="reg-name"
                type="text"
                className="input"
                placeholder="Jane Smith"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email address</label>
              <input
                id="reg-email"
                type="email"
                className="input"
                placeholder="you@company.com"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                id="reg-password"
                type="password"
                className="input"
                placeholder="At least 6 characters"
                minLength={6}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Your Role</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ROLES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, role: value })}
                    className={`px-3 py-2 rounded-lg text-sm border transition-all
                      ${form.role === value
                        ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                        : 'border-surface-border text-gray-600 hover:border-brand-300'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Bio (optional)</label>
              <textarea
                className="input resize-none min-h-[60px]"
                placeholder="A short description of what you do…"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>

            <button
              id="reg-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-500 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
