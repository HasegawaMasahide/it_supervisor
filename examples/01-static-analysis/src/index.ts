import { StaticAnalyzer } from '@it-supervisor/static-analyzer';
import { LogLevel } from '@it-supervisor/logger';
import * as path from 'path';

async function main() {
  console.log('=== Static Analysis Example ===\n');

  // 1. Initialize the analyzer
  const analyzer = new StaticAnalyzer({
    workDir: path.join(__dirname, '../.tmp'),
    logLevel: process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO,
    timeout: 300000, // 5 minutes
  });

  const projectPath = path.join(__dirname, '../sample-project');

  try {
    // 2. Run analysis with progress tracking
    console.log('Starting analysis...\n');

    const result = await analyzer.analyzeWithProgress(
      projectPath,
      {
        tools: ['eslint'], // Use ESLint only for simplicity
        eslintConfig: path.join(projectPath, '.eslintrc.json'),
        includePatterns: ['**/*.ts', '**/*.js'],
        excludePatterns: ['**/node_modules/**', '**/dist/**'],
      },
      (progress) => {
        console.log(
          `Progress: ${progress.currentTool} ` +
          `(${progress.completedTools}/${progress.totalTools} tools completed)`
        );
      }
    );

    // 3. Display results
    console.log('\n=== Analysis Results ===\n');
    console.log(`Total issues found: ${result.summary.totalIssues}`);
    console.log(`Analysis completed in: ${result.summary.duration}ms`);
    console.log(`Tools executed: ${result.summary.toolsExecuted.join(', ')}\n`);

    // Group by severity
    const bySeverity = result.issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('By Severity:');
    Object.entries(bySeverity)
      .sort(([, a], [, b]) => b - a)
      .forEach(([severity, count]) => {
        console.log(`  ${severity}: ${count}`);
      });

    // Group by category
    const byCategory = result.issues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\nBy Category:');
    Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count}`);
      });

    // Show sample issues (first 5)
    if (result.issues.length > 0) {
      console.log('\nSample Issues:');
      result.issues.slice(0, 5).forEach((issue, index) => {
        console.log(`  ${index + 1}. [${issue.severity}] ${issue.message}`);
        console.log(`     File: ${issue.file}:${issue.line}`);
        console.log(`     Category: ${issue.category}`);
      });
    }

    // 4. Show fix suggestions
    const issuesWithFixes = result.issues.filter(i => i.fixSuggestion);
    if (issuesWithFixes.length > 0) {
      console.log(`\n${issuesWithFixes.length} issues have automated fix suggestions`);
    }

    console.log('\n✓ Analysis completed successfully');

  } catch (error) {
    console.error('\n✗ Analysis failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
