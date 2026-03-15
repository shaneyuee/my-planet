# 🪐 My Planet — 我的星球

> **每个人都值得拥有一颗属于自己的星球。**
>
> 在这里，你可以畅所欲言、组建圈子、发现志趣相投的灵魂。没有算法绑架，没有信息茧房，只有最纯粹的表达与连接。

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express" />
  <img src="https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker" />
</p>

---

## 为什么是「我的星球」？

厌倦了被推荐算法支配的社交？受够了充斥广告的时间线？

**My Planet** 是一个轻量级、可自托管的私密社交平台。你可以在 5 分钟内用一条 Docker 命令把它跑起来，然后邀请你的朋友们入驻——从此拥有一个完全由你掌控的社交空间。

不需要云服务商，不需要复杂配置，一个树莓派就能承载你和朋友们的整个星球。

---

## ✨ 亮点功能

### 📮 多形态内容发布
支持 **图文**、**视频**、**音频**、**代码** 四种帖子类型。粘贴一个链接，自动抓取标题、摘要和封面图生成精美的链接预览卡片。每条帖子最多 9 张图片、10 个标签，表达从不受限。

### 🔵 私密圈子
创建只属于你们的圈子，生成 24 小时限时邀请链接，扫码即入。圈内拥有独立的消息流和帖子流——你的秘密花园，外人无法窥探。

### 🏠 广场与备忘
帖子发布到「广场」面向所有人，也可以设为「备忘」仅自己可见——把它当作你的私人笔记本。广场内容经管理员审核后展示，保持社区质量。

### 💬 嵌套评论 & 互动
三级嵌套回复、点赞、+1 表情反应、转帖……每一次互动都让连接更紧密。

### 👥 关注与发现
关注感兴趣的人，在「关注」时间线上只看你在意的内容。通过「最近活跃」入口发现新用户，让你的星球持续扩张。

### 🛡️ 注册审核 & 内容管理
新用户注册需要管理员批准，广场帖子需经审核。你的星球，你来决定谁能进入。

### 📱 移动端适配
底部 Tab 导航、响应式布局，手机上的体验和桌面一样流畅。

---

## 🛠 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React 18 + Vite 6 | 路由懒加载，首屏飞快 |
| **样式** | Tailwind CSS 3 | 原子化 CSS，响应式开箱即用 |
| **后端** | Express.js 4 (ESM) | 轻量高效，ES Modules 全面拥抱现代 Node |
| **数据库** | SQLite (better-sqlite3) | 零配置，单文件数据库，备份只需复制一个文件 |
| **认证** | JWT (7 天有效期) | 无状态认证，简单可靠 |
| **部署** | Docker 多阶段构建 | 一条命令，生产就绪 |

---

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 克隆项目
git clone https://github.com/shaneyuee/my-planet.git
cd my-planet

# 构建并启动
docker build -t my-planet .
docker run -d -p 3000:3000 \
  -v $(pwd)/data:/app/server/data.db \
  -v $(pwd)/uploads:/app/server/uploads \
  --name my-planet \
  my-planet
```

打开浏览器访问 `http://localhost:3000`，完事。

### 方式二：本地开发

**环境要求：**
- Node.js >= 20
- npm >= 9

```bash
# 克隆项目
git clone https://github.com/shaneyuee/my-planet.git
cd my-planet

# 安装所有依赖（根目录 + 客户端 + 服务端）
npm install && cd client && npm install && cd ../server && npm install && cd ..

# 启动开发服务器（前后端同时启动）
npm run dev
```

- 前端：`http://localhost:5173`（Vite 开发服务器，支持热更新）
- 后端：`http://localhost:3001`（API 服务，支持自动重载）

### 默认管理员账号

| 用户名 | 密码 |
|--------|------|
| `admin` | `admin123` |

> ⚠️ **部署后请立即修改默认密码！**

---

## 📦 项目结构

```
my-planet/
├── client/                   # React 前端
│   ├── src/
│   │   ├── pages/            # 页面组件（懒加载）
│   │   ├── components/       # 通用组件
│   │   ├── context/          # 全局状态（Auth）
│   │   └── api.js            # API 请求封装
│   └── vite.config.js        # Vite 配置 & 开发代理
├── server/                   # Express 后端
│   ├── routes/               # API 路由
│   │   ├── auth.js           # 注册 / 登录
│   │   ├── user.js           # 用户资料 / 关注
│   │   ├── post.js           # 帖子 CRUD / 转帖
│   │   ├── circle.js         # 圈子 / 邀请 / 消息
│   │   ├── comment.js        # 评论 / 点赞 / +1
│   │   └── admin.js          # 用户审核 / 内容审核
│   ├── middleware/auth.js     # JWT 认证中间件
│   ├── db.js                 # 数据库 Schema & 初始化
│   └── uploads/              # 用户上传文件
├── Dockerfile                # 多阶段构建
└── package.json              # 根项目（并发启动脚本）
```

---

## ⚙️ 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000`（生产）/ `3001`（开发） | 服务器端口 |
| `JWT_SECRET` | 内置默认值 | JWT 签名密钥，**生产环境必须修改** |
| `DB_PATH` | `./data.db` | SQLite 数据库文件路径 |

---

## 📋 常用命令

```bash
npm run dev          # 同时启动前后端开发服务器
npm run dev:server   # 仅启动后端（带 --watch 自动重载）
npm run dev:client   # 仅启动前端（Vite HMR）
npm run build        # 构建前端生产包
npm run start        # 启动生产服务器
```

---

## 🗺️ 路线图

- [ ] 消息通知系统
- [ ] 深色模式
- [ ] 帖子搜索
- [ ] Markdown 内容支持
- [ ] WebSocket 实时消息
- [ ] 多语言支持

---

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！无论是 bug 修复、新功能还是文档改进，每一份贡献都让这颗星球更美好。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

---

## 📄 License

[MIT](LICENSE) — 自由使用，自由修改，自由分享。

---

<p align="center">
  <sub>用代码构建连接，用热爱点亮星球。</sub>
  <br/>
  <sub>Built with ❤️ by <a href="https://github.com/shaneyuee">shaneyuee</a></sub>
</p>
