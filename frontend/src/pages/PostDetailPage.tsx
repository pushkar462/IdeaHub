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
import ResolveModal from '@/components/posts/ResolveModal';
import SimilarPosts from '@/components/posts/SimilarPosts';
import api from '@/api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit2, Trash2, ThumbsUp, AlertTriangle, MoreVertical, BookOpen, Sparkles, CheckCircle2, ExternalLink, ArrowBigUp } from 'lucide-react';

const PostDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { current: post, loading, fetchPost, updateStatus, deletePost, reactToPost, votePost, updatePost } = usePostStore();
  const [editOpen, setEditOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [useCaseMenuOpen, setUseCaseMenuOpen] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftSeed, setDraftSeed] = useState<{
    token: string;
    text: string;
    sources?: Array<{ postNumber: string | null; title: string; id: number }>;
    confidence?: 'high' | 'low' | 'none';
  } | null>(null);

  useEffect(() => {
    if (id) fetchPost(Number(id));
  }, [id, fetchPost]);

  if (loading) return <div className="pt-20"><Loader /></div>;
  if (!post) return <div className="text-center py-20 text-gray-500 font-medium">Post not found</div>;

  const isAuthor = user?.id === post.authorId;
  const isOwner = user?.id === post.ownerId;
  const isFounder = user?.role === 'FOUNDER' || user?.role === 'ADMIN';
  
  const canStartDiscussing = isOwner || isFounder;
  const canResolve = isOwner || isFounder || (post.type === 'QUESTION' && isAuthor);
  
  const canEdit = isAuthor;
  const canDelete = isAuthor || isFounder;
  const isLocked = post.status === 'RESOLVED';

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this post?')) {
      await deletePost(post.id);
      navigate('/feed');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    await updateStatus(post.id, newStatus);
    await fetchPost(post.id, true);
  };

  const generateDraft = async () => {
    if (!post) return;
    setDraftLoading(true);
    try {
      const res = await api.post(`/intelligence/draft-response/${post.id}`);
      const payload = res.data?.data ?? res.data;
      if (!payload || !payload.draft) {
        toast('No relevant resolved posts found — draft manually.', { icon: '📝' });
      } else {
        setDraftSeed({
          token: `${post.id}-${Date.now()}`,
          text: payload.draft,
          sources: payload.sources ?? [],
          confidence: payload.confidence,
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate draft');
    } finally {
      setDraftLoading(false);
    }
  };

  const toggleUseCase = async () => {
    try {
      const payload = new FormData();
      payload.append('isUseCase', String(!post.isUseCase));
      await updatePost(post.id, payload);
      await fetchPost(post.id, true);
      toast.success(post.isUseCase ? 'Use Case flag removed' : 'Post graduated to Use Case');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update Use Case flag');
    }
  };

  const totalReactions = post.reactions?.length ?? 0;

  // Handbook D2: hoist the canonical comment into a green block above the thread.
  const canonicalComment = post.comments?.find((c) => c.isCanonical);
  const threadComments = canonicalComment
    ? (post.comments ?? []).filter((c) => c.id !== canonicalComment.id)
    : (post.comments ?? []);

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

            {post.linkedEntityType && post.linkedEntityId && (
              <a
                href={
                  post.linkedEntityType === 'BILL' ? `${import.meta.env.VITE_CRM_BILL_BASE_URL || '#'}${post.linkedEntityId}` :
                  post.linkedEntityType === 'CASE' ? `${import.meta.env.VITE_CRM_CASE_BASE_URL || '#'}${post.linkedEntityId}` :
                  `${import.meta.env.VITE_CRM_PARTNER_BASE_URL || '#'}${post.linkedEntityId}`
                }
                target="_blank"
                rel="noreferrer"
                className="badge bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                [{post.linkedEntityType}] {post.linkedEntityId} ↗
              </a>
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

            {post.isUseCase && (
              <span className="badge bg-yellow-100 text-yellow-800 border-yellow-300 flex items-center gap-1">
                <BookOpen size={12} /> Graduated: Use Case
              </span>
            )}

            {post.campaign && (
              <Link
                to={`/campaigns/${post.campaign.id}`}
                className="badge bg-brand-light text-brand-primary border border-brand-primary/30 hover:bg-brand-primary/20 transition-colors flex items-center gap-1"
              >
                📣 {post.campaign.title}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            {canStartDiscussing && post.status === 'OPEN' && (
              <button
                onClick={() => handleStatusChange('DISCUSSING')}
                className="btn-primary text-xs py-1.5 px-4"
              >
                Start Discussing
              </button>
            )}
            
            {canResolve && post.status === 'DISCUSSING' && (
              <button
                onClick={() => setResolveOpen(true)}
                className="btn-primary text-xs py-1.5 px-4 bg-green-600 hover:bg-green-700 border-green-600"
              >
                Mark Resolved
              </button>
            )}

            {isFounder && post.status === 'RESOLVED' && (
              <button
                onClick={() => handleStatusChange('OPEN')}
                className="btn-ghost text-xs py-1.5 px-4 text-gray-500"
              >
                Reopen
              </button>
            )}

            {(isOwner || isFounder) && (
              <div className="relative">
                <button 
                  onClick={() => setUseCaseMenuOpen(!useCaseMenuOpen)}
                  className="p-1.5 text-gray-500 hover:text-brand-primary bg-gray-50 rounded-lg transition-colors"
                >
                  <MoreVertical size={16} />
                </button>
                {useCaseMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUseCaseMenuOpen(false)}></div>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-surface-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                      <button
                        onClick={() => { setUseCaseMenuOpen(false); toggleUseCase(); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-primary transition-colors"
                      >
                        {post.isUseCase ? 'Remove Use Case Flag' : 'Graduate to Use Case'}
                      </button>
                    </div>
                  </>
                )}
              </div>
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
            <p className="text-sm text-gray-700 font-medium">{post.resolution}</p>
            {post.resolutionReason && (
              <p className="text-sm text-gray-600 mt-2 italic">{post.resolutionReason}</p>
            )}
            {post.buildIssueUrl && (
              <a
                href={post.buildIssueUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary hover:underline"
              >
                <ExternalLink size={14} /> → GitHub issue
              </a>
            )}
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
            {post.type === 'IDEA' && (
              <button
                onClick={() => votePost(post.id)}
                aria-pressed={!!post.hasVoted}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all
                  ${post.hasVoted
                    ? 'bg-brand-light border-brand-primary/40 text-brand-primary'
                    : 'bg-white hover:bg-brand-light border-surface-border hover:border-brand-primary/30 text-gray-600 hover:text-brand-primary'}`}
              >
                <ArrowBigUp size={16} className={post.hasVoted ? 'fill-brand-primary' : ''} />
                <span>{post.voteCount ?? 0}</span>
              </button>
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

      <SimilarPosts postId={post.id} />

      {canonicalComment && (
        <div className="card p-6 lg:p-8 border-l-4 border-l-green-500 bg-green-50/40">
          <div className="flex items-center gap-2 text-sm font-bold text-green-700 mb-3">
            <CheckCircle2 size={16} /> Canonical answer
            {post.owner && (
              <span className="text-xs font-medium text-gray-500">· marked by {post.owner.name}</span>
            )}
          </div>
          <div className="prose max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed">
            <RenderMentionText content={canonicalComment.content} />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <Avatar user={canonicalComment.author} size="sm" />
            <span className="font-semibold text-gray-700">{canonicalComment.author?.name}</span>
            <span>· {new Date(canonicalComment.createdAt).toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="card p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
            Discussion
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold">
              {threadComments.length}
            </span>
          </h3>
          {(isOwner || isFounder) && post.type === 'QUESTION' && (post.status === 'OPEN' || post.status === 'DISCUSSING') && (
            <button
              type="button"
              onClick={generateDraft}
              disabled={draftLoading}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 flex items-center gap-1.5 disabled:opacity-60"
            >
              <Sparkles size={14} />
              {draftLoading ? 'Drafting…' : 'Generate draft response'}
            </button>
          )}
        </div>
        <CommentThread
          comments={threadComments}
          postId={post.id}
          postOwnerId={post.ownerId}
          onRefresh={() => fetchPost(post.id, true)}
          isLocked={isLocked}
          draftSeed={draftSeed}
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

      <ResolveModal
        isOpen={resolveOpen}
        onClose={() => setResolveOpen(false)}
        postId={post.id}
        postType={post.type}
      />
    </div>
  );
};

export default PostDetailPage;
