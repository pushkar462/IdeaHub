import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Post } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import Avatar from '@/components/shared/Avatar';
import StatusBadge from './StatusBadge';
import AttachmentList from './AttachmentList';
import { MoreVertical, Edit2, Trash2, MessageSquare, ThumbsUp, AlertTriangle } from 'lucide-react';

const typeColors: Record<string, string> = {
  BUG:         'bg-transparent text-red-500 border-red-500',
  IMPROVEMENT: 'bg-transparent text-indigo-500 border-indigo-500',
  SUGGESTION:  'bg-transparent text-teal-500 border-teal-500',
  FEATURE:     'bg-transparent text-violet-500 border-violet-500',
  IDEA:        'bg-transparent text-brand-primary border-brand-primary', 
  DISCUSSION:  'bg-transparent text-sky-500 border-sky-500',
  PROBLEM:     'bg-transparent text-orange-500 border-orange-500',
  QUESTION:    'bg-transparent text-purple-500 border-purple-500',
};

interface Props {
  post: Post;
  onReact?: (postId: number, emoji: string) => void;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: number) => void;
}

const PostCard: React.FC<Props> = ({ post, onReact, onEdit, onDelete }) => {
  const { user } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAuthor = user?.id === post.authorId;
  const isAdmin = user?.role === 'FOUNDER' || user?.role === 'ADMIN';
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;
  const showMenu = canEdit || canDelete;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const totalReactions = post.reactionCount ?? post.reactions?.length ?? post._count?.reactions ?? 0;
  const commentCount = post.replyCount ?? post._count?.comments ?? post.comments?.length ?? 0;

  const handleDelete = () => {
    setMenuOpen(false);
    if (confirm('Are you sure you want to delete this post?')) {
      onDelete?.(post.id);
    }
  };

  return (
    <div className="card-interactive p-5 group">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <span className={`badge ${typeColors[post.type] ?? 'bg-transparent text-gray-500 border-gray-400'}`}>
            {post.type?.replace('_', ' ')}
          </span>
          <StatusBadge status={post.status} />

          {post.section && (
            <span className="badge bg-transparent text-[#b070f0] border-[#b070f0]">
              {post.section}
            </span>
          )}

          {post.linkedEntityType && post.linkedEntityId && (
            <span className="badge bg-transparent text-indigo-500 border-indigo-500">
              [{post.linkedEntityType}] {post.linkedEntityId}
            </span>
          )}

          {post.owner && (
            <span className="badge bg-transparent text-[#77f0ec] border-[#77f0ec] flex items-center gap-1">
              {post.owner.name}
            </span>
          )}

          {post.workflowMetrics?.slaStatus === 'BREACHED' && (
            <span className="badge bg-red-100 text-red-700 border border-red-300 animate-pulse flex items-center gap-1">
              <AlertTriangle size={12} /> SLA BREACH
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
            {post.postNumber || new Date(post.createdAt).toLocaleDateString()}
          </span>
          {showMenu && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => { e.preventDefault(); setMenuOpen((o) => !o); }}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="Post actions"
              >
                <MoreVertical size={16} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-surface-border rounded-xl shadow-lg z-10 py-1 overflow-hidden">
                  {canEdit && (
                    <button
                      onClick={(e) => { e.preventDefault(); setMenuOpen(false); onEdit?.(post); }}
                      className="w-full flex items-center gap-2 text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand-primary transition-colors"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={(e) => { e.preventDefault(); handleDelete(); }}
                      className="w-full flex items-center gap-2 text-left px-3 py-2.5 text-sm text-accent-orange hover:bg-accent-orange/10 transition-colors"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Link to={`/post/${post.id}`} className="block">
        <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-primary transition-colors mb-2 line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
          {post.description}
        </p>
      </Link>

      <div className="mt-4">
        <AttachmentList attachments={post.attachments} compact />
      </div>

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-surface-border">
        <div className="flex items-center gap-3">
          <Avatar user={post.author} size="sm" />
          <div>
            <p className="text-xs font-bold text-gray-800">{post.author?.name}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{post.author?.role?.replace('_', '/')}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-gray-500 text-xs font-semibold">
          <button
            onClick={(e) => { e.preventDefault(); onReact?.(post.id, '👍'); }}
            className="flex items-center gap-1.5 hover:text-brand-primary hover:bg-brand-light px-2 py-1 rounded-md transition-all"
          >
            <ThumbsUp size={14} /> <span>{totalReactions}</span>
          </button>
          <Link
            to={`/post/${post.id}`}
            className="flex items-center gap-1.5 hover:text-[#0a6dd8] hover:bg-blue-50 px-2 py-1 rounded-md transition-all"
          >
            <MessageSquare size={14} /> <span>{commentCount}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
