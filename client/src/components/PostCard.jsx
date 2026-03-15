import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import CommentSection from './CommentSection';

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

export default function PostCard({ post, onDelete, onHide, circleId, showActions = true }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post._liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [reposting, setReposting] = useState(false);
  const [repostText, setRepostText] = useState('');
  const [repostVisibility, setRepostVisibility] = useState(['memo']);
  const [repostCircles, setRepostCircles] = useState([]);
  const [myCircles, setMyCircles] = useState([]);
  const [showComments, setShowComments] = useState(false);

  const isOwner = user && user.id === post.user_id;

  let images = [];
  if (post.images) {
    try {
      images = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
    } catch {
      images = [];
    }
  }

  let tags = [];
  if (post.tags) {
    try {
      tags = typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags;
    } catch {
      tags = [];
    }
  }

  const handleLike = async () => {
    try {
      const res = await api.toggleLike({
        target_type: 'post',
        target_id: post.id,
        ...(circleId ? { circle_id: circleId } : {}),
      });
      setLiked(res.liked);
      setLikeCount((prev) => (res.liked ? prev + 1 : prev - 1));
    } catch (err) {
      console.error('点赞失败', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这篇帖子吗？')) return;
    try {
      await api.deletePost(post.id);
      onDelete?.(post.id);
    } catch (err) {
      alert('删除失败: ' + err.message);
    }
  };

  const handleHide = async () => {
    try {
      await api.hidePost(post.id);
      onHide?.(post.id);
    } catch (err) {
      alert('隐藏失败: ' + err.message);
    }
  };

  const handleRepost = async () => {
    if (repostVisibility.length === 0) { alert('请选择转发目标'); return; }
    try {
      await api.repost(post.id, {
        content: repostText,
        visibility: repostVisibility.join(','),
        circle_ids: repostCircles,
      });
      setReposting(false);
      setRepostText('');
      setRepostVisibility(['memo']);
      setRepostCircles([]);
      alert('转发成功');
    } catch (err) {
      alert('转发失败: ' + err.message);
    }
  };

  const openRepost = async () => {
    setReposting(!reposting);
    if (!reposting && myCircles.length === 0) {
      try { const data = await api.getCircles(); setMyCircles(data || []); } catch {}
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
      {/* Author header */}
      <div className="flex items-center mb-3">
        <Link to={`/user/${post.user_id}`}>
          <img
            src={post.avatar || '/default-avatar.png'}
            alt="头像"
            className="w-10 h-10 rounded-full object-cover border"
          />
        </Link>
        <div className="ml-3 flex-1 min-w-0">
          <Link
            to={`/user/${post.user_id}`}
            className="text-sm font-semibold text-gray-800 hover:text-indigo-600 truncate block"
          >
            {post.nickname || post.username || '匿名用户'}
          </Link>
          <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
        </div>
        {post.visibility === 'private' && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">仅自己可见</span>
        )}
      </div>

      {/* Repost indicator */}
      {post.original_post_id && (
        <div className="text-xs text-gray-400 mb-2 pl-2 border-l-2 border-indigo-200">
          转发自{' '}
          <Link to={`/user/${post.original_user_id}`} className="text-indigo-500 hover:underline">
            {post.original_nickname || '用户'}
          </Link>
        </div>
      )}

      {/* Content */}
      {post.content && (
        <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap mb-3">
          {post.content}
        </p>
      )}

      {/* Images */}
      {images.length > 0 && (
        <div
          className={`grid gap-2 mb-3 ${
            images.length === 1
              ? 'grid-cols-1'
              : images.length <= 4
              ? 'grid-cols-2'
              : 'grid-cols-3'
          }`}
        >
          {images.map((img, idx) => (
            <a key={idx} href={img} target="_blank" rel="noopener noreferrer">
              <img
                src={img}
                alt={`图片${idx + 1}`}
                className="w-full rounded-md object-cover aspect-square"
              />
            </a>
          ))}
        </div>
      )}

      {/* Link preview */}
      {post.link_title && (
        <a
          href={post.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-3 bg-gray-50 rounded-md border mb-3 hover:bg-gray-100 transition-colors"
        >
          {post.link_image && (
            <img
              src={post.link_image}
              alt=""
              className="w-16 h-16 rounded object-cover shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800 truncate">{post.link_title}</p>
            {post.link_description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{post.link_description}</p>
            )}
          </div>
        </a>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Action bar */}
      {showActions && (
        <div className="flex items-center justify-between pt-2 border-t text-gray-400">
          <div className="flex items-center space-x-5">
            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center space-x-1 text-sm hover:text-red-500 transition-colors ${
                liked ? 'text-red-500' : ''
              }`}
            >
              <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span>{likeCount > 0 ? likeCount : '赞'}</span>
            </button>

            {/* Comment count */}
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-1 text-sm hover:text-indigo-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span>{post.comment_count > 0 ? post.comment_count : '评论'}</span>
            </button>

            {/* Repost */}
            {user && (
              <button
                onClick={openRepost}
                className="flex items-center space-x-1 text-sm hover:text-green-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>转发</span>
              </button>
            )}
          </div>

          {/* Owner actions */}
          {isOwner && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleHide}
                className="text-xs text-gray-400 hover:text-yellow-500 transition-colors"
              >
                隐藏
              </button>
              <button
                onClick={handleDelete}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                删除
              </button>
            </div>
          )}
        </div>
      )}

      {/* Repost form */}
      {reposting && (
        <div className="mt-3 pt-3 border-t">
          <textarea
            value={repostText}
            onChange={(e) => setRepostText(e.target.value)}
            placeholder="说点什么..."
            className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400"
            rows={2}
          />
          {/* Visibility checkboxes */}
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            <span className="text-gray-500">转发到:</span>
            {[{ key: 'memo', label: '备忘' }, { key: 'plaza', label: '广场' }, { key: 'private', label: '私密圈' }].map((v) => (
              <label key={v.key} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={repostVisibility.includes(v.key)}
                  onChange={(e) => {
                    if (e.target.checked) setRepostVisibility([...repostVisibility, v.key]);
                    else setRepostVisibility(repostVisibility.filter((x) => x !== v.key));
                  }}
                  className="rounded text-indigo-600"
                />
                {v.label}
              </label>
            ))}
          </div>
          {/* Circle selector */}
          {repostVisibility.includes('private') && myCircles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {myCircles.map((c) => (
                <label key={c.id} className="flex items-center gap-1 text-xs cursor-pointer px-2 py-1 rounded-full border" style={{ borderColor: repostCircles.includes(c.id) ? '#4f46e5' : '#d1d5db', background: repostCircles.includes(c.id) ? '#eef2ff' : 'white' }}>
                  <input
                    type="checkbox"
                    checked={repostCircles.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) setRepostCircles([...repostCircles, c.id]);
                      else setRepostCircles(repostCircles.filter((x) => x !== c.id));
                    }}
                    className="hidden"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={() => setReposting(false)}
              className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-md"
            >
              取消
            </button>
            <button
              onClick={handleRepost}
              className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              转发
            </button>
          </div>
        </div>
      )}
      {/* Comment section */}
      {showComments && (
        <CommentSection postId={post.id} circleId={circleId} />
      )}
    </div>
  );
}
