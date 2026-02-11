# Contributing to IT Supervisor Tools

Thank you for your interest in contributing to IT Supervisor Tools! This document provides guidelines and instructions for contributing to this project.

## 📋 Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
  - [Git Hooks](#6-git-hooks)
- [Testing](#testing)
- [Code Style](#code-style)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Package Dependency Rules](#package-dependency-rules)

## 🛠 Development Setup

### Prerequisites

- **Node.js**: >=18.0.0
- **npm**: >=9.0.0
- **Git**: Latest stable version

### Initial Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/it-supervisor-tools.git
   cd it-supervisor-tools
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

   This will install all dependencies for the workspace and all packages.

3. **Build packages**

   ```bash
   npm run build
   ```

   This compiles TypeScript code for all packages.

## 📂 Project Structure

This is a monorepo managed with npm workspaces:

```
@it-supervisor/tools/
├── packages/
│   ├── logger/              # Structured logging utility (foundation)
│   ├── metrics-model/       # SQLite metrics database
│   ├── issue-manager/       # Issue tracking & management
│   ├── repo-analyzer/       # Git repository analysis
│   ├── static-analyzer/     # Static code analysis orchestrator
│   ├── report-generator/    # HTML/Markdown/PDF report generation
│   └── sandbox-builder/     # Docker sandbox environment generator
├── .github/
│   └── workflows/
│       └── ci.yml           # CI/CD workflow
├── vitest.config.ts         # Test configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Workspace root package.json
```

### Package Dependencies

```
logger (foundation - used by all packages)
    ↓
metrics-model, issue-manager, repo-analyzer, static-analyzer, sandbox-builder
    ↓
report-generator (uses issue-manager for reports)
```

## 🔄 Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

- Write code following the project's code style
- Add tests for new functionality
- Update documentation as needed

### 3. Run Tests Locally

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### 4. Lint and Type-Check

```bash
# Run ESLint
npm run lint

# Run TypeScript compiler check
npm run type-check
```

### 5. Commit Changes

Follow the [Commit Convention](#commit-convention) when creating commits.

```bash
git add .
git commit -m "feat(package-name): add new feature"
```

### 6. Git Hooks

This project uses [husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to enforce code quality before commits.

#### Pre-commit Hook

When you run `git commit`, the following checks are **automatically executed**:

1. **ESLint Auto-fix**: Automatically fixes linting issues in staged TypeScript files
2. **Related Tests**: Runs tests related to changed files using `vitest related --run --bail`
3. **Type-check**: Runs TypeScript compiler check on the entire codebase with `tsc --noEmit`

If any of these checks fail, the commit will be **aborted** and you must fix the issues before committing.

#### Bypassing Hooks (Emergency Only)

**⚠️ Not recommended** - Only use in emergencies when you need to commit broken code temporarily:

```bash
git commit --no-verify -m "WIP: emergency fix"
```

**Important**: Never push commits that bypass hooks to the main branch. Fix issues in a follow-up commit as soon as possible.

#### Debugging Hook Failures

If a pre-commit hook fails, you'll see error output from the failed step:

**ESLint Failure Example:**
```
✖ eslint --fix:
  error  'unusedVar' is defined but never used  @typescript-eslint/no-unused-vars
```

**Solution:** Fix the linting error and re-commit.

**Test Failure Example:**
```
✖ vitest related --run --bail:
  FAIL packages/metrics-model/src/__tests__/database.test.ts
    ● MetricsDatabase › should create a new project
```

**Solution:** Fix the failing test and re-commit.

**Type-check Failure Example:**
```
error TS2322: Type 'string' is not assignable to type 'number'.
```

**Solution:** Fix the type error and re-commit.

#### Common Hook Issues

**Issue: "Hooks not installed"**

If hooks aren't running, reinstall them:
```bash
npm run prepare
```

**Issue: "vitest: command not found"**

Install dependencies:
```bash
npm install
```

**Issue: "Hook takes too long"**

If you're changing many files, the hook may take 30+ seconds. Be patient or split your commit into smaller chunks:
```bash
# Commit only specific files
git add packages/metrics-model/src/database.ts
git commit -m "feat(metrics-model): add new method"
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests for a specific package
npm test -- packages/metrics-model

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Writing Tests

- Place test files in `src/__tests__/` directories
- Name test files as `*.test.ts`
- Use Vitest for all tests
- Mock external dependencies (fs, child_process, database)
- Aim for >70% code coverage for new code

**Example test:**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MyClass } from '../my-class.js';

describe('MyClass', () => {
  let instance: MyClass;

  beforeEach(() => {
    instance = new MyClass();
  });

  afterEach(() => {
    // Clean up
  });

  it('should do something', () => {
    const result = instance.doSomething();
    expect(result).toBe(expected);
  });
});
```

### Test Coverage Requirements

- **Minimum**: 60% statement coverage
- **Target**: 80% statement coverage
- **Critical packages**: 90%+ coverage (metrics-model, issue-manager)

Current coverage status can be viewed by running `npm run test:coverage`.

## 🎨 Code Style

### TypeScript

- Use **strict mode** (enabled in tsconfig.json)
- Avoid `any` types - use `unknown` with type guards
- Use interfaces for object shapes
- Export types from `types.ts` in each package
- Add JSDoc comments for all public APIs

### Naming Conventions

- **Files**: kebab-case (`my-module.ts`)
- **Classes**: PascalCase (`MyClass`)
- **Functions**: camelCase (`myFunction`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase (`MyInterface`)
- **Types**: PascalCase (`MyType`)

### Code Organization

- One class per file (except for small helper classes)
- Group related functions in modules
- Keep functions small (<50 lines)
- Extract complex logic into helper functions
- Use early returns to reduce nesting

### Comments

- Use JSDoc for public APIs
- Add inline comments for complex logic
- Explain **why**, not **what**
- Keep comments up-to-date with code changes

## 📝 Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **test**: Adding or updating tests
- **refactor**: Code refactoring (no functional changes)
- **perf**: Performance improvements
- **chore**: Maintenance tasks (dependencies, config)
- **ci**: CI/CD changes
- **style**: Code style changes (formatting, no logic changes)

### Scopes

Use package names as scopes:

- `metrics-model`
- `issue-manager`
- `repo-analyzer`
- `static-analyzer`
- `report-generator`
- `sandbox-builder`
- `workspace` (for root-level changes)

### Examples

```bash
# Good commits
feat(metrics-model): add metric aggregation method
fix(issue-manager): resolve SQL parameter binding issue
docs(repo-analyzer): add JSDoc to public API
test(static-analyzer): improve test coverage to 75%
refactor(report-generator): extract PDF generation logic
chore(workspace): update TypeScript to 5.4.0

# Bad commits
added stuff
fix bug
update code
```

### Co-authoring

When committing code generated or assisted by AI:

```
feat(package): add new feature

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## 🔀 Pull Request Process

### Before Creating a PR

1. ✅ All tests pass (`npm test`)
2. ✅ No lint errors (`npm run lint`)
3. ✅ TypeScript compiles (`npm run type-check`)
4. ✅ Code coverage meets requirements
5. ✅ Documentation is updated
6. ✅ Commits follow convention

### Creating a PR

1. **Push your branch**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR on GitHub**

   - Use a clear, descriptive title
   - Reference related issues (#123)
   - Describe what changed and why
   - Add screenshots for UI changes
   - List breaking changes (if any)

3. **PR Template**

   ```markdown
   ## Summary
   Brief description of changes

   ## Changes
   - Added X
   - Fixed Y
   - Updated Z

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Manual testing performed
   - [ ] Coverage maintained/improved

   ## Related Issues
   Fixes #123
   Closes #456
   ```

### PR Review Process

- **Automated checks**: CI must pass (lint, type-check, tests, build)
- **Code review**: At least one approval required
- **Review focus**:
  - Correctness and logic
  - Test coverage and quality
  - Code style and readability
  - Performance implications
  - Security considerations

### After PR Approval

1. **Squash and merge** (preferred for feature branches)
2. **Rebase and merge** (for maintaining commit history)
3. Delete the feature branch after merging

## 📦 Package Dependency Rules

### Avoid Circular Dependencies

- Packages must form a **directed acyclic graph** (DAG)
- Never create circular dependencies between packages

### Dependency Guidelines

1. **Foundation layer**: `metrics-model` (no internal dependencies)
2. **Core services**: `issue-manager`, `repo-analyzer`, `static-analyzer`
3. **Presentation layer**: `report-generator`
4. **Utility**: `sandbox-builder` (independent)

### Adding Dependencies

- **Runtime dependencies**: Add to package's `dependencies`
- **Development dependencies**: Add to package's `devDependencies`
- **Shared dev tools**: Add to workspace root `devDependencies`

### Updating Dependencies

```bash
# Check for outdated dependencies
npm outdated

# Update a specific package
npm update <package-name>

# Update all packages (carefully!)
npm update
```

After updating dependencies:
1. Run all tests
2. Check for breaking changes in changelogs
3. Update code if needed
4. Commit with `chore(workspace): update dependencies`

## 🐛 Reporting Issues

### Bug Reports

Include:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment (Node version, OS, etc.)
- Error messages and stack traces

### Feature Requests

Include:
- Clear description of the feature
- Use cases and motivation
- Proposed API or interface
- Alternatives considered

## 💡 Questions and Support

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check README files in each package

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to IT Supervisor Tools! 🎉**
