---
name: audit-analysis
description: 分析フェーズ。外部ツール実行とAIコードレビューを組み合わせてセキュリティ・品質問題を検出する。
disable-model-invocation: true
---

# IT資産監査 — 分析フェーズ (Analysis)

対象リポジトリ: `$ARGUMENTS`

このフェーズでは **外部ツールによる決定論的検査** と **AIによるセマンティック分析** を組み合わせて、問題を網羅的に検出します。

---

## Phase A: 外部ツール実行（決定論的検査）

### A-1. 技術スタック検出と実行ツール選択

まず Discovery レポート（`01_discovery.md`）を読み、対象の技術スタックを確認してください。
Discovery レポートが無い場合は、`package.json`, `composer.json`, `requirements.txt`, `*.csproj`, `pom.xml` の存在を確認して言語を判定してください。

検出した言語に応じて、以下のツールを実行します:

#### JavaScript / TypeScript
```bash
# ESLint（コード品質 + セキュリティ）
cd "$ARGUMENTS" && npx eslint . --format json --no-error-on-unmatched-pattern 2>/dev/null || true

# npm audit（依存関係の脆弱性）
cd "$ARGUMENTS" && npm audit --json 2>/dev/null || true

# 重複コード検出
cd "$ARGUMENTS" && npx -y jscpd --reporters json --output /tmp/jscpd-output . 2>/dev/null || true
```

#### PHP
```bash
# PHPStan（静的解析）— Docker fallback
cd "$ARGUMENTS" && docker run --rm -v "$(pwd):/app" -w /app ghcr.io/phpstan/phpstan analyse --error-format=json --no-progress 2>/dev/null || true

# PHP_CodeSniffer（コーディング規約）
cd "$ARGUMENTS" && docker run --rm -v "$(pwd):/app" -w /app cytopia/phpcs --report=json . 2>/dev/null || true

# Composer audit（依存関係の脆弱性）
cd "$ARGUMENTS" && docker run --rm -v "$(pwd):/app" -w /app composer:latest audit --format=json 2>/dev/null || true
```

#### Python
```bash
# Bandit（セキュリティ）
cd "$ARGUMENTS" && docker run --rm -v "$(pwd):/app" -w /app python:3.11 bash -c "pip install bandit -q && bandit -r . -f json --exclude .venv,venv,env,__pycache__" 2>/dev/null || true

# pip-audit（依存関係の脆弱性）
cd "$ARGUMENTS" && docker run --rm -v "$(pwd):/app" -w /app python:3.11 bash -c "pip install pip-audit -q && pip-audit -r requirements.txt --format json --desc" 2>/dev/null || true

# Pylint（コード品質）
cd "$ARGUMENTS" && docker run --rm -v "$(pwd):/app" -w /app python:3.11 bash -c "pip install pylint -q && pylint --output-format=json --recursive=y ." 2>/dev/null || true
```

#### Java
```bash
# PMD（静的解析）
cd "$ARGUMENTS" && docker run --rm -v "$(pwd):/app" -w /app openjdk:17-slim bash -c "apt-get update -q && apt-get install -y -q wget unzip && wget -q https://github.com/pmd/pmd/releases/latest/download/pmd-dist-*-bin.zip -O pmd.zip && unzip -q pmd.zip && ./pmd-bin-*/bin/pmd check -d /app/src -R rulesets/java/quickstart.xml -f json" 2>/dev/null || true
```

#### C# (.NET)
```bash
# Roslyn Analyzer（ビルド時診断）
cd "$ARGUMENTS" && docker run --rm -v "$(pwd):/app" -w /app mcr.microsoft.com/dotnet/sdk:8.0 dotnet build -v normal 2>&1 | grep -E "(warning|error) [A-Z]{2,3}[0-9]+" || true
```

#### 全言語共通
```bash
# Gitleaks（シークレット検出）
cd "$ARGUMENTS" && docker run --rm -v "$(pwd):/app" zricethezav/gitleaks:latest detect --source /app --report-format json 2>/dev/null || true

# Semgrep（汎用セキュリティスキャン）
cd "$ARGUMENTS" && docker run --rm -v "$(pwd):/app" semgrep/semgrep semgrep scan --config=auto --json --quiet /app 2>/dev/null || true
```

**注意**: 各ツール実行時にエラーが出ても中断せず、次のツールに進んでください。
ツールが利用不可の場合はスキップし、その旨を記録してください。

### A-2. DAST — 動的アプリケーションセキュリティテスト（オプション）

> **参考**: https://zenn.dev/rescuenow/articles/7192f8ca6ebe48
> E2Eテスト（Playwright）のトラフィックをOWASP ZAPプロキシに通すことで、テストシナリオがそのまま脆弱性スキャンになる。

**実行条件**: 対象リポジトリに `docker-compose.yml` または `Dockerfile` が存在し、Webアプリとして起動可能な場合のみ実行する。条件を満たさない場合はスキップし、その旨を記録する。

#### 手順

```bash
# 1. 対象アプリを起動
cd "$ARGUMENTS" && docker-compose up -d
# docker-composeがない場合: docker build -t audit-target . && docker run -d --name audit-target -p 3000:3000 audit-target

# 2. アプリの起動を待機（最大30秒）
for i in $(seq 1 30); do curl -sf http://localhost:3000 > /dev/null && break; sleep 1; done

# 3. OWASP ZAPをプロキシモードで起動
docker run -d --name zap --network host zaproxy/zap-stable zap.sh -daemon \
  -port 8080 -config api.disablekey=true

# 4. ZAPの起動を待機
sleep 10

# 5. Playwrightテストスクリプトを実行（ZAPプロキシ経由）
# テストスクリプトが存在する場合:
cd "$ARGUMENTS" && HTTP_PROXY=http://localhost:8080 HTTPS_PROXY=http://localhost:8080 \
  npx playwright test --config=playwright.config.ts 2>/dev/null || true
# テストスクリプトがない場合: ZAPのスパイダー機能でクロール
docker exec zap zap-cli spider http://localhost:3000 2>/dev/null || true

# 6. ZAPパッシブスキャン完了を待機 + アクティブスキャン実行
docker exec zap zap-cli active-scan http://localhost:3000 2>/dev/null || true

# 7. ZAPレポート取得
docker exec zap zap-cli report -o /tmp/zap-report.json -f json 2>/dev/null || true
docker cp zap:/tmp/zap-report.json /tmp/zap-report.json 2>/dev/null || true

# 8. クリーンアップ
docker stop zap && docker rm zap
cd "$ARGUMENTS" && docker-compose down 2>/dev/null || docker stop audit-target && docker rm audit-target
```

#### DASTで検出される典型的な問題

| ZAPアラート | 対応するセキュリティ問題 | 深刻度 |
|------------|----------------------|--------|
| 認証・認可なし | エンドポイントに認証が必要 | High |
| Content-Security-Policy未設定 | XSS攻撃のリスク増大 | Medium |
| X-Frame-Options未設定 | クリックジャッキングの可能性 | Medium |
| HttpOnly Cookie未設定 | セッションハイジャックのリスク | Medium |
| X-Content-Type-Options未設定 | MIMEスニッフィング攻撃 | Low |
| Server情報の露出 | バージョン情報によるターゲティング | Low |

**注意**: DASTの結果は一次スクリーニングとして扱い、ビジネスロジックの脆弱性はPhase B（AI分析）で検出する。

### A-3. ツール実行結果の集約

各ツールの出力をJSON形式で保存した後、結果を統一フォーマットに集約してください。

---

## Phase B: AIセマンティック分析（パターンマッチの代替）

ここがこの監査ツールの核心です。外部ツールが検出できない **文脈依存の問題** をAI分析で検出します。

### B-1. セキュリティ分析

以下の観点でソースコードを精読してください:

**認証・認可**
- 認証バイパスが可能なルート/エンドポイントはないか
- 認可チェックの欠落（管理者専用機能に一般ユーザーがアクセス可能等）
- セッション管理の不備（固定セッション、長すぎるタイムアウト等）

**入力バリデーション**
- SQLインジェクション（ORMを経由しない直接クエリ）
- XSS（テンプレートでのエスケープ漏れ、dangerouslySetInnerHTML等）
- コマンドインジェクション
- パストラバーサル
- SSRF

**データ保護**
- ハードコードされた認証情報・APIキー・パスワード
- 機密情報のログ出力
- 暗号化なしのデータ保存
- CSRF対策の欠如

**設定の不備**
- DEBUG=Trueが本番設定に残っている
- CORS設定が過度に緩い（`*`を許可）
- HTTPS強制の欠如
- セキュリティヘッダーの不足

### B-2. コード品質分析

**保守性**
- 過度に長い関数（50行超）
- 深いネスト（4段以上）
- コード重複（同じロジックの繰り返し）
- マジックナンバー・マジックストリング

**エラーハンドリング**
- 空のcatch/exceptブロック
- エラーメッセージに内部情報の露出
- 適切でないHTTPステータスコード

**設計上の問題**
- 密結合（直接的な依存関係の多さ）
- 単一責任原則の違反
- テストの欠如

### B-3. パフォーマンス分析

- N+1クエリ問題
- 大量データの一括取得（ページネーション無し）
- インデックスの欠如が疑われるクエリ
- キャッシュの不使用
- 不要な同期処理

---

## 出力フォーマット

分析結果を `$ARGUMENTS/../{リポジトリ名}_audit/02_analysis.md` に保存してください:

```markdown
# 分析レポート — {プロジェクト名}

**分析日**: YYYY-MM-DD

## 1. 外部ツール実行結果サマリー

| ツール | 実行結果 | 検出件数 | 備考 |
|--------|---------|---------|------|
| (ツール名) | 成功/失敗/スキップ | N件 | |
| OWASP ZAP (DAST) | 成功/失敗/スキップ | N件 | docker-compose.ymlの有無で実行判定 |

## 2. 検出された問題一覧

### Critical（即時対応が必要）

#### ISSUE-001: {問題タイトル}
- **カテゴリ**: Security / CodeQuality / Performance / Dependency
- **検出方法**: {ツール名} / AI分析
- **ファイル**: {パス}:{行番号}
- **説明**: （問題の詳細説明）
- **リスク**: （放置した場合の影響）
- **推奨対応**: （具体的な改善案）

（以下、High / Medium / Low の順に記載）

## 3. 統計サマリー

| 深刻度 | 件数 |
|--------|------|
| Critical | |
| High | |
| Medium | |
| Low | |
| Info | |
| **合計** | |

| カテゴリ | 件数 |
|---------|------|
| セキュリティ | |
| コード品質 | |
| パフォーマンス | |
| 依存関係 | |
```
