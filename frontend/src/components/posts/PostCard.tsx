import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Post } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import Avatar from '@/components/shared/Avatar';
import StatusBadge from './StatusBadge';
import AttachmentList from './AttachmentList';
import {
  MoreVertical, Edit2, Trash2, MessageSquare, ThumbsUp,
  AlertTriangle, HelpCircle, Lightbulb, Megaphone,
} from 'lucide-react';

// Handbook + redesign: exactly one color per type. Left border is the visual
// grouping cue; the badge itself is a quiet pill that echoes the same hue.
const typeAccent: Record<string, { hex: string; label: string; icon: any }> = {
  QUESTION: { hex: '#8018de', label: 'Question', icon: HelpCircle    },
  PROBLEM:  { hex: '#f15d24', label: 'Problem',  icon: AlertTriangle },
  IDEA:     { hex: '#fec530', label: 'Idea',     icon: Lightbulb     },
};

// SLA dot color: green healthy / amber at-risk / red breached. Tooltip labels
// the state for accessibility — never color-alone.
const slaColor: Record<string, { hex: string; label: string }> = {
  HEALTHY:  { hex: '#2ac25d', label: 'On track — within SLA'   },
  AT_RISK:  { hex: '#fec530', label: 'At risk — nearing SLA'   },
  BREACHED: { hex: '#f15d24', label: 'Breached — past SLA'     },
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
  const isAdmin  = user?.role === 'FOUNDER' || user?.role === 'ADMIN';
  const canEdit   = isAuthor;
  const canDelete = isAuthor || isAdmin;
  const showMenu  = canEdit || canDelete;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const totalReactions = post.reactionCount ?? post.reactions?.length ?? post._count?.reactions ?? 0;
  const commentCount   = post.replyCount ?? post._count?.comments ?? post.comments?.length ?? 0;
  const type           = typeAccent[post.type] ?? { hex: '#737373', label: post.type, icon: HelpCircle };
  const TypeIcon       = type.icon;
  const sla            = post.workflowMetrics?.slaStatus ? slaColor[post.workflowMetrics.slaStatus] : null;
  const isBreached     = post.workflowMetrics?.slaStatus === 'BREACHED';

  const handleDelete = () => {
    setMenuOpen(false);
    if (confirm('Delete this post? This cannot be undone.')) onDelete?.(post.id);
  };

  return (
    <div
      className="card-interactive p-5 group relative overflow-hidden"
      style={{ borderLeft: `3px solid ${type.hex}` }}
    >
      {/* ── Top row: type + section + refs + status + SLA ────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
            style={{ color: type.hex, borderColor: type.hex + '55', backgroundColor: type.hex + '10' }}
          >
            <TypeIcon size={11} /> {type.label}
          </span>

          <span className="text-[11px] font-mono text-gray-500">{post.postNumber || `#${post.id}`}</span>

          {post.section && (
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              {post.section}
            </span>
          )}

          {post.linkedEntityType && post.linkedEntityId && (
            <span
              className="text-[11px] font-mono text-brand-primary bg-brand-light/50 px-1.5 py-0.5 rounded"
              title={`Linked ${post.linkedEntityType.toLowerCase()}`}
            >
              [{post.linkedEntityType}] {post.linkedEntityId}
            </span>
          )}

          {post.campaign && (
            <Link
              to={`/campaigns/${post.campaign.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-primary hover:underline"
              title={post.campaign.title}
            >
              <Megaphone size={10} />
              {post.campaign.title.length > 22 ? post.campaign.title.slice(0, 22) + '…' : post.campaign.title}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {sla && (
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: sla.hex, boxShadow: isBreached ? `0 0 0 3px ${sla.hex}22` : undefined }}
              title={sla.label}
              aria-label={sla.label}
            />
          )}
          <StatusBadge status={post.status} />
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

      {/* ── Title + body ─────────────────────────────────────────── */}
      <Link to={`/post/${post.id}`} className="block">
        <h3 className="text-[17px] font-bold text-gray-900 group-hover:text-brand-primary transition-colors mb-1 leading-snug line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
          {post.description}
        </p>
      </Link>

      <AttachmentList attachments={post.attachments} compact />

      {/* ── Bottom row: author · owner · counts ──────────────────── */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar user={post.author} size="sm" />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-gray-800 truncate">{post.author?.name}</p>
            <p className="text-[10px] text-gray-500 truncate">
              {post.owner && post.owner.id !== post.author?.id
                ? <>owner: <span className="text-gray-700 font-medium">{post.owner.name}</span></>
                : <>{new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-gray-500 text-xs font-medium">
          <button
            onClick={(e) => { e.preventDefault(); onReact?.(post.id, '👍'); }}
            className="flex items-center gap-1 hover:text-brand-primary hover:bg-brand-light px-2 py-1 rounded-md transition-all"
            aria-label="Like"
          >
            <ThumbsUp size={13} /> <span>{totalReactions}</span>
          </button>
          <Link
            to={`/post/${post.id}`}
            className="flex items-center gap-1 hover:text-brand-primary hover:bg-brand-light px-2 py-1 rounded-md transition-all"
            aria-label="Comments"
          >
            <MessageSquare size={13} /> <span>{commentCount}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
