# Example 01: Static Code Analysis

This example demonstrates how to use `@it-supervisor/static-analyzer` to analyze a code repository for security vulnerabilities and code quality issues.

## What This Example Does

1. Analyzes a sample Node.js project for:
   - ESLint code quality issues
   - Gitleaks security secrets
   - Snyk dependency vulnerabilities
2. Displays results grouped by severity
3. Shows how to handle progress callbacks
4. Demonstrates logging configuration

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- ESLint installed globally (or use npx)

## Installation

```bash
# From the example directory
npm install
```

## Running the Example

```bash
# Build the TypeScript code
npm run build

# Run the example
npm start

# Or run with debug logging
LOG_LEVEL=debug npm start
```

## Expected Output

```
[2026-02-11T00:00:00.000Z] INFO [static-analyzer] Starting static analysis...
[2026-02-11T00:00:01.000Z] INFO [static-analyzer] Running ESLint...
[2026-02-11T00:00:02.000Z] INFO [static-analyzer] Running Gitleaks...
[2026-02-11T00:00:03.000Z] INFO [static-analyzer] Running Snyk...

=== Static Analysis Results ===

Total issues found: 5

By Severity:
  High: 2
  Medium: 2
  Low: 1

By Category:
  Code Quality: 3
  Security: 2

Sample issues:
  [High] Potential SQL injection vulnerability in database.ts:42
  [Medium] Unused variable 'oldData' in utils.ts:15
  [Low] Missing semicolon in index.ts:8
```

## Code Walkthrough

### 1. Initialize the Analyzer

```typescript
import { StaticAnalyzer } from '@it-supervisor/static-analyzer';
import { LogLevel } from '@it-supervisor/logger';

const analyzer = new StaticAnalyzer({
  workDir: '/tmp/analysis',
  logLevel: LogLevel.INFO,
  timeout: 300000, // 5 minutes
});
```

### 2. Run Analysis with Progress Tracking

```typescript
const result = await analyzer.analyzeWithProgress(
  './sample-project',
  {
    tools: ['eslint', 'gitleaks'],
    eslintConfig: '.eslintrc.json',
    includePatterns: ['**/*.ts', '**/*.js'],
    excludePatterns: ['**/node_modules/**'],
  },
  (progress) => {
    console.log(`Progress: ${progress.currentTool} (${progress.completedTools}/${progress.totalTools})`);
  }
);
```

### 3. Process Results

```typescript
// Group by severity
const bySeverity = result.issues.reduce((acc, issue) => {
  acc[issue.severity] = (acc[issue.severity] || 0) + 1;
  return acc;
}, {});

// Filter high-severity issues
const critical = result.issues.filter(i => i.severity === 'high');
```

## Key Features Demonstrated

- ✅ Tool auto-detection based on project files
- ✅ Custom tool configuration (ESLint, Gitleaks, Snyk)
- ✅ Progress callbacks for long-running analysis
- ✅ Issue categorization and severity classification
- ✅ Configurable logging levels
- ✅ Error handling and timeout management

## Customization

### Use Different Tools

```typescript
const result = await analyzer.analyze('./sample-project', {
  tools: ['snyk'], // Only run Snyk
  snykToken: process.env.SNYK_TOKEN,
});
```

### Custom Include/Exclude Patterns

```typescript
const result = await analyzer.analyze('./sample-project', {
  includePatterns: ['src/**/*.ts'], // Only TypeScript files in src/
  excludePatterns: ['**/*.test.ts', '**/dist/**'], // Exclude tests and build artifacts
});
```

### Adjust Timeout

```typescript
const analyzer = new StaticAnalyzer({
  timeout: 600000, // 10 minutes for large projects
});
```

## Troubleshooting

### "ESLint not found"
Install ESLint globally: `npm install -g eslint`

### "Gitleaks not found"
Install Gitleaks: https://github.com/gitleaks/gitleaks#installing

### "Timeout exceeded"
Increase the timeout value in the analyzer configuration.

## Next Steps

- Explore [Example 02: Repository Analysis](../02-repository-analysis/)
- Learn about [Report Generation](../03-report-generation/)
- See how to integrate with [Issue Tracking](../05-issue-tracking/)

## Related Documentation

- [Static Analyzer API](../../packages/static-analyzer/docs/api.md)
- [Logger API](../../packages/logger/README.md)
