import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';
import { StaticAnalyzer } from '@it-supervisor/static-analyzer';
import { IssueManager, IssueCategory, IssueSeverity } from '@it-supervisor/issue-manager';
import { MetricsDatabase } from '@it-supervisor/metrics-model';
import { ReportGenerator } from '@it-supervisor/report-generator';
import { LogLevel } from '@it-supervisor/logger';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('=== Full IT Audit Pipeline Example ===\n');
  console.log('This example demonstrates a complete audit workflow:\n');
  console.log('  1. Analyze repository structure and codebase');
  console.log('  2. Run static analysis to find issues');
  console.log('  3. Store issues and metrics in databases');
  console.log('  4. Generate comprehensive audit report\n');

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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 1: Analyzing Repository');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const repoResult = await repoAnalyzer.analyzeLocal(projectPath, {
      maxFiles: 500,
      excludePatterns: ['node_modules', '.git', 'dist', 'coverage'],
      calculateComplexity: true,
    });

    console.log(`✓ Analyzed ${repoResult.fileStats.totalFiles} files`);
    console.log(`  Languages: ${repoResult.techStack.languages.map(l => l.name).join(', ')}`);
    console.log(`  Total Lines: ${repoResult.fileStats.totalLines.toLocaleString()}`);

    // Step 2: Static Analysis
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 2: Running Static Analysis');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const staticResult = await staticAnalyzer.analyze(projectPath, {
      tools: ['eslint'], // Use only ESLint for this example
      includePatterns: ['**/*.ts'],
      excludePatterns: ['**/node_modules/**', '**/dist/**', '**/__tests__/**'],
    });

    console.log(`✓ Analysis completed in ${staticResult.summary.duration}ms`);
    console.log(`  Tools: ${staticResult.summary.toolsExecuted.join(', ')}`);
    console.log(`  Issues Found: ${staticResult.summary.totalIssues}`);

    // Step 3: Store Metrics
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 3: Storing Metrics');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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

    console.log(`✓ Recorded 5 metrics for project "${project.name}"`);

    // Step 4: Store Issues
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 4: Storing Issues');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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

    console.log(`✓ Stored ${issueCount} issues in database`);

    // Step 5: Generate Report
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 5: Generating Audit Report');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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
    console.log(`✓ HTML report: ${htmlPath}`);

    // Generate Markdown report
    const mdPath = path.join(outputDir, 'pipeline-audit-report.md');
    await reportGenerator.exportToMarkdown(reportConfig, mdPath);
    console.log(`✓ Markdown report: ${mdPath}`);

    // Step 6: Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Pipeline Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Repository Analysis:');
    console.log(`  Files Analyzed: ${repoResult.fileStats.totalFiles}`);
    console.log(`  Total Lines: ${repoResult.fileStats.totalLines.toLocaleString()}`);
    console.log(`  Languages: ${repoResult.techStack.languages.length}`);

    console.log('\nStatic Analysis:');
    console.log(`  Tools Executed: ${staticResult.summary.toolsExecuted.join(', ')}`);
    console.log(`  Total Issues: ${staticResult.summary.totalIssues}`);
    console.log(`  Duration: ${staticResult.summary.duration}ms`);

    console.log('\nData Storage:');
    console.log(`  Metrics Recorded: 5`);
    console.log(`  Issues Stored: ${issueCount}`);
    console.log(`  Database: ${dbPath}`);

    console.log('\nGenerated Reports:');
    console.log(`  HTML: ${htmlPath}`);
    console.log(`  Markdown: ${mdPath}`);

    console.log('\n✓ Full pipeline completed successfully!');
    console.log('\nRun "npm run clean" to remove generated files and database.');

  } catch (error) {
    console.error('\n✗ Pipeline failed:', error instanceof Error ? error.message : error);
    console.error(error);
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
main().catch(console.error);
