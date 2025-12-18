# IT Supervisor - メインアプリケーション Dockerfile
# Multi-stage build for optimized production image

# ===== Builder Stage =====
FROM node:20-alpine AS builder

# ビルドツールのインストール（better-sqlite3のビルド用）
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

WORKDIR /app

# package.jsonとpackage-lock.jsonのコピー（キャッシュ最適化）
COPY tools/package*.json ./

# 依存関係のインストール
RUN npm ci

# ソースコードのコピー
COPY tools/ ./

# TypeScriptビルド
RUN npm run build

# テストの実行（ビルド時に品質チェック）
# RUN npm test

# ===== Production Stage =====
FROM node:20-alpine

# セキュリティ: 非rootユーザーの作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 必要な依存関係のみインストール
RUN apk add --no-cache \
    git \
    tini

WORKDIR /app

# 所有者を設定
RUN chown -R nodejs:nodejs /app

# 本番依存関係のみインストール
COPY --chown=nodejs:nodejs tools/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ビルド成果物のコピー
COPY --from=builder --chown=nodejs:nodejs /app/packages/ ./packages/

# データディレクトリの作成
RUN mkdir -p /app/data /app/reports /app/repos && \
    chown -R nodejs:nodejs /app/data /app/reports /app/repos

# 非rootユーザーに切り替え
USER nodejs

# ポート公開（将来のWeb UI用）
EXPOSE 3000

# ヘルスチェック（将来のWeb UI用）
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# tiniを使用してPID 1問題を回避
ENTRYPOINT ["/sbin/tini", "--"]

# デフォルトコマンド（docker-compose.ymlでオーバーライド可能）
CMD ["node", "--version"]
