import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useNotification } from '../context/NotificationContext';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

const typeLabels = {
  like_post: '赞了你的帖子',
  like_comment: '赞了你的评论',
  comment: '评论了你的帖子',
  reply: '回复了你的评论',
  follow: '关注了你',
  new_message: '给你发了私信',
  mention: '在帖子中提到了你',
};

function NotificationItem({ item, onRead }) {
  const navigate = useNavigate();

  const handleClick = async () => {
    if (!item.is_read) {
      await api.markNotificationRead(item.id);
      onRead();
    }
    // Navigate based on type
    if (item.type === 'follow' || item.type === 'new_message') {
      navigate(item.type === 'new_message' ? `/messages/conversation/${item.actor_id}` : `/user/${item.actor_id}`);
    } else if (item.target_type === 'post' || item.target_type === 'comment') {
      navigate('/');
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${!item.is_read ? 'bg-indigo-50/50' : ''}`}
    >
      {/* Unread indicator */}
      <div className="flex-shrink-0 pt-2">
        {!item.is_read ? (
          <span className="block w-2 h-2 rounded-full bg-indigo-500" />
        ) : (
          <span className="block w-2 h-2" />
        )}
      </div>

      {/* Avatar */}
      <div className="flex-shrink-0">
        {item.actor_avatar ? (
          <img src={item.actor_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium text-sm">
            {(item.actor_name || '?')[0]}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{item.actor_name}</span>
          <span className="text-gray-600 ml-1">{typeLabels[item.type] || item.type}</span>
        </p>
        {item.content && (
          <p className="text-sm text-gray-500 mt-0.5 truncate">"{item.content}"</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{timeAgo(item.created_at)}</p>
      </div>
    </div>
  );
}

function ConversationItem({ item }) {
  return (
    <Link
      to={`/messages/conversation/${item.other_id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {item.avatar ? (
          <img src={item.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
            {(item.nickname || item.username || '?')[0]}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">{item.nickname || item.username}</span>
          <span className="text-xs text-gray-400">{timeAgo(item.last_time)}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-gray-500 truncate pr-2">
            {item.last_sender_id === item.other_id ? '' : '我: '}{item.last_message}
          </p>
          {item.unread_count > 0 && (
            <span className="flex-shrink-0 min-w-[20px] h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center px-1.5">
              {item.unread_count > 99 ? '99+' : item.unread_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Messages() {
  const [tab, setTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { unreadNotifications, unreadMessages, refresh } = useNotification();

  useEffect(() => {
    loadData();
  }, [tab, page]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'notifications') {
        const data = await api.getNotifications(page);
        setNotifications(data.notifications);
        setTotalPages(data.totalPages);
      } else {
        const data = await api.getConversations();
        setConversations(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    refresh();
    loadData();
  };

  const handleNotificationRead = () => {
    refresh();
    loadData();
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Tab header */}
      <div className="bg-white rounded-t-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <div className="flex">
            <button
              onClick={() => { setTab('notifications'); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === 'notifications'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              通知
              {unreadNotifications > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-medium rounded-full px-1">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('dm')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === 'dm'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              私信
              {unreadMessages > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-medium rounded-full px-1">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </button>
          </div>
          {tab === 'notifications' && unreadNotifications > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              全部已读
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-100 min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400 text-sm">加载中...</div>
          </div>
        ) : tab === 'notifications' ? (
          notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm">暂无通知</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-50">
                {notifications.map((n) => (
                  <NotificationItem key={n.id} item={n} onRead={handleNotificationRead} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 py-3 border-t border-gray-50">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="text-sm text-indigo-600 disabled:text-gray-300"
                  >
                    上一页
                  </button>
                  <span className="text-xs text-gray-400">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="text-sm text-indigo-600 disabled:text-gray-300"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )
        ) : (
          conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">暂无私信</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {conversations.map((c) => (
                <ConversationItem key={c.other_id} item={c} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
