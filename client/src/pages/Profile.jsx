import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import PostCard from '../components/PostCard';

export default function Profile() {
  const { user } = useAuth();
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, tab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'posts') {
        const data = await api.getUserPosts(user.id);
        setPosts(data.posts || data || []);
      } else {
        const data = await api.getMemos();
        setMemos(data.posts || data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm('确定要删除这条内容吗？')) return;
    try {
      await api.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setMemos((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      alert('删除失败: ' + err.message);
    }
  };

  const handleHide = async (postId) => {
    try {
      await api.hidePost(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, hidden: !p.hidden } : p))
      );
    } catch (err) {
      alert('操作失败: ' + err.message);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="text-gray-400">请先登录</span>
      </div>
    );
  }

  const items = tab === 'posts' ? posts : memos;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-6">
        <img
          src={user.avatar || '/default-avatar.png'}
          alt="头像"
          className="w-16 h-16 rounded-full object-cover bg-gray-200"
        />
        <div className="flex-1">
          <h1 className="text-xl font-bold">{user.nickname || user.username}</h1>
          {user.bio && <p className="text-gray-500 text-sm mt-1">{user.bio}</p>}
        </div>
        <Link
          to="/settings"
          className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          编辑资料
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setTab('posts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'posts'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          作品
        </button>
        <button
          onClick={() => setTab('memos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'memos'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          备忘
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="text-gray-400">加载中...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">加载失败: {error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            重试
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-center py-12">暂无内容</p>
      ) : (
        <div className="space-y-4">
          {items.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={handleDelete}
              onHide={handleHide}
            />
          ))}
        </div>
      )}
    </div>
  );
}
