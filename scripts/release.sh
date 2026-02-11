#!/bin/bash
set -e

# IT Supervisor Tools Release Script
# Usage: ./scripts/release.sh [major|minor|patch|VERSION]

if [ -z "$1" ]; then
  echo "Usage: $0 [major|minor|patch|VERSION]"
  echo "Example: $0 patch"
  echo "Example: $0 0.2.0"
  exit 1
fi

VERSION_TYPE=$1

echo "🚀 Starting release process..."
echo ""

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Error: Working directory is not clean. Please commit or stash your changes."
  git status --short
  exit 1
fi

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "❌ Error: You must be on the main branch to release."
  echo "Current branch: $CURRENT_BRANCH"
  exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes from remote..."
git pull origin main

# Run quality checks
echo ""
echo "🔍 Running quality checks..."

echo "  - Running linter..."
npm run lint

echo "  - Running type check..."
npm run type-check

echo "  - Running tests..."
npm test

echo "  - Building packages..."
npm run build

echo ""
echo "✅ All quality checks passed!"

# Determine new version
CURRENT_VERSION=$(node -p "require('./package.json').version")

if [[ "$VERSION_TYPE" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  NEW_VERSION=$VERSION_TYPE
else
  # Calculate new version based on type
  IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
  MAJOR=${VERSION_PARTS[0]}
  MINOR=${VERSION_PARTS[1]}
  PATCH=${VERSION_PARTS[2]}

  case $VERSION_TYPE in
    major)
      MAJOR=$((MAJOR + 1))
      MINOR=0
      PATCH=0
      ;;
    minor)
      MINOR=$((MINOR + 1))
      PATCH=0
      ;;
    patch)
      PATCH=$((PATCH + 1))
      ;;
    *)
      echo "❌ Error: Invalid version type '$VERSION_TYPE'"
      echo "Valid types: major, minor, patch, or a version number (e.g., 0.2.0)"
      exit 1
      ;;
  esac

  NEW_VERSION="$MAJOR.$MINOR.$PATCH"
fi

echo ""
echo "📦 Version bump: $CURRENT_VERSION → $NEW_VERSION"

# Confirm release
read -p "Do you want to continue with the release? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Release cancelled."
  exit 1
fi

# Update package.json versions
echo ""
echo "📝 Updating package.json versions..."

# Update root package.json
npm version $NEW_VERSION --no-git-tag-version

# Update all package versions
for PACKAGE_DIR in packages/*; do
  if [ -f "$PACKAGE_DIR/package.json" ]; then
    PACKAGE_NAME=$(basename $PACKAGE_DIR)
    echo "  - Updating $PACKAGE_NAME to $NEW_VERSION"
    cd $PACKAGE_DIR
    npm version $NEW_VERSION --no-git-tag-version
    cd - > /dev/null
  fi
done

# Update CHANGELOG.md
echo ""
echo "📋 Updating CHANGELOG.md..."
DATE=$(date +%Y-%m-%d)

# Replace [Unreleased] with new version
sed -i "s/## \[Unreleased\]/## [Unreleased]\n\n## [$NEW_VERSION] - $DATE/" CHANGELOG.md

# Add version comparison link
PREV_VERSION=$CURRENT_VERSION
echo "[Unreleased]: https://github.com/your-org/it-supervisor-tools/compare/v$NEW_VERSION...HEAD" >> CHANGELOG.md.tmp
echo "[$NEW_VERSION]: https://github.com/your-org/it-supervisor-tools/compare/v$PREV_VERSION...v$NEW_VERSION" >> CHANGELOG.md.tmp
grep -v "^\[Unreleased\]:" CHANGELOG.md | grep -v "^\[$NEW_VERSION\]:" >> CHANGELOG.md.tmp
mv CHANGELOG.md.tmp CHANGELOG.md

# Commit changes
echo ""
echo "💾 Committing changes..."
git add .
git commit -m "chore(release): prepare release v$NEW_VERSION

- Bump version from $CURRENT_VERSION to $NEW_VERSION
- Update CHANGELOG.md with release date

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Create git tag
echo ""
echo "🏷️  Creating git tag v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# Push changes and tag
echo ""
echo "📤 Pushing changes to remote..."
git push origin main
git push origin "v$NEW_VERSION"

echo ""
echo "✅ Release v$NEW_VERSION completed successfully!"
echo ""
echo "📦 The CI/CD pipeline will now:"
echo "  1. Run quality checks (lint, type-check, tests)"
echo "  2. Build all packages"
echo "  3. Publish packages to npm"
echo "  4. Create a GitHub Release"
echo ""
echo "🔗 Monitor the release progress at:"
echo "   https://github.com/your-org/it-supervisor-tools/actions"
echo ""
echo "🎉 Thank you for contributing to IT Supervisor Tools!"
