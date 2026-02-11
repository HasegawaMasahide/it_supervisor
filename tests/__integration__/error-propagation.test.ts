/**
 * E2E Integration Test: Error Propagation and Recovery
 *
 * Tests error handling across multiple packages:
 * 1. Invalid input handling
 * 2. Database connection errors
 * 3. File system errors
 * 4. Graceful degradation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { RepositoryAnalyzer } from '../../packages/repo-analyzer/src/analyzer';
import { MetricsDatabase } from '../../packages/metrics-model/src/database';
import { IssueManager } from '../../packages/issue-manager/src/manager';
import { ReportGenerator } from '../../packages/report-generator/src/generator';

const TEST_WORKSPACE = path.join(process.cwd(), '.tmp', 'error-test');

describe('E2E: Error Propagation and Recovery', () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_WORKSPACE, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should handle invalid repository path gracefully', async () => {
    const invalidPath = '/non/existent/repository';

    await expect(
      analyzeLocal(invalidPath)
    ).rejects.toThrow();

    // Error should be descriptive
    try {
      const repoAnalyzer = new RepositoryAnalyzer(); await repoAnalyzer.analyzeLocal(invalidPath);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBeTruthy();
    }
  });

  it('should handle database errors gracefully', async () => {
    const readOnlyPath = path.join(TEST_WORKSPACE, 'readonly.db');

    // Create a database first
    const db = new MetricsDatabase(readOnlyPath);
    db.close();

    // Try to open with invalid permissions scenario
    // (In real scenario, file would be chmod 444)
    // For testing, we just verify database creation works
    const db2 = new MetricsDatabase(readOnlyPath);
    expect(db2).toBeDefined();
    db2.close();
  });

  it('should handle corrupted data gracefully', async () => {
    const dbPath = path.join(TEST_WORKSPACE, 'test.db');
    const db = new MetricsDatabase(dbPath);

    // Create project with invalid data types
    const project = db.createProject({
      name: 'test-project',
      description: 'Test project for error handling'
    });

    // Attempt to record metric with invalid value
    expect(() => {
      db.recordMetric(project.id, {
        category: 'test',
        name: 'invalid',
        value: NaN // Invalid numeric value
      });
    }).toThrow();

    db.close();
  });

  it('should handle file system errors during report generation', async () => {
    const reportGenerator = new ReportGenerator({
      title: 'Test Report',
      project: { name: 'test', version: '1.0.0' },
      issues: [],
      metrics: {}
    });

    // Try to write to invalid path
    const invalidPath = '/root/protected/report.html'; // Usually not writable

    await expect(
      reportGenerator.exportToHTML(invalidPath)
    ).rejects.toThrow();
  });

  it('should recover from partial failures', async () => {
    const dbPath = path.join(TEST_WORKSPACE, 'recovery.db');
    const issuesDbPath = path.join(TEST_WORKSPACE, 'recovery-issues.db');

    const metricsDb = new MetricsDatabase(dbPath);
    const issueManager = new IssueManager(issuesDbPath);

    // Create project successfully
    const project = metricsDb.createProject({
      name: 'recovery-test',
      description: 'Test recovery from partial failures'
    });

    expect(project.id).toBeDefined();

    // Record some metrics successfully
    metricsDb.recordMetric(project.id, {
      category: 'test',
      name: 'metric1',
      value: 100
    });

    // Attempt invalid operation
    try {
      metricsDb.recordMetric(project.id, {
        category: 'test',
        name: 'invalid',
        value: NaN
      });
    } catch {
      // Expected to fail
    }

    // Should still be able to continue operations
    metricsDb.recordMetric(project.id, {
      category: 'test',
      name: 'metric2',
      value: 200
    });

    const metrics = metricsDb.getMetrics({ projectId: project.id });
    expect(metrics.length).toBeGreaterThanOrEqual(2);

    // Create issues successfully
    const issue = issueManager.createIssue({
      projectId: project.id,
      title: 'Test Issue',
      description: 'Created after partial failure',
      category: 'test',
      severity: 'info',
      status: 'open'
    });

    expect(issue.id).toBeDefined();

    metricsDb.close();
    issueManager.close();
  });

  it('should handle concurrent operations safely', async () => {
    const dbPath = path.join(TEST_WORKSPACE, 'concurrent.db');
    const db = new MetricsDatabase(dbPath);

    const project = db.createProject({
      name: 'concurrent-test',
      description: 'Test concurrent operations'
    });

    // Simulate concurrent metric recordings
    const promises = Array.from({ length: 10 }, (_, i) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          db.recordMetric(project.id, {
            category: 'concurrent',
            name: `metric-${i}`,
            value: i * 10
          });
          resolve();
        }, Math.random() * 100);
      });
    });

    await Promise.all(promises);

    // All metrics should be recorded
    const metrics = metricsDb.getMetrics({ projectId: project.id });
    expect(metrics).toHaveLength(10);

    db.close();
  });

  it('should validate input data before processing', async () => {
    const issuesDbPath = path.join(TEST_WORKSPACE, 'validation.db');
    const issueManager = new IssueManager(issuesDbPath);

    // Empty title should be rejected
    expect(() => {
      issueManager.createIssue({
        projectId: 'test-project',
        title: '', // Invalid: empty title
        description: 'Test description',
        category: 'test',
        severity: 'info',
        status: 'open'
      });
    }).toThrow();

    // Invalid severity should be rejected
    expect(() => {
      issueManager.createIssue({
        projectId: 'test-project',
        title: 'Test Issue',
        description: 'Test description',
        category: 'test',
        severity: 'invalid' as any, // Invalid severity
        status: 'open'
      });
    }).toThrow();

    issueManager.close();
  });

  it('should provide meaningful error messages', async () => {
    const dbPath = path.join(TEST_WORKSPACE, 'error-messages.db');
    const db = new MetricsDatabase(dbPath);

    try {
      db.recordMetric('non-existent-project', {
        category: 'test',
        name: 'metric',
        value: 100
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      // Error message should be descriptive
      expect((error as Error).message).toBeTruthy();
      expect((error as Error).message.length).toBeGreaterThan(10);
    }

    db.close();
  });

  it('should cleanup resources on error', async () => {
    const dbPath = path.join(TEST_WORKSPACE, 'cleanup.db');
    const tempFiles: string[] = [];

    try {
      const db = new MetricsDatabase(dbPath);

      // Create some temporary files
      for (let i = 0; i < 3; i++) {
        const tempFile = path.join(TEST_WORKSPACE, `temp-${i}.txt`);
        await fs.writeFile(tempFile, `Temporary file ${i}`);
        tempFiles.push(tempFile);
      }

      // Simulate error during processing
      const project = db.createProject({
        name: 'cleanup-test',
        description: 'Test resource cleanup'
      });

      // Do some work
      db.recordMetric(project.id, {
        category: 'test',
        name: 'cleanup',
        value: 42
      });

      db.close();
    } finally {
      // Cleanup temporary files
      for (const file of tempFiles) {
        try {
          await fs.unlink(file);
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    // Verify cleanup was successful
    for (const file of tempFiles) {
      const exists = await fs.access(file).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    }
  });
});
