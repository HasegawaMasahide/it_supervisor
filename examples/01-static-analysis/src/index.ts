import { StaticAnalyzer, AnalyzerTool } from '@it-supervisor/static-analyzer';
import { createLogger, LogLevel } from '@it-supervisor/logger';
import * as path from 'path';

const logger = createLogger({ name: 'static-analysis-example', level: LogLevel.INFO });

async function main() {
  logger.info('=== Static Analysis Example ===\n');

  // 1. Initialize the analyzer
  const analyzer = new StaticAnalyzer();

  const projectPath = path.join(__dirname, '../sample-project');

  try {
    // 2. Run analysis with progress tracking
    logger.info('Starting analysis...\n');

    const result = await analyzer.analyzeWithProgress(
      projectPath,
      {
        tools: [AnalyzerTool.ESLint], // Use ESLint only for simplicity
        excludePatterns: ['**/node_modules/**', '**/dist/**'],
      },
      (progress) => {
        logger.info(
          `Progress: ${progress.tool} ` +
          `(${progress.current}/${progress.total} tools completed)`
        );
      }
    );

    // 3. Display results
    logger.info('\n=== Analysis Results ===\n');
    logger.info(`Total issues found: ${result.summary.totalIssues}`);
    logger.info(`Analysis completed in: ${result.summary.executionTime}ms`);
    logger.info(`Files analyzed: ${result.summary.filesAnalyzed}\n`);

    // Group by severity
    logger.info('By Severity:');
    Object.entries(result.summary.bySeverity)
      .sort(([, a], [, b]) => b - a)
      .forEach(([severity, count]) => {
        logger.info(`  ${severity}: ${count}`);
      });

    // Group by category
    logger.info('\nBy Category:');
    Object.entries(result.summary.byCategory)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        logger.info(`  ${category}: ${count}`);
      });

    // Show sample issues (first 5)
    if (result.allIssues.length > 0) {
      logger.info('\nSample Issues:');
      result.allIssues.slice(0, 5).forEach((issue, index) => {
        logger.info(`  ${index + 1}. [${issue.severity}] ${issue.message}`);
        logger.info(`     File: ${issue.file}:${issue.line || '?'}`);
        logger.info(`     Category: ${issue.category}`);
      });
    }

    // 4. Show fix suggestions
    const issuesWithFixes = result.allIssues.filter(i => i.fix?.available);
    if (issuesWithFixes.length > 0) {
      logger.info(`\n${issuesWithFixes.length} issues have automated fix suggestions`);
    }

    logger.info('\n✓ Analysis completed successfully');

  } catch (error) {
    logger.error('\n✗ Analysis failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the example
main().catch((err) => logger.error(err));
