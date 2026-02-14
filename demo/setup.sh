#!/bin/bash
#
# デモリポジトリのGit履歴を復元するセットアップスクリプト
#
# 使い方:
#   bash demo/setup.sh
#
# bundleファイルから各デモプロジェクトのGit履歴とソースコードを復元し、
# プロジェクトドキュメント（README.md, ISSUES.md）を配置します。
# it_supervisorリポジトリをclone/checkoutした後に一度だけ実行してください。

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUNDLE_DIR="$SCRIPT_DIR/bundles"
DOCS_DIR="$SCRIPT_DIR/project-docs"

PROJECTS=(
  laravel-todo-app
  react-cms-app
  django-ec-app
  aspnet-legacy-system
  vue-booking-app
  springboot-crm-app
)

if [ ! -d "$BUNDLE_DIR" ]; then
  echo "Error: bundles/ directory not found at $BUNDLE_DIR" >&2
  exit 1
fi

restored=0
skipped=0

for project in "${PROJECTS[@]}"; do
  project_dir="$SCRIPT_DIR/$project"
  bundle_file="$BUNDLE_DIR/${project}.bundle"

  if [ ! -f "$bundle_file" ]; then
    echo "[SKIP] $project: bundle file not found"
    skipped=$((skipped + 1))
    continue
  fi

  if [ -d "$project_dir/.git" ]; then
    echo "[SKIP] $project: already initialized"
    skipped=$((skipped + 1))
    continue
  fi

  echo "[INIT] $project ..."
  mkdir -p "$project_dir"
  cd "$project_dir"
  git init -q
  git fetch -q "$bundle_file" main
  git reset --hard -q FETCH_HEAD

  # プロジェクトドキュメントを配置
  if [ -d "$DOCS_DIR/$project" ]; then
    cp "$DOCS_DIR/$project/"*.md . 2>/dev/null || true
  fi

  echo "       -> $(git rev-list --count HEAD) commits restored"
  restored=$((restored + 1))
done

echo ""
echo "Done: $restored restored, $skipped skipped"
