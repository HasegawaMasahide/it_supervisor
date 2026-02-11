import { IssueManager, IssueCategory, IssueSeverity, IssueStatus } from '@it-supervisor/issue-manager';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('=== Issue Tracking Example ===\n');

  // 1. Initialize the issue manager
  const dbPath = path.join(__dirname, '../issues.db');
  const manager = new IssueManager(dbPath);

  const projectId = 'example-project-001';

  try {
    // 2. Create sample issues
    console.log('Step 1: Creating sample issues...\n');

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

    console.log(`✓ Created issue #${issue1.id}: ${issue1.title}`);

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

    console.log(`✓ Created issue #${issue2.id}: ${issue2.title}`);

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

    console.log(`✓ Created issue #${issue3.id}: ${issue3.title}`);

    // 3. Add comments to an issue
    console.log('\nStep 2: Adding comments...\n');

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

    console.log(`✓ Added comments to issue #${issue1.id}`);

    // 4. Search and filter issues
    console.log('\nStep 3: Searching and filtering issues...\n');

    const criticalIssues = manager.searchIssues({
      projectId,
      severity: [IssueSeverity.Critical],
    });

    console.log(`Found ${criticalIssues.length} critical issue(s):`);
    criticalIssues.forEach(issue => {
      console.log(`  - #${issue.id}: ${issue.title}`);
    });

    const securityIssues = manager.searchIssues({
      projectId,
      keyword: 'security',
    });

    console.log(`\nFound ${securityIssues.length} issue(s) related to security:`);
    securityIssues.forEach(issue => {
      console.log(`  - #${issue.id}: ${issue.title} [${issue.severity}]`);
    });

    // 5. Update issue status
    console.log('\nStep 4: Updating issue status...\n');

    manager.updateIssue(issue3.id!, {
      status: IssueStatus.InProgress,
      assignee: 'john-doe',
    });

    console.log(`✓ Updated issue #${issue3.id} status to: ${IssueStatus.InProgress}`);

    // 6. Get statistics
    console.log('\nStep 5: Getting statistics...\n');

    const stats = manager.getStatistics(projectId);

    console.log('Project Statistics:');
    console.log(`  Total Issues: ${stats.total}`);
    console.log(`  By Status:`);
    console.log(`    - Open: ${stats.byStatus[IssueStatus.Open] || 0}`);
    console.log(`    - In Progress: ${stats.byStatus[IssueStatus.InProgress] || 0}`);
    console.log(`    - Resolved: ${stats.byStatus[IssueStatus.Resolved] || 0}`);
    console.log(`  By Severity:`);
    console.log(`    - Critical: ${stats.bySeverity[IssueSeverity.Critical] || 0}`);
    console.log(`    - High: ${stats.bySeverity[IssueSeverity.High] || 0}`);
    console.log(`    - Medium: ${stats.bySeverity[IssueSeverity.Medium] || 0}`);
    console.log(`    - Low: ${stats.bySeverity[IssueSeverity.Low] || 0}`);

    // 7. Get high priority issues
    console.log('\nStep 6: Getting high priority issues...\n');

    const highPriorityIssues = manager.getHighPriorityIssues(projectId, 5);

    console.log('Top Priority Issues:');
    highPriorityIssues.forEach((issue, index) => {
      const priority = manager.calculatePriority(issue);
      console.log(`  ${index + 1}. [Priority: ${priority}] ${issue.title}`);
      console.log(`     Severity: ${issue.severity}, Category: ${issue.category}`);
    });

    // 8. Export to CSV
    console.log('\nStep 7: Exporting issues to CSV...\n');

    const csv = manager.exportToCSV(projectId);
    console.log('CSV Export (first 300 characters):');
    console.log(csv.substring(0, 300) + '...\n');

    // 9. Get issue with comments
    console.log('Step 8: Retrieving issue with comments...\n');

    const issueWithComments = manager.getIssue(issue1.id!);
    const comments = manager.getComments(issue1.id!);

    console.log(`Issue #${issueWithComments?.id}: ${issueWithComments?.title}`);
    console.log(`Comments (${comments.length}):`);
    comments.forEach((comment, index) => {
      console.log(`  ${index + 1}. [${comment.author}] ${comment.content}`);
    });

    console.log('\n✓ Issue tracking example completed successfully');
    console.log(`\nDatabase stored at: ${dbPath}`);
    console.log('Run "npm run clean" to remove the database file.');

  } catch (error) {
    console.error('\n✗ Issue tracking failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
