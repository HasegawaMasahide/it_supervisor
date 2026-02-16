# IT資産監査エージェント 実行ガイド

it_supervisor をチェックアウト済みの Windows マシンで、Claude Code を使って監査エージェントを実行する手順です。

---

## 前提条件

| 項目 | 要件 |
|---|---|
| OS | Windows 10/11 |
| Node.js | v18 以上 |
| npm | v9 以上 |
| Claude Code | インストール済み（`claude` コマンドが使えること） |
| it_supervisor | チェックアウト済み |
| 分析対象リポジトリ | 任意のパスにクローン済み |

---

## 1. ツール群のビルド（初回のみ）

```bash
cd c:/workspace/new_business/it_supervisor/tools
npm install
npm run build
```

ビルドが正常に終わることを確認してください。`npm test` でテストが通ることも確認できます。

---

## 2. Claude Code の実行

### 方法A: ワンライナーで実行（推奨）

プロンプトファイルの内容と実行パラメータをまとめて渡します。

```bash
claude -p "
以下のプロンプトに従い、IT資産監査を実行してください。

## 実行パラメータ
- TARGET_REPO_PATH: c:/path/to/target-repo
- PROJECT_NAME: 顧客Webアプリ
- CUSTOMER_NAME: 株式会社サンプル
- OUTPUT_DIR: c:/workspace/new_business/it_supervisor/output

## 作業ディレクトリ
c:/workspace/new_business/it_supervisor/tools をプロジェクトルートとして作業してください。
TypeScriptのスクリプトを作成・実行して監査パイプラインを実行してください。

## 手順
$(cat c:/workspace/new_business/it_supervisor/tools/docs/AGENT_AUDIT_PROMPT.md)
" --allowedTools "Bash,Read,Write,Edit,Glob,Grep"
```

### 方法B: 対話モードで実行

Claude Code を対話モードで起動し、手動で指示を出します。

```bash
# tools ディレクトリで起動
cd c:/workspace/new_business/it_supervisor/tools
claude
```

起動後、以下のように入力します:

```
docs/AGENT_AUDIT_PROMPT.md を読んで、そのプロンプトに従ってIT資産監査を実行してください。

実行パラメータ:
- TARGET_REPO_PATH: c:/path/to/target-repo
- PROJECT_NAME: 顧客Webアプリ
- CUSTOMER_NAME: 株式会社サンプル
- OUTPUT_DIR: c:/workspace/new_business/it_supervisor/output

tools/ ディレクトリでTypeScriptスクリプトを作成し、npx tsx で実行してください。
```

### 方法C: スクリプトファイル経由で実行

再利用しやすいようにシェルスクリプト化する方法です。

#### `run-audit.sh` を作成

```bash
#!/bin/bash
# IT資産監査エージェント実行スクリプト
# 使い方: ./run-audit.sh <対象リポジトリパス> <プロジェクト名> <顧客名>

TARGET_REPO="${1:?対象リポジトリのパスを指定してください}"
PROJECT_NAME="${2:?プロジェクト名を指定してください}"
CUSTOMER_NAME="${3:?顧客名を指定してください}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOOLS_DIR="$SCRIPT_DIR"
OUTPUT_DIR="$SCRIPT_DIR/output/$(date +%Y%m%d_%H%M%S)"
PROMPT_FILE="$TOOLS_DIR/docs/AGENT_AUDIT_PROMPT.md"

echo "=================================="
echo " IT資産監査エージェント"
echo "=================================="
echo " 対象: $TARGET_REPO"
echo " プロジェクト: $PROJECT_NAME"
echo " 顧客: $CUSTOMER_NAME"
echo " 出力先: $OUTPUT_DIR"
echo "=================================="

mkdir -p "$OUTPUT_DIR"

claude -p "
以下のプロンプトに従い、IT資産監査を実行してください。

## 実行パラメータ
- TARGET_REPO_PATH: $TARGET_REPO
- PROJECT_NAME: $PROJECT_NAME
- CUSTOMER_NAME: $CUSTOMER_NAME
- OUTPUT_DIR: $OUTPUT_DIR

## 作業手順
1. $TOOLS_DIR をカレントディレクトリとして作業すること
2. 監査パイプラインを単一の TypeScript ファイル（$OUTPUT_DIR/run-audit.ts）として生成すること
3. npx tsx $OUTPUT_DIR/run-audit.ts で実行すること
4. エラーが出たら修正して再実行すること
5. 最終的な成果物が $OUTPUT_DIR/reports/ に出力されていることを確認すること

## 監査プロンプト
$(cat "$PROMPT_FILE")
" --allowedTools "Bash,Read,Write,Edit,Glob,Grep"

echo ""
echo "完了。出力先: $OUTPUT_DIR"
```

#### 実行

```bash
cd c:/workspace/new_business/it_supervisor/tools
bash run-audit.sh "c:/path/to/target-repo" "顧客Webアプリ" "株式会社サンプル"
```

---

## 3. 実行の流れ（Claude が行うこと）

Claude は以下を自律的に行います:

```
1. OUTPUT_DIR/run-audit.ts を生成
   （AGENT_AUDIT_PROMPT.md の Step 1〜7 を実装したスクリプト）

2. npx tsx OUTPUT_DIR/run-audit.ts を実行

3. エラーがあればスクリプトを修正して再実行

4. 成果物の存在確認
   OUTPUT_DIR/
   ├── run-audit.ts              ← 実行スクリプト本体
   ├── audit.db                  ← メトリクス・Issue DB
   ├── metrics-export.json       ← メトリクスJSON
   ├── issues-export.csv         ← Issue一覧CSV
   └── reports/
       ├── audit-report.html     ← HTMLレポート
       ├── audit-report.md       ← Markdownレポート
       └── audit-report.pdf      ← PDFレポート（環境依存）
```

---

## 4. 実行例

```bash
# 例1: ローカルのLaravelプロジェクトを監査
bash run-audit.sh "c:/projects/customer-laravel-app" "顧客ECサイト" "株式会社ABC商事"

# 例2: Reactアプリを監査
bash run-audit.sh "c:/projects/react-dashboard" "管理ダッシュボード" "XYZテクノロジー株式会社"

# 例3: このリポジトリ自体を監査（テスト用）
bash run-audit.sh "c:/workspace/new_business/it_supervisor" "IT Supervisor" "自社"
```

---

## 5. トラブルシューティング

### ビルドが失敗する

```bash
# node_modules を削除して再インストール
cd c:/workspace/new_business/it_supervisor/tools
rm -rf node_modules
npm install
npm run build
```

### Claude が tools のパッケージを見つけられない

スクリプト内の import パスが解決できない場合、`npx tsx` の実行ディレクトリを `tools/` にする必要があります。Claude に以下のように伝えてください:

```
スクリプトの実行は必ず c:/workspace/new_business/it_supervisor/tools ディレクトリで
npx tsx を使って実行してください。
```

### 静的解析ツールが見つからない

ESLint 等は tools の devDependencies に含まれていますが、外部ツールはシステムにインストールされている必要があります。利用できないツールはスキップされる設計です。

#### 外部ツールのインストール

**PHP プロジェクト用ツール（Composer 経由）:**

```bash
# PHPStan
composer global require phpstan/phpstan

# PHPCS (PHP_CodeSniffer)
composer global require squizlabs/php_codesniffer

# Psalm（テイント解析）
composer global require vimeo/psalm

# PHPMD（メトリクス・複雑度）
composer global require phpmd/phpmd

# PHPCPD（重複コード検出）
composer global require systemsdk/phpcpd

# Progpilot（PHP SAST）- phar ファイルをダウンロード
curl -L -o progpilot.phar https://github.com/designsecurity/progpilot/releases/latest/download/progpilot.phar
```

**Docker 経由（推奨 - 環境を汚さない）:**

各ツールは Docker イメージとしても利用可能です。`useDocker: true` オプションを指定すると Docker 経由で実行されます。

```bash
# 各ツールの Docker イメージを事前に pull
docker pull vimeo/psalm
docker pull phpmd/phpmd
docker pull systemsdk/phpcpd
docker pull composer:latest
docker pull semgrep/semgrep
docker pull sonarsource/sonar-scanner-cli
```

**Semgrep（多言語対応SAST）:**

```bash
# pip 経由
pip install semgrep

# または Docker（推奨）
docker pull semgrep/semgrep
```

**SonarQube Community Edition（オプション）:**

SonarQube はサーバーとして起動し、環境変数 `SONARQUBE_URL` を設定する必要があります。

```bash
# Docker で SonarQube サーバー起動
docker run -d --name sonarqube -p 9000:9000 sonarqube:community

# 環境変数を設定
export SONARQUBE_URL=http://localhost:9000
```

**Gitleaks（シークレット検出）:**

```bash
# Windows (Scoop)
scoop install gitleaks

# macOS
brew install gitleaks

# Docker
docker pull ghcr.io/gitleaks/gitleaks
```

### PDF が生成されない

Puppeteer（Chromium）が未インストールの場合、PDF生成はスキップされます。HTML/Markdown は必ず生成されます。PDF が必要な場合:

```bash
cd c:/workspace/new_business/it_supervisor/tools
npm install puppeteer
```

---

## 6. カスタマイズ

### プロンプトの調整

[AGENT_AUDIT_PROMPT.md](./AGENT_AUDIT_PROMPT.md) を編集することで、監査の範囲や出力内容をカスタマイズできます。

| カスタマイズ項目 | 編集箇所 |
|---|---|
| 実行する静的解析ツール | Step 3 のツール選択ロジック |
| Issue登録の閾値（例: High以上のみ） | Step 4 のループ条件 |
| 改善提案のルール | Step 5 の条件分岐 |
| レポートに含めるデータ | Step 6 の reportConfig |
| レポートタイプ（Analysis→FinalReport等） | Step 6 の ReportType |

### CLAUDE.md による永続設定

`tools/CLAUDE.md` を作成すると、Claude Code がこのディレクトリで起動されるたびに自動的にコンテキストとして読み込まれます。監査時の共通設定を書いておくと便利です。

```markdown
# tools/CLAUDE.md の例

## 監査エージェントの共通設定
- 監査スクリプトは TypeScript で書き、npx tsx で実行すること
- import は @it-supervisor/* パッケージを使用すること
- エラー時はログ出力して可能な限り続行すること
- レポートは日本語で生成すること
```
