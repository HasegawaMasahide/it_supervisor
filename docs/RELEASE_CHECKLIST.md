# Release Checklist for v0.1.0

このドキュメントは、IT Supervisor Toolsのv0.1.0リリースのための完全なチェックリストです。

## 📋 Pre-Release Verification

### 1. Code Quality Checks

- [ ] **All tests pass** (`npm test`)
  - [ ] Unit tests: 391 passed, 0 failed
  - [ ] Skipped tests documented in progress.md
- [ ] **Type checking passes** (`npm run type-check`)
  - [ ] No TypeScript errors
- [ ] **Linting passes** (`npm run lint`)
  - [ ] 0 ESLint errors, 0 warnings
- [ ] **Coverage meets threshold** (`npm run coverage`)
  - [ ] Statements: ≥ 80% (current: 83.99%)
  - [ ] Branches: ≥ 70% (current: 75.67%)
  - [ ] Functions: ≥ 80% (current: 85.14%)
  - [ ] Lines: ≥ 80% (current: 84.19%)
- [ ] **Complexity check passes** (`npm run complexity`)
  - [ ] No high-complexity functions (>15)
  - [ ] Average complexity < 5 (current: 2.85)

### 2. Security & Dependencies

- [ ] **Zero vulnerabilities** (`npm audit --production`)
  - [ ] Critical: 0
  - [ ] High: 0
  - [ ] Moderate: 0
  - [ ] Low: 0
- [ ] **Dependencies up-to-date** (`npm outdated`)
  - [ ] No major outdated dependencies
- [ ] **Quality health score** (`npm run quality`)
  - [ ] Health score ≥ 95/100 (current: 98.4)

### 3. Documentation

- [ ] **README.md is complete**
  - [ ] Quick start guide
  - [ ] Installation instructions
  - [ ] Usage examples
  - [ ] Package overview with test coverage badges
  - [ ] API documentation links
- [ ] **CHANGELOG.md is up-to-date**
  - [ ] All changes since last release documented
  - [ ] Follows Keep a Changelog format
  - [ ] Version comparison links work
- [ ] **API documentation complete**
  - [ ] All 7 packages have docs/api.md
  - [ ] All public methods documented with JSDoc
  - [ ] Examples included
- [ ] **CONTRIBUTING.md is accurate**
  - [ ] Development setup instructions
  - [ ] Testing guidelines
  - [ ] Commit message convention
  - [ ] PR process
- [ ] **SECURITY.md exists**
  - [ ] Supported versions listed
  - [ ] Vulnerability reporting process
  - [ ] Security best practices
- [ ] **LICENSE file exists**
  - [ ] MIT license with correct year and copyright holder

### 4. Package Configuration

- [ ] **All package.json files correct**
  - [ ] Version: 0.1.0 in all 7 packages + root
  - [ ] Repository URLs updated (replace "your-org/it-supervisor-tools")
  - [ ] Bugs URL updated
  - [ ] Homepage URL updated
  - [ ] Author field filled
  - [ ] Keywords added
  - [ ] License: MIT
  - [ ] `files` field configured (dist/, README.md, LICENSE, docs/)
  - [ ] `exports` field configured for ESM/CJS compatibility
- [ ] **Build artifacts clean** (`npm run clean && npm run build`)
  - [ ] All packages build successfully
  - [ ] dist/ directories contain compiled JavaScript
  - [ ] Type declarations (.d.ts) generated

### 5. Examples & Benchmarks

- [ ] **Examples work** (examples/01-07)
  - [ ] All examples have working TypeScript code
  - [ ] All examples have README.md
  - [ ] All examples build successfully
- [ ] **Benchmarks run** (`npm run benchmark`)
  - [ ] repo-analyzer benchmark completes
  - [ ] static-analyzer benchmark completes (or skip with continue-on-error)
  - [ ] report-generator benchmark completes

### 6. CI/CD Pipeline

- [ ] **GitHub Actions workflows configured**
  - [ ] .github/workflows/ci.yml exists
  - [ ] .github/workflows/release.yml exists
  - [ ] All jobs pass on main branch
- [ ] **Pre-commit hooks working**
  - [ ] Husky installed (`npm run prepare`)
  - [ ] lint-staged configured
  - [ ] Hooks trigger on commit

## 🚀 Release Execution

### 1. Final Preparations

- [ ] **Update version numbers**
  ```bash
  # Use automated release script
  npm run release:patch  # for 0.1.0 → 0.1.1
  npm run release:minor  # for 0.1.0 → 0.2.0
  npm run release:major  # for 0.1.0 → 1.0.0

  # Or manually update all package.json files
  ```

- [ ] **Create release branch**
  ```bash
  git checkout -b release/v0.1.0
  ```

- [ ] **Run full test suite one more time**
  ```bash
  npm run clean
  npm install
  npm run build
  npm test
  npm run lint
  npm run type-check
  npm run coverage
  ```

### 2. Git Tag & Push

- [ ] **Commit final changes**
  ```bash
  git add .
  git commit -m "chore(release): prepare v0.1.0"
  ```

- [ ] **Create Git tag**
  ```bash
  git tag -a v0.1.0 -m "Release v0.1.0"
  ```

- [ ] **Push to remote**
  ```bash
  git push origin release/v0.1.0
  git push origin v0.1.0
  ```

### 3. GitHub Release

- [ ] **Create GitHub Release**
  - Go to https://github.com/your-org/it-supervisor-tools/releases/new
  - Tag: v0.1.0
  - Title: "v0.1.0 - Initial Release"
  - Description: Copy from CHANGELOG.md [Unreleased] section
  - [ ] Mark as pre-release (if applicable)
  - [ ] Publish release

- [ ] **Verify release workflow triggered**
  - Check GitHub Actions for release workflow
  - Ensure all jobs pass (validate, publish-npm, create-release)

### 4. NPM Publishing

**⚠️ WARNING: Once published to npm, packages cannot be unpublished after 72 hours!**

- [ ] **Dry-run publish** (test without actually publishing)
  ```bash
  cd packages/logger && npm pack
  cd ../metrics-model && npm pack
  cd ../issue-manager && npm pack
  cd ../repo-analyzer && npm pack
  cd ../static-analyzer && npm pack
  cd ../sandbox-builder && npm pack
  cd ../report-generator && npm pack
  ```

- [ ] **Verify package contents**
  ```bash
  tar -tzf it-supervisor-logger-0.1.0.tgz
  # Verify: dist/, README.md, LICENSE, docs/ are included
  # Verify: src/, __tests__/, coverage/ are excluded
  ```

- [ ] **Publish to npm** (requires npm authentication)
  ```bash
  # Login to npm
  npm login

  # Publish each package (or use automated release workflow)
  cd packages/logger && npm publish --access public
  cd ../metrics-model && npm publish --access public
  cd ../issue-manager && npm publish --access public
  cd ../repo-analyzer && npm publish --access public
  cd ../static-analyzer && npm publish --access public
  cd ../sandbox-builder && npm publish --access public
  cd ../report-generator && npm publish --access public
  ```

- [ ] **Verify npm packages**
  - [ ] https://www.npmjs.com/package/@it-supervisor/logger
  - [ ] https://www.npmjs.com/package/@it-supervisor/metrics-model
  - [ ] https://www.npmjs.com/package/@it-supervisor/issue-manager
  - [ ] https://www.npmjs.com/package/@it-supervisor/repo-analyzer
  - [ ] https://www.npmjs.com/package/@it-supervisor/static-analyzer
  - [ ] https://www.npmjs.com/package/@it-supervisor/sandbox-builder
  - [ ] https://www.npmjs.com/package/@it-supervisor/report-generator

### 5. Post-Release Verification

- [ ] **Test installation from npm**
  ```bash
  mkdir test-install && cd test-install
  npm init -y
  npm install @it-supervisor/logger@0.1.0
  npm install @it-supervisor/metrics-model@0.1.0
  npm install @it-supervisor/issue-manager@0.1.0
  npm install @it-supervisor/repo-analyzer@0.1.0
  npm install @it-supervisor/static-analyzer@0.1.0
  npm install @it-supervisor/sandbox-builder@0.1.0
  npm install @it-supervisor/report-generator@0.1.0
  ```

- [ ] **Test basic import/usage**
  ```typescript
  // test.ts
  import { createLogger } from '@it-supervisor/logger';
  const logger = createLogger({ name: 'test' });
  logger.info('Hello, world!');

  // Run: npx tsx test.ts
  ```

- [ ] **Update CHANGELOG.md**
  - Move [Unreleased] changes to [0.1.0] section
  - Add release date: `## [0.1.0] - 2026-02-11`
  - Create new empty [Unreleased] section

- [ ] **Merge release branch to main**
  ```bash
  git checkout main
  git merge release/v0.1.0
  git push origin main
  ```

## 🔄 Rollback Procedures

### If issues found BEFORE npm publish:

1. **Delete Git tag**
   ```bash
   git tag -d v0.1.0
   git push origin :refs/tags/v0.1.0
   ```

2. **Delete GitHub Release**
   - Go to Releases page
   - Click "Delete" on v0.1.0 release

3. **Fix issues and restart release process**

### If issues found AFTER npm publish:

**⚠️ Cannot unpublish after 72 hours! Publish a patch instead.**

1. **Deprecate broken version** (if critical issues)
   ```bash
   npm deprecate @it-supervisor/package-name@0.1.0 "Critical bug, use 0.1.1 instead"
   ```

2. **Publish patch release** (0.1.1)
   - Fix issues
   - Follow checklist again
   - Increment patch version
   - Publish 0.1.1

3. **Update GitHub Release**
   - Add note about issues and patch release
   - Link to v0.1.1

## 📊 Success Criteria

Release v0.1.0 is considered successful when:

- ✅ All 7 packages published to npm with correct version (0.1.0)
- ✅ GitHub Release created with complete changelog
- ✅ All CI/CD checks pass (green checkmarks)
- ✅ Packages installable from npm without errors
- ✅ Basic usage examples work as documented
- ✅ Health score maintained ≥ 95/100
- ✅ Zero critical or high-severity security vulnerabilities
- ✅ Documentation accessible and accurate

## 📞 Release Team Contacts

- **Release Manager**: [Name]
- **Technical Lead**: [Name]
- **QA Lead**: [Name]
- **DevOps Engineer**: [Name]

## 📚 References

- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
- [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [RELEASE.md](./RELEASE.md) - Automated release process documentation
- [PROJECT_STATUS_REPORT.md](../PROJECT_STATUS_REPORT.md) - Current project status

---

**Version**: 1.0
**Last Updated**: 2026-02-11
**Status**: Ready for v0.1.0 Release
