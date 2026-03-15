import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

export default function UserProfile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const isSelf = currentUser && currentUser.id === parseInt(id);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const promises = [api.getUser(id), api.getUserPosts(id)];
    if (currentUser && !isSelf) {
      promises.push(api.getFollowStatus(id));
    }

    Promise.all(promises)
      .then(([userData, postsData, followData]) => {
        setProfile(userData.user || userData);
        setPosts(postsData.posts || postsData || []);
        if (followData) {
          setIsFollowing(followData.following);
          setFollowerCount(followData.followerCount);
          setFollowingCount(followData.followingCount);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, currentUser?.id]);

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      const res = await api.toggleFollow(id);
      setIsFollowing(res.following);
      setFollowerCount((c) => res.following ? c + 1 : c - 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="text-gray-400 text-lg">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center min-h-[60vh] justify-center">
        <p className="text-red-500 mb-4">加载失败: {error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">重试</button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="text-gray-400">用户不存在</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* User Header */}
      <div className="flex items-center gap-4 mb-6">
        <img
          src={profile.avatar || '/default-avatar.png'}
          alt="头像"
          className="w-16 h-16 rounded-full object-cover bg-gray-200"
        />
        <div className="flex-1">
          <h1 className="text-xl font-bold">{profile.nickname || profile.username}</h1>
          {profile.bio && <p className="text-gray-500 text-sm mt-1">{profile.bio}</p>}
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span>{followerCount} 粉丝</span>
            <span>{followingCount} 关注</span>
          </div>
        </div>
        {currentUser && !isSelf && (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                isFollowing
                  ? 'border border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-500'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              } disabled:opacity-50`}
            >
              {isFollowing ? '已关注' : '关注'}
            </button>
            <button
              onClick={() => navigate(`/messages/conversation/${id}`)}
              className="px-4 py-1.5 text-sm rounded-full border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              发消息
            </button>
          </div>
        )}
      </div>

      {/* Posts */}
      <h2 className="text-lg font-semibold mb-4">作品</h2>
      {posts.length === 0 ? (
        <p className="text-gray-400 text-center py-12">暂无内容</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} showActions={false} />
          ))}
        </div>
      )}
    </div>
  );
}
