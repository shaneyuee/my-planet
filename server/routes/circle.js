import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Create circle
router.post('/', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '圈名不能为空' });
  const result = db.prepare('INSERT INTO circles (name, owner_id) VALUES (?, ?)').run(name, req.user.id);
  const circleId = result.lastInsertRowid;
  // Owner auto-joins
  db.prepare('INSERT INTO circle_members (circle_id, user_id) VALUES (?, ?)').run(circleId, req.user.id);
  res.json({ id: circleId, name, owner_id: req.user.id });
});

// My circles
router.get('/', authMiddleware, (req, res) => {
  const circles = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) as member_count,
      (SELECT nickname FROM users WHERE id = c.owner_id) as owner_name
    FROM circles c
    JOIN circle_members cm ON cm.circle_id = c.id AND cm.user_id = ?
    ORDER BY c.created_at DESC
  `).all(req.user.id);
  res.json(circles);
});

// Circle detail
router.get('/:id', authMiddleware, (req, res) => {
  const circle = db.prepare('SELECT * FROM circles WHERE id = ?').get(req.params.id);
  if (!circle) return res.status(404).json({ error: '私密圈不存在' });
  const isMember = db.prepare('SELECT 1 FROM circle_members WHERE circle_id = ? AND user_id = ?').get(circle.id, req.user.id);
  if (!isMember) return res.status(403).json({ error: '你不是该圈成员' });
  const members = db.prepare(`
    SELECT u.id, u.nickname, u.avatar FROM circle_members cm
    JOIN users u ON u.id = cm.user_id WHERE cm.circle_id = ?
  `).all(circle.id);
  res.json({ ...circle, members });
});

// Generate invite link
router.post('/:id/invite', authMiddleware, (req, res) => {
  const circle = db.prepare('SELECT * FROM circles WHERE id = ?').get(req.params.id);
  if (!circle) return res.status(404).json({ error: '私密圈不存在' });
  const isMember = db.prepare('SELECT 1 FROM circle_members WHERE circle_id = ? AND user_id = ?').get(circle.id, req.user.id);
  if (!isMember) return res.status(403).json({ error: '你不是该圈成员' });

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO circle_invites (circle_id, token, inviter_id, expires_at) VALUES (?, ?, ?, ?)').run(circle.id, token, req.user.id, expiresAt);
  res.json({ token, expires_at: expiresAt });
});

// Join via invite
router.post('/join/:token', authMiddleware, (req, res) => {
  const invite = db.prepare('SELECT * FROM circle_invites WHERE token = ?').get(req.params.token);
  if (!invite) return res.status(404).json({ error: '邀请链接无效' });
  if (new Date(invite.expires_at) < new Date()) return res.status(400).json({ error: '邀请已过期' });

  const already = db.prepare('SELECT 1 FROM circle_members WHERE circle_id = ? AND user_id = ?').get(invite.circle_id, req.user.id);
  if (already) return res.json({ message: '你已经是成员了', circle_id: invite.circle_id });

  db.prepare('INSERT INTO circle_members (circle_id, user_id) VALUES (?, ?)').run(invite.circle_id, req.user.id);
  res.json({ message: '加入成功', circle_id: invite.circle_id });
});

// Circle messages
router.get('/:id/messages', authMiddleware, (req, res) => {
  const isMember = db.prepare('SELECT 1 FROM circle_members WHERE circle_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!isMember) return res.status(403).json({ error: '你不是该圈成员' });

  const before = req.query.before;
  let query = `
    SELECT m.*, u.nickname, u.avatar FROM circle_messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.circle_id = ?
  `;
  const params = [req.params.id];
  if (before) {
    query += ' AND m.id < ?';
    params.push(before);
  }
  query += ' ORDER BY m.created_at DESC LIMIT 100';
  const messages = db.prepare(query).all(...params);
  res.json(messages.reverse());
});

// Send message
router.post('/:id/messages', authMiddleware, (req, res) => {
  const isMember = db.prepare('SELECT 1 FROM circle_members WHERE circle_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!isMember) return res.status(403).json({ error: '你不是该圈成员' });

  const { content, type, ref_post_id } = req.body;
  if (!content && !ref_post_id) return res.status(400).json({ error: '内容不能为空' });

  const result = db.prepare('INSERT INTO circle_messages (circle_id, user_id, content, type, ref_post_id) VALUES (?, ?, ?, ?, ?)').run(req.params.id, req.user.id, content || '', type || 'text', ref_post_id || null);
  const msg = db.prepare('SELECT m.*, u.nickname, u.avatar FROM circle_messages m JOIN users u ON u.id = m.user_id WHERE m.id = ?').get(result.lastInsertRowid);
  res.json(msg);
});

// Circle posts
router.get('/:id/posts', authMiddleware, (req, res) => {
  const isMember = db.prepare('SELECT 1 FROM circle_members WHERE circle_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!isMember) return res.status(403).json({ error: '你不是该圈成员' });

  const circleId = parseInt(req.params.id);
  const posts = db.prepare(`
    SELECT p.*, u.nickname, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE target_type = 'post' AND target_id = p.id AND circle_id = ?) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND circle_id = ?) as comment_count,
      ou.nickname as original_nickname, ou.id as original_user_id
    FROM posts p
    JOIN post_circles pc ON pc.post_id = p.id AND pc.circle_id = ?
    JOIN users u ON u.id = p.user_id
    LEFT JOIN posts op ON p.original_post_id = op.id
    LEFT JOIN users ou ON op.user_id = ou.id
    WHERE p.hidden = 0
    ORDER BY p.created_at DESC
  `).all(circleId, circleId, circleId);

  for (const p of posts) {
    p._liked = !!db.prepare("SELECT 1 FROM likes WHERE user_id = ? AND target_type = 'post' AND target_id = ? AND circle_id = ?").get(req.user.id, p.id, circleId);
  }

  res.json({ posts });
});

export default router;
