import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nickname TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL DEFAULT 'image_text',
    content TEXT DEFAULT '',
    link TEXT DEFAULT '',
    link_title TEXT DEFAULT '',
    link_description TEXT DEFAULT '',
    link_image TEXT DEFAULT '',
    images TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    visibility TEXT DEFAULT 'plaza',
    plaza_status TEXT DEFAULT 'pending',
    original_post_id INTEGER REFERENCES posts(id),
    hidden INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS circles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS post_circles (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, circle_id)
  );

  CREATE TABLE IF NOT EXISTS circle_members (
    circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (circle_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS circle_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    inviter_id INTEGER NOT NULL REFERENCES users(id),
    expires_at DATETIME NOT NULL
  );

  CREATE TABLE IF NOT EXISTS circle_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT DEFAULT '',
    type TEXT DEFAULT 'text',
    ref_post_id INTEGER REFERENCES posts(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    circle_id INTEGER REFERENCES circles(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    parent_id INTEGER REFERENCES comments(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    circle_id INTEGER REFERENCES circles(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, target_type, target_id, circle_id)
  );

  CREATE TABLE IF NOT EXISTS plus_ones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    UNIQUE(comment_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS follows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    follower_id INTEGER NOT NULL REFERENCES users(id),
    following_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_id INTEGER NOT NULL REFERENCES users(id),
    actor_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    content TEXT DEFAULT '',
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_id, is_read, created_at);

  CREATE TABLE IF NOT EXISTS direct_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    recipient_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages(sender_id, recipient_id, created_at);
`);

// FTS5 full-text search tables
db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(content, tags, content_rowid=id, tokenize='unicode61');
  CREATE VIRTUAL TABLE IF NOT EXISTS comments_fts USING fts5(content, content_rowid=id, tokenize='unicode61');
`);

// Triggers to sync FTS tables with source tables
db.exec(`
  CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
    INSERT INTO posts_fts(rowid, content, tags) VALUES (NEW.id, NEW.content, NEW.tags);
  END;
  CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE OF content, tags ON posts BEGIN
    UPDATE posts_fts SET content = NEW.content, tags = NEW.tags WHERE rowid = NEW.id;
  END;
  CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
    DELETE FROM posts_fts WHERE rowid = OLD.id;
  END;

  CREATE TRIGGER IF NOT EXISTS comments_ai AFTER INSERT ON comments BEGIN
    INSERT INTO comments_fts(rowid, content) VALUES (NEW.id, NEW.content);
  END;
  CREATE TRIGGER IF NOT EXISTS comments_au AFTER UPDATE OF content ON comments BEGIN
    UPDATE comments_fts SET content = NEW.content WHERE rowid = NEW.id;
  END;
  CREATE TRIGGER IF NOT EXISTS comments_ad AFTER DELETE ON comments BEGIN
    DELETE FROM comments_fts WHERE rowid = OLD.id;
  END;
`);

// Rebuild FTS index with existing data
try {
  const postCount = db.prepare('SELECT COUNT(*) as c FROM posts_fts').get().c;
  const realPostCount = db.prepare('SELECT COUNT(*) as c FROM posts').get().c;
  if (postCount === 0 && realPostCount > 0) {
    db.exec(`INSERT INTO posts_fts(rowid, content, tags) SELECT id, content, tags FROM posts`);
    db.exec(`INSERT INTO comments_fts(rowid, content) SELECT id, content FROM comments`);
  }
} catch {}

// Add last_login column if not exists
try { db.exec('ALTER TABLE users ADD COLUMN last_login DATETIME'); } catch {}

// Add media_meta column if not exists
try { db.exec("ALTER TABLE posts ADD COLUMN media_meta TEXT DEFAULT ''"); } catch {}

// Repo info cache table
db.exec(`
  CREATE TABLE IF NOT EXISTS repo_cache (
    url TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed admin user if not exists (password: admin123)
import bcrypt from 'bcryptjs';
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, nickname, role, status) VALUES (?, ?, ?, ?, ?)').run('admin', hash, '管理员', 'admin', 'approved');
}

export default db;
