# Test Coverage Gaps

**Generated:** 2026-02-11
**Current Overall Coverage:** 83.99% statements

## Purpose

This document tracks remaining test coverage gaps that require external dependencies or complex setup.
It serves as a guide for future test improvements when those dependencies become available.

---

## Package: repo-analyzer

**Current Coverage:** 69.71% statements, 72.02% branches, 73.91% functions
**Target Coverage:** 80%
**Gap:** -10.29%

### Uncovered Areas

#### 1. Git Operations (Lines 702-723)

**Methods:**
- `cloneRepository()` - Git clone operation
- `analyzeCommitHistory()` - Git log parsing

**Why Not Covered:**
- Requires actual Git binary execution
- Mocking `simple-git` library is complex in Vitest
- Would need integration tests with real Git repositories

**Recommended Approach:**
- Create integration tests in separate suite
- Use temporary Git repositories for testing
- Mock `simple-git` at a higher level (return values, not implementation)

#### 2. Advanced File Analysis (Lines 816+)

**Methods:**
- `analyzeDependencyGraph()` - Complex dependency parsing
- `detectEntryPoints()` - Multi-format entry point detection (package.json, composer.json, pom.xml)

**Why Not Covered:**
- Requires extensive mocking of file system operations
- Current Vitest fs mocking has limitations (see Task 20 documentation)
- 11 complexity-related tests already skipped due to mocking issues

**Recommended Approach:**
- Wait for Vitest fs mocking improvements
- Consider using `memfs` or `mock-fs` libraries
- Create real test fixtures in `.tmp/` directory instead of mocking

#### 3. Comment Detection Edge Cases (Lines 619-649, 680-700)

**Methods:**
- `isLineComment()` - Partially covered
- `isBlockCommentStart()` - Partially covered
- `isBlockCommentEnd()` - Partially covered

**Why Not Covered:**
- Edge cases for less common languages (C++, C#, .NET)
- Multi-line comment handling in various file types
- Mixed comment styles (e.g., PHP `//` and `#`)

**Current Status:**
- ✅ JavaScript/TypeScript comments covered
- ✅ PHP comments covered
- ✅ Python/Ruby/Shell comments covered
- ⚠️ C/C++/Java comments partially covered
- ❌ Edge cases not covered (e.g., `/* ... */` spanning multiple lines)

**Recommended Tests:**
```typescript
it('should handle multi-line block comments in C++', () => {
  const content = `
/*
 * Multi-line
 * comment
 */
int main() { return 0; }
  `;
  const stats = await analyzer.analyzeFile('/test/file.cpp');
  expect(stats.commentLines).toBe(4);
});
```

---

## Package: static-analyzer

**Current Coverage:** 69.38% statements, 58.45% branches, 76.92% functions
**Target Coverage:** 80%
**Gap:** -10.62%

### Uncovered Areas

#### 1. Tool Execution Error Paths (Lines 466-493, 619-623)

**Methods:**
- `runESLint()` - Error handling for ESLint failures
- `runPHPStan()` - Error handling for PHPStan failures
- `runSnyk()` - Error handling for Snyk API failures

**Why Not Covered:**
- Requires mocking external tool failures (command not found, permission denied, timeout)
- Complex error scenarios (partial output, malformed JSON, network errors)

**Recommended Tests:**
```typescript
it('should handle ESLint timeout errors', async () => {
  vi.mocked(execFileAsync).mockRejectedValue(new Error('Command timeout'));
  const result = await analyzer.runESLint('/test/project');
  expect(result.issues).toEqual([]);
});
```

#### 2. Complex Issue Deduplication (Lines 732-795)

**Methods:**
- `removeDuplicateIssues()` - Advanced deduplication logic with fuzzy matching

**Why Not Covered:**
- Requires creating many similar issues with slight variations
- Edge cases: identical file/line but different tools, same message but different locations

**Recommended Tests:**
```typescript
it('should deduplicate issues from different tools at same location', () => {
  const issues = [
    { file: 'test.ts', line: 10, message: 'Unused variable', tool: AnalyzerTool.ESLint },
    { file: 'test.ts', line: 10, message: 'Unused variable', tool: AnalyzerTool.TSC },
  ];
  const result = analyzer.removeDuplicateIssues(issues);
  expect(result).toHaveLength(1);
});
```

#### 3. Fix Suggestion Generation (Lines 840-844)

**Methods:**
- `generateFixSuggestion()` - Rule-based fix suggestions

**Why Not Covered:**
- Only a few common rules tested (no-unused-vars, eqeqeq)
- Many ESLint/PHPStan rules not covered

**Recommended Approach:**
- Add tests for top 20 most common linting rules
- Test suggestions for security rules (no-eval, no-unsafe-innerhtml)

---

## Package: logger

**Current Coverage:** 85.71% statements, 78.37% branches, 92.30% functions
**Status:** ✅ Exceeds 80% threshold

### Minor Gaps

#### 1. index.ts Re-export File (Lines 1-10)

**Why 0% Coverage:**
- Vitest doesn't track coverage for re-export files
- This is a known limitation, not an actual gap
- All actual logic in logger.ts is well-covered

---

## Overall Recommendations

### Short-term (Next 1-2 Weeks)

1. **Accept 70% coverage for repo-analyzer and static-analyzer**
   - Both packages exceed industry standard (60-70%)
   - Core functionality is well-tested
   - Uncovered areas are edge cases and external dependencies

2. **Document skipped tests with clear reasoning** ✅ (Done in Task 20)

3. **Focus on high-value improvements:**
   - Integration tests for Git operations
   - End-to-end tests for full analysis pipelines
   - Performance tests for large codebases

### Medium-term (Next 1-3 Months)

1. **Improve Vitest fs mocking**
   - Contribute to Vitest project or wait for updates
   - Migrate to `memfs` or `mock-fs` if needed

2. **Add integration test suite**
   - Use real test repositories in `.tmp/`
   - Test Git clone, ESLint execution, Snyk API calls
   - CI/CD environment with all tools installed

3. **Achieve 80% coverage incrementally**
   - Add 2-3 tests per week
   - Focus on high-impact, low-effort areas first

### Long-term (Next 3-6 Months)

1. **Refactor large files** (Task 112)
   - Split static-analyzer/analyzer.ts (1,198 lines) into tool-specific modules
   - Split sandbox-builder/builder.ts (1,154 lines) into environment detectors
   - Improves testability and maintainability

2. **Add property-based testing**
   - Use `fast-check` library for fuzzing
   - Test parser robustness with random inputs

3. **Set up mutation testing**
   - Use Stryker to find weak tests
   - Improve test quality, not just coverage percentage

---

## Metrics

| Package | Current | Target | Gap | Priority |
|---------|---------|--------|-----|----------|
| metrics-model | 96.31% | 80% | +16.31% | ✅ Excellent |
| sandbox-builder | 95.64% | 80% | +15.64% | ✅ Excellent |
| issue-manager | 95.19% | 80% | +15.19% | ✅ Excellent |
| report-generator | 89.10% | 80% | +9.10% | ✅ Good |
| logger | 85.71% | 80% | +5.71% | ✅ Good |
| **repo-analyzer** | **69.71%** | **80%** | **-10.29%** | ⚠️ **Below Target** |
| **static-analyzer** | **69.38%** | **80%** | **-10.62%** | ⚠️ **Below Target** |
| **Overall** | **83.99%** | **80%** | **+3.99%** | ✅ **Exceeds Target** |

---

## Conclusion

While repo-analyzer and static-analyzer are below the 80% target individually, **the overall project exceeds 80% coverage (83.99%)**.
The remaining gaps are primarily in areas requiring complex external dependencies (Git, linting tools) or advanced Vitest features not yet available.

**Recommendation:** Accept current coverage levels and focus on integration tests and code refactoring for long-term improvement.
