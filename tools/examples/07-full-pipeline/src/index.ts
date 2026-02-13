import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';
import { StaticAnalyzer } from '@it-supervisor/static-analyzer';
import { IssueManager, IssueCategory, IssueSeverity } from '@it-supervisor/issue-manager';
import { MetricsDatabase } from '@it-supervisor/metrics-model';
import { ReportGenerator } from '@it-supervisor/report-generator';
import { createLogger, LogLevel } from '@it-supervisor/logger';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger({ name: 'example', level: LogLevel.INFO });

async function main() {
  logger.info('=== Full IT Audit Pipeline Example ===\n');
  logger.info('This example demonstrates a complete audit workflow:\n');
  logger.info('  1. Analyze repository structure and codebase');
  logger.info('  2. Run static analysis to find issues');
  logger.info('  3. Store issues and metrics in databases');
  logger.info('  4. Generate comprehensive audit report\n');

  // Initialize components
  const projectPath = path.resolve(__dirname, '../../..');
  const dbPath = path.join(__dirname, '../pipeline.db');
  const outputDir = __dirname + '/..';

  const repoAnalyzer = new RepositoryAnalyzer();
  const staticAnalyzer = new StaticAnalyzer({
    workDir: path.join(__dirname, '../.tmp'),
    logLevel: LogLevel.WARN,
    timeout: 120000,
  });
  const issueManager = new IssueManager(dbPath);
  const metricsDb = new MetricsDatabase(dbPath);
  const reportGenerator = new ReportGenerator();

  const projectId = 'full-pipeline-example';
  const timestamp = new Date();

  try {
    // Step 1: Repository Analysis
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('Step 1: Analyzing Repository');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const repoResult = await repoAnalyzer.analyzeLocal(projectPath, {
      maxFiles: 500,
      excludePatterns: ['node_modules', '.git', 'dist', 'coverage'],
      calculateComplexity: true,
    });

    logger.info(`✓ Analyzed ${repoResult.fileStats.totalFiles} files`);
    logger.info(`  Languages: ${repoResult.techStack.languages.map(l => l.name).join(', ')}`);
    logger.info(`  Total Lines: ${repoResult.fileStats.totalLines.toLocaleString()}`);

    // Step 2: Static Analysis
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('Step 2: Running Static Analysis');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const staticResult = await staticAnalyzer.analyze(projectPath, {
      tools: ['eslint'], // Use only ESLint for this example
      includePatterns: ['**/*.ts'],
      excludePatterns: ['**/node_modules/**', '**/dist/**', '**/__tests__/**'],
    });

    logger.info(`✓ Analysis completed in ${staticResult.summary.duration}ms`);
    logger.info(`  Tools: ${staticResult.summary.toolsExecuted.join(', ')}`);
    logger.info(`  Issues Found: ${staticResult.summary.totalIssues}`);

    // Step 3: Store Metrics
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('Step 3: Storing Metrics');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const project = metricsDb.createProject({
      name: projectId,
      description: 'Full pipeline audit example',
      repository: repoResult.metadata.remoteUrl || 'local',
    });

    metricsDb.batchRecordMetrics([
      {
        projectId: project.id!,
        category: 'code',
        name: 'total_files',
        value: repoResult.fileStats.totalFiles,
        timestamp,
      },
      {
        projectId: project.id!,
        category: 'code',
        name: 'total_lines',
        value: repoResult.fileStats.totalLines,
        timestamp,
      },
      {
        projectId: project.id!,
        category: 'code',
        name: 'code_lines',
        value: repoResult.fileStats.codeLines,
        timestamp,
      },
      {
        projectId: project.id!,
        category: 'code',
        name: 'comment_lines',
        value: repoResult.fileStats.commentLines,
        timestamp,
      },
      {
        projectId: project.id!,
        category: 'quality',
        name: 'total_issues',
        value: staticResult.summary.totalIssues,
        timestamp,
      },
    ]);

    logger.info(`✓ Recorded 5 metrics for project "${project.name}"`);

    // Step 4: Store Issues
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('Step 4: Storing Issues');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let issueCount = 0;
    const maxIssues = 20; // Limit to first 20 issues for demo

    for (const issue of staticResult.issues.slice(0, maxIssues)) {
      const category = mapCategory(issue.category);
      const severity = mapSeverity(issue.severity);

      issueManager.createIssue({
        projectId,
        title: issue.message,
        description: issue.message,
        category,
        severity,
        source: issue.tool,
        file: issue.file,
        line: issue.line,
        column: issue.column,
        ruleId: issue.rule,
      });

      issueCount++;
    }

    logger.info(`✓ Stored ${issueCount} issues in database`);

    // Step 5: Generate Report
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('Step 5: Generating Audit Report');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const stats = issueManager.getStatistics(projectId);

    const reportConfig = {
      title: 'IT Asset Audit Report',
      subtitle: 'Automated Code Quality and Security Analysis',
      author: 'IT Supervisor Tools',
      date: timestamp.toISOString().split('T')[0],
      version: '1.0.0',

      // Repository metadata
      repository: {
        name: repoResult.metadata.name || projectId,
        url: repoResult.metadata.remoteUrl || 'N/A',
        branch: repoResult.metadata.defaultBranch || 'main',
      },

      // Summary statistics
      summary: {
        totalFiles: repoResult.fileStats.totalFiles,
        totalLines: repoResult.fileStats.totalLines,
        totalIssues: staticResult.summary.totalIssues,
        criticalIssues: stats.bySeverity[IssueSeverity.Critical] || 0,
        highIssues: stats.bySeverity[IssueSeverity.High] || 0,
        mediumIssues: stats.bySeverity[IssueSeverity.Medium] || 0,
        lowIssues: stats.bySeverity[IssueSeverity.Low] || 0,
      },

      // Language distribution
      languages: repoResult.techStack.languages
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5)
        .map(lang => ({
          name: lang.name,
          percentage: lang.percentage,
          lines: lang.lineCount,
        })),

      // Top issues
      securityIssues: staticResult.issues.slice(0, 10).map(issue => ({
        severity: issue.severity,
        category: issue.category,
        title: issue.message,
        description: issue.message,
        file: `${issue.file}:${issue.line}`,
        recommendation: issue.fixSuggestion || 'Review and fix manually',
      })),

      // Quality metrics
      qualityMetrics: [
        {
          name: 'Code Lines',
          value: repoResult.fileStats.codeLines,
          unit: 'lines',
          status: 'info',
        },
        {
          name: 'Comment Ratio',
          value: (repoResult.fileStats.commentLines / repoResult.fileStats.codeLines) * 100,
          unit: '%',
          status: 'good',
        },
        {
          name: 'Issues Found',
          value: staticResult.summary.totalIssues,
          unit: 'issues',
          status: staticResult.summary.totalIssues > 50 ? 'warning' : 'good',
        },
      ],

      // Recommendations
      recommendations: generateRecommendations(repoResult, staticResult, stats),
    };

    // Generate HTML report
    const htmlPath = path.join(outputDir, 'pipeline-audit-report.html');
    await reportGenerator.exportToHTML(reportConfig, htmlPath);
    logger.info(`✓ HTML report: ${htmlPath}`);

    // Generate Markdown report
    const mdPath = path.join(outputDir, 'pipeline-audit-report.md');
    await reportGenerator.exportToMarkdown(reportConfig, mdPath);
    logger.info(`✓ Markdown report: ${mdPath}`);

    // Step 6: Summary
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('Pipeline Summary');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    logger.info('Repository Analysis:');
    logger.info(`  Files Analyzed: ${repoResult.fileStats.totalFiles}`);
    logger.info(`  Total Lines: ${repoResult.fileStats.totalLines.toLocaleString()}`);
    logger.info(`  Languages: ${repoResult.techStack.languages.length}`);

    logger.info('\nStatic Analysis:');
    logger.info(`  Tools Executed: ${staticResult.summary.toolsExecuted.join(', ')}`);
    logger.info(`  Total Issues: ${staticResult.summary.totalIssues}`);
    logger.info(`  Duration: ${staticResult.summary.duration}ms`);

    logger.info('\nData Storage:');
    logger.info(`  Metrics Recorded: 5`);
    logger.info(`  Issues Stored: ${issueCount}`);
    logger.info(`  Database: ${dbPath}`);

    logger.info('\nGenerated Reports:');
    logger.info(`  HTML: ${htmlPath}`);
    logger.info(`  Markdown: ${mdPath}`);

    logger.info('\n✓ Full pipeline completed successfully!');
    logger.info('\nRun "npm run clean" to remove generated files and database.');

  } catch (error) {
    logger.error('\n✗ Pipeline failed:', error instanceof Error ? error.message : error);
    logger.error(error);
    process.exit(1);
  }
}

// Helper functions

function mapCategory(category: string): IssueCategory {
  const mapping: Record<string, IssueCategory> = {
    security: IssueCategory.Security,
    performance: IssueCategory.Performance,
    vulnerability: IssueCategory.Security,
    'code-quality': IssueCategory.CodeQuality,
    style: IssueCategory.CodeQuality,
  };

  return mapping[category.toLowerCase()] || IssueCategory.CodeQuality;
}

function mapSeverity(severity: string): IssueSeverity {
  const mapping: Record<string, IssueSeverity> = {
    critical: IssueSeverity.Critical,
    high: IssueSeverity.High,
    medium: IssueSeverity.Medium,
    low: IssueSeverity.Low,
    error: IssueSeverity.High,
    warning: IssueSeverity.Medium,
    info: IssueSeverity.Low,
  };

  return mapping[severity.toLowerCase()] || IssueSeverity.Low;
}

function generateRecommendations(
  repoResult: any,
  staticResult: any,
  stats: any
): any[] {
  const recommendations = [];

  // Critical issues recommendation
  if (stats.bySeverity[IssueSeverity.Critical] > 0) {
    recommendations.push({
      priority: 'high',
      title: `Fix ${stats.bySeverity[IssueSeverity.Critical]} critical issue(s)`,
      description: 'Critical issues require immediate attention',
      effort: 'Medium',
      impact: 'High',
    });
  }

  // Code quality recommendation
  if (staticResult.summary.totalIssues > 20) {
    recommendations.push({
      priority: 'medium',
      title: 'Improve overall code quality',
      description: `${staticResult.summary.totalIssues} issues detected. Consider running automated fixes.`,
      effort: 'Medium',
      impact: 'Medium',
    });
  }

  // Documentation recommendation
  const commentRatio = repoResult.fileStats.commentLines / repoResult.fileStats.codeLines;
  if (commentRatio < 0.1) {
    recommendations.push({
      priority: 'low',
      title: 'Add more code documentation',
      description: 'Comment ratio is below 10%. Consider adding JSDoc comments.',
      effort: 'Low',
      impact: 'Low',
    });
  }

  return recommendations;
}

// Run the example
main().catch((err) => logger.error(err));
