import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { usePostStore } from '@/stores/post.store';
import { useDepartmentStore } from '@/stores/department.store';
import { MentionsInput, Mention } from 'react-mentions';
import { fetchUsersForMention } from '@/lib/mentions';
import { Post } from '@/types';
import { validateFile, parseUploadError } from '@/lib/uploads';
import AttachmentList from './AttachmentList';
import toast from 'react-hot-toast';

interface TeamMember {
  id: number;
  name: string;
  role: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  post?: Post | null;
}

const CATEGORIES = ['BUG', 'IMPROVEMENT', 'SUGGESTION', 'FEATURE', 'IDEA', 'DISCUSSION', 'PROBLEM'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

const emptyForm = {
  title: '', description: '', category: 'DISCUSSION',
  priority: 'MEDIUM', tags: '', assigneeId: '', departmentId: '',
};

const CreatePostModal: React.FC<Props> = ({ isOpen, onClose, post }) => {
  const isEditMode = Boolean(post);
  const { fetchFeed, updatePost } = usePostStore();
  const { departments, fetchDepartments } = useDepartmentStore();
  const [users, setUsers] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      api.get('/auth/users', { params: { limit: 50 } }).then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setUsers(list);
      }).catch(() => {});
    }
  }, [isOpen, fetchDepartments]);

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestionReason, setSuggestionReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [existingAttachments, setExistingAttachments] = useState(post?.attachments ?? []);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen && post) {
      setForm({
        title: post.title,
        description: post.description,
        category: post.category,
        priority: post.priority,
        tags: post.tags?.join(', ') ?? '',
        assigneeId: post.assigneeId ? String(post.assigneeId) : '',
        departmentId: post.departmentId ? String(post.departmentId) : '',
      });
      setExistingAttachments(post.attachments ?? []);
      setRemovedAttachmentIds([]);
      setFile(null);
      setError('');
    } else if (isOpen && !post) {
      setForm(emptyForm);
      setExistingAttachments([]);
      setRemovedAttachmentIds([]);
      setFile(null);
      setError('');
    }
  }, [isOpen, post]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    if (selected) {
      const validationError = validateFile(selected);
      if (validationError) {
        setError(validationError);
        e.target.value = '';
        return;
      }
    }
    setError('');
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('description', form.description);
      payload.append('category', form.category);
      payload.append('priority', form.priority);

      if (form.tags) {
        const tagsArray = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
        payload.append('tags', JSON.stringify(tagsArray));
      }

      if (form.assigneeId) payload.append('assigneeId', form.assigneeId);
      if (form.departmentId) payload.append('departmentId', form.departmentId);
      if (file) payload.append('attachment', file);

      if (isEditMode && post) {
        for (const attId of removedAttachmentIds) {
          payload.append('removeAttachmentId', String(attId));
        }
        await updatePost(post.id, payload);
      } else {
        await api.post('/posts', payload);
        await fetchFeed();
        toast.success('Post created');
      }

      onClose();
      setForm(emptyForm);
      setFile(null);
      setRemovedAttachmentIds([]);
    } catch (err: any) {
      const msg = parseUploadError(err);
      setError(msg);
      if (!isEditMode) toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const visibleAttachments = existingAttachments.filter(
    (a) => !removedAttachmentIds.includes(a.id)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-surface-border shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditMode ? 'Edit Post' : 'Create New Post'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
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
            <div className="border border-surface-border rounded-lg focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 overflow-hidden bg-white">
              <MentionsInput
                className="mentions-input min-h-[100px] w-full p-3 text-sm outline-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the issue, idea, or discussion… use @name to mention someone"
                style={{
                  control: { minHeight: 100 },
                  input: { margin: 0, padding: 12, border: 'none', outline: 'none' },
                  suggestions: {
                    list: { backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
                    item: { padding: '8px 12px', borderBottom: '1px solid #f3f4f6' },
                  },
                }}
              >
                <Mention
                  trigger="@"
                  data={fetchUsersForMention}
                  displayTransform={(_id, display) => `@${display}`}
                  style={{ backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px', padding: '0 2px' }}
                />
              </MentionsInput>
            </div>
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

          {!isEditMode && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Target Department</label>
                <select className="input" value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                  <option value="">(None)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="label mb-0">Assign To (Optional)</label>
                  {form.departmentId && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { data } = await api.get(`/intelligence/recommend-assignee/${form.departmentId}`);
                          if (data && data.recommendedAssignee) {
                            setForm(prev => ({ ...prev, assigneeId: String(data.recommendedAssignee.id) }));
                            setSuggestionReason(data.reasons.join(', '));
                          } else {
                            setSuggestionReason('No suggestion available.');
                          }
                        } catch {
                          setSuggestionReason('Failed to load suggestion.');
                        }
                      }}
                      className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium"
                    >
                      ✨ Suggest
                    </button>
                  )}
                </div>
                <select
                  className="input mt-1"
                  value={form.assigneeId}
                  onChange={(e) => {
                    setForm({ ...form, assigneeId: e.target.value });
                    setSuggestionReason('');
                  }}
                >
                  <option value="">— Unassigned —</option>
                  {users.filter(u => u.name !== 'Admin' && u.role !== 'ADMIN').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role?.replace('_', '/')})
                    </option>
                  ))}
                </select>
                {suggestionReason && (
                  <p className="text-xs text-purple-600 mt-1 flex items-start gap-1">
                    <span>✨</span> {suggestionReason}
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="label">Tags (comma-separated)</label>
            <input
              className="input"
              placeholder="e.g. auth, api, mobile"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>

          {visibleAttachments.length > 0 && (
            <div>
              <label className="label">Current Attachments</label>
              <div className="space-y-2">
                {visibleAttachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-surface-border bg-surface">
                    <AttachmentList attachments={[att]} compact />
                    <button
                      type="button"
                      onClick={() => setRemovedAttachmentIds((prev) => [...prev, att.id])}
                      className="text-xs text-red-500 hover:underline shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">{isEditMode ? 'Add Attachment (Optional)' : 'Attachment (Optional)'}</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.doc,.docx"
              className="input text-sm p-2"
              onChange={handleFileChange}
            />
            {file && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 bg-surface px-3 py-2 rounded-lg">
                <span>📎</span>
                <span className="truncate flex-1">{file.name}</span>
                <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                <button type="button" onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500">×</button>
              </div>
            )}
            {loading && file && (
              <p className="text-xs text-brand-600 mt-1">Uploading attachment…</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (isEditMode ? 'Saving…' : 'Posting…') : (isEditMode ? 'Save Changes' : 'Create Post')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
