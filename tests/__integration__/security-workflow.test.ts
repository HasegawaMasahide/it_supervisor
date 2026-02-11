/**
 * E2E Integration Test: Security Audit Workflow
 *
 * Tests security-focused workflow:
 * 1. Scan for vulnerabilities (static-analyzer with security tools)
 * 2. Store security metrics (metrics-model)
 * 3. Generate security report (report-generator)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { MetricsDatabase } from '../../packages/metrics-model/src/database';
import { ReportGenerator } from '../../packages/report-generator/src/generator';

const TEST_WORKSPACE = path.join(process.cwd(), '.tmp', 'security-test');
const TEST_REPO = path.join(TEST_WORKSPACE, 'vulnerable-repo');
const TEST_DB = path.join(TEST_WORKSPACE, 'security.db');
const TEST_OUTPUT = path.join(TEST_WORKSPACE, 'output');

describe('E2E: Security Audit Workflow', () => {
  let metricsDb: MetricsDatabase;

  beforeAll(async () => {
    // Create test workspace
    await fs.mkdir(TEST_WORKSPACE, { recursive: true });
    await fs.mkdir(TEST_REPO, { recursive: true });
    await fs.mkdir(TEST_OUTPUT, { recursive: true });

    // Create a repository with potential security issues
    await fs.writeFile(
      path.join(TEST_REPO, 'auth.ts'),
      `import * as crypto from 'crypto';

// Weak encryption (potential security issue)
export function encryptPassword(password: string): string {
  const cipher = crypto.createCipher('des', 'weak-secret-key');
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Hardcoded credentials (security issue)
export const API_KEY = 'sk_test_1234567890abcdef';
export const DATABASE_PASSWORD = 'admin123';

// SQL injection risk
export function getUserById(id: string): string {
  return \`SELECT * FROM users WHERE id = '\${id}'\`;
}
`
    );

    await fs.writeFile(
      path.join(TEST_REPO, 'package.json'),
      JSON.stringify({
        name: 'vulnerable-app',
        version: '1.0.0',
        dependencies: {
          // Intentionally old package with known vulnerabilities
          'lodash': '^4.17.0'
        }
      }, null, 2)
    );

    // Initialize database
    metricsDb = new MetricsDatabase(TEST_DB);
  });

  afterAll(async () => {
    // Cleanup
    metricsDb?.close();

    try {
      await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should detect and report security issues', async () => {
    // Step 1: Simulate security scan results
    console.log('Step 1: Simulating security scan...');

    // Mock security findings (in real scenario, these would come from static-analyzer)
    const securityFindings = [
      {
        severity: 'critical',
        category: 'security',
        title: 'Hardcoded API Key',
        description: 'API key found in source code',
        file: 'auth.ts',
        line: 12,
        rule: 'no-hardcoded-credentials'
      },
      {
        severity: 'high',
        category: 'security',
        title: 'Weak Encryption Algorithm',
        description: 'DES algorithm is deprecated and weak',
        file: 'auth.ts',
        line: 5,
        rule: 'no-weak-crypto'
      },
      {
        severity: 'high',
        category: 'security',
        title: 'SQL Injection Risk',
        description: 'Unsanitized string concatenation in SQL query',
        file: 'auth.ts',
        line: 17,
        rule: 'no-sql-injection'
      }
    ];

    expect(securityFindings).toHaveLength(3);
    expect(securityFindings.filter(f => f.severity === 'critical')).toHaveLength(1);
    expect(securityFindings.filter(f => f.severity === 'high')).toHaveLength(2);

    // Step 2: Store security metrics
    console.log('Step 2: Storing security metrics...');
    const project = metricsDb.createProject({
      name: 'vulnerable-app',
      description: 'Security audit test project',
      metadata: { type: 'security-test' }
    });

    metricsDb.recordMetric(project.id, {
      category: 'security',
      name: 'critical_vulnerabilities',
      value: securityFindings.filter(f => f.severity === 'critical').length,
      unit: 'issues'
    });

    metricsDb.recordMetric(project.id, {
      category: 'security',
      name: 'high_vulnerabilities',
      value: securityFindings.filter(f => f.severity === 'high').length,
      unit: 'issues'
    });

    metricsDb.recordMetric(project.id, {
      category: 'security',
      name: 'security_score',
      value: 45, // 0-100 scale
      unit: 'score'
    });

    const metrics = metricsDb.getMetrics({ projectId: project.id });
    expect(metrics).toHaveLength(3);

    // Step 3: Generate security report
    console.log('Step 3: Generating security report...');
    const reportGenerator = new ReportGenerator({
      title: 'Security Audit Report',
      project: {
        name: 'vulnerable-app',
        version: '1.0.0',
        description: 'Security vulnerability assessment'
      },
      issues: securityFindings.map((finding, index) => ({
        id: String(index + 1),
        title: finding.title,
        severity: finding.severity,
        category: finding.category,
        file: finding.file,
        line: finding.line,
        message: finding.description
      })),
      metrics: {
        totalIssues: securityFindings.length,
        criticalIssues: securityFindings.filter(f => f.severity === 'critical').length,
        highIssues: securityFindings.filter(f => f.severity === 'high').length,
        securityScore: 45
      }
    });

    const htmlOutput = path.join(TEST_OUTPUT, 'security-report.html');
    await reportGenerator.exportToHTML(htmlOutput);

    // Verify report was generated
    const reportExists = await fs.access(htmlOutput).then(() => true).catch(() => false);
    expect(reportExists).toBe(true);

    const reportContent = await fs.readFile(htmlOutput, 'utf-8');
    expect(reportContent).toContain('Security Audit Report');
    expect(reportContent).toContain('vulnerable-app');
    expect(reportContent).toContain('Hardcoded API Key');
    expect(reportContent).toContain('SQL Injection Risk');

    console.log('✅ Security workflow completed successfully!');
  }, 20000); // 20 second timeout

  it('should track security improvements over time', async () => {
    const project = metricsDb.createProject({
      name: 'security-tracking',
      description: 'Track security improvements'
    });

    // Initial scan (many vulnerabilities)
    metricsDb.recordMetric(project.id, {
      category: 'security',
      name: 'total_vulnerabilities',
      value: 10
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    // After fixes (fewer vulnerabilities)
    metricsDb.recordMetric(project.id, {
      category: 'security',
      name: 'total_vulnerabilities',
      value: 3
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    // After more fixes (even fewer)
    metricsDb.recordMetric(project.id, {
      category: 'security',
      name: 'total_vulnerabilities',
      value: 0
    });

    // Analyze improvement trend
    const metrics = metricsDb.getMetrics({
      projectId: project.id,
      category: 'security',
      name: 'total_vulnerabilities'
    });

    expect(metrics).toHaveLength(3);
    expect(metrics[0].value).toBe(0); // Latest: all fixed
    expect(metrics[1].value).toBe(3); // Middle: partially fixed
    expect(metrics[2].value).toBe(10); // Oldest: initial state

    // Calculate improvement percentage
    const improvement = ((metrics[2].value - metrics[0].value) / metrics[2].value) * 100;
    expect(improvement).toBe(100); // 100% improvement
  });

  it('should categorize security issues by severity', async () => {
    const project = metricsDb.createProject({
      name: 'severity-categorization',
      description: 'Test severity categorization'
    });

    // Record metrics by severity
    metricsDb.recordMetrics(project.id, [
      { category: 'security', name: 'critical', value: 2 },
      { category: 'security', name: 'high', value: 5 },
      { category: 'security', name: 'medium', value: 8 },
      { category: 'security', name: 'low', value: 3 }
    ]);

    const allMetrics = metricsDb.getMetrics({ projectId: project.id });
    expect(allMetrics).toHaveLength(4);

    // Calculate total risk score (weighted by severity)
    const weights = { critical: 10, high: 5, medium: 2, low: 1 };
    const riskScore = allMetrics.reduce((score, metric) => {
      const weight = weights[metric.name as keyof typeof weights] || 0;
      return score + (metric.value * weight);
    }, 0);

    expect(riskScore).toBe(2 * 10 + 5 * 5 + 8 * 2 + 3 * 1); // 20 + 25 + 16 + 3 = 64
  });
});
