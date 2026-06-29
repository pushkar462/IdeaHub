import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePostStore } from '@/stores/post.store';
import { useAuthStore } from '@/stores/auth.store';
import Loader from '@/components/shared/Loader';
import Avatar from '@/components/shared/Avatar';
import StatusBadge from '@/components/posts/StatusBadge';
import CommentThread from '@/components/posts/CommentThread';
import AISummary from '@/components/posts/AISummary';
import RenderMentionText from '@/components/shared/RenderMentionText';
import AttachmentList from '@/components/posts/AttachmentList';
import CreatePostModal from '@/components/posts/CreatePostModal';
import { ArrowLeft, Edit2, Trash2, ThumbsUp, AlertTriangle } from 'lucide-react';

const PostDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { current: post, loading, fetchPost, updateStatus, deletePost, reactToPost } = usePostStore();
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (id) fetchPost(Number(id));
  }, [id, fetchPost]);

  if (loading) return <div className="pt-20"><Loader /></div>;
  if (!post) return <div className="text-center py-20 text-gray-500 font-medium">Post not found</div>;

  const isAuthor = user?.id === post.authorId;
  const isFounder = user?.role === 'FOUNDER' || user?.role === 'ADMIN';
  const isDepartmentMember = (user as any)?.departmentId === post.departmentId && post.departmentId != null;
  const canChangeStatus = isAuthor || isFounder || isDepartmentMember;
  const canEdit = isAuthor;
  const canDelete = isAuthor || isFounder;
  const isLocked = post.status === 'RESOLVED';

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this post?')) {
      await deletePost(post.id);
      navigate('/feed');
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateStatus(post.id, e.target.value);
  };

  const totalReactions = post.reactions?.length ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <button onClick={() => navigate(-1)} className="text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-2">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="card p-6 lg:p-8 animate-in">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="badge bg-gray-100 text-gray-600 border-gray-200">
              {post.type?.replace('_', ' ')}
            </span>
            <StatusBadge status={post.status} />

            {post.section && (
              <span className="badge bg-brand-light text-brand-primary border border-brand-primary/20">
                {post.section}
              </span>
            )}

            {post.workflowMetrics?.slaStatus === 'BREACHED' && (
              <span className="badge bg-red-100 text-red-700 border border-red-300 animate-pulse flex items-center gap-1">
                <AlertTriangle size={12} /> SLA BREACH
              </span>
            )}

            {post.workflowMetrics?.slaStatus === 'AT_RISK' && (
              <span className="badge bg-orange-100 text-orange-700 border border-orange-300 flex items-center gap-1">
                <AlertTriangle size={12} /> SLA AT RISK
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {canChangeStatus && (
              <select
                className="input py-1.5 text-xs w-auto bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                value={post.status}
                onChange={handleStatusChange}
                disabled={isLocked && !isFounder}
              >
                <option value="OPEN">Open</option>
                <option value="DISCUSSING">Discussing</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            )}
            {canEdit && (
              <button onClick={() => setEditOpen(true)} className="p-1.5 text-gray-500 hover:text-brand-primary bg-gray-50 rounded-lg transition-colors">
                <Edit2 size={16} />
              </button>
            )}
            {canDelete && (!isLocked || isFounder) && (
              <button onClick={handleDelete} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2 leading-snug">
          {post.title}
        </h1>
        {post.postNumber && (
          <p className="text-sm font-medium text-brand-primary mb-6">{post.postNumber}</p>
        )}

        <div className="prose max-w-none text-gray-700 whitespace-pre-wrap mb-6 leading-relaxed">
          <RenderMentionText content={post.description} />
        </div>

        <AttachmentList attachments={post.attachments} />

        {post.resolution && (
          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">Resolution</h4>
            <p className="text-sm text-gray-300">{post.resolution}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4
                        pt-6 mt-6 border-t border-surface-border">
          <div className="flex items-center gap-3">
            <Link to={`/profile/${post.authorId}`} className="ring-2 ring-brand-primary/20 rounded-full p-0.5">
              <Avatar user={post.author} size="md" />
            </Link>
            <div>
              <p className="text-sm font-bold text-gray-900">
                <Link to={`/profile/${post.authorId}`} className="hover:text-brand-primary transition-colors">{post.author?.name}</Link>
              </p>
              <p className="text-xs text-gray-500 font-medium">
                Posted {new Date(post.createdAt).toLocaleString()}
                {post.updatedAt !== post.createdAt && (
                  <span> · Edited {new Date(post.updatedAt).toLocaleString()}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {post.owner && (
              <div className="flex items-center gap-2 bg-[#77f0ec]/10 px-3 py-1.5 rounded-lg border border-[#77f0ec]/30">
                <span className="text-xs font-medium text-[#0a6dd8]">Owner:</span>
                <span className="text-xs text-[#0a6dd8] font-bold">{post.owner.name}</span>
              </div>
            )}
            <button
              onClick={() => {
                if (!isLocked) reactToPost(post.id, '👍');
              }}
              disabled={isLocked}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all
                ${isLocked 
                  ? 'bg-gray-50 border-surface-border text-gray-400 cursor-not-allowed' 
                  : 'bg-white hover:bg-brand-light border-surface-border hover:border-brand-primary/30 text-gray-600 hover:text-brand-primary'}`}
            >
              <ThumbsUp size={16} /> <span>{totalReactions}</span>
            </button>
          </div>
        </div>
      </div>

      <AISummary postId={post.id} initialSummary={post.workflowMetrics?.aiSummaryCache} isLocked={isLocked} />

      <div className="card p-6 lg:p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
          Discussion 
          <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold">
            {post.comments?.length ?? 0}
          </span>
        </h3>
        <CommentThread
          comments={post.comments ?? []}
          postId={post.id}
          onRefresh={() => fetchPost(post.id, true)}
          isLocked={isLocked}
        />
      </div>

      <CreatePostModal
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          fetchPost(post.id, true);
        }}
        post={post}
      />
    </div>
  );
};

export default PostDetailPage;
