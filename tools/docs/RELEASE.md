# Release Guide

This document describes the release process for IT Supervisor Tools.

## Release Process Overview

IT Supervisor Tools uses **automated releases** via GitHub Actions. The release process is triggered by pushing a version tag.

## Prerequisites

Before releasing, ensure you have:

1. **npm Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **npm Access Token**: Generate a token with publish permissions
   - Go to [npmjs.com/settings/tokens](https://www.npmjs.com/settings/YOUR_USERNAME/tokens)
   - Click "Generate New Token" → "Classic Token"
   - Select "Automation" type
   - Copy the token
3. **GitHub Repository Secrets**: Add the npm token to GitHub
   - Go to repository Settings → Secrets and variables → Actions
   - Add `NPM_TOKEN` secret with your npm access token
4. **Clean Working Directory**: No uncommitted changes
5. **Main Branch**: You must be on the `main` branch
6. **All Tests Passing**: Run `npm test` to verify

## Release Methods

### Method 1: Automated Release Script (Recommended)

We provide a release script that automates the entire process:

```bash
# Patch release (0.1.0 → 0.1.1)
./scripts/release.sh patch

# Minor release (0.1.0 → 0.2.0)
./scripts/release.sh minor

# Major release (0.1.0 → 1.0.0)
./scripts/release.sh major

# Custom version
./scripts/release.sh 0.2.0
```

The script will:
1. ✅ Check working directory is clean
2. ✅ Ensure you're on the `main` branch
3. ✅ Pull latest changes
4. ✅ Run quality checks (lint, type-check, tests)
5. ✅ Build all packages
6. ✅ Update version in all `package.json` files
7. ✅ Update `CHANGELOG.md` with release date
8. ✅ Commit changes
9. ✅ Create and push git tag
10. ✅ Trigger CI/CD pipeline

### Method 2: Manual Release

If you prefer to release manually:

#### Step 1: Update Versions

Update version in all `package.json` files:

```bash
# Update root package.json
npm version patch --no-git-tag-version

# Update all package versions
for dir in packages/*; do
  cd $dir
  npm version patch --no-git-tag-version
  cd -
done
```

#### Step 2: Update CHANGELOG.md

Replace `## [Unreleased]` with the new version and date:

```markdown
## [Unreleased]

## [0.1.1] - 2026-02-11
```

Add version comparison links at the bottom:

```markdown
[Unreleased]: https://github.com/your-org/it-supervisor-tools/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/your-org/it-supervisor-tools/compare/v0.1.0...v0.1.1
```

#### Step 3: Commit Changes

```bash
git add .
git commit -m "chore(release): prepare release v0.1.1"
```

#### Step 4: Create and Push Tag

```bash
git tag -a v0.1.1 -m "Release v0.1.1"
git push origin main
git push origin v0.1.1
```

## CI/CD Pipeline

Once the tag is pushed, GitHub Actions will automatically:

### 1. Validate Release (`validate` job)
- Run ESLint
- Run TypeScript type check
- Run all tests
- Build all packages

### 2. Publish to npm (`publish-npm` job)
- Publish all 7 packages to npm registry:
  - `@it-supervisor/logger`
  - `@it-supervisor/metrics-model`
  - `@it-supervisor/repo-analyzer`
  - `@it-supervisor/static-analyzer`
  - `@it-supervisor/issue-manager`
  - `@it-supervisor/report-generator`
  - `@it-supervisor/sandbox-builder`

### 3. Create GitHub Release (`create-release` job)
- Extract changelog for the version
- Create GitHub Release with:
  - Release notes from CHANGELOG.md
  - Installation instructions
  - Links to documentation

## Monitoring Release Progress

1. Go to [GitHub Actions](https://github.com/your-org/it-supervisor-tools/actions)
2. Find the "Release" workflow for your tag
3. Monitor the progress of each job:
   - ✅ Validate → ✅ Publish to npm → ✅ Create GitHub Release

## Release Checklist

Use this checklist before releasing:

- [ ] All tests pass (`npm test`)
- [ ] Code coverage meets thresholds (≥80%)
- [ ] No ESLint errors (`npm run lint`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] CHANGELOG.md is up to date
- [ ] All examples work correctly
- [ ] Documentation is accurate
- [ ] Breaking changes are documented
- [ ] Migration guide is provided (if breaking changes)
- [ ] Working directory is clean
- [ ] On `main` branch with latest changes

## Post-Release Tasks

After a successful release:

1. **Verify npm packages**:
   ```bash
   npm view @it-supervisor/static-analyzer
   npm view @it-supervisor/repo-analyzer
   # ... check all packages
   ```

2. **Verify GitHub Release**:
   - Check https://github.com/your-org/it-supervisor-tools/releases
   - Ensure release notes are correct

3. **Announce the release**:
   - Update project README if needed
   - Share on social media (optional)
   - Notify users of breaking changes

4. **Prepare for next release**:
   - Add `## [Unreleased]` section to CHANGELOG.md
   - Start tracking new changes

## Versioning Strategy

We follow [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR** version (1.0.0): Incompatible API changes
- **MINOR** version (0.1.0): New features, backwards-compatible
- **PATCH** version (0.0.1): Bug fixes, backwards-compatible

### Pre-release Versions

For pre-releases, use these suffixes:

- `alpha`: Early development, unstable
- `beta`: Feature-complete, testing phase
- `rc`: Release candidate, final testing

Examples:
- `0.2.0-alpha.1`
- `0.2.0-beta.1`
- `0.2.0-rc.1`

To release a pre-release version:

```bash
./scripts/release.sh 0.2.0-beta.1
```

Pre-releases are marked as "pre-release" on GitHub and can be published with `--tag next` on npm.

## Rollback

If a release fails or has critical issues:

### 1. Unpublish from npm (within 72 hours)

```bash
npm unpublish @it-supervisor/package-name@VERSION
```

⚠️ **Warning**: Unpublishing is only possible within 72 hours of publication.

### 2. Delete GitHub Release

- Go to https://github.com/your-org/it-supervisor-tools/releases
- Click "Delete" on the problematic release

### 3. Delete Git Tag

```bash
git tag -d v0.1.1
git push origin :refs/tags/v0.1.1
```

### 4. Revert Commit

```bash
git revert HEAD
git push origin main
```

### 5. Release a Patch

The best practice is to release a new patch version with the fix:

```bash
./scripts/release.sh patch
```

## Troubleshooting

### "npm publish" fails with 403 Forbidden

- **Cause**: Invalid or expired npm token
- **Solution**: Regenerate npm token and update GitHub secret `NPM_TOKEN`

### "npm publish" fails with "package already exists"

- **Cause**: Version number already published
- **Solution**: Bump version and release again

### Tests fail in CI but pass locally

- **Cause**: Environment differences
- **Solution**: Check Node.js version, dependencies, and environment variables

### GitHub Release creation fails

- **Cause**: Missing `GITHUB_TOKEN` or invalid changelog format
- **Solution**: Check Actions permissions and CHANGELOG.md syntax

## Support

For questions or issues with the release process:

- Open an issue: https://github.com/your-org/it-supervisor-tools/issues
- Contact maintainers: See CONTRIBUTING.md

---

**Last Updated**: 2026-02-11
