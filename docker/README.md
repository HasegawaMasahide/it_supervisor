# IT Supervisor - Docker環境ガイド

このディレクトリには、IT Supervisorツール群をDocker環境で実行するための設定ファイルが含まれています。

## 📋 目次

1. [クイックスタート](#クイックスタート)
2. [ディレクトリ構造](#ディレクトリ構造)
3. [サービス一覧](#サービス一覧)
4. [使用例](#使用例)
5. [トラブルシューティング](#トラブルシューティング)

---

## クイックスタート

### 初回セットアップ

```bash
# 1. リポジトリのルートディレクトリに移動
cd it_supervisor

# 2. 環境変数ファイルの作成
cp .env.example .env

# 3. Dockerイメージのビルド
docker-compose build

# 4. サービスの起動
docker-compose up -d

# 5. ログの確認
docker-compose logs -f

# 6. データベースの初期化確認
docker-compose exec db psql -U postgres -d it_supervisor -c "\dt"
```

### 日常的な使い方

```bash
# サービスの起動
docker-compose up -d

# サービスの停止
docker-compose down

# ログの確認（リアルタイム）
docker-compose logs -f app

# 特定のサービスのみ起動
docker-compose up -d app db redis

# コンテナ内でコマンド実行
docker-compose exec app sh
```

---

## ディレクトリ構造

```
docker/
├── README.md                    # このファイル
├── app/
│   └── Dockerfile              # メインアプリケーション用
├── analyzers/
│   ├── eslint.Dockerfile       # ESLint静的解析用
│   ├── phpcs.Dockerfile        # PHP_CodeSniffer用
│   └── scripts/
│       ├── run-eslint.sh       # ESLint実行スクリプト
│       └── run-phpcs.sh        # PHPCS実行スクリプト
├── db/
│   └── init.sql                # PostgreSQL初期化SQL
└── nginx/
    └── Dockerfile              # 将来のWebUI用（未実装）
```

---

## サービス一覧

### コアサービス

| サービス | 説明 | ポート | 依存関係 |
|---------|------|--------|---------|
| `app` | メインアプリケーション | - | db, redis |
| `db` | PostgreSQL 16 | 5432 | - |
| `redis` | Redis 7 | 6379 | - |

### 静的解析サービス

| サービス | 説明 | 用途 |
|---------|------|------|
| `analyzer-eslint` | ESLint コンテナ | JavaScript/TypeScript解析 |
| `analyzer-phpcs` | PHP_CodeSniffer | PHP解析 |

### オプションサービス

| サービス | 説明 | ポート | 起動方法 |
|---------|------|--------|---------|
| `pgadmin` | PostgreSQL管理UI | 5050 | `--profile tools` |
| `sonarqube` | 高度な静的解析 | 9000 | コメント解除が必要 |

---

## 使用例

### 1. 顧客リポジトリの解析

```bash
# 1. 解析対象リポジトリをボリュームにコピー
docker cp /path/to/customer-repo it-supervisor-app:/app/repos/customer-project

# 2. リポジトリ解析の実行
docker-compose exec app node packages/repo-analyzer/dist/index.js \
  --repo-path /app/repos/customer-project \
  --output /app/reports/repo-analysis.json

# 3. 結果の確認
docker-compose exec app cat /app/reports/repo-analysis.json
```

### 2. ESLint静的解析の実行

```bash
# ESLintコンテナで解析実行
docker-compose exec analyzer-eslint /usr/local/bin/run-eslint.sh \
  /repos/customer-project json

# 結果の確認
docker-compose exec analyzer-eslint cat /repos/eslint-report.json

# ホストにコピー
docker cp it-supervisor-analyzer-eslint:/repos/eslint-report.json ./reports/
```

### 3. PHP_CodeSnifferの実行

```bash
# PHPCS実行
docker-compose exec analyzer-phpcs /usr/local/bin/run-phpcs.sh \
  /repos/customer-project PSR12

# 結果の確認
docker-compose exec analyzer-phpcs cat /repos/phpcs-report.json

# ホストにコピー
docker cp it-supervisor-analyzer-phpcs:/repos/phpcs-report.json ./reports/
```

### 4. データベース操作

```bash
# PostgreSQLに接続
docker-compose exec db psql -U postgres -d it_supervisor

# テーブル一覧
\dt

# プロジェクト一覧
SELECT * FROM projects;

# Issue一覧
SELECT id, title, severity, status FROM issues LIMIT 10;

# 接続終了
\q
```

### 5. pgAdminを使用したGUI管理

```bash
# pgAdminを起動
docker-compose --profile tools up -d pgadmin

# ブラウザでアクセス
open http://localhost:5050

# ログイン情報
# Email: admin@it-supervisor.local
# Password: admin

# サーバー接続設定
# Host: db
# Port: 5432
# Username: postgres
# Password: postgres
```

### 6. レポート生成

```bash
# メインアプリケーションでレポート生成
docker-compose exec app node packages/report-generator/dist/index.js \
  --project-id "10000000-0000-0000-0000-000000000001" \
  --type analysis \
  --format pdf \
  --output /app/reports/analysis-report.pdf

# 生成されたレポートをホストにコピー
docker cp it-supervisor-app:/app/reports/analysis-report.pdf ./reports/
```

---

## トラブルシューティング

### better-sqlite3 ビルドエラー

**問題**: `better-sqlite3` のビルドに失敗する

**解決策**:
```bash
# 1. Dockerコンテナ内でビルド（推奨）
docker-compose build --no-cache app

# 2. または sql.js に置き換え（アーキテクチャ設計書参照）
```

### ポートが既に使用されている

**問題**: `Error: port 5432 already in use`

**解決策**:
```bash
# 既存のPostgreSQLを停止
# Windows
net stop postgresql-x64-16

# または docker-compose.yml のポートを変更
# ports:
#   - "5433:5432"  # ホスト側を5433に変更
```

### データベース接続エラー

**問題**: `ECONNREFUSED` エラー

**解決策**:
```bash
# 1. データベースが起動しているか確認
docker-compose ps

# 2. ヘルスチェック状態を確認
docker-compose exec db pg_isready -U postgres

# 3. ログを確認
docker-compose logs db

# 4. 再起動
docker-compose restart db
```

### ディスク容量不足

**問題**: Docker ボリュームがディスクを圧迫

**解決策**:
```bash
# 使用されていないボリュームを削除
docker volume prune

# 特定のボリュームを削除（注意: データが失われます）
docker-compose down -v
```

### コンテナが起動しない

**問題**: `app` サービスが起動直後に停止する

**解決策**:
```bash
# ログを詳細に確認
docker-compose logs app

# インタラクティブモードで起動
docker-compose run --rm app sh

# 依存関係を確認
docker-compose exec app npm list
```

### ネットワークエラー

**問題**: コンテナ間で通信できない

**解決策**:
```bash
# ネットワークの再作成
docker-compose down
docker network prune
docker-compose up -d

# ネットワークの確認
docker network ls
docker network inspect it_supervisor_it-supervisor-network
```

---

## メンテナンス

### バックアップ

```bash
# データベースバックアップ
docker-compose exec db pg_dump -U postgres it_supervisor > backup.sql

# ボリュームのバックアップ
docker run --rm -v it_supervisor_postgres-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data
```

### リストア

```bash
# データベースリストア
docker-compose exec -T db psql -U postgres it_supervisor < backup.sql

# ボリュームのリストア
docker run --rm -v it_supervisor_postgres-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

### クリーンアップ

```bash
# すべてのコンテナとボリュームを削除
docker-compose down -v

# イメージも削除
docker-compose down --rmi all -v

# Docker全体のクリーンアップ
docker system prune -a --volumes
```

---

## 次のステップ

- [アーキテクチャ設計書](../doc/アーキテクチャ設計書.md) を読む
- [Phase 2: ECS/Fargate環境](../doc/アーキテクチャ設計書.md#phase-2-ecsfargate本番環境) の構築を検討
- [顧客向けダッシュボード](../doc/アーキテクチャ設計書.md#顧客向けダッシュボード) の開発を開始

---

**作成者**: IT Supervisor チーム
**更新日**: 2025-12-18
