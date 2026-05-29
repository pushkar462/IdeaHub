import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

const LoginPage: React.FC = () => {
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100
                    flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center
                          text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
            C
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to CollabHub</p>
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
              <label className="label">Email address</label>
              <input
                id="login-email"
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
                id="login-password"
                type="password"
                className="input"
                placeholder="••••••••"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            New to CollabHub?{' '}
            <Link to="/register" className="text-brand-500 font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
