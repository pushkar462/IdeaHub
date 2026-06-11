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

const PostDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { current: post, loading, fetchPost, updateStatus, deletePost, reactToPost } = usePostStore();
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (id) fetchPost(Number(id));
  }, [id, fetchPost]);

  if (loading) return <Loader />;
  if (!post) return <div className="text-center py-20 text-gray-500">Post not found</div>;

  const isAuthor = user?.id === post.authorId;
  const isFounder = user?.role === 'FOUNDER' || user?.role === 'ADMIN';
  const isDepartmentMember = (user as any)?.departmentId === post.departmentId && post.departmentId != null;
  const canChangeStatus = isAuthor || isFounder || isDepartmentMember;
  const canEdit = isAuthor;
  const canDelete = isAuthor || isFounder;
  const isLocked = post.status === 'DONE';

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
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
        ← Back
      </button>

      <div className="card p-6 lg:p-8 animate-in">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="badge bg-gray-100 text-gray-600">{post.category.replace('_', ' ')}</span>
            <StatusBadge status={post.status} />
            <span className="text-xs font-medium text-gray-400">PRIORITY: {post.priority}</span>

            {post.department && (
              <span className="badge bg-purple-100 text-purple-700 border border-purple-200">
                {post.department.name}
              </span>
            )}

            {post.workflowMetrics?.slaStatus === 'BREACHED' && (
              <span className="badge bg-red-100 text-red-700 animate-pulse border border-red-300">
                🚨 SLA BREACHED
              </span>
            )}

            {post.workflowMetrics?.slaStatus === 'AT_RISK' && (
              <span className="badge bg-orange-100 text-orange-700 border border-orange-300">
                ⚠️ SLA AT RISK
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {canChangeStatus && (
              <select
                className="input py-1 text-xs w-auto bg-gray-50 disabled:cursor-not-allowed disabled:opacity-75"
                value={post.status}
                onChange={handleStatusChange}
                disabled={isLocked && !isFounder}
              >
                <option value="BACKLOG">Backlog</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="BLOCKED">Blocked</option>
                <option value="DONE">Done</option>
              </select>
            )}
            {canEdit && (
              <button onClick={() => setEditOpen(true)} className="text-xs text-brand-600 hover:underline">
                Edit
              </button>
            )}
            {canDelete && (!isLocked || isFounder) && (
              <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">
                Delete
              </button>
            )}
          </div>
        </div>

        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4 leading-snug">
          {post.title}
        </h1>
        <div className="prose max-w-none text-gray-700 whitespace-pre-wrap mb-4">
          <RenderMentionText content={post.description} />
        </div>

        <AttachmentList attachments={post.attachments} />

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 mt-4">
            {post.tags.map(tag => (
              <span key={tag} className="badge bg-surface text-gray-500">#{tag}</span>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4
                        pt-6 border-t border-surface-border">
          <div className="flex items-center gap-3">
            <Link to={`/profile/${post.authorId}`}>
              <Avatar user={post.author} size="md" />
            </Link>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                <Link to={`/profile/${post.authorId}`} className="hover:underline">{post.author?.name}</Link>
              </p>
              <p className="text-xs text-gray-400">
                Posted {new Date(post.createdAt).toLocaleString()}
                {post.updatedAt !== post.createdAt && (
                  <span> · Edited {new Date(post.updatedAt).toLocaleString()}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {post.assignee && (
              <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
                <span className="text-xs font-medium text-purple-700">Assigned to:</span>
                <Avatar user={post.assignee} size="sm" />
                <span className="text-xs text-purple-900 font-medium">{post.assignee.name}</span>
              </div>
            )}
            <button
              onClick={() => {
                if (!isLocked) reactToPost(post.id, '👍');
              }}
              disabled={isLocked}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors
                ${isLocked ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-surface hover:bg-surface-hover border-surface-border text-gray-700'}`}
            >
              👍 <span>{totalReactions}</span>
            </button>
          </div>
        </div>
      </div>

      <AISummary postId={post.id} initialSummary={post.workflowMetrics?.aiSummaryCache} isLocked={isLocked} />

      <div className="card p-6 lg:p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          Discussion <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
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
