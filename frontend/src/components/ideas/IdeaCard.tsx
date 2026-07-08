import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowBigUp } from 'lucide-react';
import { Post } from '@/types';
import Avatar from '@/components/shared/Avatar';
import StatusBadge from '@/components/posts/StatusBadge';

interface Props {
  post: Post;
  onApprove?: (id: number) => void;
  onVote?: (id: number) => void;
}

const IdeaCard: React.FC<Props> = ({ post, onApprove, onVote }) => {
  const voteCount = post.voteCount ?? 0;
  const hasVoted  = Boolean(post.hasVoted);

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

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-border">
        <div className="flex items-center gap-2">
          <Avatar user={post.author} size="sm" />
          <span className="text-xs text-gray-600">{post.author?.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onVote?.(post.id)}
            aria-pressed={hasVoted}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
              hasVoted
                ? 'bg-brand-light text-brand-primary border-brand-primary/40'
                : 'bg-white text-gray-500 border-surface-border hover:text-brand-primary hover:border-brand-primary/30'
            }`}
          >
            <ArrowBigUp size={14} className={hasVoted ? 'fill-brand-primary' : ''} />
            <span>{voteCount}</span>
          </button>
          {onApprove && (post.status === 'OPEN' || post.status === 'DISCUSSING') && (
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
