import React, { useState } from 'react';
import api from '@/api/axios';
import { usePostStore } from '@/stores/post.store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = ['BUG', 'IMPROVEMENT', 'SUGGESTION', 'FEATURE', 'IDEA', 'DISCUSSION'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

const CreatePostModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { fetchFeed } = usePostStore();
  const [form, setForm] = useState({
    title: '', description: '', category: 'DISCUSSION',
    priority: 'MEDIUM', tags: '', assigneeId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/posts', {
        title: form.title,
        description: form.description,
        category: form.category,
        priority: form.priority,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        assigneeId: form.assigneeId ? Number(form.assigneeId) : undefined,
      });
      await fetchFeed();
      onClose();
      setForm({ title: '', description: '', category: 'DISCUSSION', priority: 'MEDIUM', tags: '', assigneeId: '' });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <h2 className="text-lg font-semibold text-gray-900">Create New Post</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2">{error}</div>
          )}

          <div>
            <label className="label">Title *</label>
            <input
              className="input" required
              placeholder="Short, descriptive title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Description *</label>
            <textarea
              className="input min-h-[100px] resize-y" required
              placeholder="Describe the issue, idea, or discussion… use @name to mention someone"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Tags (comma-separated)</label>
            <input
              className="input"
              placeholder="e.g. auth, api, mobile"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Posting…' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
