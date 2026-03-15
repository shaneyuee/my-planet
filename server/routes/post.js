import { Router } from 'express';
import multer from 'multer';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';
import { fetchLinkPreview } from '../utils/linkPreview.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const upload = multer({
  storage: multer.diskStorage({
    destination: join(__dirname, '..', 'uploads'),
    filename: (req, file, cb) => cb(null, `post-${req.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extname(file.originalname)}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('只支持图片格式'));
  },
});

const router = Router();

// Create post
router.post('/', authMiddleware, (req, res, next) => {
  upload.array('images', 9)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, (req, res) => {
  const { type, content, link, tags, visibility, circle_ids } = req.body;
  const parsedTags = tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [];
  if (parsedTags.length > 10) return res.status(400).json({ error: '最多10个标签' });

  const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
  const visibilityStr = visibility || 'plaza';
  const plazaStatus = visibilityStr.includes('plaza') ? 'pending' : null;

  const result = db.prepare(`
    INSERT INTO posts (user_id, type, content, link, images, tags, visibility, plaza_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, type || 'image_text', content || '', link || '', JSON.stringify(images), JSON.stringify(parsedTags), visibilityStr, plazaStatus);

  const postId = result.lastInsertRowid;

  // Link to circles if private visibility
  if (visibilityStr.includes('private') && circle_ids) {
    const ids = Array.isArray(circle_ids) ? circle_ids : JSON.parse(circle_ids);
    const insertCircle = db.prepare('INSERT OR IGNORE INTO post_circles (post_id, circle_id) VALUES (?, ?)');
    for (const cid of ids) {
      insertCircle.run(postId, cid);
    }
  }

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  res.json(post);
});

// Link preview
router.post('/link-preview', authMiddleware, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: '缺少URL' });
  const preview = await fetchLinkPreview(url);
  res.json(preview);
});

// Plaza posts (approved) with filtering and sorting
router.get('/plaza', optionalAuthMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const { sort, type, tag, following } = req.query;

  const validTypes = ['video', 'image_text', 'audio', 'code'];
  const conditions = ["p.visibility LIKE '%plaza%'", "p.plaza_status = 'approved'", "p.hidden = 0"];
  const params = [];

  if (type && validTypes.includes(type)) {
    conditions.push('p.type = ?');
    params.push(type);
  }

  if (tag) {
    conditions.push('EXISTS (SELECT 1 FROM json_each(p.tags) WHERE json_each.value = ?)');
    params.push(tag);
  }

  if (following === 'true' && req.user) {
    conditions.push('p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)');
    params.push(req.user.id);
  }

  const where = conditions.join(' AND ');
  let orderBy = 'p.created_at DESC';
  if (sort === 'hot') {
    orderBy = `(
      (SELECT COUNT(*) FROM likes WHERE target_type = 'post' AND target_id = p.id) +
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id)
    ) DESC, p.created_at DESC`;
  }

  const userId = req.user?.id;
  const posts = db.prepare(`
    SELECT p.*, u.nickname, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE target_type = 'post' AND target_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND circle_id IS NULL) as comment_count,
      ou.nickname as original_nickname, ou.id as original_user_id
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN posts op ON p.original_post_id = op.id
    LEFT JOIN users ou ON op.user_id = ou.id
    WHERE ${where}
    ORDER BY ${orderBy} LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  if (userId) {
    for (const p of posts) {
      p._liked = !!db.prepare("SELECT 1 FROM likes WHERE user_id = ? AND target_type = 'post' AND target_id = ?").get(userId, p.id);
    }
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM posts p WHERE ${where}`).get(...params).count;
  res.json({ posts, total, page, totalPages: Math.ceil(total / limit) });
});

// User's posts
router.get('/user/:id', authMiddleware, (req, res) => {
  const userId = parseInt(req.params.id);
  const isSelf = userId === req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  let where = 'p.user_id = ?';
  if (!isSelf) where += ' AND p.hidden = 0 AND (p.visibility LIKE \'%plaza%\' AND p.plaza_status = \'approved\')';

  const posts = db.prepare(`
    SELECT p.*, u.nickname, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE target_type = 'post' AND target_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND circle_id IS NULL) as comment_count,
      ou.nickname as original_nickname, ou.id as original_user_id
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN posts op ON p.original_post_id = op.id
    LEFT JOIN users ou ON op.user_id = ou.id
    WHERE ${where}
    ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `).all(userId, limit, offset);

  for (const p of posts) {
    p._liked = !!db.prepare("SELECT 1 FROM likes WHERE user_id = ? AND target_type = 'post' AND target_id = ?").get(req.user.id, p.id);
  }

  res.json({ posts });
});

// My memos
router.get('/memo', authMiddleware, (req, res) => {
  const posts = db.prepare(`
    SELECT p.*, u.nickname, u.avatar FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.user_id = ? AND p.visibility LIKE '%memo%'
    ORDER BY p.created_at DESC
  `).all(req.user.id);
  res.json({ posts });
});

// Hide/unhide post
router.put('/:id/hide', authMiddleware, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!post) return res.status(404).json({ error: '作品不存在' });
  db.prepare('UPDATE posts SET hidden = ? WHERE id = ?').run(post.hidden ? 0 : 1, post.id);
  res.json({ hidden: !post.hidden });
});

// Delete post
router.delete('/:id', authMiddleware, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '作品不存在' });
  if (post.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权删除' });
  }
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ message: '已删除' });
});

// Repost
router.post('/:id/repost', authMiddleware, (req, res) => {
  const original = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!original) return res.status(404).json({ error: '原作品不存在' });

  const { visibility, circle_ids } = req.body;
  const visibilityStr = visibility || 'memo';
  const plazaStatus = visibilityStr.includes('plaza') ? 'pending' : null;

  const result = db.prepare(`
    INSERT INTO posts (user_id, type, content, link, link_title, link_description, link_image, images, tags, visibility, plaza_status, original_post_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, original.type, original.content, original.link, original.link_title, original.link_description, original.link_image, original.images, original.tags, visibilityStr, plazaStatus, original.id);

  if (visibilityStr.includes('private') && circle_ids) {
    const ids = Array.isArray(circle_ids) ? circle_ids : JSON.parse(circle_ids);
    const insertCircle = db.prepare('INSERT OR IGNORE INTO post_circles (post_id, circle_id) VALUES (?, ?)');
    for (const cid of ids) insertCircle.run(result.lastInsertRowid, cid);
  }

  res.json({ message: '转发成功', postId: result.lastInsertRowid });
});

// Single post
router.get('/:id', authMiddleware, (req, res) => {
  const post = db.prepare(`
    SELECT p.*, u.nickname, u.avatar FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!post) return res.status(404).json({ error: '作品不存在' });
  res.json(post);
});

export default router;
