import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get comments for a post
router.get('/post/:postId', authMiddleware, (req, res) => {
  const { circle_id } = req.query;
  let query = `
    SELECT c.*, u.nickname, u.avatar,
      (SELECT COUNT(*) FROM plus_ones WHERE comment_id = c.id) as plus_count,
      (SELECT COUNT(*) FROM likes WHERE target_type = 'comment' AND target_id = c.id) as like_count
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
  `;
  const params = [req.params.postId];
  if (circle_id) {
    query += ' AND c.circle_id = ?';
    params.push(circle_id);
  } else {
    query += ' AND c.circle_id IS NULL';
  }
  query += ' ORDER BY c.created_at ASC';
  const comments = db.prepare(query).all(...params);
  res.json(comments);
});

// Create comment
router.post('/', authMiddleware, (req, res) => {
  const { post_id, circle_id, content, parent_id } = req.body;
  if (!content) return res.status(400).json({ error: '评论不能为空' });

  const result = db.prepare('INSERT INTO comments (post_id, circle_id, user_id, content, parent_id) VALUES (?, ?, ?, ?, ?)').run(post_id, circle_id || null, req.user.id, content, parent_id || null);
  const comment = db.prepare(`
    SELECT c.*, u.nickname, u.avatar FROM comments c
    JOIN users u ON u.id = c.user_id WHERE c.id = ?
  `).get(result.lastInsertRowid);
  res.json(comment);
});

// Like post or comment
router.post('/like', authMiddleware, (req, res) => {
  const { target_type, target_id, circle_id } = req.body;
  const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ? AND circle_id IS ?').get(req.user.id, target_type, target_id, circle_id || null);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
    return res.json({ liked: false });
  }
  db.prepare('INSERT INTO likes (user_id, target_type, target_id, circle_id) VALUES (?, ?, ?, ?)').run(req.user.id, target_type, target_id, circle_id || null);
  res.json({ liked: true });
});

// Check like status
router.get('/like-status', authMiddleware, (req, res) => {
  const { target_type, target_id, circle_id } = req.query;
  const liked = !!db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ? AND circle_id IS ?').get(req.user.id, target_type, target_id, circle_id || null);
  const count = db.prepare('SELECT COUNT(*) as count FROM likes WHERE target_type = ? AND target_id = ? AND circle_id IS ?').get(target_type, target_id, circle_id || null).count;
  res.json({ liked, count });
});

// +1 comment
router.post('/plus-one', authMiddleware, (req, res) => {
  const { comment_id } = req.body;
  const existing = db.prepare('SELECT id FROM plus_ones WHERE comment_id = ? AND user_id = ?').get(comment_id, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM plus_ones WHERE id = ?').run(existing.id);
    return res.json({ plusOne: false });
  }
  db.prepare('INSERT INTO plus_ones (comment_id, user_id) VALUES (?, ?)').run(comment_id, req.user.id);
  res.json({ plusOne: true });
});

export default router;
