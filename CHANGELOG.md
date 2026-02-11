# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive API documentation for all 6 packages (4,675+ lines)
- `@it-supervisor/logger` package for structured logging with configurable log levels
- Test coverage reporting with vitest (@vitest/coverage-v8)
- GitHub Actions CI/CD workflow with 5 jobs (lint, type-check, test, coverage, build)
- CONTRIBUTING.md with development guidelines and coding standards
- SECURITY.md with vulnerability reporting guidelines
- Comprehensive README.md to project root (280+ lines)
- MIT LICENSE file for open source distribution
- Snapshot versioning and restoration feature in sandbox-builder
- Unit tests for all packages (381 passing tests, 83.71% coverage)
- JSDoc documentation for all public APIs
- `files` field to all package.json for optimized npm publishing
- `type-check` script to package.json for TypeScript validation

### Changed
- Updated coverage thresholds to 80% (statements, lines, functions) and 70% (branches)
- Replaced all console.log/error statements with structured logger (42 instances)
- Updated puppeteer from ^21.6.0 to ^24.37.2 (fixes 5 high-severity vulnerabilities)
- Updated @types/node from 20.x to ^25.2.3
- Updated @typescript-eslint packages from 6.x to ^8.55.0
- Updated better-sqlite3 from 9.x to ^12.6.2
- Updated marked from 11.x to ^17.0.1
- Enhanced package.json metadata with repository, bugs, homepage fields
- Organized and archived outdated documentation files to docs/archive/

### Fixed
- TypeScript compilation errors (null safety for child process streams)
- ESLint errors (unused imports, parameters, require() statements)
- Reduced `any` type usage from 38 warnings to 0 warnings (-100%)
- Error handling in sandbox-builder (JSON parsing, input validation)
- Error handling in repo-analyzer (file read operations, fileCache memory leak)
- Error handling in static-analyzer (shell injection prevention, timeout enforcement)
- Duplicate member name in SandboxController (exec → execRaw)

### Removed
- Redundant @types/marked dependency (marked@17.x includes built-in types)

## [0.1.0] - Initial Development

### Added
- Initial project structure with 6 packages:
  - `@it-supervisor/static-analyzer` - Static code analysis orchestrator
  - `@it-supervisor/repo-analyzer` - Git repository analysis
  - `@it-supervisor/sandbox-builder` - Docker sandbox environment generator
  - `@it-supervisor/report-generator` - HTML/Markdown/PDF report generation
  - `@it-supervisor/issue-manager` - Issue tracking and CRUD operations
  - `@it-supervisor/metrics-model` - SQLite metrics database
- TypeScript monorepo with npm workspaces
- Basic test suite with vitest
- ESLint and TypeScript configuration
- Package-level README files

[Unreleased]: https://github.com/your-org/it-supervisor-tools/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-org/it-supervisor-tools/releases/tag/v0.1.0
