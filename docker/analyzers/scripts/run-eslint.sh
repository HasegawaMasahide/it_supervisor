#!/bin/sh
# ESLint 実行スクリプト

set -e

# 使用方法
usage() {
    echo "Usage: $0 <repository_path> [output_format]"
    echo "  output_format: json (default) | html | stylish"
    exit 1
}

# 引数チェック
if [ -z "$1" ]; then
    usage
fi

REPO_PATH="$1"
OUTPUT_FORMAT="${2:-json}"
OUTPUT_FILE="/repos/eslint-report.${OUTPUT_FORMAT}"

# リポジトリの存在確認
if [ ! -d "$REPO_PATH" ]; then
    echo "Error: Repository path not found: $REPO_PATH"
    exit 1
fi

echo "Running ESLint on: $REPO_PATH"
echo "Output format: $OUTPUT_FORMAT"

# ESLint実行
cd "$REPO_PATH"

# .eslintrc.js がなければデフォルト設定を使用
if [ ! -f ".eslintrc.js" ] && [ ! -f ".eslintrc.json" ]; then
    echo "No ESLint config found, using default configuration..."
    eslint . \
        --format "$OUTPUT_FORMAT" \
        --output-file "$OUTPUT_FILE" \
        --ext .js,.jsx,.ts,.tsx \
        --ignore-pattern "node_modules/*" \
        --ignore-pattern "dist/*" \
        --ignore-pattern "build/*" \
        || true  # エラーがあっても続行
else
    echo "Using repository's ESLint configuration..."
    eslint . \
        --format "$OUTPUT_FORMAT" \
        --output-file "$OUTPUT_FILE" \
        || true
fi

echo "ESLint analysis completed. Report saved to: $OUTPUT_FILE"
