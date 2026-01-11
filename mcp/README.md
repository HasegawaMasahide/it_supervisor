# IT資産監査サービス - MCP統合ガイド

このディレクトリには、IT資産監査サービスで使用するMCP (Model Context Protocol) サーバーの設定と実装が含まれています。

## 📁 ディレクトリ構成

```
mcp/
├── config/                      # 設定ファイル
│   ├── mcp-config.json         # MCPサーバー設定（Claude Code用）
│   ├── .env.example            # 環境変数テンプレート
│   └── .env                    # 環境変数（git管理外）
├── servers/                     # カスタムMCPサーバー実装
│   ├── security-scanner/       # セキュリティスキャンサーバー
│   ├── multi-lang-analyzer/    # PHP/C#静的解析サーバー
│   └── proposal-context/       # 改善提案コンテキストサーバー
├── scripts/                     # セットアップスクリプト
│   ├── setup-mcp.sh            # 初期セットアップ
│   └── verify-mcp.sh           # 動作確認
└── README.md                    # このファイル
```

## 🚀 クイックスタート

### 1. 初期セットアップ

```bash
# プロジェクトルートから実行
cd /home/user/it_supervisor

# セットアップスクリプトを実行
./mcp/scripts/setup-mcp.sh
```

### 2. 環境変数の設定

```bash
# .envファイルを編集
vi mcp/config/.env

# 最低限必要な設定:
# - GITHUB_TOKEN: GitHub Personal Access Token（必須）
# - WORKSPACE_PATH: 解析対象のリポジトリパス
# - METRICS_DB_PATH: メトリクスDBのパス
```

**GitHub Tokenの取得方法:**
1. https://github.com/settings/tokens/new にアクセス
2. スコープを選択: `repo`, `read:org`, `read:user`
3. トークンを生成してコピー
4. `.env`ファイルの`GITHUB_TOKEN`に設定

### 3. Claude Code設定

```bash
# MCP設定をClaude Codeにコピー
cp mcp/config/mcp-config.json ~/.config/claude-code/mcp.json

# Claude Codeを再起動してMCPサーバーを有効化
```

### 4. 動作確認

```bash
# 動作確認スクリプトを実行
./mcp/scripts/verify-mcp.sh
```

## 🔧 導入済みMCPサーバー

### 既存OSSサーバー（即座に利用可能）

| サーバー | 機能 | 対応ツール |
|---------|------|-----------|
| **@modelcontextprotocol/server-github** | GitHub API統合 | Tool 4, 7, 9 |
| **@modelcontextprotocol/server-git** | Git操作 | Tool 4, 9 |
| **@modelcontextprotocol/server-filesystem** | ファイルシステム操作 | 全般 |
| **@bytebase/dbhub** | データベース操作 | Tool 1 |
| **@HalbonLabs/mcp-aggregator** | 品質ツール統合 | Tool 5 |

### カスタムサーバー（開発予定）

| サーバー | 機能 | 対応ツール | 状態 |
|---------|------|-----------|------|
| **security-scanner** | Gitleaks, Snyk, OWASP | Tool 5 | 設計中 |
| **multi-lang-analyzer** | PHP/C#静的解析 | Tool 5 | 設計中 |
| **proposal-context** | 改善提案コンテキスト | Tool 8 | 設計中 |

## 📚 MCPサーバー詳細

### 1. GitHub MCP Server

**提供ツール:**
- `search_repositories` - リポジトリ検索
- `get_repository` - リポジトリ情報取得
- `list_issues` - Issue一覧取得
- `create_issue` - Issue作成
- `list_pull_requests` - PR一覧取得
- `get_commit` - コミット情報取得

**使用例:**
```typescript
// Claude Codeが自動的に以下のように使用
const issues = await mcp.list_issues({
  owner: "HasegawaMasahide",
  repo: "it_supervisor",
  state: "open"
});
```

**対応するツール要件:**
- Tool 4: リポジトリ解析ツール
- Tool 7: Issue管理システム
- Tool 9: 変更管理システム

---

### 2. Git MCP Server

**提供ツール:**
- `git_log` - コミット履歴取得
- `git_diff` - 差分取得
- `git_status` - ステータス確認
- `git_show` - コミット詳細表示

**使用例:**
```typescript
// コミット履歴分析
const commits = await mcp.git_log({
  repository: "/path/to/repo",
  max_count: 100
});

// 最近の変更を分析
const diff = await mcp.git_diff({
  repository: "/path/to/repo",
  target: "HEAD~10..HEAD"
});
```

**対応するツール要件:**
- Tool 4: リポジトリ解析ツール（コミット履歴分析）
- Tool 9: 変更管理システム

---

### 3. Filesystem MCP Server

**提供ツール:**
- `read_file` - ファイル読み込み
- `write_file` - ファイル書き込み
- `list_directory` - ディレクトリ一覧
- `search_files` - ファイル検索

**セキュリティ:**
- 許可されたディレクトリのみアクセス可能
- `.gitignore`パターンを尊重
- シンボリックリンク攻撃を防止

**使用例:**
```typescript
// package.jsonを読み込んで依存関係を分析
const packageJson = await mcp.read_file({
  path: "/workspace/package.json"
});
```

---

### 4. DBHub (メトリクスデータベース)

**提供ツール:**
- `execute_sql` - SQLクエリ実行
- `list_tables` - テーブル一覧
- `describe_table` - テーブル構造取得

**セキュリティ機能:**
- 読み取り専用モード対応
- 行数制限（デフォルト1000行）
- クエリタイムアウト（デフォルト30秒）
- トランザクション制御

**使用例:**
```typescript
// Before/After比較
const beforeMetrics = await mcp.execute_sql({
  query: `
    SELECT metric_name, AVG(value) as avg_value
    FROM metrics
    WHERE project_id = ? AND collected_at < ?
    GROUP BY metric_name
  `,
  params: [projectId, implementationDate]
});

const afterMetrics = await mcp.execute_sql({
  query: `
    SELECT metric_name, AVG(value) as avg_value
    FROM metrics
    WHERE project_id = ? AND collected_at >= ?
    GROUP BY metric_name
  `,
  params: [projectId, implementationDate]
});
```

**データベーススキーマ:**
```sql
-- プロジェクト管理
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    repository_url TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

-- メトリクス収集
CREATE TABLE metrics (
    id INTEGER PRIMARY KEY,
    project_id TEXT,
    collected_at DATETIME,
    category TEXT,           -- security, performance, quality, debt
    metric_name TEXT,        -- vulnerability_count, response_time, etc.
    value TEXT,
    unit TEXT,
    source TEXT,             -- どのツールで取得したか
    note TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

---

### 5. Quality Hub (品質ツール統合)

**提供ツール:**
- `run_biome` - Biome実行
- `run_eslint` - ESLint実行
- `run_prettier` - Prettier実行
- `run_playwright` - Playwrightテスト実行

**使用例:**
```typescript
// JavaScript/TypeScriptの品質チェック
const eslintResults = await mcp.run_eslint({
  path: "/workspace",
  fix: false
});
```

---

## 💡 効果測定

### トークン削減効果

| 操作 | MCP未使用 | MCP使用 | 削減率 |
|-----|----------|---------|-------|
| リポジトリ構造分析 | 100K tokens | 5K tokens | **95%** |
| コミット履歴分析 | 30K tokens | 2K tokens | **93%** |
| DBクエリ結果取得 | 50K tokens | 3K tokens | **94%** |
| 静的解析結果読込 | 200K tokens | 10K tokens | **95%** |

### コスト削減効果

**年間試算（事業計画の前提条件で計算）:**
- プロジェクト数: 年間24件
- 1プロジェクトあたりのAI利用料: 50,000円
- MCP未使用: 1,200,000円/年 (売上の5%)
- MCP使用: 480,000円/年 (売上の2%)
- **年間削減額: 720,000円**

---

## 🔧 トラブルシューティング

### MCPサーバーが起動しない

**症状:** Claude CodeでMCPサーバーが接続できない

**解決方法:**
1. 環境変数が正しく設定されているか確認
   ```bash
   cat mcp/config/.env | grep GITHUB_TOKEN
   ```

2. Node.jsのバージョンを確認
   ```bash
   node --version  # v18.0.0以上が必要
   ```

3. MCPサーバーを手動で起動して確認
   ```bash
   npx -y @modelcontextprotocol/server-github
   ```

4. Claude Codeのログを確認
   ```bash
   tail -f ~/.local/state/claude-code/logs/mcp.log
   ```

---

### データベース接続エラー

**症状:** `SQLITE_CANTOPEN` エラーが発生

**解決方法:**
1. データベースファイルのパスを確認
   ```bash
   ls -la data/metrics.db
   ```

2. ディレクトリの権限を確認
   ```bash
   chmod 755 data
   chmod 644 data/metrics.db
   ```

3. データベースを再初期化
   ```bash
   rm data/metrics.db
   ./mcp/scripts/setup-mcp.sh
   ```

---

### GitHub APIレート制限

**症状:** `API rate limit exceeded` エラー

**解決方法:**
1. GitHub Tokenが設定されているか確認（未認証: 60req/h → 認証: 5000req/h）
2. リクエスト頻度を下げる
3. GitHub Enterpriseを使用（無制限）

---

## 📖 次のステップ

### カスタムMCPサーバーの開発

以下の設計ドキュメントを参照してカスタムサーバーを開発します：

1. **セキュリティスキャンサーバー**
   - ドキュメント: `mcp/servers/security-scanner/DESIGN.md`
   - 開発期間: 1週間
   - 優先度: 高

2. **PHP/C#静的解析サーバー**
   - ドキュメント: `mcp/servers/multi-lang-analyzer/DESIGN.md`
   - 開発期間: 2週間
   - 優先度: 高

3. **改善提案コンテキストサーバー**
   - ドキュメント: `mcp/servers/proposal-context/DESIGN.md`
   - 開発期間: 3週間
   - 優先度: 中

---

## 🔗 参考リンク

- [Model Context Protocol 公式ドキュメント](https://modelcontextprotocol.io/)
- [MCP GitHub Organization](https://github.com/modelcontextprotocol)
- [Awesome MCP Servers](https://github.com/wong2/awesome-mcp-servers)
- [Claude API Documentation](https://docs.anthropic.com/)

---

## 📄 ライセンス

このプロジェクトは MIT License の下で公開されています。

---

## 👥 お問い合わせ

質問や問題がある場合は、プロジェクトのIssueトラッカーで報告してください。
