/**
 * E2E Integration Test: Performance and Scalability
 *
 * Tests system behavior under load:
 * 1. Large repository analysis
 * 2. High volume metric storage
 * 3. Bulk report generation
 * 4. Memory usage monitoring
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { RepositoryAnalyzer } from '../../packages/repo-analyzer/src/analyzer';
import { MetricsDatabase } from '../../packages/metrics-model/src/database';
import { IssueManager } from '../../packages/issue-manager/src/manager';
import { ReportGenerator } from '../../packages/report-generator/src/generator';

const TEST_WORKSPACE = path.join(process.cwd(), '.tmp', 'performance-test');
const LARGE_REPO = path.join(TEST_WORKSPACE, 'large-repo');

describe('E2E: Performance and Scalability', () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_WORKSPACE, { recursive: true });
    await fs.mkdir(LARGE_REPO, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should handle repository with 100 files efficiently', async () => {
    console.log('Creating test repository with 100 files...');

    // Create 100 TypeScript files
    const fileCreationPromises = Array.from({ length: 100 }, async (_, i) => {
      const fileContent = `
// File ${i}
export function function${i}(x: number): number {
  const result = x * ${i};
  return result;
}

export class Class${i} {
  private value: number;

  constructor(value: number) {
    this.value = value;
  }

  public getValue(): number {
    return this.value;
  }

  public setValue(newValue: number): void {
    this.value = newValue;
  }
}
`;
      await fs.writeFile(path.join(LARGE_REPO, `file${i}.ts`), fileContent);
    });

    await Promise.all(fileCreationPromises);

    // Analyze repository and measure time
    const startTime = Date.now();
    const repoAnalyzer = new RepositoryAnalyzer(); const analysis = await repoAnalyzer.analyzeLocal(LARGE_REPO);
    const duration = Date.now() - startTime;

    console.log(`Analysis completed in ${duration}ms`);

    expect(analysis.summary.totalFiles).toBe(100);
    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
  }, 30000); // 30 second timeout

  it('should handle high volume metric storage', async () => {
    const dbPath = path.join(TEST_WORKSPACE, 'high-volume.db');
    const db = new MetricsDatabase(dbPath);

    const project = db.createProject({
      name: 'high-volume-test',
      description: 'Test high volume metric storage'
    });

    console.log('Recording 1000 metrics...');

    const startTime = Date.now();

    // Record 1000 metrics in batches
    const batchSize = 100;
    const totalMetrics = 1000;

    for (let batch = 0; batch < totalMetrics / batchSize; batch++) {
      const metrics = Array.from({ length: batchSize }, (_, i) => ({
        category: 'performance',
        name: `metric-${batch * batchSize + i}`,
        value: Math.random() * 100
      }));

      db.recordMetrics(project.id, metrics);
    }

    const duration = Date.now() - startTime;
    console.log(`Recorded 1000 metrics in ${duration}ms`);

    // Verify all metrics were stored
    const allMetrics = db.getMetrics({ projectId: project.id });
    expect(allMetrics).toHaveLength(totalMetrics);

    // Should complete within 5 seconds
    expect(duration).toBeLessThan(5000);

    db.close();
  }, 15000); // 15 second timeout

  it('should handle bulk issue creation', async () => {
    const issuesDbPath = path.join(TEST_WORKSPACE, 'bulk-issues.db');
    const issueManager = new IssueManager(issuesDbPath);

    const projectId = 'bulk-test-project';
    console.log('Creating 500 issues...');

    const startTime = Date.now();

    // Create 500 issues
    const issues = Array.from({ length: 500 }, (_, i) => {
      return issueManager.createIssue({
        projectId,
        title: `Issue ${i}`,
        description: `Description for issue ${i}`,
        category: ['security', 'code-quality', 'performance'][i % 3] as any,
        severity: ['critical', 'high', 'medium', 'low', 'info'][i % 5] as any,
        status: 'open'
      });
    });

    const duration = Date.now() - startTime;
    console.log(`Created 500 issues in ${duration}ms`);

    expect(issues).toHaveLength(500);
    expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

    // Search performance
    const searchStart = Date.now();
    const searchResults = issueManager.searchIssues({ projectId });
    const searchDuration = Date.now() - searchStart;

    console.log(`Search completed in ${searchDuration}ms`);
    expect(searchResults).toHaveLength(500);
    expect(searchDuration).toBeLessThan(1000); // Search should be fast

    issueManager.close();
  }, 15000); // 15 second timeout

  it('should generate large reports efficiently', async () => {
    console.log('Generating report with 500 issues...');

    // Create 500 mock issues
    const issues = Array.from({ length: 500 }, (_, i) => ({
      id: String(i + 1),
      title: `Issue ${i + 1}`,
      severity: ['critical', 'high', 'medium', 'low', 'info'][i % 5] as any,
      category: 'code-quality' as any,
      message: `This is issue number ${i + 1} with some description text`
    }));

    const reportGenerator = new ReportGenerator({
      title: 'Large Performance Test Report',
      project: {
        name: 'performance-test',
        version: '1.0.0',
        description: 'Performance testing with large dataset'
      },
      issues,
      metrics: {
        totalIssues: 500,
        criticalIssues: 100,
        highIssues: 100,
        mediumIssues: 100,
        lowIssues: 100,
        infoIssues: 100
      }
    });

    const outputPath = path.join(TEST_WORKSPACE, 'large-report.html');

    const startTime = Date.now();
    await reportGenerator.exportToHTML(outputPath);
    const duration = Date.now() - startTime;

    console.log(`Report generated in ${duration}ms`);

    // Verify report was created
    const stats = await fs.stat(outputPath);
    expect(stats.size).toBeGreaterThan(0);

    // Should complete within 5 seconds
    expect(duration).toBeLessThan(5000);

    // Read and verify report content
    const content = await fs.readFile(outputPath, 'utf-8');
    expect(content).toContain('Large Performance Test Report');
    expect(content).toContain('500'); // Total issues count
  }, 15000); // 15 second timeout

  it('should handle memory efficiently with large datasets', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Create large dataset
    const dbPath = path.join(TEST_WORKSPACE, 'memory-test.db');
    const db = new MetricsDatabase(dbPath);

    const project = db.createProject({
      name: 'memory-test',
      description: 'Test memory efficiency'
    });

    // Record 10000 metrics
    for (let batch = 0; batch < 100; batch++) {
      const metrics = Array.from({ length: 100 }, (_, i) => ({
        category: 'memory',
        name: `metric-${batch * 100 + i}`,
        value: Math.random() * 1000
      }));

      db.recordMetrics(project.id, metrics);
    }

    db.close();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

    console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);

    // Memory increase should be reasonable (less than 100 MB)
    expect(memoryIncrease).toBeLessThan(100);
  }, 30000); // 30 second timeout

  it('should support pagination for large result sets', async () => {
    const issuesDbPath = path.join(TEST_WORKSPACE, 'pagination.db');
    const issueManager = new IssueManager(issuesDbPath);

    const projectId = 'pagination-test';

    // Create 300 issues
    for (let i = 0; i < 300; i++) {
      issueManager.createIssue({
        projectId,
        title: `Issue ${i}`,
        description: `Description ${i}`,
        category: 'test',
        severity: 'info',
        status: 'open'
      });
    }

    // Test pagination
    const page1 = issueManager.searchIssues({ projectId }, { limit: 50, offset: 0 });
    const page2 = issueManager.searchIssues({ projectId }, { limit: 50, offset: 50 });
    const page3 = issueManager.searchIssues({ projectId }, { limit: 50, offset: 100 });

    expect(page1).toHaveLength(50);
    expect(page2).toHaveLength(50);
    expect(page3).toHaveLength(50);

    // Pages should contain different issues
    expect(page1[0].id).not.toBe(page2[0].id);
    expect(page2[0].id).not.toBe(page3[0].id);

    issueManager.close();
  }, 20000); // 20 second timeout

  it('should handle concurrent database operations', async () => {
    const dbPath = path.join(TEST_WORKSPACE, 'concurrent-ops.db');
    const db = new MetricsDatabase(dbPath);

    const project = db.createProject({
      name: 'concurrent-ops',
      description: 'Test concurrent operations'
    });

    // Simulate concurrent reads and writes
    const operations = Array.from({ length: 50 }, (_, i) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          if (i % 2 === 0) {
            // Write operation
            db.recordMetric(project.id, {
              category: 'concurrent',
              name: `metric-${i}`,
              value: i
            });
          } else {
            // Read operation
            db.getMetrics({ projectId: project.id });
          }
          resolve();
        }, Math.random() * 100);
      });
    });

    const startTime = Date.now();
    await Promise.all(operations);
    const duration = Date.now() - startTime;

    console.log(`50 concurrent operations completed in ${duration}ms`);

    // All write operations should have succeeded
    const metrics = db.getMetrics({ projectId: project.id });
    expect(metrics.length).toBeGreaterThanOrEqual(25); // At least 25 writes

    db.close();
  }, 15000); // 15 second timeout
});
