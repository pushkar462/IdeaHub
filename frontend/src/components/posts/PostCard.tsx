import React from 'react';
import { Link } from 'react-router-dom';
import { Post } from '@/types';
import Avatar from '@/components/shared/Avatar';
import StatusBadge from './StatusBadge';

const categoryColors: Record<string, string> = {
  BUG:         'bg-red-100 text-red-700',
  IMPROVEMENT: 'bg-indigo-100 text-indigo-700',
  SUGGESTION:  'bg-teal-100 text-teal-700',
  FEATURE:     'bg-violet-100 text-violet-700',
  IDEA:        'bg-amber-100 text-amber-700',
  DISCUSSION:  'bg-sky-100 text-sky-700',
  PROBLEM:     'bg-orange-100 text-orange-700',
};

const priorityDot: Record<string, string> = {
  LOW:    'bg-gray-400',
  MEDIUM: 'bg-yellow-400',
  HIGH:   'bg-red-500',
};

interface Props {
  post: Post;
  onReact?: (postId: number, emoji: string) => void;
}

const PostCard: React.FC<Props> = ({ post, onReact }) => {
  const totalReactions = post.reactionCount ?? post.reactions?.length ?? post._count?.reactions ?? 0;
  const commentCount = post.replyCount ?? post._count?.comments ?? post.comments?.length ?? 0;

  return (
    <div className="card p-5 hover:shadow-lg transition-shadow animate-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge ${categoryColors[post.category] ?? 'bg-gray-100 text-gray-600'}`}>
            {post.category.replace('_', ' ')}
          </span>
          <StatusBadge status={post.status} />
          {/* Priority dot */}
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className={`w-2 h-2 rounded-full ${priorityDot[post.priority]}`} />
            {post.priority}
          </span>
          
          {post.department && (
            <span className="badge bg-purple-100 text-purple-700 border border-purple-200">
              {post.department.name}
            </span>
          )}

          {post.assignee && (
            <span className="badge bg-blue-100 text-blue-700 flex items-center gap-1">
              <span>👤</span> {post.assignee.name}
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
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {new Date(post.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Title & Description */}
      <Link to={`/post/${post.id}`} className="group">
        <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors mb-1 line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-2">{post.description}</p>
      </Link>

      {/* Tags */}
      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {post.tags.map((tag) => (
            <span key={tag} className="badge bg-surface text-gray-500 text-xs">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-border">
        {/* Author */}
        <div className="flex items-center gap-2">
          <Avatar user={post.author} size="sm" />
          <div>
            <p className="text-xs font-medium text-gray-700">{post.author?.name}</p>
            <p className="text-xs text-gray-400">{post.author?.role?.replace('_', '/')}</p>
          </div>
        </div>

        {/* Stats & Reactions */}
        <div className="flex items-center gap-3 text-gray-400 text-xs">
          <button
            onClick={() => onReact?.(post.id, '👍')}
            className="flex items-center gap-1 hover:text-brand-500 transition-colors"
          >
            👍 <span>{totalReactions}</span>
          </button>
          <Link
            to={`/post/${post.id}`}
            className="flex items-center gap-1 hover:text-brand-500 transition-colors"
          >
            💬 <span>{commentCount}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
