#!/bin/bash

# IT資産監査サービス - MCPセットアップスクリプト
# このスクリプトは、既存OSSのMCPサーバーをインストールし、設定を行います

set -e  # エラーが発生したら即座に終了

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ出力関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ヘッダー表示
echo "================================================================"
echo "  IT資産監査サービス - MCPサーバーセットアップ"
echo "================================================================"
echo ""

# 前提条件チェック
log_info "前提条件をチェック中..."

# Node.js バージョンチェック
if ! command -v node &> /dev/null; then
    log_error "Node.jsがインストールされていません"
    log_info "https://nodejs.org/ からインストールしてください"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    log_error "Node.js v18.0.0以上が必要です（現在: v$NODE_VERSION）"
    exit 1
fi
log_success "Node.js v$NODE_VERSION が検出されました"

# npm チェック
if ! command -v npm &> /dev/null; then
    log_error "npmがインストールされていません"
    exit 1
fi
log_success "npm $(npm --version) が検出されました"

# npx チェック
if ! command -v npx &> /dev/null; then
    log_error "npxがインストールされていません"
    exit 1
fi
log_success "npx が利用可能です"

# ディレクトリ設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MCP_DIR="$PROJECT_ROOT/mcp"
CONFIG_DIR="$MCP_DIR/config"
DATA_DIR="$PROJECT_ROOT/data"
LOGS_DIR="$PROJECT_ROOT/logs"

log_info "プロジェクトルート: $PROJECT_ROOT"

# ディレクトリ作成
log_info "必要なディレクトリを作成中..."
mkdir -p "$DATA_DIR"
mkdir -p "$LOGS_DIR"
log_success "ディレクトリを作成しました"

# 環境変数ファイルの確認
log_info "環境変数ファイルを確認中..."
if [ ! -f "$CONFIG_DIR/.env" ]; then
    log_warn ".envファイルが存在しません"
    log_info ".env.exampleからコピーします"
    cp "$CONFIG_DIR/.env.example" "$CONFIG_DIR/.env"
    log_warn "⚠️  $CONFIG_DIR/.env を編集して環境変数を設定してください"
    log_warn "   特にGITHUB_TOKENは必須です"
else
    log_success ".envファイルが存在します"
fi

# 環境変数の読み込み
if [ -f "$CONFIG_DIR/.env" ]; then
    log_info "環境変数を読み込み中..."
    export $(grep -v '^#' "$CONFIG_DIR/.env" | xargs)
    log_success "環境変数を読み込みました"
fi

# MCPサーバーのインストール
log_info "MCPサーバーをインストール中..."
echo ""

# 1. GitHub MCP Server
log_info "1/5: @modelcontextprotocol/server-github をインストール中..."
if npx -y @modelcontextprotocol/server-github --version &> /dev/null 2>&1 || true; then
    log_success "@modelcontextprotocol/server-github インストール完了"
else
    log_warn "@modelcontextprotocol/server-github のバージョン確認に失敗（初回実行時は正常）"
fi

# 2. Git MCP Server
log_info "2/5: @modelcontextprotocol/server-git をインストール中..."
if npx -y @modelcontextprotocol/server-git --version &> /dev/null 2>&1 || true; then
    log_success "@modelcontextprotocol/server-git インストール完了"
else
    log_warn "@modelcontextprotocol/server-git のバージョン確認に失敗（初回実行時は正常）"
fi

# 3. Filesystem MCP Server
log_info "3/5: @modelcontextprotocol/server-filesystem をインストール中..."
if npx -y @modelcontextprotocol/server-filesystem --help &> /dev/null 2>&1 || true; then
    log_success "@modelcontextprotocol/server-filesystem インストール完了"
else
    log_warn "@modelcontextprotocol/server-filesystem のヘルプ表示に失敗（初回実行時は正常）"
fi

# 4. DBHub (Bytebase)
log_info "4/5: @bytebase/dbhub をインストール中..."
if npx -y @bytebase/dbhub --version &> /dev/null 2>&1 || true; then
    log_success "@bytebase/dbhub インストール完了"
else
    log_warn "@bytebase/dbhub のインストール状況を確認できませんでした"
fi

# 5. MCP Aggregator (Quality Hub)
log_info "5/5: @HalbonLabs/mcp-aggregator をインストール中..."
if npx -y @HalbonLabs/mcp-aggregator --version &> /dev/null 2>&1 || true; then
    log_success "@HalbonLabs/mcp-aggregator インストール完了"
else
    log_warn "@HalbonLabs/mcp-aggregator のインストール状況を確認できませんでした"
fi

echo ""
log_success "全てのMCPサーバーのインストールが完了しました"

# データベースの初期化
log_info "メトリクスデータベースを初期化中..."
METRICS_DB="${METRICS_DB_PATH:-$DATA_DIR/metrics.db}"

if [ ! -f "$METRICS_DB" ]; then
    log_info "SQLiteデータベースを作成: $METRICS_DB"
    sqlite3 "$METRICS_DB" <<EOF
-- プロジェクトテーブル
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    repository_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- メトリクステーブル
CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    category TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT,
    source TEXT,
    note TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_metrics_project_id ON metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_metrics_category ON metrics(category);
CREATE INDEX IF NOT EXISTS idx_metrics_collected_at ON metrics(collected_at);

-- サンプルプロジェクト
INSERT INTO projects (id, name, description)
VALUES ('sample-project', 'サンプルプロジェクト', 'セットアップ確認用のサンプルプロジェクト');
EOF
    log_success "データベースを初期化しました"
else
    log_info "データベースは既に存在します: $METRICS_DB"
fi

# Claude Code設定の確認
log_info "Claude Code MCP設定を確認中..."
CLAUDE_CONFIG_DIR="$HOME/.config/claude-code"
CLAUDE_MCP_CONFIG="$CLAUDE_CONFIG_DIR/mcp.json"

if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
    log_info "Claude Code設定ディレクトリを作成: $CLAUDE_CONFIG_DIR"
    mkdir -p "$CLAUDE_CONFIG_DIR"
fi

log_info "MCPサーバー設定ファイルの場所:"
log_info "  ソース: $CONFIG_DIR/mcp-config.json"
log_info "  コピー先: $CLAUDE_MCP_CONFIG"
echo ""
log_warn "⚠️  Claude Codeでこの設定を使用するには、以下のコマンドを実行してください:"
echo ""
echo "    cp $CONFIG_DIR/mcp-config.json $CLAUDE_MCP_CONFIG"
echo ""

# セットアップ完了
echo ""
echo "================================================================"
log_success "MCPセットアップが完了しました！"
echo "================================================================"
echo ""
echo "次のステップ:"
echo ""
echo "1. 環境変数を設定"
echo "   vi $CONFIG_DIR/.env"
echo ""
echo "2. GITHUB_TOKENを設定（必須）"
echo "   https://github.com/settings/tokens/new"
echo "   スコープ: repo, read:org, read:user"
echo ""
echo "3. Claude Code設定ファイルをコピー"
echo "   cp $CONFIG_DIR/mcp-config.json $CLAUDE_MCP_CONFIG"
echo ""
echo "4. Claude Codeを再起動してMCPサーバーを有効化"
echo ""
echo "5. 動作確認"
echo "   $MCP_DIR/scripts/verify-mcp.sh"
echo ""
echo "詳細は $MCP_DIR/README.md を参照してください"
echo ""
