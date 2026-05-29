import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePostStore } from '@/stores/post.store';
import { useAuthStore } from '@/stores/auth.store';
import Loader from '@/components/shared/Loader';
import Avatar from '@/components/shared/Avatar';
import StatusBadge from '@/components/posts/StatusBadge';
import CommentThread from '@/components/posts/CommentThread';

const PostDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { current: post, loading, fetchPost, updateStatus, deletePost, reactToPost } = usePostStore();

  useEffect(() => {
    if (id) fetchPost(Number(id));
  }, [id, fetchPost]);

  if (loading) return <Loader />;
  if (!post) return <div className="text-center py-20 text-gray-500">Post not found</div>;

  const isAuthor = user?.id === post.authorId;
  const isFounder = user?.role === 'FOUNDER' || user?.role === 'ADMIN';
  const canEdit = isAuthor || isFounder;

  const handleDelete = async () => {
    if (confirm('Delete this post permanently?')) {
      await deletePost(post.id);
      navigate(-1);
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateStatus(post.id, e.target.value);
  };

  const totalReactions = post.reactions?.length ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
        ← Back
      </button>

      {/* Main Post Card */}
      <div className="card p-6 lg:p-8 animate-in">
        {/* Header Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="badge bg-gray-100 text-gray-600">{post.category.replace('_', ' ')}</span>
            <StatusBadge status={post.status} />
            <span className="text-xs font-medium text-gray-400">PRIORITY: {post.priority}</span>
          </div>
          <div className="flex items-center gap-3">
            {canEdit && (
              <select
                className="input py-1 text-xs w-auto bg-gray-50"
                value={post.status}
                onChange={handleStatusChange}
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            )}
            {canEdit && (
              <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4 leading-snug">
          {post.title}
        </h1>
        <div className="prose max-w-none text-gray-700 whitespace-pre-wrap mb-8">
          {post.description}
        </div>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map(tag => (
              <span key={tag} className="badge bg-surface text-gray-500">#{tag}</span>
            ))}
          </div>
        )}

        {/* Footer: Author & Assignee */}
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
              onClick={() => reactToPost(post.id, '👍')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover
                         transition-colors border border-surface-border text-sm font-medium text-gray-700"
            >
              👍 <span>{totalReactions}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Discussion Thread */}
      <div className="card p-6 lg:p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          Discussion <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
            {post.comments?.length ?? 0}
          </span>
        </h3>
        <CommentThread
          comments={post.comments ?? []}
          postId={post.id}
          onRefresh={() => fetchPost(post.id)}
        />
      </div>
    </div>
  );
};

export default PostDetailPage;
