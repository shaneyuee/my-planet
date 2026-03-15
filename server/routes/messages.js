import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get conversation list
router.get('/conversations', authMiddleware, (req, res) => {
  const userId = req.user.id;

  // Get all users this user has DM'd with, plus last message and unread count
  const conversations = db.prepare(`
    WITH conversations AS (
      SELECT
        CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END as other_id,
        MAX(id) as last_msg_id
      FROM direct_messages
      WHERE sender_id = ? OR recipient_id = ?
      GROUP BY other_id
    )
    SELECT
      c.other_id,
      u.nickname, u.avatar, u.username,
      dm.content as last_message,
      dm.created_at as last_time,
      dm.sender_id as last_sender_id,
      (SELECT COUNT(*) FROM direct_messages
       WHERE sender_id = c.other_id AND recipient_id = ? AND is_read = 0
      ) as unread_count
    FROM conversations c
    JOIN users u ON u.id = c.other_id
    JOIN direct_messages dm ON dm.id = c.last_msg_id
    ORDER BY dm.created_at DESC
  `).all(userId, userId, userId, userId);

  res.json(conversations);
});

// Get messages with a specific user
router.get('/conversation/:userId', authMiddleware, (req, res) => {
  const myId = req.user.id;
  const otherId = parseInt(req.params.userId);
  const before = req.query.before;
  const limit = 50;

  let query = `
    SELECT dm.*, u.nickname as sender_name, u.avatar as sender_avatar
    FROM direct_messages dm
    JOIN users u ON u.id = dm.sender_id
    WHERE ((dm.sender_id = ? AND dm.recipient_id = ?) OR (dm.sender_id = ? AND dm.recipient_id = ?))
  `;
  const params = [myId, otherId, otherId, myId];

  if (before) {
    query += ' AND dm.id < ?';
    params.push(before);
  }
  query += ' ORDER BY dm.created_at DESC LIMIT ?';
  params.push(limit);

  const messages = db.prepare(query).all(...params);
  res.json(messages.reverse());
});

// Send a message
router.post('/send', authMiddleware, (req, res) => {
  const { recipient_id, content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: '内容不能为空' });
  if (recipient_id === req.user.id) return res.status(400).json({ error: '不能给自己发私信' });

  const recipient = db.prepare('SELECT id FROM users WHERE id = ? AND status = ?').get(recipient_id, 'approved');
  if (!recipient) return res.status(404).json({ error: '用户不存在' });

  const result = db.prepare(
    'INSERT INTO direct_messages (sender_id, recipient_id, content) VALUES (?, ?, ?)'
  ).run(req.user.id, recipient_id, content.trim());

  // Create notification for new message
  db.prepare(
    "INSERT INTO notifications (recipient_id, actor_id, type, target_type, target_id, content) VALUES (?, ?, 'new_message', 'user', ?, ?)"
  ).run(recipient_id, req.user.id, req.user.id, content.trim().slice(0, 50));

  const msg = db.prepare(`
    SELECT dm.*, u.nickname as sender_name, u.avatar as sender_avatar
    FROM direct_messages dm JOIN users u ON u.id = dm.sender_id WHERE dm.id = ?
  `).get(result.lastInsertRowid);

  res.json(msg);
});

// Mark conversation as read
router.put('/conversation/:userId/read', authMiddleware, (req, res) => {
  const otherId = parseInt(req.params.userId);
  db.prepare(
    'UPDATE direct_messages SET is_read = 1 WHERE sender_id = ? AND recipient_id = ? AND is_read = 0'
  ).run(otherId, req.user.id);
  res.json({ success: true });
});

export default router;
