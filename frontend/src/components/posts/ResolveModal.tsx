import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PostType } from '@/types';
import api from '@/api/axios';
import { usePostStore } from '@/stores/post.store';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  postId: number;
  postType: PostType;
}

const typeToResolutions: Record<PostType, string[]> = {
  QUESTION: ['ANSWERED', 'PARKED', 'DECLINED'],
  PROBLEM: ['FIXED', 'PARKED', 'DECLINED'],
  IDEA: ['APPROVED', 'PARKED', 'DECLINED'],
};

const ResolveModal: React.FC<Props> = ({ isOpen, onClose, postId, postType }) => {
  const [resolution, setResolution] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { fetchPost, fetchFeed } = usePostStore();

  if (!isOpen) return null;

  const availableResolutions = typeToResolutions[postType] || [];
  const needsReason = resolution === 'PARKED' || resolution === 'DECLINED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolution) {
      toast.error('Please select a resolution');
      return;
    }
    if (needsReason && !reason.trim()) {
      toast.error('A reason is required for Parked or Declined resolutions');
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/posts/${postId}/status`, {
        status: 'RESOLVED',
        resolution,
        resolutionReason: reason.trim() || undefined,
      });
      toast.success('Post resolved successfully');
      await fetchPost(postId, true);
      await fetchFeed();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resolve post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white border border-surface-border rounded-2xl shadow-2xl w-full max-w-md animate-in flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h2 className="text-lg font-bold text-gray-900">Mark as Resolved</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Resolution *</label>
            <select
              className="input bg-gray-50 focus:bg-white"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              required
            >
              <option value="" disabled>Select resolution...</option>
              {availableResolutions.map((res) => (
                <option key={res} value={res}>{res}</option>
              ))}
            </select>
          </div>

          {needsReason && (
            <div>
              <label className="label">Reason *</label>
              <textarea
                className="input bg-gray-50 focus:bg-white min-h-[100px]"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Why is this ${resolution.toLowerCase()}?`}
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost px-5">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary px-6 bg-green-600 hover:bg-green-700 border-green-600">
              {loading ? 'Resolving...' : 'Resolve'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResolveModal;
