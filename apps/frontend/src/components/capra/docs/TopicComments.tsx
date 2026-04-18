import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getAuthHeaders } from '../../../utils/authHeaders.js';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface Comment {
  id: number;
  topic_id: string;
  user_id: number;
  user_name: string | null;
  user_image: string | null;
  content: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

interface TopicCommentsProps {
  topicId: string;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function Avatar({ name, image, size = 28 }: { name: string | null; image: string | null; size?: number }) {
  const initial = (name || '?')[0].toUpperCase();
  const colors = ['#2D8CFF', '#60A5FA', '#a855f7', '#ec4899', '#f43f5e', '#ef4444', '#2D8CFF', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];
  const colorIndex = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  if (image) {
    return (
      <img
        src={image}
        alt={name || 'User'}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-medium"
      style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: colors[colorIndex] }}
    >
      {initial}
    </div>
  );
}

export default function TopicComments({ topicId }: TopicCommentsProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/topic-comments?topicId=${encodeURIComponent(topicId)}`, {
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error('Failed to fetch comments');
      const data = await res.json();
      setComments(data.comments || []);
    } catch {
      // Silently fail — comments are non-critical
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    setLoading(true);
    setComments([]);
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/topic-comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          topicId,
          content: trimmed,
          parentId: replyTo?.id ?? null,
          userName: user?.name || null,
          userImage: user?.image || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to post comment');
      const data = await res.json();
      setComments(prev => [data.comment, ...prev]);
      setContent('');
      setReplyTo(null);
    } catch {
      // Could add error toast here
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (deletingId) return;
    setDeletingId(commentId);
    try {
      const res = await fetch(`${API_URL}/api/topic-comments/${commentId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error('Failed to delete comment');
      setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
    } catch {
      // Could add error toast here
    } finally {
      setDeletingId(null);
    }
  };

  // Organize into threads: top-level comments + their replies
  const topLevel = comments.filter(c => c.parent_id === null);
  const repliesMap = new Map<number, Comment[]>();
  for (const c of comments) {
    if (c.parent_id !== null) {
      const existing = repliesMap.get(c.parent_id) || [];
      existing.push(c);
      repliesMap.set(c.parent_id, existing);
    }
  }

  const totalCount = comments.length;

  return (
    <div
      className="rounded-xl p-5 mt-6"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <h3 className="text-base font-semibold landing-body" style={{ color: 'var(--text-primary)' }}>
        Discussion{totalCount > 0 ? ` \u00B7 ${totalCount} comment${totalCount !== 1 ? 's' : ''}` : ''}
      </h3>

      {/* Comment form */}
      {isAuthenticated && user && (
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Avatar name={user.name || user.email} image={user.image || null} size={22} />
            <span className="text-xs font-medium landing-body" style={{ color: 'var(--text-secondary)' }}>
              {user.name || user.email}
            </span>
          </div>

          {replyTo && (
            <div
              className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg text-xs"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
            >
              <span>Replying to <strong style={{ color: 'var(--text-secondary)' }}>{replyTo.user_name || 'Anonymous'}</strong></span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="ml-auto hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Share your thoughts..."
            rows={3}
            className="w-full rounded-lg px-3 py-2.5 text-sm landing-body resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-shadow"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />

          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40 landing-body"
              style={{ background: 'var(--accent)' }}
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {/* Comment list */}
      <div className={isAuthenticated ? 'mt-4' : 'mt-4'}>
        {loading ? (
          <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading comments...
          </div>
        ) : totalCount === 0 ? (
          <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No comments yet. Be the first to share your thoughts.
          </div>
        ) : (
          <div className="space-y-1">
            {topLevel.map(comment => (
              <CommentThread
                key={comment.id}
                comment={comment}
                replies={repliesMap.get(comment.id) || []}
                currentUserId={user?.id}
                deletingId={deletingId}
                onReply={setReplyTo}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentThread({
  comment,
  replies,
  currentUserId,
  deletingId,
  onReply,
  onDelete,
}: {
  comment: Comment;
  replies: Comment[];
  currentUserId: string | undefined;
  deletingId: number | null;
  onReply: (c: Comment) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div>
      <CommentItem
        comment={comment}
        isOwn={currentUserId != null && String(comment.user_id) === String(currentUserId)}
        isDeleting={deletingId === comment.id}
        onReply={() => onReply(comment)}
        onDelete={() => onDelete(comment.id)}
      />
      {replies.length > 0 && (
        <div className="ml-5 pl-4 space-y-1" style={{ borderLeft: '2px solid var(--border)' }}>
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isOwn={currentUserId != null && String(reply.user_id) === String(currentUserId)}
              isDeleting={deletingId === reply.id}
              onReply={() => onReply(comment)}
              onDelete={() => onDelete(reply.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  isOwn,
  isDeleting,
  onReply,
  onDelete,
}: {
  comment: Comment;
  isOwn: boolean;
  isDeleting: boolean;
  onReply: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-2.5 py-3 group">
      <Avatar name={comment.user_name} image={comment.user_image} size={28} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium landing-body" style={{ color: 'var(--text-primary)' }}>
            {comment.user_name || 'Anonymous'}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {timeAgo(comment.created_at)}
          </span>
        </div>
        <p
          className="text-sm mt-0.5 leading-relaxed landing-body whitespace-pre-wrap break-words"
          style={{ color: 'var(--text-secondary)' }}
        >
          {comment.content}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <button
            type="button"
            onClick={onReply}
            className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            Reply
          </button>
          {isOwn && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
