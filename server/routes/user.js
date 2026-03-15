import { Router } from 'express';
import multer from 'multer';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const upload = multer({
  storage: multer.diskStorage({
    destination: join(__dirname, '..', 'uploads'),
    filename: (req, file, cb) => cb(null, `avatar-${req.user.id}-${Date.now()}${extname(file.originalname)}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('只支持图片格式'));
  },
});

const router = Router();

// Search users by nickname/username prefix (for @mention)
router.get('/search', authMiddleware, (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.json([]);
  const term = q.trim() + '%';
  const users = db.prepare(`
    SELECT id, username, nickname, avatar
    FROM users
    WHERE status = 'approved' AND (nickname LIKE ? OR username LIKE ?)
    LIMIT 10
  `).all(term, term);
  res.json(users);
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, nickname, avatar, bio, role, status, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

router.put('/me', authMiddleware, (req, res) => {
  const { nickname, bio } = req.body;
  db.prepare('UPDATE users SET nickname = COALESCE(?, nickname), bio = COALESCE(?, bio) WHERE id = ?').run(nickname, bio, req.user.id);
  const user = db.prepare('SELECT id, username, nickname, avatar, bio, role FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

router.post('/avatar', authMiddleware, (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: '请选择图片' });
    const avatarPath = `/uploads/${req.file.filename}`;
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarPath, req.user.id);
    res.json({ avatar: avatarPath });
  });
});

// My following list
router.get('/me/following', authMiddleware, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.nickname, u.avatar, u.bio
    FROM follows f JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ?
  `).all(req.user.id);
  res.json({ users });
});

// Recently logged-in users
router.get('/recent', authMiddleware, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, nickname, avatar, bio, last_login
    FROM users
    WHERE status = 'approved' AND last_login IS NOT NULL
    ORDER BY last_login DESC LIMIT 50
  `).all();
  res.json({ users });
});

// Toggle follow
router.post('/:id/follow', authMiddleware, (req, res) => {
  const targetId = parseInt(req.params.id);
  if (targetId === req.user.id) return res.status(400).json({ error: '不能关注自己' });
  const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, targetId);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE id = ?').run(existing.id);
    return res.json({ following: false });
  }
  db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.user.id, targetId);

  // Notification for new follow
  db.prepare(
    "INSERT INTO notifications (recipient_id, actor_id, type, target_type, target_id) VALUES (?, ?, 'follow', 'user', ?)"
  ).run(targetId, req.user.id, req.user.id);

  res.json({ following: true });
});

// Follow status + counts
router.get('/:id/follow-status', authMiddleware, (req, res) => {
  const targetId = parseInt(req.params.id);
  const row = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, targetId);
  const followerCount = db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(targetId).count;
  const followingCount = db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').get(targetId).count;
  res.json({ following: !!row, followerCount, followingCount });
});

router.get('/:id', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, nickname, avatar, bio, role, created_at FROM users WHERE id = ? AND status = ?').get(req.params.id, 'approved');
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

export default router;
