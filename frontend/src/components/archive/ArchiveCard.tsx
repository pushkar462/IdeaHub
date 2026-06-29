import React from 'react';
import { Link } from 'react-router-dom';
import { Post } from '@/types';
import Avatar from '@/components/shared/Avatar';
import StatusBadge from '@/components/posts/StatusBadge';

interface Props { post: Post }

const typeIcon: Record<string, string> = {
  BUG: '🐛', IMPROVEMENT: '⚡', SUGGESTION: '💬',
  FEATURE: '🚀', IDEA: '💡', DISCUSSION: '🗨️', PROBLEM: '⚠️',
};

const ArchiveCard: React.FC<Props> = ({ post }) => (
  <div className="card p-5 hover:shadow-md transition-shadow animate-in">
    <div className="flex items-start gap-3 mb-3">
      <span className="text-2xl">{typeIcon[post.type] ?? '📄'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <StatusBadge status={post.status} />
          <span className="badge bg-gray-100 text-gray-500 text-xs">{post.type}</span>
        </div>
        <Link to={`/post/${post.id}`} className="group">
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors truncate">
            {post.title}
          </h3>
        </Link>
        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{post.description}</p>
      </div>
    </div>



    <div className="flex items-center justify-between text-xs text-gray-400">
      <div className="flex items-center gap-2">
        <Avatar user={post.author} size="sm" />
        <span>{post.author?.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <span>💬 {post._count?.comments ?? 0}</span>
        <span>👍 {post._count?.reactions ?? 0}</span>
        <span>{new Date(post.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  </div>
);

export default ArchiveCard;
