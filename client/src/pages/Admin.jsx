import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [processingUsers, setProcessingUsers] = useState({});
  const [processingPosts, setProcessingPosts] = useState({});

  const fetchPendingUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await api.getPendingUsers();
      setPendingUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchPendingPosts = async () => {
    setPostsLoading(true);
    try {
      const data = await api.getPendingPosts();
      setPendingPosts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchPendingUsers();
      fetchPendingPosts();
    }
  }, [user]);

  // 权限检查（放在 hooks 之后）
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 mb-4">无权访问管理后台</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          返回首页
        </button>
      </div>
    );
  }

  const handleUserAction = async (userId, status) => {
    setProcessingUsers((prev) => ({ ...prev, [userId]: true }));
    try {
      await api.approveUser(userId, status);
      fetchPendingUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessingUsers((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handlePostAction = async (postId, status) => {
    setProcessingPosts((prev) => ({ ...prev, [postId]: true }));
    try {
      await api.approvePost(postId, status);
      fetchPendingPosts();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessingPosts((prev) => ({ ...prev, [postId]: false }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">管理后台</h1>

      {/* 用户审批 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b border-gray-200 pb-2">
          用户审批
        </h2>
        {usersLoading ? (
          <div className="text-center py-6 text-gray-400">加载中...</div>
        ) : pendingUsers.length === 0 ? (
          <div className="text-center py-6 text-gray-400">暂无待审批用户</div>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  {u.avatar ? (
                    <img src={u.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                      {(u.nickname || u.username || '?')[0]}
                    </span>
                  )}
                  <div>
                    <p className="font-medium text-gray-800">{u.nickname || u.username}</p>
                    <p className="text-sm text-gray-500">@{u.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUserAction(u.id, 'approved')}
                    disabled={processingUsers[u.id]}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    通过
                  </button>
                  <button
                    onClick={() => handleUserAction(u.id, 'rejected')}
                    disabled={processingUsers[u.id]}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 transition"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 作品审批 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b border-gray-200 pb-2">
          作品审批
        </h2>
        {postsLoading ? (
          <div className="text-center py-6 text-gray-400">加载中...</div>
        ) : pendingPosts.length === 0 ? (
          <div className="text-center py-6 text-gray-400">暂无待审批作品</div>
        ) : (
          <div className="space-y-3">
            {pendingPosts.map((post) => (
              <div
                key={post.id}
                className="p-4 bg-white rounded-xl shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-800">
                    {post.nickname || post.username || '未知用户'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(post.created_at).toLocaleString('zh-CN')}
                  </span>
                </div>
                {/* 内容预览 */}
                <p className="text-gray-700 mb-3 line-clamp-3 whitespace-pre-wrap">
                  {post.content || '(无文字内容)'}
                </p>
                {(() => {
                  const imgs = typeof post.images === 'string' ? JSON.parse(post.images || '[]') : (post.images || []);
                  return imgs.length > 0 ? (
                    <div className="flex gap-2 mb-3 overflow-x-auto">
                      {imgs.slice(0, 4).map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt=""
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                      ))}
                    </div>
                  ) : null;
                })()}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handlePostAction(post.id, 'approved')}
                    disabled={processingPosts[post.id]}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    通过
                  </button>
                  <button
                    onClick={() => handlePostAction(post.id, 'rejected')}
                    disabled={processingPosts[post.id]}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 transition"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
