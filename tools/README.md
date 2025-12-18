# IT Supervisor Tools

IT資産監査・改善サービス用のツール群です。

**実装状況**: ✅ コード実装 100% 完了 | ⚠️ ビルド/テスト 保留中（環境問題）

詳細な実装状況は [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) を参照してください。

## 🚀 クイックスタート（デモ実行）

現在、better-sqlite3のビルド問題により、デモスクリプト（モック実装）での動作確認を推奨します：

```bash
cd ../demo/scripts
npm run analyze
```

**動作確認済み**：Laravel TODOアプリの解析、レポート生成まで完全動作します。

## 📦 プロジェクト構造

このプロジェクトはモノレポ構成で、以下のパッケージで構成されています:

```
tools/
├── packages/
│   ├── metrics-model/       # メトリクスデータモデル（✅ 641行実装済み）
│   ├── repo-analyzer/       # リポジトリ解析ツール（✅ 866行実装済み）
│   ├── static-analyzer/     # 静的解析オーケストレーター（✅ 18KB実装済み）
│   ├── sandbox-builder/     # サンドボックス環境構築ツール（✅ 876行実装済み）
│   ├── issue-manager/       # Issue管理システム（✅ 631行実装済み）
│   └── report-generator/    # レポートジェネレーター（✅ 610行実装済み）
├── IMPLEMENTATION_STATUS.md # 実装状況の詳細
├── USAGE_EXAMPLES.md        # 使用例
├── package.json
├── tsconfig.json
└── README.md
```

## ⚠️ 既知の問題と解決策

### better-sqlite3 ビルドエラー

**問題**: Windows環境でbetter-sqlite3（ネイティブモジュール）のビルドに失敗

**影響範囲**:
- `@it-supervisor/metrics-model`
- `@it-supervisor/issue-manager`

**✅ 解決済み（推奨）: Docker環境を使用**

Docker環境では、better-sqlite3のビルド問題は発生しません。以下のコマンドで即座に使用可能です：

```bash
# リポジトリルートディレクトリで実行
cd ..
make setup  # 初回セットアップ
make up     # サービス起動

# ツールの実行例
docker-compose exec app node packages/repo-analyzer/dist/index.js --help
```

詳細は [../docker/README.md](../docker/README.md) 参照

**代替手段**: デモスクリプト（モック実装）での動作確認

```bash
cd ../demo/scripts
npm run analyze
```

詳細は [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md#better-sqlite3-ビルド問題) 参照

## 🔧 セットアップ

### 推奨: Docker環境を使用（better-sqlite3問題を完全回避）

```bash
# 1. リポジトリルートに移動
cd ..

# 2. 初回セットアップ
make setup
# または: cp .env.example .env && docker-compose build && docker-compose up -d

# 3. 動作確認
make status
docker-compose ps

# 4. ツールの実行
docker-compose exec app node packages/repo-analyzer/dist/index.js --help
```

詳細は [Docker環境ガイド](../docker/README.md) を参照

### ローカル環境でのセットアップ（非推奨）

better-sqlite3のビルド問題があるため、**Docker環境を強く推奨**します。

どうしてもローカルでビルドする場合:

#### 必要な環境

- Node.js 18以上
- npm 9以上
- Python 3.x + Build Tools（better-sqlite3ビルド用）
  - Windows: `npm install --global windows-build-tools`
  - macOS: Xcode Command Line Tools
  - Linux: `build-essential`

#### インストール

```bash
# ワークスペース全体の依存関係をインストール
npm install

# または個別パッケージ
cd packages/repo-analyzer
npm install
```

#### ビルド

```bash
# 全パッケージをビルド
npm run build

# または個別パッケージ
cd packages/repo-analyzer
npm run build
```

#### テスト

```bash
npm run test
```

#### リント

```bash
npm run lint
```

## 各パッケージの概要

### @it-supervisor/metrics-model

メトリクスデータを管理するための型定義とユーティリティを提供します。

### @it-supervisor/repo-analyzer

Gitリポジトリを解析し、技術スタック・ファイル構成・コミット履歴などを収集します。

### @it-supervisor/static-analyzer

複数の静的解析ツールを統合的に実行し、結果を統一フォーマットで出力します。

### @it-supervisor/sandbox-builder

解析対象のシステムを安全に動作させるサンドボックス環境を自動構築します。

### @it-supervisor/issue-manager

発見された問題を管理し、優先順位付け・ステータス管理を行います。

### @it-supervisor/report-generator

各フェーズの成果物レポートを自動生成します（PDF/HTML対応）。

## 開発方針

- **TypeScript**: すべてのコードはTypeScriptで記述
- **PostgreSQL**: データ永続化（Docker環境ではPostgreSQL、ローカルではSQLite）
- **Docker**: 静的解析・サンドボックス環境はDocker上で実行
- **オフライン対応**: 顧客環境でのオフライン作業を考慮
- **多言語対応**: 日本語・英語の両方に対応

## Docker環境での使用例

### リポジトリ解析

```bash
# 顧客リポジトリをコンテナにコピー
docker cp /path/to/customer-repo it-supervisor-app:/app/repos/customer-project

# 解析実行
docker-compose exec app node packages/repo-analyzer/dist/index.js \
  --repo-path /app/repos/customer-project \
  --output /app/reports/repo-analysis.json

# 結果の確認
docker-compose exec app cat /app/reports/repo-analysis.json
```

### 静的解析（ESLint）

```bash
# ESLint実行
docker-compose exec analyzer-eslint \
  /usr/local/bin/run-eslint.sh /repos/customer-project json

# 結果のコピー
docker cp it-supervisor-analyzer-eslint:/repos/eslint-report.json ./reports/
```

### 静的解析（PHP_CodeSniffer）

```bash
# PHPCS実行
docker-compose exec analyzer-phpcs \
  /usr/local/bin/run-phpcs.sh /repos/customer-project PSR12

# 結果のコピー
docker cp it-supervisor-analyzer-phpcs:/repos/phpcs-report.json ./reports/
```

詳細な使用方法は [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) を参照

## 関連ドキュメント

- [アーキテクチャ設計書](../doc/アーキテクチャ設計書.md) - システム全体の設計
- [Docker環境ガイド](../docker/README.md) - Docker環境の詳細
- [実装状況](./IMPLEMENTATION_STATUS.md) - 各ツールの実装状況
- [使用例](./USAGE_EXAMPLES.md) - 具体的な使用例

## ライセンス

Private - IT資産監査・改善サービス専用
