# IT Supervisor Tools

IT資産監査・改善サービス用のツール群です。

## プロジェクト構造

このプロジェクトはモノレポ構成で、以下のパッケージで構成されています:

```
tools/
├── packages/
│   ├── metrics-model/       # メトリクスデータモデル
│   ├── repo-analyzer/       # リポジトリ解析ツール
│   ├── static-analyzer/     # 静的解析オーケストレーター
│   ├── sandbox-builder/     # サンドボックス環境構築ツール
│   ├── issue-manager/       # Issue管理システム
│   └── report-generator/    # レポートジェネレーター
├── package.json
├── tsconfig.json
└── README.md
```

## セットアップ

### 必要な環境

- Node.js 18以上
- npm 9以上

### インストール

```bash
npm install
```

### ビルド

```bash
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
