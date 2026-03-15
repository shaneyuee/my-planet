import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import MarkdownRenderer from './MarkdownRenderer';
import MentionInput from './MentionInput';

function timeAgo(dateStr) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

function CommentItem({ comment, postId, circleId, onReply, depth = 0 }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(comment._liked || false);
  const [likeCount, setLikeCount] = useState(comment.like_count || 0);
  const [plusOned, setPlusOned] = useState(comment._plusOned || false);
  const [plusOneCount, setPlusOneCount] = useState(comment.plus_one_count || 0);

  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await api.toggleLike({
        target_type: 'comment',
        target_id: comment.id,
        ...(circleId ? { circle_id: circleId } : {}),
      });
      setLiked(res.liked);
      setLikeCount((prev) => (res.liked ? prev + 1 : prev - 1));
    } catch (err) {
      console.error('点赞失败', err);
    }
  };

  const handlePlusOne = async () => {
    if (!user) return;
    try {
      const res = await api.togglePlusOne({
        comment_id: comment.id,
        ...(circleId ? { circle_id: circleId } : {}),
      });
      setPlusOned(res.plusOned);
      setPlusOneCount((prev) => (res.plusOned ? prev + 1 : prev - 1));
    } catch (err) {
      console.error('+1失败', err);
    }
  };

  const maxDepth = 3;

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-100 pl-4' : ''} mb-3`}>
      <div className="flex items-start gap-2">
        <img
          src={comment.avatar || '/default-avatar.png'}
          alt="头像"
          className="w-7 h-7 rounded-full object-cover mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold text-gray-700">
              {comment.nickname || comment.username || '匿名'}
            </span>
            {comment.reply_to_nickname && (
              <span className="text-xs text-gray-400">
                回复 <span className="text-indigo-500">{comment.reply_to_nickname}</span>
              </span>
            )}
            <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
          </div>
          <MarkdownRenderer content={comment.content} className="text-sm text-gray-800 leading-relaxed" />
          <div className="flex items-center gap-4 mt-1">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-xs transition-colors ${
                liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
            <button
              onClick={handlePlusOne}
              className={`flex items-center gap-1 text-xs transition-colors ${
                plusOned ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600'
              }`}
            >
              <span className="font-bold">+1</span>
              {plusOneCount > 0 && <span>{plusOneCount}</span>}
            </button>
            {user && depth < maxDepth && (
              <button
                onClick={() => onReply(comment)}
                className="text-xs text-gray-400 hover:text-indigo-500 transition-colors"
              >
                回复
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              circleId={circleId}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({ postId, circleId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const data = await api.getComments(postId, circleId);
      setComments(buildTree(Array.isArray(data) ? data : data.comments || []));
    } catch (err) {
      console.error('加载评论失败', err);
    } finally {
      setLoading(false);
    }
  }, [postId, circleId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  function buildTree(flatComments) {
    const map = {};
    const roots = [];
    flatComments.forEach((c) => {
      map[c.id] = { ...c, replies: [] };
    });
    flatComments.forEach((c) => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].replies.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });
    return roots;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.createComment({
        post_id: postId,
        content: content.trim(),
        parent_id: replyTo?.id || null,
        ...(circleId ? { circle_id: circleId } : {}),
      });
      setContent('');
      setReplyTo(null);
      await fetchComments();
    } catch (err) {
      alert('评论失败: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = (comment) => {
    setReplyTo(comment);
    setContent('');
  };

  if (loading) {
    return (
      <div className="py-6 text-center text-gray-400 text-sm">加载评论中...</div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        评论 {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-gray-400 mb-4">暂无评论，来发表第一条评论吧</p>
      ) : (
        <div className="mb-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              circleId={circleId}
              onReply={handleReply}
            />
          ))}
        </div>
      )}

      {/* Comment form */}
      {user ? (
        <form onSubmit={handleSubmit} className="border-t pt-3">
          {replyTo && (
            <div className="flex items-center justify-between mb-2 px-2 py-1 bg-gray-50 rounded text-xs text-gray-500">
              <span>
                回复 <span className="text-indigo-500">{replyTo.nickname || replyTo.username}</span>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-gray-400 hover:text-red-400"
              >
                取消
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <MentionInput
              value={content}
              onChange={setContent}
              placeholder={replyTo ? `回复 ${replyTo.nickname || replyTo.username}...` : '写下你的评论...'}
              rows={1}
              className="flex-1 !rounded-md text-sm !ring-1 !ring-indigo-400 !ring-opacity-0 focus-within:!ring-opacity-100"
            />
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {submitting ? '发送中...' : '发送'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-gray-400 text-center py-3 border-t">
          请先登录后再评论
        </p>
      )}
    </div>
  );
}
