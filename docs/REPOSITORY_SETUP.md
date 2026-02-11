# Repository URL Setup Guide

このドキュメントでは、プレースホルダーのGitHubリポジトリURLを実際のリポジトリURLに更新する手順を説明します。

## 📌 Overview

現在、プロジェクト内の複数のファイルでGitHubリポジトリURLのプレースホルダー `your-org/it-supervisor-tools` が使用されています。npmへの公開前、またはCI/CDパイプラインの設定前に、これらを実際のリポジトリURLに置き換える必要があります。

## 🔍 Affected Files

以下の18個のファイルにプレースホルダーURLが含まれています:

### Root Level Files
1. **README.md** - Badges, clone instructions
2. **CHANGELOG.md** - Version comparison links
3. **CONTRIBUTING.md** - Repository references
4. **package.json** - Repository, bugs, homepage fields

### Package Files (7 packages)
5. **packages/logger/package.json**
6. **packages/metrics-model/package.json**
7. **packages/issue-manager/package.json**
8. **packages/repo-analyzer/package.json**
9. **packages/static-analyzer/package.json**
10. **packages/sandbox-builder/package.json**
11. **packages/report-generator/package.json**

### Documentation Files
12. **docs/RELEASE_CHECKLIST.md** - GitHub Release instructions
13. **docs/RELEASE.md** - Release automation
14. **docs/API_INTEGRATION_GUIDE.md** - CI/CD examples

### CI/CD Files
15. **.github/workflows/release.yml** - GitHub Actions workflow

### Scripts
16. **scripts/release.sh** - Release automation script

### Other Files
17. **examples/README.md** - Example project references
18. **progress.md** - Task tracking documentation

## ✏️ How to Update

### Method 1: Automated Search and Replace (Recommended)

Use the following command to update all files at once:

```bash
# 1. Set your actual GitHub organization/username and repository name
GITHUB_ORG="your-github-username"  # e.g., "acme-corp"
REPO_NAME="it-supervisor-tools"     # Keep as-is or change if needed

# 2. Run search and replace (dry-run first to preview changes)
grep -r "your-org/it-supervisor-tools" . \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=dist \
  --exclude-dir=.tmp \
  --exclude=REPOSITORY_SETUP.md

# 3. If the preview looks correct, apply the changes
find . -type f \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/.tmp/*" \
  -not -name "REPOSITORY_SETUP.md" \
  -exec sed -i "s|your-org/it-supervisor-tools|${GITHUB_ORG}/${REPO_NAME}|g" {} +

# 4. Verify the changes
git diff
```

### Method 2: Manual Update

If you prefer manual updates or need fine-grained control, edit each file individually:

#### 1. Root package.json
```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/YOUR-ORG/it-supervisor-tools.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR-ORG/it-supervisor-tools/issues"
  },
  "homepage": "https://github.com/YOUR-ORG/it-supervisor-tools#readme"
}
```

#### 2. Package-level package.json (all 7 packages)
```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/YOUR-ORG/it-supervisor-tools.git",
    "directory": "packages/PACKAGE-NAME"
  },
  "bugs": {
    "url": "https://github.com/YOUR-ORG/it-supervisor-tools/issues"
  },
  "homepage": "https://github.com/YOUR-ORG/it-supervisor-tools/tree/main/packages/PACKAGE-NAME#readme"
}
```

#### 3. README.md
Update badge URLs:
```markdown
[![CI](https://github.com/YOUR-ORG/it-supervisor-tools/workflows/CI/badge.svg)](https://github.com/YOUR-ORG/it-supervisor-tools/actions)
[![codecov](https://codecov.io/gh/YOUR-ORG/it-supervisor-tools/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR-ORG/it-supervisor-tools)

git clone https://github.com/YOUR-ORG/it-supervisor-tools.git
```

#### 4. CHANGELOG.md
Update version comparison links at the bottom:
```markdown
[Unreleased]: https://github.com/YOUR-ORG/it-supervisor-tools/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/YOUR-ORG/it-supervisor-tools/releases/tag/v0.1.0
```

#### 5. .github/workflows/release.yml
Update workflow references if needed (GitHub Actions automatically uses correct repo).

## ✅ Verification Checklist

After updating, verify the changes:

- [ ] **package.json files** (root + 7 packages)
  - [ ] `repository.url` points to correct GitHub repo
  - [ ] `bugs.url` points to correct Issues page
  - [ ] `homepage` points to correct repo/README
  - [ ] Package-level `repository.directory` is correct

- [ ] **README.md**
  - [ ] CI badge links to correct GitHub Actions page
  - [ ] Codecov badge links to correct Codecov page
  - [ ] Clone command uses correct URL

- [ ] **CHANGELOG.md**
  - [ ] Version comparison links work
  - [ ] Release tag links work

- [ ] **CONTRIBUTING.md**
  - [ ] Repository references updated

- [ ] **CI/CD Files**
  - [ ] .github/workflows/release.yml references correct repo (if hardcoded)

- [ ] **Documentation**
  - [ ] docs/RELEASE_CHECKLIST.md
  - [ ] docs/RELEASE.md
  - [ ] docs/API_INTEGRATION_GUIDE.md

- [ ] **Test the changes**
  ```bash
  # Verify no placeholder URLs remain
  grep -r "your-org/it-supervisor-tools" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=dist \
    --exclude-dir=.tmp \
    --exclude=REPOSITORY_SETUP.md

  # Should return no results (except this file)
  ```

## 🔐 Additional Setup (GitHub Repository)

After updating URLs, configure the GitHub repository:

### 1. Repository Settings

- **Description**: "IT資産監査・改善サービス用ツール群 — TypeScriptで構築された、IT資産の自動分析・診断・改善提案を行うための統合ツールセット"
- **Topics**: `typescript`, `monorepo`, `static-analysis`, `code-quality`, `it-audit`, `repository-analysis`, `docker`, `pdf-reports`
- **Website**: Your production documentation URL (if any)
- **License**: MIT

### 2. Branch Protection Rules (main branch)

- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging:
  - `lint`
  - `type-check`
  - `test`
  - `coverage`
  - `complexity`
  - `build`
- ✅ Require branches to be up to date before merging
- ✅ Include administrators

### 3. GitHub Actions Secrets

Add the following secrets for CI/CD workflows:

- **CODECOV_TOKEN**: Get from https://codecov.io/
  1. Sign up/login to Codecov
  2. Add repository
  3. Copy upload token
  4. Add as GitHub secret

- **NPM_TOKEN**: Get from https://www.npmjs.com/
  1. Login to npm
  2. Go to Access Tokens
  3. Generate new token (Automation type)
  4. Add as GitHub secret (for automated npm publishing)

### 4. Codecov Integration

1. Go to https://codecov.io/
2. Sign in with GitHub
3. Add your repository
4. Copy the upload token
5. Add as GitHub secret: `CODECOV_TOKEN`
6. Verify badge URL in README.md matches your repo

### 5. npm Organization Setup (Optional)

If publishing under `@it-supervisor/` scope:

1. Create npm organization: https://www.npmjs.com/org/create
2. Set organization name to `it-supervisor`
3. Add team members with appropriate permissions
4. Update package.json `name` fields if needed

## 🚫 Common Mistakes to Avoid

1. **Forgetting to update all 7 package.json files** - Each package needs its own repository configuration
2. **Incorrect directory paths** - Package-level package.json must include `"directory": "packages/PACKAGE-NAME"`
3. **Hardcoded organization name in scripts** - Check scripts/release.sh for hardcoded URLs
4. **Leaving placeholders in documentation** - Update all docs/ files
5. **Not testing badge URLs** - Verify CI and Codecov badges work before release

## 📝 Template for New Packages

When adding new packages to the monorepo, use this template:

```json
{
  "name": "@it-supervisor/new-package",
  "version": "0.1.0",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/YOUR-ORG/it-supervisor-tools.git",
    "directory": "packages/new-package"
  },
  "bugs": {
    "url": "https://github.com/YOUR-ORG/it-supervisor-tools/issues"
  },
  "homepage": "https://github.com/YOUR-ORG/it-supervisor-tools/tree/main/packages/new-package#readme"
}
```

## 🔄 When to Update URLs

Update repository URLs:

1. **Before first commit to GitHub** - Set correct URLs from the start
2. **Before publishing to npm** - Package metadata must be correct
3. **When migrating repositories** - Update all references if repo is moved/renamed
4. **When forking the project** - Update to your fork's URL

## 📞 Need Help?

If you encounter issues:

1. Check this guide: [REPOSITORY_SETUP.md](./REPOSITORY_SETUP.md)
2. Review CI/CD documentation: [RELEASE.md](./RELEASE.md)
3. See release checklist: [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)
4. File an issue: https://github.com/YOUR-ORG/it-supervisor-tools/issues (update URL first!)

---

**Version**: 1.0
**Last Updated**: 2026-02-11
**Status**: Ready for Use
