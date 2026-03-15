import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Circle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchCircles = async () => {
    try {
      const data = await api.getCircles();
      setCircles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCircles();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.createCircle({ name: newName.trim() });
      setNewName('');
      setShowModal(false);
      fetchCircles();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="text-gray-400">加载中...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">我的私密圈</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          创建私密圈
        </button>
      </div>

      {circles.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          还没有加入任何私密圈
        </div>
      ) : (
        <div className="space-y-3">
          {circles.map((circle) => (
            <div
              key={circle.id}
              onClick={() => navigate(`/circles/${circle.id}`)}
              className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md cursor-pointer transition"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{circle.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  创建者: {circle.owner_name || circle.owner_nickname || '未知'}
                </p>
              </div>
              <div className="text-sm text-gray-400">
                {circle.member_count || 0} 位成员
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建私密圈弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">创建私密圈</h2>
            <input
              type="text"
              placeholder="输入圈子名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); setNewName(''); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
