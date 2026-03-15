const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

export const api = {
  // Auth
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  // User
  getMe: () => request('/user/me'),
  updateMe: (body) => request('/user/me', { method: 'PUT', body: JSON.stringify(body) }),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return request('/user/avatar', { method: 'POST', body: fd });
  },
  getUser: (id) => request(`/user/${id}`),
  toggleFollow: (id) => request(`/user/${id}/follow`, { method: 'POST' }),
  getFollowStatus: (id) => request(`/user/${id}/follow-status`),
  getRecentUsers: () => request('/user/recent'),
  searchUsers: (q) => request(`/user/search?q=${encodeURIComponent(q)}`),

  // Posts
  createPost: (formData) => request('/posts', { method: 'POST', body: formData }),
  linkPreview: (url) => request('/posts/link-preview', { method: 'POST', body: JSON.stringify({ url }) }),
  getPlaza: (page = 1, { sort, type, tag, following } = {}) => {
    const params = new URLSearchParams({ page });
    if (sort) params.set('sort', sort);
    if (type) params.set('type', type);
    if (tag) params.set('tag', tag);
    if (following) params.set('following', 'true');
    return request(`/posts/plaza?${params.toString()}`);
  },
  getUserPosts: (id) => request(`/posts/user/${id}`),
  getMemos: () => request('/posts/memo'),
  getPost: (id) => request(`/posts/${id}`),
  hidePost: (id) => request(`/posts/${id}/hide`, { method: 'PUT' }),
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  repost: (id, body) => request(`/posts/${id}/repost`, { method: 'POST', body: JSON.stringify(body) }),

  // Circles
  createCircle: (body) => request('/circles', { method: 'POST', body: JSON.stringify(body) }),
  getCircles: () => request('/circles'),
  getCircle: (id) => request(`/circles/${id}`),
  createInvite: (id) => request(`/circles/${id}/invite`, { method: 'POST' }),
  joinCircle: (token) => request(`/circles/join/${token}`, { method: 'POST' }),
  getCircleMessages: (id, before) => request(`/circles/${id}/messages${before ? `?before=${before}` : ''}`),
  sendMessage: (id, body) => request(`/circles/${id}/messages`, { method: 'POST', body: JSON.stringify(body) }),
  getCirclePosts: (id) => request(`/circles/${id}/posts`),

  // Comments
  getComments: (postId, circleId) => request(`/comments/post/${postId}${circleId ? `?circle_id=${circleId}` : ''}`),
  createComment: (body) => request('/comments', { method: 'POST', body: JSON.stringify(body) }),
  toggleLike: (body) => request('/comments/like', { method: 'POST', body: JSON.stringify(body) }),
  getLikeStatus: (params) => request(`/comments/like-status?target_type=${params.target_type}&target_id=${params.target_id}${params.circle_id ? `&circle_id=${params.circle_id}` : ''}`),
  togglePlusOne: (body) => request('/comments/plus-one', { method: 'POST', body: JSON.stringify(body) }),

  // Admin
  getPendingUsers: () => request('/admin/users'),
  getAllUsers: () => request('/admin/users/all'),
  approveUser: (id, status) => request(`/admin/users/${id}/approve`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getPendingPosts: () => request('/admin/posts'),
  approvePost: (id, status) => request(`/admin/posts/${id}/approve`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Notifications
  getNotifications: (page = 1) => request(`/notifications?page=${page}`),
  getUnreadCount: () => request('/notifications/unread-count'),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' }),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),

  // Direct Messages
  getConversations: () => request('/messages/conversations'),
  getConversation: (userId, before) => request(`/messages/conversation/${userId}${before ? `?before=${before}` : ''}`),
  sendDirectMessage: (body) => request('/messages/send', { method: 'POST', body: JSON.stringify(body) }),
  markConversationRead: (userId) => request(`/messages/conversation/${userId}/read`, { method: 'PUT' }),

  // Search
  search: (q, page = 1) => request(`/search?q=${encodeURIComponent(q)}&page=${page}`),
};
