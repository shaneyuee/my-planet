# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npx vite build

# Stage 2: Build native deps
FROM node:20-bookworm-slim AS server-build
WORKDIR /app
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev

# Stage 3: Production
FROM node:20-bookworm-slim
WORKDIR /app

COPY --from=server-build /app/node_modules ./node_modules
COPY server/ ./
COPY --from=frontend-build /app/client/dist ./public

RUN mkdir -p uploads

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "index.js"]
