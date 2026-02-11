import { ReportGenerator } from '@it-supervisor/report-generator';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger({ name: 'example', level: LogLevel.INFO });

async function main() {
  logger.info('=== Report Generation Example ===\n');

  // 1. Initialize the generator
  const generator = new ReportGenerator();

  // Create output directory
  const outputDir = path.join(__dirname, '../output');
  await fs.mkdir(outputDir, { recursive: true });

  try {
    // 2. Define sample data for the report
    const reportConfig = {
      title: 'IT Asset Audit Report',
      subtitle: 'Comprehensive Security and Quality Analysis',
      author: 'IT Supervisor Tools',
      date: new Date().toISOString().split('T')[0],
      version: '1.0.0',

      // Summary statistics
      summary: {
        totalFiles: 1250,
        totalLines: 45678,
        totalIssues: 47,
        criticalIssues: 3,
        highIssues: 12,
        mediumIssues: 18,
        lowIssues: 14,
      },

      // Languages detected
      languages: [
        { name: 'TypeScript', percentage: 78.5, lines: 35847 },
        { name: 'JavaScript', percentage: 15.2, lines: 6943 },
        { name: 'JSON', percentage: 4.1, lines: 1872 },
        { name: 'Markdown', percentage: 2.2, lines: 1005 },
      ],

      // Security findings
      securityIssues: [
        {
          severity: 'critical',
          category: 'Vulnerability',
          title: 'Outdated dependency with known CVE',
          description: 'Package "lodash" v4.17.15 has known security vulnerability CVE-2020-8203',
          file: 'package.json',
          recommendation: 'Update to lodash@4.17.21 or higher',
        },
        {
          severity: 'high',
          category: 'Security',
          title: 'Hardcoded API key detected',
          description: 'API key found in source code',
          file: 'src/config.ts:15',
          recommendation: 'Move sensitive data to environment variables',
        },
        {
          severity: 'medium',
          category: 'Best Practice',
          title: 'Missing input validation',
          description: 'User input is not validated before database query',
          file: 'src/api/users.ts:42',
          recommendation: 'Implement input validation and sanitization',
        },
      ],

      // Quality metrics
      qualityMetrics: [
        { name: 'Test Coverage', value: 83.7, unit: '%', status: 'good' },
        { name: 'Code Complexity', value: 8.2, unit: 'avg', status: 'good' },
        { name: 'Duplicate Code', value: 3.5, unit: '%', status: 'excellent' },
        { name: 'Technical Debt', value: 2.3, unit: 'days', status: 'good' },
      ],

      // Recommendations
      recommendations: [
        {
          priority: 'high',
          title: 'Update vulnerable dependencies',
          description: 'Update 3 packages with known security vulnerabilities',
          effort: 'Low',
          impact: 'High',
        },
        {
          priority: 'medium',
          title: 'Improve test coverage',
          description: 'Add tests for uncovered modules (repo-analyzer: 65%, static-analyzer: 69%)',
          effort: 'Medium',
          impact: 'Medium',
        },
        {
          priority: 'low',
          title: 'Refactor large files',
          description: 'Split files larger than 1000 lines into smaller modules',
          effort: 'High',
          impact: 'Low',
        },
      ],
    };

    // 3. Generate HTML report
    logger.info('Generating HTML report...');
    const htmlOutput = path.join(outputDir, 'audit-report.html');
    await generator.exportToHTML(reportConfig, htmlOutput);
    logger.info(`✓ HTML report generated: ${htmlOutput}`);

    // 4. Generate Markdown report
    logger.info('\nGenerating Markdown report...');
    const mdOutput = path.join(outputDir, 'audit-report.md');
    await generator.exportToMarkdown(reportConfig, mdOutput);
    logger.info(`✓ Markdown report generated: ${mdOutput}`);

    // 5. Generate PDF report (with fallback to HTML)
    logger.info('\nGenerating PDF report...');
    const pdfOutput = path.join(outputDir, 'audit-report.pdf');

    try {
      await generator.exportToPDF(reportConfig, pdfOutput);
      logger.info(`✓ PDF report generated: ${pdfOutput}`);
    } catch (error) {
      logger.info(`⚠ PDF generation failed (Puppeteer not configured), HTML saved instead`);
      logger.info(`  Note: Install system dependencies for PDF generation in production`);
    }

    // 6. Generate report with charts
    logger.info('\nGenerating enhanced report with charts...');

    const chartData = generator.generateChartData(reportConfig, {
      includeLanguages: true,
      includeSeverity: true,
      includeMetrics: true,
    });

    const htmlWithCharts = generator.generateHTMLWithCharts(reportConfig, chartData);
    const htmlChartsOutput = path.join(outputDir, 'audit-report-with-charts.html');
    await fs.writeFile(htmlChartsOutput, htmlWithCharts, 'utf-8');
    logger.info(`✓ Enhanced HTML report with charts generated: ${htmlChartsOutput}`);

    // 7. Display summary
    logger.info('\n=== Report Summary ===\n');
    logger.info(`Title: ${reportConfig.title}`);
    logger.info(`Date: ${reportConfig.date}`);
    logger.info(`Total Issues: ${reportConfig.summary.totalIssues}`);
    logger.info(`  - Critical: ${reportConfig.summary.criticalIssues}`);
    logger.info(`  - High: ${reportConfig.summary.highIssues}`);
    logger.info(`  - Medium: ${reportConfig.summary.mediumIssues}`);
    logger.info(`  - Low: ${reportConfig.summary.lowIssues}`);

    logger.info('\nGenerated Files:');
    logger.info(`  - ${htmlOutput}`);
    logger.info(`  - ${mdOutput}`);
    logger.info(`  - ${htmlChartsOutput}`);

    logger.info('\n✓ Report generation completed successfully');
    logger.info(`\nOpen the HTML files in your browser to view the reports.`);

  } catch (error) {
    logger.error('\n✗ Report generation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the example
main().catch((err) => logger.error(err));
