import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get notifications list
router.get('/', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const notifications = db.prepare(`
    SELECT n.*, u.nickname as actor_name, u.avatar as actor_avatar
    FROM notifications n
    JOIN users u ON u.id = n.actor_id
    WHERE n.recipient_id = ?
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ?').get(req.user.id).count;

  res.json({ notifications, total, page, totalPages: Math.ceil(total / limit) });
});

// Get unread count (single source of truth for red dots)
router.get('/unread-count', authMiddleware, (req, res) => {
  const notifications = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = 0'
  ).get(req.user.id).count;

  const messages = db.prepare(
    'SELECT COUNT(*) as count FROM direct_messages WHERE recipient_id = ? AND is_read = 0'
  ).get(req.user.id).count;

  res.json({ notifications, messages });
});

// Mark all notifications as read
router.put('/read-all', authMiddleware, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE recipient_id = ? AND is_read = 0').run(req.user.id);
  res.json({ success: true });
});

// Mark single notification as read
router.put('/:id/read', authMiddleware, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

export default router;
