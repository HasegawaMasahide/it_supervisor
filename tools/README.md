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

## ⚠️ 既知の問題

### better-sqlite3 ビルドエラー

**問題**: Windows環境でbetter-sqlite3（ネイティブモジュール）のビルドに失敗

**影響範囲**:
- `@it-supervisor/metrics-model`
- `@it-supervisor/issue-manager`

**暫定対応**: デモスクリプト（`../demo/scripts/analyze-todo-app.ts`）を使用

**恒久対応（予定）**:
- [ ] `sql.js` (WebAssembly版SQLite) への置き換え
- [ ] または Docker環境でのビルド

詳細は [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md#better-sqlite3-ビルド問題) 参照

## 🔧 セットアップ（将来の実装完成後）

### 必要な環境

- Node.js 18以上
- npm 9以上
- Python 3.x（better-sqlite3ビルド用、将来的には不要になる予定）

### インストール

```bash
# ワークスペース全体の依存関係をインストール
npm install

# または個別パッケージ
cd packages/repo-analyzer
npm install
```

### ビルド

```bash
# 全パッケージをビルド
npm run build

# または個別パッケージ
cd packages/repo-analyzer
npm run build
```

### テスト

```bash
npm run test
```

### リント

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
- **SQLite**: データ永続化にはSQLiteを使用（後にPostgreSQLも検討）
- **Docker**: 静的解析・サンドボックス環境はDocker上で実行
- **オフライン対応**: 顧客環境でのオフライン作業を考慮
- **多言語対応**: 日本語・英語の両方に対応

## ライセンス

Private - IT資産監査・改善サービス専用
