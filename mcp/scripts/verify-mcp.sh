#!/bin/bash

# IT資産監査サービス - MCP動作確認スクリプト
# MCPサーバーが正しく設定されているか確認します

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

echo "================================================================"
echo "  MCPサーバー動作確認"
echo "================================================================"
echo ""

# ディレクトリ設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_DIR="$PROJECT_ROOT/mcp/config"
DATA_DIR="$PROJECT_ROOT/data"

# 環境変数の読み込み
if [ -f "$CONFIG_DIR/.env" ]; then
    export $(grep -v '^#' "$CONFIG_DIR/.env" | xargs)
fi

ERRORS=0

# 1. 設定ファイルの確認
log_info "1. 設定ファイルの確認"
if [ -f "$CONFIG_DIR/mcp-config.json" ]; then
    log_success "mcp-config.json が存在します"
else
    log_error "mcp-config.json が見つかりません"
    ((ERRORS++))
fi

if [ -f "$CONFIG_DIR/.env" ]; then
    log_success ".env が存在します"
else
    log_error ".env が見つかりません"
    ((ERRORS++))
fi
echo ""

# 2. 環境変数の確認
log_info "2. 環境変数の確認"
if [ -n "$GITHUB_TOKEN" ]; then
    log_success "GITHUB_TOKEN が設定されています"
else
    log_warn "GITHUB_TOKEN が設定されていません（GitHub MCP Serverが動作しません）"
fi

if [ -n "$WORKSPACE_PATH" ]; then
    log_success "WORKSPACE_PATH: $WORKSPACE_PATH"
else
    log_warn "WORKSPACE_PATH が設定されていません"
fi

if [ -n "$METRICS_DB_PATH" ]; then
    log_success "METRICS_DB_PATH: $METRICS_DB_PATH"
else
    log_warn "METRICS_DB_PATH が設定されていません（デフォルト: $DATA_DIR/metrics.db）"
fi
echo ""

# 3. データベースの確認
log_info "3. データベースの確認"
METRICS_DB="${METRICS_DB_PATH:-$DATA_DIR/metrics.db}"
if [ -f "$METRICS_DB" ]; then
    log_success "メトリクスDB: $METRICS_DB"

    # テーブルの確認
    TABLES=$(sqlite3 "$METRICS_DB" "SELECT name FROM sqlite_master WHERE type='table';")
    if echo "$TABLES" | grep -q "projects"; then
        log_success "  projects テーブルが存在します"
    else
        log_error "  projects テーブルが見つかりません"
        ((ERRORS++))
    fi

    if echo "$TABLES" | grep -q "metrics"; then
        log_success "  metrics テーブルが存在します"
    else
        log_error "  metrics テーブルが見つかりません"
        ((ERRORS++))
    fi
else
    log_error "メトリクスDBが見つかりません: $METRICS_DB"
    ((ERRORS++))
fi
echo ""

# 4. MCPサーバーの確認
log_info "4. MCPサーバーのインストール確認"

# GitHub Server
if npm list -g @modelcontextprotocol/server-github &> /dev/null || command -v @modelcontextprotocol/server-github &> /dev/null; then
    log_success "@modelcontextprotocol/server-github"
else
    log_warn "@modelcontextprotocol/server-github (npx経由で利用可能なはず)"
fi

# Git Server
if npm list -g @modelcontextprotocol/server-git &> /dev/null || command -v @modelcontextprotocol/server-git &> /dev/null; then
    log_success "@modelcontextprotocol/server-git"
else
    log_warn "@modelcontextprotocol/server-git (npx経由で利用可能なはず)"
fi

# Filesystem Server
if npm list -g @modelcontextprotocol/server-filesystem &> /dev/null || command -v @modelcontextprotocol/server-filesystem &> /dev/null; then
    log_success "@modelcontextprotocol/server-filesystem"
else
    log_warn "@modelcontextprotocol/server-filesystem (npx経由で利用可能なはず)"
fi

# DBHub
if npm list -g @bytebase/dbhub &> /dev/null || command -v dbhub &> /dev/null; then
    log_success "@bytebase/dbhub"
else
    log_warn "@bytebase/dbhub (npx経由で利用可能なはず)"
fi

echo ""

# 5. Claude Code設定の確認
log_info "5. Claude Code設定の確認"
CLAUDE_CONFIG="$HOME/.config/claude-code/mcp.json"
if [ -f "$CLAUDE_CONFIG" ]; then
    log_success "Claude Code MCP設定: $CLAUDE_CONFIG"
else
    log_warn "Claude Code MCP設定が見つかりません"
    log_info "以下のコマンドでコピーしてください:"
    echo "    cp $CONFIG_DIR/mcp-config.json $CLAUDE_CONFIG"
fi
echo ""

# 6. ディレクトリ構造の確認
log_info "6. ディレクトリ構造の確認"
if [ -d "$DATA_DIR" ]; then
    log_success "データディレクトリ: $DATA_DIR"
else
    log_error "データディレクトリが見つかりません"
    ((ERRORS++))
fi

if [ -d "$PROJECT_ROOT/logs" ]; then
    log_success "ログディレクトリ: $PROJECT_ROOT/logs"
else
    log_warn "ログディレクトリが見つかりません（自動作成されます）"
fi

if [ -d "$PROJECT_ROOT/mcp/servers" ]; then
    log_success "カスタムMCPサーバーディレクトリ: $PROJECT_ROOT/mcp/servers"
else
    log_error "カスタムMCPサーバーディレクトリが見つかりません"
    ((ERRORS++))
fi
echo ""

# 結果サマリー
echo "================================================================"
if [ $ERRORS -eq 0 ]; then
    log_success "全ての確認項目をパスしました！"
    echo ""
    echo "次のステップ:"
    echo "1. Claude Codeを起動"
    echo "2. MCPサーバーの接続状態を確認"
    echo "3. 実際のプロジェクトで動作確認"
else
    log_error "$ERRORS 件のエラーが見つかりました"
    echo ""
    echo "修正方法:"
    echo "1. setup-mcp.sh を再実行"
    echo "2. .env ファイルを確認"
    echo "3. エラーメッセージを確認して対処"
fi
echo "================================================================"
echo ""
