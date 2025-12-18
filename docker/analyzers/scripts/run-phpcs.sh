#!/bin/sh
# PHP_CodeSniffer 実行スクリプト

set -e

# 使用方法
usage() {
    echo "Usage: $0 <repository_path> [standard]"
    echo "  standard: PSR12 (default) | PSR2 | WordPress | Squiz"
    exit 1
}

# 引数チェック
if [ -z "$1" ]; then
    usage
fi

REPO_PATH="$1"
STANDARD="${2:-PSR12}"
OUTPUT_FILE="/repos/phpcs-report.json"

# リポジトリの存在確認
if [ ! -d "$REPO_PATH" ]; then
    echo "Error: Repository path not found: $REPO_PATH"
    exit 1
fi

echo "Running PHP_CodeSniffer on: $REPO_PATH"
echo "Coding standard: $STANDARD"

# PHP_CodeSniffer実行
cd "$REPO_PATH"

phpcs . \
    --standard="$STANDARD" \
    --report=json \
    --report-file="$OUTPUT_FILE" \
    --extensions=php \
    --ignore=vendor/*,node_modules/* \
    || true  # エラーがあっても続行

# 追加: CBF（Code Beautifier and Fixer）で自動修正可能な問題を検出
phpcbf . \
    --standard="$STANDARD" \
    --extensions=php \
    --ignore=vendor/*,node_modules/* \
    --dry-run \
    || true

echo "PHP_CodeSniffer analysis completed. Report saved to: $OUTPUT_FILE"
