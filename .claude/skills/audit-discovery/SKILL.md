---
name: audit-discovery
description: 顧客リポジトリの調査フェーズ。技術スタック・構造・開発履歴を把握する。
disable-model-invocation: true
---

# IT資産監査 — 調査フェーズ (Discovery)

対象リポジトリ: `$ARGUMENTS`

以下の手順で対象リポジトリを調査し、調査レポートを生成してください。

## Step 1: ディレクトリ構造の把握

対象リポジトリのディレクトリ構造を確認し、主要なディレクトリとその役割を特定してください。

```
確認ポイント:
- ソースコードのルートディレクトリ
- テストディレクトリの有無と構造
- 設定ファイル群の場所
- ドキュメントの有無
- CI/CDパイプラインの定義
```

## Step 2: 技術スタック自動検出

以下のファイルの有無と内容を確認し、使用技術を特定してください:

| 検出対象ファイル | 判定される技術 |
|---|---|
| `package.json` | Node.js / JavaScript / TypeScript |
| `composer.json` | PHP |
| `requirements.txt`, `Pipfile`, `pyproject.toml` | Python |
| `*.csproj`, `*.sln` | C# / .NET |
| `pom.xml`, `build.gradle` | Java |
| `Gemfile` | Ruby |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `Dockerfile`, `docker-compose.yml` | Docker |

各パッケージ管理ファイルを読み、以下を抽出:
- フレームワーク名とバージョン
- 主要なライブラリ・依存関係
- 開発用依存関係（devDependencies等）
- スクリプト定義（build, test, lint等）

## Step 3: Git履歴分析

```bash
# 基本統計
git -C "$ARGUMENTS" log --oneline | wc -l          # 総コミット数
git -C "$ARGUMENTS" log --format="%ai" | head -1    # 最新コミット日
git -C "$ARGUMENTS" log --format="%ai" | tail -1    # 最初のコミット日
git -C "$ARGUMENTS" shortlog -sn --no-merges        # コミッター別件数

# ファイル変更頻度（ホットスポット特定）
git -C "$ARGUMENTS" log --format=format: --name-only | sort | uniq -c | sort -rn | head -20

# 最近の変更
git -C "$ARGUMENTS" log --oneline -20
```

## Step 4: コード規模の計測

ファイル拡張子ごとのファイル数と行数を集計してください。
特に以下の点に注目:
- ソースコードと設定ファイルの比率
- テストコードの有無と割合
- 生成コード（node_modules, vendor等）の除外

## Step 5: 設定・環境ファイルの確認

以下の設定ファイルを確認し、注目すべき設定を記録:
- `.env`, `.env.example` — 環境変数（シークレットの有無に注意）
- データベース設定ファイル
- 認証・セキュリティ関連の設定
- CORS / CSP ヘッダー設定
- ログ設定

## 出力フォーマット

調査結果を以下のMarkdown形式で `$ARGUMENTS/../{リポジトリ名}_audit/01_discovery.md` に保存してください:

```markdown
# 調査レポート — {プロジェクト名}

**調査日**: YYYY-MM-DD
**対象リポジトリ**: {パス}

## 1. プロジェクト概要

| 項目 | 値 |
|------|-----|
| 主要言語 | |
| フレームワーク | |
| バージョン | |
| ファイル数 | |
| コード行数（概算） | |
| テスト有無 | |

## 2. 技術スタック

### 言語・フレームワーク
（検出結果を記載）

### 主要依存関係
| パッケージ | バージョン | 用途 |
|-----------|-----------|------|

### 開発ツール
（lint, test, build等のツール）

## 3. ディレクトリ構造

（主要ディレクトリとその役割）

## 4. 開発履歴サマリー

| 項目 | 値 |
|------|-----|
| 総コミット数 | |
| 開発期間 | |
| コミッター数 | |
| 最終更新 | |

### ホットスポット（変更頻度の高いファイル）
（上位10件）

## 5. 注目ポイント（分析フェーズへの申し送り）

- [ ] （調査中に気づいた懸念事項をリスト）
```
