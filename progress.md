# Progress — IT Supervisor Tools Quality Improvement

## Task List

### Phase 1: Build Infrastructure

- [x] **Task 1: Add vitest to the workspace**
  - Install vitest as a devDependency at the workspace root
  - Add a root `vitest.config.ts` with TypeScript support
  - Update root `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`
  - Verify `npm test` runs (even with 0 tests) without error
  - Commit: `chore: add vitest configuration to workspace root`

### Phase 2: Tests for packages WITHOUT native dependencies

- [x] **Task 2: Unit tests for sandbox-builder (detection)**
  - Create `packages/sandbox-builder/src/__tests__/builder.test.ts`
  - Test `detect()` method: mock `fs.readFile` / `fs.access` to simulate different project types
  - Test cases: Node.js project, PHP project, Python project, unknown project, empty directory
  - Test database detection from package.json dependencies
  - Commit: `test(sandbox-builder): add unit tests for environment detection`

- [x] **Task 3: Unit tests for sandbox-builder (Docker config generation)**
  - Test `build()` method: verify generated DockerCompose config structure
  - Test each environment type produces correct base image and ports
  - Test isolation level settings
  - Commit: `test(sandbox-builder): add unit tests for Docker config generation`

- [x] **Task 4: Unit tests for repo-analyzer (language detection)**
  - Create `packages/repo-analyzer/src/__tests__/analyzer.test.ts`
  - Test `detectLanguages()` with mocked file listings
  - Test `analyzeFile()` line counting with various comment styles
  - Test `calculateComplexity()` with known code snippets
  - Commit: `test(repo-analyzer): add unit tests for language detection and file analysis`

- [x] **Task 5: Unit tests for repo-analyzer (tech stack detection)**
  - Test `detectFrameworks()` with mocked package.json, composer.json, pom.xml
  - Test `detectDependencies()` for npm, pip, composer ecosystems
  - Test `analyzeMetadata()` for README, LICENSE, Dockerfile detection
  - Commit: `test(repo-analyzer): add unit tests for tech stack detection`

- [x] **Task 6: Unit tests for static-analyzer**
  - Create `packages/static-analyzer/src/__tests__/analyzer.test.ts`
  - Test `selectTools()` auto-detection based on project files
  - Test `removeDuplicateIssues()` deduplication logic
  - Test `createSummary()` statistics aggregation
  - Test `generateFixSuggestion()` for known rules
  - Mock `child_process.exec` for tool runner tests
  - Commit: `test(static-analyzer): add unit tests for tool selection and issue processing`

### Phase 3: Error handling improvements

- [x] **Task 7: Fix error handling in sandbox-builder**
  - Wrap all `JSON.parse()` calls in try-catch (builder.ts lines ~65, ~95, etc.)
  - Add input validation for `detect()` and `build()` (check path exists)
  - Return meaningful error messages instead of crashing
  - Add tests for error cases
  - Commit: `fix(sandbox-builder): add error handling for JSON parsing and input validation`

- [x] **Task 8: Fix error handling in repo-analyzer**
  - Add try-catch around file read operations in `analyzeFile()`
  - Clear `fileCache` map after analysis to prevent memory leak
  - Handle binary file detection gracefully
  - Add tests for error cases
  - Commit: `fix(repo-analyzer): add error handling and fix fileCache memory leak`

- [ ] **Task 9: Fix error handling in static-analyzer**
  - Replace `exec()` with `execFile()` to prevent shell injection in Docker commands
  - Add timeout enforcement for tool execution
  - Clean up temp files (gitleaks report) in finally blocks
  - Add tests for error cases
  - Commit: `fix(static-analyzer): prevent shell injection and add timeout enforcement`

## Completed

- **Task 1: Add vitest to the workspace** ✓
- **Task 2: Unit tests for sandbox-builder (detection)** ✓
- **Task 3: Unit tests for sandbox-builder (Docker config generation)** ✓
- **Task 4: Unit tests for repo-analyzer (language detection and file analysis)** ✓
- **Task 5: Unit tests for repo-analyzer (tech stack detection)** ✓
- **Task 6: Unit tests for static-analyzer** ✓
- **Task 7: Fix error handling in sandbox-builder** ✓
- **Task 8: Fix error handling in repo-analyzer** ✓

## Notes

- Packages `metrics-model` and `issue-manager` depend on `better-sqlite3` (native module).
  Skip these for now — focus on the 3 packages without native dependencies first.
- `report-generator` depends on `puppeteer` (optional) — mock it in tests.
- All tests should use mocks for filesystem, git, and child_process operations.
