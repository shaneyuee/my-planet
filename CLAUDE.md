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
