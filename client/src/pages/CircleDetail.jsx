import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import PostCard from '../components/PostCard';

export default function CircleDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [circle, setCircle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('messages');

  // 发言相关
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // 作品相关
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // 邀请相关
  const [inviteUrl, setInviteUrl] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCircle = async () => {
      try {
        const data = await api.getCircle(id);
        setCircle(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCircle();
  }, [id]);

  // 加载发言
  const fetchMessages = async () => {
    setMsgLoading(true);
    try {
      const data = await api.getCircleMessages(id);
      setMessages(data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error(err);
    } finally {
      setMsgLoading(false);
    }
  };

  // 加载作品
  const fetchPosts = async () => {
    setPostsLoading(true);
    try {
      const data = await api.getCirclePosts(id);
      setPosts(data.posts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchMessages();
    } else {
      fetchPosts();
    }
  }, [activeTab, id]);

  const handleSend = async () => {
    if (!msgText.trim() || sending) return;
    setSending(true);
    try {
      await api.sendMessage(id, { content: msgText.trim() });
      setMsgText('');
      fetchMessages();
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleInvite = async () => {
    try {
      const data = await api.createInvite(id);
      const url = `${window.location.origin}/circles/join/${data.token}`;
      setInviteUrl(url);
      setShowInvite(true);
      setCopied(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement('input');
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="text-gray-400">加载中...</span>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="text-gray-400">圈子不存在或无权访问</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* 头部信息 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-800">{circle.name}</h1>
          <button
            onClick={handleInvite}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
          >
            邀请
          </button>
        </div>
        {/* 成员列表 */}
        <div className="flex flex-wrap gap-2">
          {(circle.members || []).map((m) => (
            <Link
              key={m.id}
              to={`/user/${m.id}`}
              className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-full text-sm text-gray-600 hover:bg-gray-100 transition"
            >
              {m.avatar ? (
                <img src={m.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                  {(m.nickname || m.username || '?')[0]}
                </span>
              )}
              <span>{m.nickname || m.username}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Tab切换 */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'messages'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          发言
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'posts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          作品
        </button>
      </div>

      {/* 发言列表 */}
      {activeTab === 'messages' && (
        <div>
          {msgLoading ? (
            <div className="text-center py-10 text-gray-400">加载中...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 text-gray-400">暂无发言，来说点什么吧</div>
          ) : (
            <div className="space-y-3 mb-4 max-h-[60vh] overflow-y-auto px-1">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  {msg.avatar ? (
                    <img src={msg.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {(msg.nickname || msg.username || '?')[0]}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-800">
                        {msg.nickname || msg.username}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(msg.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-gray-700 mt-0.5 break-words">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* 输入框 */}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="输入消息..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={sending || !msgText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {sending ? '发送中...' : '发送'}
            </button>
          </div>
        </div>
      )}

      {/* 作品列表 */}
      {activeTab === 'posts' && (
        <div>
          {postsLoading ? (
            <div className="text-center py-10 text-gray-400">加载中...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-10 text-gray-400">暂无作品</div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} circleId={id} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 邀请链接弹窗 */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-3">邀请链接</h2>
            <p className="text-sm text-gray-500 mb-3">将以下链接分享给好友，即可加入圈子：</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm whitespace-nowrap"
              >
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowInvite(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
