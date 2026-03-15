#!/bin/bash
set -e

# 配置
REMOTE_HOST="root@120.26.92.97"
REMOTE_DIR="/opt/personal-space"
CONTAINER_NAME="personal-space"
IMAGE_NAME="personal-space:latest"
TARBALL="/tmp/personal-space.tar.gz"

echo "=== 1. 本地编译客户端 ==="
cd "$(dirname "$0")"
npm run build

echo "=== 2. 打包项目文件 ==="
tar czf "$TARBALL" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='server/data.db' \
  --exclude='server/data.db-wal' \
  --exclude='server/data.db-shm' \
  --exclude='server/uploads/*' \
  --exclude='.claude' \
  -C . .
echo "打包完成: $(du -h "$TARBALL" | cut -f1)"

echo "=== 3. 上传到远程服务器 ==="
scp "$TARBALL" "$REMOTE_HOST:/tmp/"

echo "=== 4. 远程部署 ==="
ssh "$REMOTE_HOST" bash -s << DEPLOY_EOF
set -e

echo "--- 停止并删除旧容器 ---"
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}\$"; then
  docker stop "$CONTAINER_NAME" && docker rm "$CONTAINER_NAME"
  echo "旧容器已删除"
else
  echo "无旧容器"
fi

echo "--- 删除旧镜像 ---"
if docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}\$"; then
  docker rmi "$IMAGE_NAME"
  echo "旧镜像已删除"
else
  echo "无旧镜像"
fi

echo "--- 解压项目文件 ---"
rm -rf "$REMOTE_DIR"
mkdir -p "$REMOTE_DIR"
tar xzf "$TARBALL" -C "$REMOTE_DIR"

echo "--- 构建 Docker 镜像 ---"
cd "$REMOTE_DIR"
docker build -t "$IMAGE_NAME" .

echo "--- 启动容器 ---"
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p 3000:3000 \
  -v "$REMOTE_DIR/data:/app/data" \
  -v "$REMOTE_DIR/uploads:/app/uploads" \
  -e DB_PATH=/app/data/data.db \
  "$IMAGE_NAME"

echo "--- 验证 ---"
sleep 2
docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}  {{.Status}}  {{.Ports}}"
echo "部署完成!"
DEPLOY_EOF

rm -f "$TARBALL"
echo "=== 部署成功 ==="
