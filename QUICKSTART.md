# IT Supervisor - クイックスタートガイド

このガイドでは、IT Supervisorを5分で起動し、デモプロジェクトで動作確認する手順を説明します。

## 🎯 目標

- Docker環境の起動
- データベースの初期化確認
- デモプロジェクト（Laravel TODOアプリ）の解析
- レポート生成

所要時間: **約5分**

---

## 📋 前提条件

- Docker Desktopがインストール済み（[ダウンロード](https://www.docker.com/products/docker-desktop/)）
- Git がインストール済み
- 空きディスク容量: 最低5GB

---

## 🚀 ステップ1: リポジトリのクローン

```bash
# リポジトリをクローン
git clone https://github.com/your-org/it_supervisor.git
cd it_supervisor
```

---

## 🔧 ステップ2: 初期セットアップ

### 方法A: Makeを使用（推奨）

```bash
make setup
```

このコマンドは以下を自動実行します:
1. `.env` ファイルの作成
2. Dockerイメージのビルド
3. サービスの起動

### 方法B: 手動セットアップ

```bash
# 1. 環境変数ファイルの作成
cp .env.example .env

# 2. Dockerイメージのビルド
docker-compose build

# 3. サービスの起動
docker-compose up -d
```

---

## ✅ ステップ3: 動作確認

### サービスの状態確認

```bash
# Makeを使用
make status

# または直接確認
docker-compose ps
```

**期待される出力**:
```
Name                            State    Ports
----------------------------------------------------------------
it-supervisor-app              Up
it-supervisor-db               Up       0.0.0.0:5432->5432/tcp
it-supervisor-redis            Up       0.0.0.0:6379->6379/tcp
it-supervisor-analyzer-eslint  Up
it-supervisor-analyzer-phpcs   Up
```

### データベースの確認

```bash
# PostgreSQLに接続
make db-console

# または
docker-compose exec db psql -U postgres -d it_supervisor
```

PostgreSQLコンソールで以下を実行:

```sql
-- テーブル一覧
\dt

-- デモプロジェクトの確認
SELECT * FROM projects;

-- 終了
\q
```

---

## 🧪 ステップ4: デモプロジェクトの解析

### デモスクリプトの実行

```bash
cd demo/scripts
npm install  # 初回のみ
npm run analyze
```

**実行内容**:
1. Laravel TODOアプリの解析
2. メトリクスの収集
3. Issueの検出
4. レポートの生成

**期待される出力**:
```
✅ Repository analyzed
✅ Static analysis completed
✅ Issues identified
✅ Report generated: demo/laravel-todo-app/reports/analysis-report.md
```

### 生成されたレポートの確認

```bash
# Windows
start demo/laravel-todo-app/reports/analysis-report.md

# macOS
open demo/laravel-todo-app/reports/analysis-report.md

# Linux
xdg-open demo/laravel-todo-app/reports/analysis-report.md
```

---

## 🎨 ステップ5: pgAdmin（データベース管理UI）の起動

```bash
# pgAdminを起動
make pgadmin

# または
docker-compose --profile tools up -d pgadmin
```

ブラウザで http://localhost:5050 にアクセス

**ログイン情報**:
- Email: `admin@it-supervisor.local`
- Password: `admin`

**サーバー接続設定**:
1. 左ペインで「Servers」を右クリック → 「Register」→「Server」
2. 以下を入力:
   - Name: `IT Supervisor`
   - Host: `db`
   - Port: `5432`
   - Username: `postgres`
   - Password: `postgres`

---

## 📊 ステップ6: 実際のプロジェクトを解析（オプション）

### 顧客リポジトリのコピー

```bash
# 解析したいリポジトリをDockerコンテナにコピー
docker cp /path/to/customer-repo it-supervisor-app:/app/repos/customer-project
```

### リポジトリ解析の実行

```bash
docker-compose exec app node packages/repo-analyzer/dist/index.js \
  --repo-path /app/repos/customer-project \
  --output /app/reports/repo-analysis.json

# 結果の確認
docker-compose exec app cat /app/reports/repo-analysis.json | jq .
```

### 静的解析（ESLint）の実行

```bash
# ESLint実行
docker-compose exec analyzer-eslint \
  /usr/local/bin/run-eslint.sh /repos/customer-project json

# 結果のコピー
docker cp it-supervisor-analyzer-eslint:/repos/eslint-report.json ./reports/
```

### 静的解析（PHP_CodeSniffer）の実行

```bash
# PHPCS実行
docker-compose exec analyzer-phpcs \
  /usr/local/bin/run-phpcs.sh /repos/customer-project PSR12

# 結果のコピー
docker cp it-supervisor-analyzer-phpcs:/repos/phpcs-report.json ./reports/
```

---

## 🔍 よくある問題

### ポートが既に使用されている

**エラー**: `Error: port 5432 already in use`

**解決策**:
```bash
# 既存のPostgreSQLを停止
# Windows
net stop postgresql-x64-16

# macOS/Linux
sudo systemctl stop postgresql
```

### Dockerが起動しない

**解決策**:
1. Docker Desktopが起動しているか確認
2. WSL2が有効か確認（Windows）
3. Docker Desktopの設定で「Resources」→「Memory」を最低4GB以上に設定

### データベースに接続できない

**解決策**:
```bash
# データベースのヘルスチェック
docker-compose exec db pg_isready -U postgres

# ログの確認
docker-compose logs db

# 再起動
docker-compose restart db
```

---

## 🧹 クリーンアップ

### サービスの停止

```bash
# サービス停止（データは保持）
make down
# または
docker-compose down
```

### 完全削除（データも削除）

```bash
# すべてのコンテナ、ボリューム、イメージを削除
make clean-all
# または
docker-compose down --rmi all -v
```

---

## 📚 次のステップ

### 1. ドキュメントを読む

- [README.md](README.md) - プロジェクト全体の概要
- [アーキテクチャ設計書](doc/アーキテクチャ設計書.md) - システム設計の詳細
- [Docker環境ガイド](docker/README.md) - Docker環境の詳細

### 2. 実際の顧客プロジェクトで試す

- 顧客リポジトリの解析
- Issue管理
- レポート生成

### 3. 本番環境の構築を検討（3ヶ月後〜）

- [Terraform設定](terraform/README.md) でAWS ECS/Fargate環境を構築
- 顧客向けダッシュボードの開発

---

## 💬 サポート

問題が解決しない場合:

1. [トラブルシューティング](docker/README.md#トラブルシューティング)を確認
2. [GitHub Issues](https://github.com/your-org/it_supervisor/issues)で報告
3. チーム内で相談

---

## 🎉 完了！

以上でIT Supervisorの基本的なセットアップは完了です。

次は実際の顧客プロジェクトで試してみましょう！

---

**作成者**: IT Supervisor チーム
**更新日**: 2025-12-18
