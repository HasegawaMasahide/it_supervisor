import { StaticAnalyzer, AnalyzerTool } from '@it-supervisor/static-analyzer';
import { LogLevel } from '@it-supervisor/logger';
import * as path from 'path';

async function main() {
  console.log('=== Static Analysis Example ===\n');

  // 1. Initialize the analyzer
  const analyzer = new StaticAnalyzer();

  const projectPath = path.join(__dirname, '../sample-project');

  try {
    // 2. Run analysis with progress tracking
    console.log('Starting analysis...\n');

    const result = await analyzer.analyzeWithProgress(
      projectPath,
      {
        tools: [AnalyzerTool.ESLint], // Use ESLint only for simplicity
        excludePatterns: ['**/node_modules/**', '**/dist/**'],
      },
      (progress) => {
        console.log(
          `Progress: ${progress.tool} ` +
          `(${progress.current}/${progress.total} tools completed)`
        );
      }
    );

    // 3. Display results
    console.log('\n=== Analysis Results ===\n');
    console.log(`Total issues found: ${result.summary.totalIssues}`);
    console.log(`Analysis completed in: ${result.summary.executionTime}ms`);
    console.log(`Files analyzed: ${result.summary.filesAnalyzed}\n`);

    // Group by severity
    console.log('By Severity:');
    Object.entries(result.summary.bySeverity)
      .sort(([, a], [, b]) => b - a)
      .forEach(([severity, count]) => {
        console.log(`  ${severity}: ${count}`);
      });

    // Group by category
    console.log('\nBy Category:');
    Object.entries(result.summary.byCategory)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count}`);
      });

    // Show sample issues (first 5)
    if (result.allIssues.length > 0) {
      console.log('\nSample Issues:');
      result.allIssues.slice(0, 5).forEach((issue, index) => {
        console.log(`  ${index + 1}. [${issue.severity}] ${issue.message}`);
        console.log(`     File: ${issue.file}:${issue.line || '?'}`);
        console.log(`     Category: ${issue.category}`);
      });
    }

    // 4. Show fix suggestions
    const issuesWithFixes = result.allIssues.filter(i => i.fix?.available);
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
