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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-brand-light/50 via-white to-brand-light
                    flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-primary rounded-2xl flex items-center justify-center
                          text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
            A
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join Athwart Loop</h1>
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
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  className="input pr-10"
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
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
                        ? 'border-brand-primary bg-brand-light text-brand-primary font-bold'
                        : 'border-surface-border text-gray-600 hover:border-brand-primary/50'
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
            <Link to="/login" className="text-brand-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
