import { IssueManager, IssueCategory, IssueSeverity, IssueStatus } from '@it-supervisor/issue-manager';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger({ name: 'example', level: LogLevel.INFO });

async function main() {
  logger.info('=== Issue Tracking Example ===\n');

  // 1. Initialize the issue manager
  const dbPath = path.join(__dirname, '../issues.db');
  const manager = new IssueManager(dbPath);

  const projectId = 'example-project-001';

  try {
    // 2. Create sample issues
    logger.info('Step 1: Creating sample issues...\n');

    const issue1 = manager.createIssue({
      projectId,
      title: 'Security vulnerability in lodash dependency',
      description: 'CVE-2020-8203: Prototype pollution in lodash before 4.17.21',
      category: IssueCategory.Security,
      severity: IssueSeverity.Critical,
      source: 'snyk',
      file: 'package.json',
      line: 15,
      column: 5,
      ruleId: 'CVE-2020-8203',
      tags: ['security', 'dependency', 'cve'],
    });

    logger.info(`✓ Created issue #${issue1.id}: ${issue1.title}`);

    const issue2 = manager.createIssue({
      projectId,
      title: 'Missing input validation in user API',
      description: 'User input is not validated before database query, potential SQL injection',
      category: IssueCategory.CodeQuality,
      severity: IssueSeverity.High,
      source: 'static-analyzer',
      file: 'src/api/users.ts',
      line: 42,
      assignee: 'dev-team',
      tags: ['security', 'validation', 'api'],
    });

    logger.info(`✓ Created issue #${issue2.id}: ${issue2.title}`);

    const issue3 = manager.createIssue({
      projectId,
      title: 'Code complexity exceeds threshold',
      description: 'Function "processUserData" has cyclomatic complexity of 25 (threshold: 10)',
      category: IssueCategory.CodeQuality,
      severity: IssueSeverity.Medium,
      source: 'repo-analyzer',
      file: 'src/utils/data-processor.ts',
      line: 128,
      tags: ['complexity', 'refactoring'],
    });

    logger.info(`✓ Created issue #${issue3.id}: ${issue3.title}`);

    // 3. Add comments to an issue
    logger.info('\nStep 2: Adding comments...\n');

    manager.addComment({
      issueId: issue1.id!,
      author: 'security-bot',
      content: 'Automated fix available: Update lodash to version 4.17.21 or higher',
    });

    manager.addComment({
      issueId: issue1.id!,
      author: 'developer',
      content: 'Acknowledged. Will update dependency in the next sprint.',
    });

    logger.info(`✓ Added comments to issue #${issue1.id}`);

    // 4. Search and filter issues
    logger.info('\nStep 3: Searching and filtering issues...\n');

    const criticalIssues = manager.searchIssues({
      projectId,
      severity: [IssueSeverity.Critical],
    });

    logger.info(`Found ${criticalIssues.length} critical issue(s):`);
    criticalIssues.forEach(issue => {
      logger.info(`  - #${issue.id}: ${issue.title}`);
    });

    const securityIssues = manager.searchIssues({
      projectId,
      keyword: 'security',
    });

    logger.info(`\nFound ${securityIssues.length} issue(s) related to security:`);
    securityIssues.forEach(issue => {
      logger.info(`  - #${issue.id}: ${issue.title} [${issue.severity}]`);
    });

    // 5. Update issue status
    logger.info('\nStep 4: Updating issue status...\n');

    manager.updateIssue(issue3.id!, {
      status: IssueStatus.InProgress,
      assignee: 'john-doe',
    });

    logger.info(`✓ Updated issue #${issue3.id} status to: ${IssueStatus.InProgress}`);

    // 6. Get statistics
    logger.info('\nStep 5: Getting statistics...\n');

    const stats = manager.getStatistics(projectId);

    logger.info('Project Statistics:');
    logger.info(`  Total Issues: ${stats.total}`);
    logger.info(`  By Status:`);
    logger.info(`    - Open: ${stats.byStatus[IssueStatus.Open] || 0}`);
    logger.info(`    - In Progress: ${stats.byStatus[IssueStatus.InProgress] || 0}`);
    logger.info(`    - Resolved: ${stats.byStatus[IssueStatus.Resolved] || 0}`);
    logger.info(`  By Severity:`);
    logger.info(`    - Critical: ${stats.bySeverity[IssueSeverity.Critical] || 0}`);
    logger.info(`    - High: ${stats.bySeverity[IssueSeverity.High] || 0}`);
    logger.info(`    - Medium: ${stats.bySeverity[IssueSeverity.Medium] || 0}`);
    logger.info(`    - Low: ${stats.bySeverity[IssueSeverity.Low] || 0}`);

    // 7. Get high priority issues
    logger.info('\nStep 6: Getting high priority issues...\n');

    const highPriorityIssues = manager.getHighPriorityIssues(projectId, 5);

    logger.info('Top Priority Issues:');
    highPriorityIssues.forEach((issue, index) => {
      const priority = manager.calculatePriority(issue);
      logger.info(`  ${index + 1}. [Priority: ${priority}] ${issue.title}`);
      logger.info(`     Severity: ${issue.severity}, Category: ${issue.category}`);
    });

    // 8. Export to CSV
    logger.info('\nStep 7: Exporting issues to CSV...\n');

    const csv = manager.exportToCSV(projectId);
    logger.info('CSV Export (first 300 characters):');
    logger.info(csv.substring(0, 300) + '...\n');

    // 9. Get issue with comments
    logger.info('Step 8: Retrieving issue with comments...\n');

    const issueWithComments = manager.getIssue(issue1.id!);
    const comments = manager.getComments(issue1.id!);

    logger.info(`Issue #${issueWithComments?.id}: ${issueWithComments?.title}`);
    logger.info(`Comments (${comments.length}):`);
    comments.forEach((comment, index) => {
      logger.info(`  ${index + 1}. [${comment.author}] ${comment.content}`);
    });

    logger.info('\n✓ Issue tracking example completed successfully');
    logger.info(`\nDatabase stored at: ${dbPath}`);
    logger.info('Run "npm run clean" to remove the database file.');

  } catch (error) {
    logger.error('\n✗ Issue tracking failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the example
main().catch((err) => logger.error(err));
