import React, { useEffect, useState } from 'react';
import { Comment } from '@/types';
import Avatar from '@/components/shared/Avatar';
import api from '@/api/axios';
import { useAuthStore } from '@/stores/auth.store';
import { MentionsInput, Mention } from 'react-mentions';
import { fetchUsersForMention } from '@/lib/mentions';
import RenderMentionText from '@/components/shared/RenderMentionText';

interface Props {
  comments: Comment[];
  postId: number;
  postOwnerId?: number;
  onRefresh: () => void;
  isLocked?: boolean;
  // AI E2: when this changes (parent stamps a new token per draft), the textarea
  // is pre-filled with `seededDraft`. Non-empty token strings replace any user text.
  draftSeed?: { token: string; text: string; sources?: Array<{ postNumber: string | null; title: string; id: number }>; confidence?: 'high' | 'low' | 'none' } | null;
}

const CommentItem: React.FC<{
  comment: Comment;
  postId: number;
  postOwnerId?: number;
  onRefresh: () => void;
  depth?: number;
  isLocked?: boolean;
}> = ({ comment, postId, postOwnerId, onRefresh, depth = 0, isLocked }) => {
  const { user } = useAuthStore();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [loading, setLoading] = useState(false);

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setLoading(true);
    await api.post('/comments', { postId, content: replyText, parentId: comment.id });
    setReplyText('');
    setShowReply(false);
    setLoading(false);
    onRefresh();
  };

  const submitEdit = async () => {
    if (!editText.trim()) return;
    await api.patch(`/comments/${comment.id}`, { content: editText });
    setEditing(false);
    onRefresh();
  };

  const deleteComment = async () => {
    if (!confirm('Delete this comment?')) return;
    await api.delete(`/comments/${comment.id}`);
    onRefresh();
  };

  const toggleCanonical = async () => {
    await api.patch(`/comments/${comment.id}`, { isCanonical: !comment.isCanonical });
    onRefresh();
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-surface-border pl-4' : ''} mb-4`}>
      {comment.isCanonical && (
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 w-max px-2 py-1 rounded-md border border-green-200">
          <span className="text-green-500">⭐</span> Canonical Answer
        </div>
      )}
      <div className={`flex gap-3 ${comment.isCanonical ? 'bg-green-50/30 p-3 rounded-xl border border-green-100' : ''}`}>
        <Avatar user={comment.author} size="sm" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-800">{comment.author?.name}</span>
            <span className="text-xs text-gray-400">
              {new Date(comment.createdAt).toLocaleString()}
            </span>
          </div>

          {editing ? (
            <div className="space-y-2">
              <textarea
                className="input text-sm min-h-[60px] resize-y"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={submitEdit} className="btn-primary text-xs py-1 px-3">Save</button>
                <button onClick={() => setEditing(false)} className="btn-ghost text-xs py-1 px-3">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap"><RenderMentionText content={comment.content} /></p>
          )}

          {/* Reactions */}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-400">{comment.reactions?.length ?? 0} 👍</span>
            {!isLocked && (
              <>
                <button
                  onClick={() => setShowReply(!showReply)}
                  className="text-xs text-gray-400 hover:text-brand-500 transition-colors"
                >
                  Reply
                </button>
                {user?.id === comment.authorId && (
                  <>
                    <button onClick={() => setEditing(true)}
                      className="text-xs text-gray-400 hover:text-brand-500 transition-colors">
                      Edit
                    </button>
                    <button onClick={deleteComment}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                      Delete
                    </button>
                  </>
                )}
                {user?.id === postOwnerId && (
                  <button onClick={toggleCanonical}
                    className={`text-xs transition-colors ${comment.isCanonical ? 'text-green-600 font-bold hover:text-green-700' : 'text-gray-400 hover:text-green-600'}`}>
                    {comment.isCanonical ? 'Unmark Canonical' : 'Mark Canonical'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Reply form */}
          {showReply && (
            <div className="mt-3 flex gap-2">
              <div className="flex-1 border border-surface-border rounded-lg focus-within:ring-2 focus-within:ring-brand-500 overflow-hidden bg-white">
                <MentionsInput
                  className="mentions-input text-sm w-full outline-none"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply…"
                  style={{
                    control: { minHeight: 60 },
                    input: { margin: 0, padding: 8, border: 'none', outline: 'none' },
                    highlighter: { padding: 8, border: 'none' },
                    suggestions: {
                      list: { backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', zIndex: 10 },
                      item: { padding: '8px 12px', borderBottom: '1px solid #f3f4f6' },
                    },
                  }}
                >
                  <Mention trigger="@" data={fetchUsersForMention} displayTransform={(id, display) => `@${display}`} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px' }} />
                </MentionsInput>
              </div>
              <button onClick={submitReply} disabled={loading} className="btn-primary self-end">
                {loading ? '…' : 'Send'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={reply} postId={postId} postOwnerId={postOwnerId} onRefresh={onRefresh} depth={depth + 1} isLocked={isLocked} />
      ))}
    </div>
  );
};

const CommentThread: React.FC<Props> = ({ comments, postId, postOwnerId, onRefresh, isLocked, draftSeed }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [seededFromDraft, setSeededFromDraft] = useState(false);
  const [lastDraftToken, setLastDraftToken] = useState<string | null>(null);

  useEffect(() => {
    if (draftSeed && draftSeed.token && draftSeed.token !== lastDraftToken && draftSeed.text) {
      setText(draftSeed.text);
      setSeededFromDraft(true);
      setLastDraftToken(draftSeed.token);
    }
  }, [draftSeed, lastDraftToken]);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    await api.post('/comments', { postId, content: text });
    setText('');
    setSeededFromDraft(false);
    setLoading(false);
    onRefresh();
  };

  return (
    <div>
      {/* New comment box */}
      {isLocked ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center mb-6">
          <p className="text-sm text-gray-600">🔒 This post is marked as Done and is locked for new comments.</p>
        </div>
      ) : (
        <div className="mb-6">
          {seededFromDraft && (
            <div className="mb-2 flex items-center flex-wrap gap-2 bg-purple-50 border border-purple-200 rounded-t-lg px-3 py-2 text-xs text-purple-800">
              <span className="font-bold">✨ AI draft — review before posting</span>
              {draftSeed?.confidence && draftSeed.confidence !== 'none' && (
                <span className={`px-1.5 py-0.5 rounded-md font-semibold ${draftSeed.confidence === 'high' ? 'bg-purple-200' : 'bg-purple-100'}`}>
                  {draftSeed.confidence} confidence
                </span>
              )}
              {draftSeed?.sources?.map((s) => (
                <a key={s.id} href={`/post/${s.id}`} className="badge bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 text-[10px] font-mono">
                  {s.postNumber ?? `#${s.id}`}
                </a>
              ))}
              <button
                type="button"
                onClick={() => { setText(''); setSeededFromDraft(false); }}
                className="ml-auto text-purple-500 hover:text-purple-700"
              >
                Discard draft
              </button>
            </div>
          )}
        <div className="flex gap-3">
          <div className={`flex-1 border rounded-lg focus-within:ring-2 focus-within:ring-brand-500 overflow-hidden bg-white ${seededFromDraft ? 'border-purple-200 rounded-t-none' : 'border-surface-border'}`}>
            <MentionsInput
              className="mentions-input text-sm w-full outline-none"
              value={text}
              onChange={(e) => { setText(e.target.value); if (seededFromDraft && !e.target.value) setSeededFromDraft(false); }}
              placeholder="Write a comment… use @name to mention someone"
              style={{
                control: { minHeight: 72 },
                input: { margin: 0, padding: 12, border: 'none', outline: 'none' },
                highlighter: { padding: 12, border: 'none' },
                suggestions: {
                  list: { backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', zIndex: 10 },
                  item: { padding: '8px 12px', borderBottom: '1px solid #f3f4f6' },
                },
              }}
            >
              <Mention trigger="@" data={fetchUsersForMention} displayTransform={(id, display) => `@${display}`} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px' }} />
            </MentionsInput>
          </div>
          <button onClick={submit} disabled={loading} className="btn-primary self-end">
            {loading ? '…' : 'Comment'}
          </button>
        </div>
        </div>
      )}

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No comments yet. Be the first!</p>
      ) : (
        [...comments].sort((a, b) => {
          if (a.isCanonical && !b.isCanonical) return -1;
          if (!a.isCanonical && b.isCanonical) return 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }).map((c) => (
          <CommentItem key={c.id} comment={c} postId={postId} postOwnerId={postOwnerId} onRefresh={onRefresh} isLocked={isLocked} />
        ))
      )}
    </div>
  );
};

export default CommentThread;
