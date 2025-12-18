# IT Supervisor - 顧客向けダッシュボード

## 📋 概要

顧客がプロジェクトの進捗、メトリクス、Issueをリアルタイムで確認できるWebダッシュボードです。

## 🎯 主要機能

### 1. Overview（概要）
- プロジェクトステータス
- 主要メトリクス（コード品質、セキュリティリスク、技術的負債）
- Before/Afterのグラフ表示

### 2. Issues（課題管理）
- Issue一覧（フィルタ・ソート機能付き）
- Issue詳細ページ
- コメント機能
- ステータス更新

### 3. Reports（レポート）
- レポート一覧
- PDF/HTMLビューア
- ダウンロード機能

### 4. Timeline（進捗管理）
- フェーズごとの進捗
- マイルストーン達成状況
- 次のアクション

## 🛠️ 技術スタック

### フロントエンド
```json
{
  "framework": "React 18 + TypeScript",
  "ui": "Material-UI (MUI)",
  "charts": "Chart.js + react-chartjs-2",
  "state": "React Query + Zustand",
  "routing": "React Router v6",
  "auth": "Auth0 / Firebase Auth"
}
```

### バックエンドAPI
```json
{
  "framework": "Express.js + TypeScript",
  "orm": "Prisma",
  "validation": "Zod",
  "authentication": "Passport.js + JWT"
}
```

## 📦 ディレクトリ構造（予定）

```
dashboard/
├── frontend/              # Reactアプリケーション
│   ├── src/
│   │   ├── components/   # 共通コンポーネント
│   │   ├── pages/        # ページコンポーネント
│   │   ├── hooks/        # カスタムフック
│   │   ├── api/          # API呼び出し
│   │   ├── store/        # 状態管理
│   │   └── types/        # 型定義
│   ├── public/
│   └── package.json
│
├── backend/               # Express.js API
│   ├── src/
│   │   ├── routes/       # APIルート
│   │   ├── controllers/  # コントローラー
│   │   ├── services/     # ビジネスロジック
│   │   ├── middleware/   # ミドルウェア
│   │   └── types/        # 型定義
│   └── package.json
│
└── README.md
```

## 🚀 開発開始（将来）

### 1. フロントエンドの初期化

```bash
# Create React App with TypeScript
npx create-react-app frontend --template typescript

# または Vite（推奨）
npm create vite@latest frontend -- --template react-ts

cd frontend
npm install @mui/material @emotion/react @emotion/styled
npm install react-router-dom react-query zustand
npm install chart.js react-chartjs-2
npm install axios zod
```

### 2. バックエンドの初期化

```bash
mkdir backend && cd backend
npm init -y
npm install express typescript @types/express
npm install prisma @prisma/client
npm install passport passport-jwt jsonwebtoken
npm install zod cors helmet
npm install -D @types/node ts-node nodemon
```

### 3. Dockerコンテナ化

```dockerfile
# dashboard/frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# dashboard/backend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## 🎨 UIモックアップ

### Overview Page
```
┌──────────────────────────────────────────────┐
│  IT Supervisor Dashboard                     │
├──────────────────────────────────────────────┤
│                                               │
│  Project: Laravel TODO App                   │
│  Status: Analysis  Progress: 45%             │
│                                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ Code    │  │Security │  │Technical│     │
│  │Quality  │  │Risks    │  │Debt     │     │
│  │  72/100 │  │   12    │  │  8 days │     │
│  └─────────┘  └─────────┘  └─────────┘     │
│                                               │
│  📊 Metrics Trend (Last 7 Days)              │
│  ┌─────────────────────────────────────┐    │
│  │    Chart.js Line Chart              │    │
│  │    (Code Quality, Security, etc.)   │    │
│  └─────────────────────────────────────┘    │
│                                               │
└──────────────────────────────────────────────┘
```

### Issues Page
```
┌──────────────────────────────────────────────┐
│  Issues  🔍 Search  ▼ Filter  ⚙️ Settings   │
├──────────────────────────────────────────────┤
│                                               │
│  ⚠️  Critical (3)  ⚡ High (12)  ⚪ Medium (28)│
│                                               │
│  ┌─────────────────────────────────────┐    │
│  │ 🔴 SQL Injection vulnerability      │    │
│  │    app/controllers/UserController    │    │
│  │    Created: 2025-12-15  Status: Open │    │
│  └─────────────────────────────────────┘    │
│                                               │
│  ┌─────────────────────────────────────┐    │
│  │ 🟡 Unused variable detected          │    │
│  │    app/helpers/utils.php             │    │
│  │    Created: 2025-12-14  Status: Open │    │
│  └─────────────────────────────────────┘    │
│                                               │
└──────────────────────────────────────────────┘
```

## 🔐 認証・認可

### 認証フロー

```typescript
// JWT認証
interface AuthFlow {
  login: {
    email: string;
    password: string;
    mfa_code?: string;
  };

  response: {
    access_token: string;      // 有効期限: 24時間
    refresh_token: string;     // 有効期限: 7日間
    user: {
      id: string;
      email: string;
      company_name: string;
      plan: 'light' | 'standard' | 'premium';
    };
  };
}
```

### ロールベースアクセス制御

```typescript
enum Role {
  ADMIN = 'admin',           // IT Supervisorチーム
  CUSTOMER = 'customer',     // 顧客（読み取り専用）
  ENGINEER = 'engineer'      // エンジニア（読み書き可能）
}

interface Permission {
  view_projects: boolean;
  view_issues: boolean;
  comment_issues: boolean;
  update_issue_status: boolean;
  view_reports: boolean;
  download_reports: boolean;
  view_source_code: boolean; // 顧客は不可
}
```

## 📱 レスポンシブデザイン

- **デスクトップ**: 1920x1080以上
- **タブレット**: 768px - 1024px
- **モバイル**: 375px - 767px

すべてのページでモバイルファーストデザインを採用。

## 🔗 API設計（予定）

### エンドポイント例

```typescript
// GET /api/projects/:id
GET /api/projects/10000000-0000-0000-0000-000000000001
{
  "id": "...",
  "name": "Laravel TODO App",
  "status": "analysis",
  "progress": 45,
  "metrics": { ... }
}

// GET /api/projects/:id/issues
GET /api/projects/.../issues?severity=critical&status=open
{
  "issues": [ ... ],
  "total": 15,
  "page": 1,
  "per_page": 20
}

// POST /api/issues/:id/comments
POST /api/issues/.../comments
{
  "content": "This issue has been fixed in PR #123"
}
```

## 📝 開発優先度

### Phase 1（MVP: 4-6週間）
- [ ] 認証機能
- [ ] Overview ページ
- [ ] Issue一覧・詳細ページ
- [ ] レポート閲覧機能

### Phase 2（本番運用: 2-3週間）
- [ ] リアルタイム通知
- [ ] コメント機能
- [ ] ダウンロード機能
- [ ] 検索・フィルタリング強化

### Phase 3（拡張: 継続的）
- [ ] モバイルアプリ（React Native）
- [ ] メール通知
- [ ] カスタマイズ可能なダッシュボード
- [ ] APIキー発行機能

## 🔗 関連ドキュメント

- [アーキテクチャ設計書](../doc/アーキテクチャ設計書.md#顧客向けダッシュボード)
- [データベーススキーマ](../docker/db/init.sql)

---

**作成者**: IT Supervisor チーム
**更新日**: 2025-12-18
**ステータス**: 設計フェーズ（未実装）
