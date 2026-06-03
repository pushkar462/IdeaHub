import React from 'react';
import { Link } from 'react-router-dom';
import { Post } from '@/types';
import Avatar from '@/components/shared/Avatar';
import StatusBadge from '@/components/posts/StatusBadge';

interface Props {
  post: Post;
  onApprove?: (id: number) => void;
  onReact?: (id: number, emoji: string) => void;
}

const IdeaCard: React.FC<Props> = ({ post, onApprove, onReact }) => {
  const reactions = post.reactions ?? [];
  const thumbsUp = reactions.filter((r) => r.emoji === '👍').length;

  return (
    <div className="card p-5 hover:shadow-lg transition-shadow animate-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg">💡</span>
          <StatusBadge status={post.status} />
          {post.department && (
            <span className="badge bg-purple-100 text-purple-700 border border-purple-200">
              {post.department.name}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>

      <Link to={`/post/${post.id}`} className="group">
        <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors mb-1">
          {post.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-3">{post.description}</p>
      </Link>

      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {post.tags.map((tag) => (
            <span key={tag} className="badge bg-amber-50 text-amber-600 text-xs">#{tag}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-border">
        <div className="flex items-center gap-2">
          <Avatar user={post.author} size="sm" />
          <span className="text-xs text-gray-600">{post.author?.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onReact?.(post.id, '👍')}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-500 transition-colors"
          >
            👍 <span>{thumbsUp}</span>
          </button>
          {onApprove && (post.status === 'TODO' || post.status === 'BACKLOG') && (
            <button
              onClick={() => onApprove(post.id)}
              className="btn-primary text-xs py-1 px-3"
            >
              ✓ Approve
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdeaCard;
