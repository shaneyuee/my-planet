import { Router } from 'express';
import db from '../db.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuthMiddleware, (req, res) => {
  const { q, page: pageStr } = req.query;
  if (!q || !q.trim()) return res.json({ posts: [], total: 0, page: 1, totalPages: 0 });

  const page = parseInt(pageStr) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  // Escape FTS5 special characters and wrap each token in quotes for safe matching
  const searchTerm = q.trim().replace(/['"]/g, '').split(/\s+/).map(t => `"${t}"`).join(' ');

  try {
    const countRow = db.prepare(`
      SELECT COUNT(*) as total FROM posts_fts
      JOIN posts p ON p.id = posts_fts.rowid
      WHERE posts_fts MATCH ?
        AND p.visibility LIKE '%plaza%'
        AND p.plaza_status = 'approved'
        AND p.hidden = 0
    `).get(searchTerm);

    const total = countRow.total;
    const totalPages = Math.ceil(total / limit);

    const posts = db.prepare(`
      SELECT p.*, u.nickname, u.avatar, u.username,
        highlight(posts_fts, 0, '<mark>', '</mark>') as highlighted_content,
        (SELECT COUNT(*) FROM likes WHERE target_type = 'post' AND target_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND circle_id IS NULL) as comment_count
      FROM posts_fts
      JOIN posts p ON p.id = posts_fts.rowid
      JOIN users u ON u.id = p.user_id
      WHERE posts_fts MATCH ?
        AND p.visibility LIKE '%plaza%'
        AND p.plaza_status = 'approved'
        AND p.hidden = 0
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(searchTerm, limit, offset);

    res.json({ posts, total, page, totalPages });
  } catch (err) {
    console.error('Search error:', err);
    res.json({ posts: [], total: 0, page: 1, totalPages: 0 });
  }
});

export default router;
