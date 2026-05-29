import React, { useState } from 'react';
import { Comment } from '@/types';
import Avatar from '@/components/shared/Avatar';
import api from '@/api/axios';
import { useAuthStore } from '@/stores/auth.store';

interface Props {
  comments: Comment[];
  postId: number;
  onRefresh: () => void;
}

const CommentItem: React.FC<{
  comment: Comment;
  postId: number;
  onRefresh: () => void;
  depth?: number;
}> = ({ comment, postId, onRefresh, depth = 0 }) => {
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

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-surface-border pl-4' : ''} mb-4`}>
      <div className="flex gap-3">
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
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          )}

          {/* Reactions */}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-400">{comment.reactions?.length ?? 0} 👍</span>
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
          </div>

          {/* Reply form */}
          {showReply && (
            <div className="mt-3 flex gap-2">
              <textarea
                className="input text-sm flex-1 min-h-[60px] resize-none"
                placeholder="Write a reply…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <button onClick={submitReply} disabled={loading} className="btn-primary self-end">
                {loading ? '…' : 'Send'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={reply} postId={postId} onRefresh={onRefresh} depth={depth + 1} />
      ))}
    </div>
  );
};

const CommentThread: React.FC<Props> = ({ comments, postId, onRefresh }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    await api.post('/comments', { postId, content: text });
    setText('');
    setLoading(false);
    onRefresh();
  };

  return (
    <div>
      {/* New comment box */}
      <div className="flex gap-3 mb-6">
        <textarea
          className="input text-sm flex-1 min-h-[72px] resize-none"
          placeholder="Write a comment… use @name to mention someone"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button onClick={submit} disabled={loading} className="btn-primary self-end">
          {loading ? '…' : 'Comment'}
        </button>
      </div>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No comments yet. Be the first!</p>
      ) : (
        comments.map((c) => (
          <CommentItem key={c.id} comment={c} postId={postId} onRefresh={onRefresh} />
        ))
      )}
    </div>
  );
};

export default CommentThread;
