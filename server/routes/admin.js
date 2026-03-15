import { Router } from 'express';
import db from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

// Pending users
router.get('/users', authMiddleware, adminMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, username, nickname, status, created_at FROM users WHERE status = ? ORDER BY created_at DESC').all('pending');
  res.json(users);
});

// All users
router.get('/users/all', authMiddleware, adminMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, username, nickname, avatar, role, status, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

// Approve/reject user
router.put('/users/:id/approve', authMiddleware, adminMiddleware, (req, res) => {
  const { status } = req.body; // 'approved' or 'rejected'
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: '无效状态' });
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: '操作成功' });
});

// Pending plaza posts
router.get('/posts', authMiddleware, adminMiddleware, (req, res) => {
  const posts = db.prepare(`
    SELECT p.*, u.nickname, u.avatar FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.plaza_status = 'pending'
    ORDER BY p.created_at DESC
  `).all();
  res.json(posts);
});

// Approve/reject post
router.put('/posts/:id/approve', authMiddleware, adminMiddleware, (req, res) => {
  const { status } = req.body; // 'approved' or 'rejected'
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: '无效状态' });
  db.prepare('UPDATE posts SET plaza_status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: '操作成功' });
});

export default router;
