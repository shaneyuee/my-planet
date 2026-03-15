import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${time}`;
  return `${d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })} ${time}`;
}

// Show time separator if gap > 5 minutes
function shouldShowTime(messages, index) {
  if (index === 0) return true;
  const prev = new Date(messages[index - 1].created_at).getTime();
  const curr = new Date(messages[index].created_at).getTime();
  return curr - prev > 5 * 60 * 1000;
}

export default function Conversation() {
  const { userId } = useParams();
  const { user } = useAuth();
  const { refresh } = useNotification();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    loadConversation();
    markRead();

    // Load other user info
    api.getUser(userId).then(setOtherUser).catch(() => {});
  }, [userId]);

  useEffect(() => {
    // Poll for new messages every 10s
    const timer = setInterval(async () => {
      try {
        const data = await api.getConversation(userId);
        setMessages(data);
        // Mark new messages as read
        await api.markConversationRead(userId);
        refresh();
      } catch {}
    }, 10000);
    return () => clearInterval(timer);
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const data = await api.getConversation(userId);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const markRead = async () => {
    try {
      await api.markConversationRead(userId);
      refresh();
    } catch {}
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const msg = await api.sendDirectMessage({ recipient_id: parseInt(userId), content: text });
      setMessages((prev) => [...prev, msg]);
      setInput('');
      refresh();
    } catch (err) {
      console.error(err);
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="bg-white rounded-t-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/messages')}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {otherUser && (
          <Link to={`/user/${otherUser.id}`} className="flex items-center gap-2 hover:opacity-80">
            {otherUser.avatar ? (
              <img src={otherUser.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-medium">
                {(otherUser.nickname || otherUser.username || '?')[0]}
              </div>
            )}
            <span className="text-sm font-medium text-gray-900">{otherUser.nickname || otherUser.username}</span>
          </Link>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={containerRef}
        className="flex-1 bg-gray-50 border-x border-gray-100 overflow-y-auto px-4 py-4 space-y-1"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-gray-400 text-sm">加载中...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-gray-400 text-sm">暂无消息，说点什么吧</span>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === user.id;
            const showTime = shouldShowTime(messages, idx);
            return (
              <div key={msg.id}>
                {showTime && (
                  <div className="flex justify-center my-3">
                    <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex items-end gap-2 mb-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {isMe ? (
                      user.avatar ? (
                        <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-medium">
                          {(user.nickname || user.username || '?')[0]}
                        </div>
                      )
                    ) : (
                      msg.sender_avatar ? (
                        <img src={msg.sender_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium">
                          {(msg.sender_name || '?')[0]}
                        </div>
                      )
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm break-words ${
                      isMe
                        ? 'bg-indigo-500 text-white rounded-br-md'
                        : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-100'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="bg-white rounded-b-xl shadow-sm border border-gray-100 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
            className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 max-h-24"
            style={{ minHeight: '38px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
