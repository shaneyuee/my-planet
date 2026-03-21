# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Space is a Chinese-language social platform with posts, circles (groups), comments, likes, follows, and admin moderation. It uses a monorepo structure with separate client and server directories.

## Development Commands

```bash
# Install dependencies (run from root)
npm install && cd client && npm install && cd ../server && npm install

# Run both client and server concurrently (from root)
npm run dev

# Run server only (with --watch for auto-reload)
npm run dev:server

# Run client only (Vite dev server on :5173)
npm run dev:client

# Build client for production
npm run build

# Start production server (serves built client + API on :3001)
npm run start
```

## Architecture

**Monorepo with three package.json files:** root (concurrently for dev), `client/`, and `server/`.

### Server (`server/`)
- **Express.js** with ES modules (`"type": "module"`)
- **SQLite** via `better-sqlite3` — database file at `server/data.db` (configurable via `DB_PATH` env var)
- Schema auto-created on import of `db.js` — no migration system, all tables use `CREATE TABLE IF NOT EXISTS`
- Default admin seeded automatically (username: `admin`, password: `admin123`)
- JWT auth with token in `Authorization: Bearer <token>` header; secret configurable via `JWT_SECRET` env var
- File uploads handled by `multer`, stored in `server/uploads/`
- API routes mounted at `/api/{auth,user,posts,circles,comments,admin}`
- Three auth middleware levels: `authMiddleware` (required), `optionalAuthMiddleware` (optional), `adminMiddleware` (admin role check)
- UI strings and error messages are in Chinese

### Client (`client/`)
- **React 18** with **Vite** and **Tailwind CSS 3**
- React Router v6 with lazy-loaded page components
- Auth state managed via React Context (`AuthContext`) with JWT stored in `localStorage`
- All API calls go through `client/src/api.js` — a single `request()` wrapper that auto-attaches JWT tokens
- Vite proxies `/api` and `/uploads` to `http://localhost:3001` during development

### Production / Docker
- Multi-stage Dockerfile: builds client, then serves built assets from `server/public/` with SPA fallback
- Production port defaults to 3000 (`PORT` env var)

### Key Data Model Concepts
- **Posts** have a `visibility` field (`plaza` for public, or scoped to circles) and a `plaza_status` for admin moderation (`pending`/`approved`)
- **Circles** are private groups with invite-link-based joining (token + expiry)
- **Users** require admin approval (`status: pending` → `approved`)
- Posts support types: `image_text` and link posts (with preview metadata)
- Comments support threading via `parent_id` and circle-scoped visibility

## Code Quality Checklist（每次生成/修改代码必须检查）

### 1. 数据一致性：同一模型的所有查询点必须同步

posts 表在多个路由中被查询，修改任何一处时必须检查并同步所有查询点：

| 查询点 | 文件位置 |
|--------|---------|
| 广场帖子 | `server/routes/post.js` — `GET /plaza` |
| 用户帖子 | `server/routes/post.js` — `GET /user/:id` |
| 备忘帖子 | `server/routes/post.js` — `GET /memo` |
| 单条帖子 | `server/routes/post.js` — `GET /:id` |
| 圈子帖子 | `server/routes/circle.js` — `GET /:id/posts` |
| 搜索结果 | `server/routes/search.js` — `GET /` |
| 转发写入 | `server/routes/post.js` — `POST /:id/repost`（INSERT 必须包含所有需复制的列） |

**检查规则：**
- 新增表字段时：grep 所有 `SELECT.*FROM posts` 和 `INSERT INTO posts` 语句，确认都已更新
- 新增 JOIN 时（如转发原作者 LEFT JOIN）：所有返回帖子列表的查询都要加上
- 新增 INSERT 列时：转发路由的 INSERT 必须同步包含新列

### 2. 字段复制完整性

当一个操作需要复制数据（如转发帖子），不能手动逐个列出字段。如果不得不列出，则：
- 对照 `db.js` 中的建表语句，确认没有遗漏
- 特别注意后续通过 `ALTER TABLE ADD COLUMN` 新增的列

### 3. 前后端一致性

- 服务端返回新字段时，确认前端组件已处理该字段的渲染
- 前端新增组件引用时，确认所有使用该数据的页面都已更新

## Bug 修复流程规则

每次修复 bug 后，必须执行以下步骤：

1. **根因分析**：找到 bug 的本质原因（不是表面原因）
2. **影响面排查**：检查是否有其他地方存在同类问题，一并修复
3. **总结规避措施**：将发现的模式写入本文件的 Checklist 中，防止同类问题再次出现
4. **更新查询点表格**：如果涉及新的查询/写入点，更新上方的查询点表格
