# IT Supervisor

**IT資産監査・改善サービス** - Agent AIを活用した中小企業向けIT資産の高速監査・改善・実装ワンストップサービス

[![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)
[![AWS](https://img.shields.io/badge/AWS-ECS%2FFargate-orange.svg)](terraform/)

---

## 📋 目次

- [概要](#概要)
- [主要な差別化要素](#主要な差別化要素)
- [クイックスタート](#クイックスタート)
- [プロジェクト構成](#プロジェクト構成)
- [開発環境セットアップ](#開発環境セットアップ)
- [使用方法](#使用方法)
- [デプロイ](#デプロイ)
- [ドキュメント](#ドキュメント)
- [ライセンス](#ライセンス)

---

## 概要

IT Supervisorは、中小企業の既存IT資産（業務アプリ、コーポレートサイト、CMS等）に対し、**Agent AI（Claude Code等）を活用**した高速監査・改善提案・実装までをワンストップで提供するサービスです。

### ビジネス目標（初年度）

- **受注件数**: 7件（月0.5〜1件ペース）
- **売上高**: 14,000千円
- **粗利率**: 60%

### サービスプラン

| プラン | 内容 | 価格帯 | 期間 |
|--------|------|--------|------|
| **ライト** | 診断レポートのみ | 50-80万円 | 3-4週間 |
| **スタンダード** | 診断+改善提案（人間検証付）| 100-150万円 | 4-6週間 |
| **プレミアム** | 実装まで（ワンストップ）| 200-400万円 | 3-5ヶ月 |

---

## 主要な差別化要素

### 1. AI+人間のハイブリッド体制
- **AIで効率化**: 静的解析、メトリクス収集、レポート生成を自動化
- **人間で品質保証**: Critical問題は2名以上でレビュー、4層品質ゲート

### 2. 瑕疵担保責任
- **対象**: コード変更による機能破壊、既存機能の退行、セキュリティ診断の見落とし
- **期間**: 実装完了後3ヶ月間
- **効果**: 「AIが怖い」という顧客不安を解消

### 3. ワンストップ対応
- 診断から実装・効果測定までを一気通貫で提供
- Before/After比較による効果の可視化

---

## クイックスタート

### 前提条件

- Docker Desktop（Windows/macOS）または Docker Engine（Linux）
- Git
- **推奨**: Make（オプション、コマンド簡略化用）

### 3ステップで起動

```bash
# 1. リポジトリのクローン
git clone https://github.com/your-org/it_supervisor.git
cd it_supervisor

# 2. 初期セットアップ（環境変数作成、ビルド、起動）
make setup
# または Makeが無い場合:
# cp .env.example .env && docker-compose build && docker-compose up -d

# 3. 動作確認
make status
# または:
# docker-compose ps

# ログの確認
make logs
# または:
# docker-compose logs -f
```

### サービスへのアクセス

| サービス | URL | 認証情報 |
|---------|-----|---------|
| pgAdmin（DB管理） | http://localhost:5050 | admin@it-supervisor.local / admin |
| PostgreSQL | localhost:5432 | postgres / postgres |
| Redis | localhost:6379 | - |

---

## プロジェクト構成

```
it_supervisor/
├── doc/                          # ドキュメント
│   ├── IT資産監査・改善サービス_事業計画書.md
│   ├── アーキテクチャ設計書.md    # ★重要: Docker/ECS/k8sの設計
│   └── ツール群の要件ヒアリングメモ.md
│
├── lp/                           # ランディングページ
│   ├── index.html
│   ├── styles.css
│   └── script.js
│
├── tools/                        # ツール群（TypeScript）
│   ├── packages/
│   │   ├── metrics-model/       # メトリクスデータモデル
│   │   ├── repo-analyzer/       # リポジトリ解析
│   │   ├── static-analyzer/     # 静的解析オーケストレーター
│   │   ├── sandbox-builder/     # サンドボックス環境構築
│   │   ├── issue-manager/       # Issue管理システム
│   │   └── report-generator/    # レポートジェネレーター
│   └── README.md
│
├── docker/                       # Docker設定
│   ├── app/Dockerfile           # メインアプリケーション
│   ├── analyzers/               # 静的解析ツール用コンテナ
│   │   ├── eslint.Dockerfile
│   │   ├── phpcs.Dockerfile
│   │   └── scripts/
│   ├── db/init.sql              # PostgreSQL初期化スクリプト
│   └── README.md
│
├── terraform/                    # AWS ECS/Fargate本番環境（Phase 2）
│   ├── main.tf
│   ├── variables.tf
│   └── README.md
│
├── kubernetes/                   # k8s移行計画（Phase 3、参考）
│   └── README.md
│
├── dashboard/                    # 顧客向けダッシュボード（設計のみ）
│   └── README.md
│
├── .github/workflows/            # CI/CD
│   └── deploy-ecs.yml
│
├── docker-compose.yml            # Docker Compose設定
├── Makefile                      # ヘルパーコマンド
├── .env.example                  # 環境変数テンプレート
├── .gitignore
└── README.md                     # このファイル
```

---

## 開発環境セットアップ

### 方法1: Makeを使用（推奨）

```bash
# 初回セットアップ
make setup

# サービスの起動/停止
make up
make down
make restart

# ログの確認
make logs
make logs-app
make logs-db

# シェル接続
make shell        # appコンテナ
make db-console   # PostgreSQL

# pgAdmin起動
make pgadmin

# 状態確認
make status
make info
```

### 方法2: docker-composeを直接使用

```bash
# 環境変数ファイルの作成
cp .env.example .env

# ビルド
docker-compose build

# 起動
docker-compose up -d

# ログ確認
docker-compose logs -f app

# 停止
docker-compose down
```

---

## 使用方法

### 1. 顧客リポジトリの解析

```bash
# 1. 顧客リポジトリをボリュームにコピー
docker cp /path/to/customer-repo it-supervisor-app:/app/repos/customer-project

# 2. リポジトリ解析の実行
docker-compose exec app node packages/repo-analyzer/dist/index.js \
  --repo-path /app/repos/customer-project \
  --output /app/reports/repo-analysis.json

# 3. 結果の確認
docker-compose exec app cat /app/reports/repo-analysis.json

# または Makeを使用
make analyze-repo REPO_PATH=/app/repos/customer-project
```

### 2. 静的解析の実行

#### ESLint（JavaScript/TypeScript）

```bash
# Makeを使用
make analyze-eslint REPO_PATH=/repos/customer-project

# または直接実行
docker-compose exec analyzer-eslint \
  /usr/local/bin/run-eslint.sh /repos/customer-project json
```

#### PHP_CodeSniffer（PHP）

```bash
# Makeを使用
make analyze-phpcs REPO_PATH=/repos/customer-project STANDARD=PSR12

# または直接実行
docker-compose exec analyzer-phpcs \
  /usr/local/bin/run-phpcs.sh /repos/customer-project PSR12
```

### 3. データベース操作

```bash
# PostgreSQLコンソールに接続
make db-console
# または:
# docker-compose exec db psql -U postgres -d it_supervisor

# プロジェクト一覧
SELECT * FROM projects;

# Issue一覧（Critical のみ）
SELECT id, title, severity, status FROM issues WHERE severity = 'critical';

# メトリクス一覧
SELECT * FROM metrics ORDER BY measured_at DESC LIMIT 10;

# バックアップ
make db-backup

# リストア
make db-restore BACKUP_FILE=backups/backup-20251218.sql
```

### 4. レポート生成

```bash
docker-compose exec app node packages/report-generator/dist/index.js \
  --project-id "10000000-0000-0000-0000-000000000001" \
  --type analysis \
  --format pdf \
  --output /app/reports/analysis-report.pdf

# 生成されたレポートをホストにコピー
docker cp it-supervisor-app:/app/reports/analysis-report.pdf ./reports/
```

---

## デプロイ

### Phase 1: ローカル開発環境（現在）

```bash
# Docker Composeで実行
docker-compose up -d
```

### Phase 2: AWS ECS/Fargate（3ヶ月後〜）

```bash
# Terraformでインフラ構築
cd terraform
terraform init
terraform plan
terraform apply

# GitHub Actionsで自動デプロイ
git push origin main  # mainブランチへのpushで自動デプロイ
```

詳細は [terraform/README.md](terraform/README.md) を参照。

### Phase 3: Kubernetes（12ヶ月後〜、条件付き）

顧客数50社以上、月商1000万円以上になった場合のみ検討。

詳細は [kubernetes/README.md](kubernetes/README.md) を参照。

---

## ドキュメント

### 重要なドキュメント

| ドキュメント | 説明 |
|------------|------|
| [アーキテクチャ設計書](doc/アーキテクチャ設計書.md) | **必読**: Docker/ECS/k8sの設計、データモデル、セキュリティ |
| [事業計画書](doc/IT資産監査・改善サービス_事業計画書.md) | サービス概要、ビジネスモデル、収益計画 |
| [ツール要件](doc/ツール群の要件ヒアリングメモ.md) | 各ツールの機能要件、データフロー |
| [Docker環境ガイド](docker/README.md) | Docker環境の詳細、トラブルシューティング |
| [Terraform設定](terraform/README.md) | AWS ECS/Fargateの構築方法、コスト試算 |
| [ダッシュボード設計](dashboard/README.md) | 顧客向けWebダッシュボードの設計 |

### ツール使用例

- [tools/USAGE_EXAMPLES.md](tools/USAGE_EXAMPLES.md) - 各ツールの使用例
- [tools/IMPLEMENTATION_STATUS.md](tools/IMPLEMENTATION_STATUS.md) - 実装状況

---

## 技術スタック

### バックエンド
- **言語**: TypeScript（Node.js 20）
- **データベース**: PostgreSQL 16（本番）/ SQLite（開発）
- **キャッシュ**: Redis 7
- **ORM**: Prisma（予定）

### フロントエンド（顧客向けダッシュボード、未実装）
- **フレームワーク**: React 18 + TypeScript
- **UI**: Material-UI (MUI)
- **チャート**: Chart.js

### 静的解析ツール
- **JavaScript/TypeScript**: ESLint, Prettier
- **PHP**: PHP_CodeSniffer, PHPStan, PHP Mess Detector
- **C#**: Roslyn Analyzers, StyleCop
- **Python**: pylint, mypy, bandit
- **Java**: Checkstyle, SpotBugs, PMD
- **セキュリティ**: Snyk, Gitleaks, OWASP Dependency-Check
- **統合**: SonarQube（オプション）

### インフラ
- **開発**: Docker + docker-compose
- **本番**: AWS ECS/Fargate + RDS Aurora Serverless v2
- **IaC**: Terraform
- **CI/CD**: GitHub Actions

---

## トラブルシューティング

### better-sqlite3 ビルドエラー

**問題**: Windows環境でbetter-sqlite3のビルドに失敗

**解決策**: Docker環境を使用してください。Docker内でビルドされるため、ホスト環境のPython設定は不要です。

```bash
# Docker環境で実行
docker-compose up -d
docker-compose exec app npm install
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

```bash
# データベースのヘルスチェック
docker-compose exec db pg_isready -U postgres

# ログの確認
docker-compose logs db

# 再起動
docker-compose restart db
```

詳細は [docker/README.md](docker/README.md#トラブルシューティング) を参照。

---

## コントリビューション

このプロジェクトは社内専用です。外部からのコントリビューションは受け付けていません。

---

## ライセンス

UNLICENSED - IT資産監査・改善サービス専用（社内使用のみ）

---

## サポート

### 質問・問題報告

1. [GitHub Issues](https://github.com/your-org/it_supervisor/issues)
2. プロジェクトドキュメント参照
3. チーム内での相談

### 緊急時の連絡先

- プロジェクトマネージャー: pm@example.com
- 技術リード: tech-lead@example.com

---

## 次のステップ

### 今すぐ実施（Phase 1）

1. **Docker環境の確認**
   ```bash
   make setup
   make status
   ```

2. **デモプロジェクトで動作確認**
   ```bash
   cd demo/scripts
   npm run analyze
   ```

3. **ドキュメントの熟読**
   - [アーキテクチャ設計書](doc/アーキテクチャ設計書.md)を読む
   - [Docker環境ガイド](docker/README.md)を確認

### 3ヶ月後（Phase 2）

- AWS ECS/Fargate環境の構築
- 顧客向けダッシュボードの開発
- 本番運用開始

### 12ヶ月後（Phase 3、条件付き）

- 顧客数・売上を見てKubernetes移行を検討
- **ほとんどの場合、不要**（ECSで十分）

---

**作成者**: IT Supervisor チーム
**更新日**: 2025-12-18
**バージョン**: 1.0
