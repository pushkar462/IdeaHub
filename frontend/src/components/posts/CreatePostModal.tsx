import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { usePostStore } from '@/stores/post.store';
import { MentionsInput, Mention } from 'react-mentions';
import { fetchUsersForMention } from '@/lib/mentions';
import { Post } from '@/types';
import { validateFile, parseUploadError } from '@/lib/uploads';
import AttachmentList from './AttachmentList';
import toast from 'react-hot-toast';
import { X, Paperclip, Sparkles, Edit2, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  post?: Post | null;
}

const TYPES = ['QUESTION', 'PROBLEM', 'IDEA'];
const SECTIONS = ['BILLS', 'INVOICING', 'PATIENTS', 'CASES', 'PARTNERS', 'HOSPITALS', 'DOCTORS', 'WHATSAPP', 'PLATFORM', 'GENERAL'];

const emptyForm = {
  title: '',
  description: '',
  type: 'QUESTION',
  section: 'GENERAL',
  isUseCase: false,
  linkedEntityType: '' as '' | 'BILL' | 'CASE' | 'PARTNER',
  linkedEntityId: '',
};

const CreatePostModal: React.FC<Props> = ({ isOpen, onClose, post }) => {
  const isEditMode = Boolean(post);
  const { fetchFeed, updatePost } = usePostStore();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [existingAttachments, setExistingAttachments] = useState(post?.attachments ?? []);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>([]);
  
  const [duplicateMatch, setDuplicateMatch] = useState<any>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  useEffect(() => {
    if (isEditMode || !form.title || form.title.trim().length < 10) {
      setDuplicateMatch(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingDuplicate(true);
      try {
        const { data } = await api.post('/intelligence/duplicate-check', { title: form.title, body: form.description });
        if (data.data?.found) {
          setDuplicateMatch(data.data.match);
        } else {
          setDuplicateMatch(null);
        }
      } catch (err) {
        setDuplicateMatch(null);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [form.title, form.description, isEditMode]);

  useEffect(() => {
    if (isOpen && post) {
      setForm({
        title: post.title,
        description: post.description,
        type: post.type,
        section: post.section,
        isUseCase: post.isUseCase,
        linkedEntityType: (post.linkedEntityType as any) || '',
        linkedEntityId: post.linkedEntityId || '',
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
      payload.append('type', form.type);
      payload.append('section', form.section);
      payload.append('isUseCase', String(form.isUseCase));
      if (form.linkedEntityType) payload.append('linkedEntityType', form.linkedEntityType);
      if (form.linkedEntityId) payload.append('linkedEntityId', form.linkedEntityId);

      if (file) payload.append('attachment', file);

      if (isEditMode && post) {
        for (const attId of removedAttachmentIds) {
          payload.append('removeAttachmentId', String(attId));
        }
        await updatePost(post.id, payload);
      } else {
        await api.post('/posts', payload);
        await fetchFeed();
        toast.success('Post created successfully!');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white border border-surface-border rounded-2xl shadow-2xl w-full max-w-xl animate-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-surface-border shrink-0">
          <h2 className="text-xl font-bold text-gray-900 tracking-wide flex items-center gap-2">
            {isEditMode ? <><Edit2 size={20} className="text-brand-primary" /> Edit Post</> : <><Sparkles size={20} className="text-brand-primary" /> New Thread</>}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <div>
            <label className="label flex items-center justify-between">
              <span>Thread Title *</span>
              {checkingDuplicate && <span className="text-xs text-brand-primary animate-pulse">Checking for duplicates...</span>}
            </label>
            <input
              className="input text-base py-3 bg-gray-50 focus:bg-white" required
              placeholder="E.g. Invoice generation failing for patient loop..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            {duplicateMatch && !isEditMode && (
              <div className="mt-3 p-4 bg-orange-50 border border-orange-200 rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-2 text-orange-800 font-bold text-sm">
                  <Sparkles size={16} /> Possible Duplicate Found
                </div>
                <p className="text-sm text-orange-700">
                  This looks very similar to an already resolved post:
                  <a href={duplicateMatch.url} target="_blank" rel="noreferrer" className="ml-1 font-bold underline hover:text-orange-900">
                    {duplicateMatch.postNumber || 'Post'}: {duplicateMatch.title}
                  </a>
                </p>
                {duplicateMatch.resolution && (
                  <div className="bg-white/60 p-2 rounded-lg border border-orange-100 text-xs text-gray-700">
                    <span className="font-bold block mb-1">Resolution:</span>
                    {duplicateMatch.resolution}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select className="input bg-gray-50 focus:bg-white" value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Section</label>
              <select className="input bg-gray-50 focus:bg-white" value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}>
                {SECTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Link CRM Record Type (Optional)</label>
              <select className="input bg-gray-50 focus:bg-white" value={form.linkedEntityType}
                onChange={(e) => setForm({ ...form, linkedEntityType: e.target.value as any })}>
                <option value="">None</option>
                <option value="BILL">Bill</option>
                <option value="CASE">Case</option>
                <option value="PARTNER">Partner</option>
              </select>
            </div>
            {form.linkedEntityType && (
              <div>
                <label className="label">
                  Record ID {form.linkedEntityType === 'BILL' ? '(e.g. SCCS0001)' : form.linkedEntityType === 'CASE' ? '(e.g. CS0001)' : '(e.g. PTR0001)'}
                </label>
                <input
                  className="input bg-gray-50 focus:bg-white"
                  placeholder="Enter Record ID..."
                  value={form.linkedEntityId}
                  onChange={(e) => setForm({ ...form, linkedEntityId: e.target.value })}
                />
              </div>
            )}
          </div>

          <div>
            <label className="label">Description *</label>
            <div className="border border-surface-border rounded-xl focus-within:ring-2 focus-within:ring-brand-primary/50 focus-within:border-brand-primary overflow-hidden bg-white transition-all shadow-sm">
              <MentionsInput
                className="mentions-input min-h-[120px] w-full p-4 text-gray-900 outline-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the issue, idea, or problem… Use @name to mention someone."
                style={{
                  control: { minHeight: 120 },
                  input: { margin: 0, padding: 16, border: 'none', outline: 'none' },
                  suggestions: {
                    list: { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
                    item: { padding: '8px 12px', borderBottom: '1px solid #f3f4f6', color: '#1f2937' },
                  },
                }}
              >
                <Mention
                  trigger="@"
                  data={fetchUsersForMention}
                  displayTransform={(_id, display) => `@${display}`}
                  style={{ backgroundColor: '#ede3ff', color: '#8018de', borderRadius: '4px', padding: '0 2px' }}
                />
              </MentionsInput>
            </div>
          </div>

          <label className="flex items-center gap-3 p-4 border border-surface-border rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={form.isUseCase}
              onChange={(e) => setForm({ ...form, isUseCase: e.target.checked })}
              className="w-4 h-4 text-brand-primary bg-white border-gray-300 rounded focus:ring-brand-primary/50 focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-700">Flag as Reusable Use-Case / Document</span>
          </label>

          {visibleAttachments.length > 0 && (
            <div>
              <label className="label">Current Attachments</label>
              <div className="space-y-2">
                {visibleAttachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-surface-border bg-gray-50">
                    <AttachmentList attachments={[att]} compact />
                    <button
                      type="button"
                      onClick={() => setRemovedAttachmentIds((prev) => [...prev, att.id])}
                      className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label flex items-center gap-2">
              <Paperclip size={14} className="text-gray-500" />
              {isEditMode ? 'Add File (Optional)' : 'Attach File (Optional)'}
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.doc,.docx"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
              <div className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 hover:border-brand-primary/50 rounded-xl bg-gray-50 hover:bg-brand-light/50 transition-all text-gray-500">
                <Paperclip size={20} />
                <span className="text-sm font-medium">Click or drag file to attach</span>
              </div>
            </div>
            
            {file && (
              <div className="mt-3 flex items-center gap-3 text-sm text-brand-primary bg-brand-light/50 border border-brand-primary/20 px-4 py-3 rounded-xl">
                <span className="text-brand-primary"><Paperclip size={16} /></span>
                <span className="truncate flex-1 font-medium">{file.name}</span>
                <span className="text-xs text-brand-primary font-semibold bg-white/50 px-2 py-0.5 rounded-md">{(file.size / 1024).toFixed(1)} KB</span>
                <button type="button" onClick={() => setFile(null)} className="p-1 hover:bg-red-100 hover:text-red-600 rounded-md transition-colors"><X size={14} /></button>
              </div>
            )}
            {loading && file && (
              <p className="text-xs text-brand-primary mt-2 font-medium animate-pulse">Uploading attachment…</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
            <button type="button" onClick={onClose} className="btn-ghost px-6">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary px-8">
              {loading ? (isEditMode ? 'Saving…' : 'Posting…') : (isEditMode ? 'Save Changes' : 'Create Post')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
