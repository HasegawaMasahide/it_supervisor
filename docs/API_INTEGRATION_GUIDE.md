# API Integration Guide

**IT Supervisor Tools** — マルチパッケージ統合ガイド

このガイドでは、`@it-supervisor/tools` モノレポの複数のパッケージを組み合わせて、実世界のユースケースに対応する方法を説明します。

---

## 📋 目次

1. [はじめに](#はじめに)
2. [基本的な統合パターン](#基本的な統合パターン)
3. [完全なワークフロー例](#完全なワークフロー例)
   - [例1: 完全なリポジトリ監査パイプライン](#例1-完全なリポジトリ監査パイプライン)
   - [例2: セキュリティ監査ワークフロー](#例2-セキュリティ監査ワークフロー)
   - [例3: コード品質モニタリング](#例3-コード品質モニタリング)
   - [例4: イシュー駆動開発ワークフロー](#例4-イシュー駆動開発ワークフロー)
   - [例5: パフォーマンスベンチマークパイプライン](#例5-パフォーマンスベンチマークパイプライン)
4. [ベストプラクティス](#ベストプラクティス)
5. [エラーハンドリング](#エラーハンドリング)
6. [トラブルシューティング](#トラブルシューティング)

---

## はじめに

IT Supervisor Tools は、7つの独立したパッケージで構成されています：

| パッケージ | 役割 |
|-----------|------|
| `@it-supervisor/logger` | 構造化ロギング |
| `@it-supervisor/repo-analyzer` | Git リポジトリ分析 |
| `@it-supervisor/static-analyzer` | 静的解析ツール統合 |
| `@it-supervisor/metrics-model` | メトリクスデータベース管理 |
| `@it-supervisor/issue-manager` | 問題管理・トラッキング |
| `@it-supervisor/sandbox-builder` | Docker環境自動構築 |
| `@it-supervisor/report-generator` | レポート生成 (HTML/PDF) |

これらのパッケージを組み合わせることで、強力な自動化ワークフローを構築できます。

---

## 基本的な統合パターン

### パターン1: 分析 → メトリクス保存

リポジトリを分析し、結果をメトリクスデータベースに保存します。

```typescript
import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';
import { MetricsDatabase, MetricCategory } from '@it-supervisor/metrics-model';

const analyzer = new RepositoryAnalyzer();
const metricsDB = new MetricsDatabase('./metrics.db');

// リポジトリを分析
const result = await analyzer.analyzeLocal('./target-repo');

// プロジェクトを作成
const projectId = metricsDB.createProject({
  name: result.metadata.name || 'unknown',
  description: result.metadata.description || '',
  metadata: { path: './target-repo' }
});

// メトリクスを保存
metricsDB.recordMetric({
  projectId,
  timestamp: new Date(),
  category: MetricCategory.CodeQuality,
  name: 'total_files',
  value: result.fileStats.totalFiles
});

metricsDB.recordMetric({
  projectId,
  timestamp: new Date(),
  category: MetricCategory.CodeQuality,
  name: 'total_lines',
  value: result.fileStats.totalLines
});
```

### パターン2: 分析 → イシュー作成 → レポート生成

静的解析でイシューを検出し、レポートを生成します。

```typescript
import { StaticAnalyzer, AnalyzerTool } from '@it-supervisor/static-analyzer';
import { IssueManager, IssueSeverity, IssueCategory } from '@it-supervisor/issue-manager';
import { ReportGenerator } from '@it-supervisor/report-generator';

const analyzer = new StaticAnalyzer();
const issueManager = new IssueManager('./issues.db');
const reportGenerator = new ReportGenerator();

// 静的解析
const analysisResult = await analyzer.analyze('./target-repo', {
  tools: [AnalyzerTool.ESLint, AnalyzerTool.Gitleaks],
  parallel: true
});

const projectId = 'project-123';

// イシューを作成
for (const issue of analysisResult.issues) {
  issueManager.createIssue({
    projectId,
    title: issue.message,
    description: `File: ${issue.file}\nLine: ${issue.line}`,
    category: IssueCategory.Security,
    severity: issue.severity as IssueSeverity,
    tags: [issue.tool, issue.rule || 'unknown']
  });
}

// レポート生成
const issues = issueManager.searchIssues({ projectId });
await reportGenerator.generate({
  outputPath: './report.html',
  format: 'html',
  title: 'Security Audit Report',
  data: {
    summary: {
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length
    },
    issues
  }
});
```

---

## 完全なワークフロー例

### 例1: 完全なリポジトリ監査パイプライン

**目的**: リポジトリを完全に監査し、包括的なレポートを生成

**使用パッケージ**: `repo-analyzer`, `static-analyzer`, `issue-manager`, `metrics-model`, `report-generator`

```typescript
import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';
import { StaticAnalyzer, AnalyzerTool } from '@it-supervisor/static-analyzer';
import { IssueManager, IssueSeverity, IssueCategory, IssueStatus } from '@it-supervisor/issue-manager';
import { MetricsDatabase, MetricCategory } from '@it-supervisor/metrics-model';
import { ReportGenerator } from '@it-supervisor/report-generator';
import { createLogger, LogLevel } from '@it-supervisor/logger';

const logger = createLogger('audit-pipeline', { level: LogLevel.INFO });

async function runFullAudit(repoPath: string): Promise<void> {
  logger.info('Starting full repository audit', { repoPath });

  // 1. データベース初期化
  const metricsDB = new MetricsDatabase('./audit-metrics.db');
  const issueManager = new IssueManager('./audit-issues.db');

  // 2. リポジトリ分析
  logger.info('Step 1/5: Analyzing repository structure');
  const repoAnalyzer = new RepositoryAnalyzer();
  const repoResult = await repoAnalyzer.analyzeLocal(repoPath);

  const projectId = metricsDB.createProject({
    name: repoResult.metadata.name || 'unknown',
    description: `Audit of ${repoPath}`,
    metadata: { path: repoPath, analyzedAt: new Date().toISOString() }
  });

  logger.info('Repository analyzed', {
    files: repoResult.fileStats.totalFiles,
    languages: repoResult.techStack.languages.length
  });

  // 3. メトリクス記録
  logger.info('Step 2/5: Recording metrics');
  const metrics = [
    { name: 'total_files', value: repoResult.fileStats.totalFiles },
    { name: 'total_lines', value: repoResult.fileStats.totalLines },
    { name: 'total_commits', value: repoResult.gitHistory.totalCommits },
    { name: 'contributors', value: repoResult.gitHistory.contributors.length },
    { name: 'languages', value: repoResult.techStack.languages.length },
    { name: 'avg_complexity', value: repoResult.fileStats.avgComplexity }
  ];

  metricsDB.recordBatch(metrics.map(m => ({
    projectId,
    timestamp: new Date(),
    category: MetricCategory.CodeQuality,
    name: m.name,
    value: m.value
  })));

  // 4. 静的解析
  logger.info('Step 3/5: Running static analysis');
  const staticAnalyzer = new StaticAnalyzer();
  const tools: AnalyzerTool[] = [AnalyzerTool.ESLint];

  // TypeScriptプロジェクトの場合のみGitleaksを追加
  if (repoResult.techStack.languages.some(l => l.name === 'TypeScript' || l.name === 'JavaScript')) {
    tools.push(AnalyzerTool.Gitleaks);
  }

  const analysisResult = await staticAnalyzer.analyzeWithProgress(
    repoPath,
    { tools, parallel: true },
    (tool, current, total) => {
      logger.info(`Running ${tool} (${current}/${total})`);
    }
  );

  logger.info('Static analysis completed', {
    totalIssues: analysisResult.summary.totalIssues,
    critical: analysisResult.summary.bySeverity.critical
  });

  // 5. イシュー作成
  logger.info('Step 4/5: Creating issues from findings');
  const issueCategoryMap: Record<string, IssueCategory> = {
    security: IssueCategory.Security,
    performance: IssueCategory.Performance,
    'code-quality': IssueCategory.CodeQuality,
    'technical-debt': IssueCategory.TechnicalDebt
  };

  for (const issue of analysisResult.issues) {
    const category = issueCategoryMap[issue.category] || IssueCategory.CodeQuality;
    const severity = issue.severity as IssueSeverity;

    issueManager.createIssue({
      projectId,
      title: `[${issue.tool}] ${issue.message}`,
      description: `**File**: ${issue.file}\n**Line**: ${issue.line}\n**Rule**: ${issue.rule || 'N/A'}\n\n${issue.suggestion || ''}`,
      category,
      severity,
      status: IssueStatus.Identified,
      tags: [issue.tool, issue.rule || 'unknown', issue.category]
    });
  }

  // 6. レポート生成
  logger.info('Step 5/5: Generating audit report');
  const reportGenerator = new ReportGenerator();
  const issues = issueManager.searchIssues({ projectId });
  const stats = issueManager.getStatistics(projectId);

  await reportGenerator.generate({
    outputPath: './audit-report.html',
    format: 'html',
    title: `Repository Audit Report: ${repoResult.metadata.name}`,
    subtitle: `Generated on ${new Date().toLocaleDateString()}`,
    data: {
      summary: {
        repository: repoResult.metadata.name,
        path: repoPath,
        totalFiles: repoResult.fileStats.totalFiles,
        totalLines: repoResult.fileStats.totalLines,
        totalCommits: repoResult.gitHistory.totalCommits,
        languages: repoResult.techStack.languages.map(l => l.name).join(', '),
        frameworks: repoResult.techStack.frameworks.map(f => f.name).join(', '),
        totalIssues: stats.total,
        criticalIssues: stats.bySeverity.critical,
        highIssues: stats.bySeverity.high
      },
      metrics: metricsDB.getMetrics({ projectId }),
      issues: issues.slice(0, 100), // トップ100件
      stats
    }
  });

  logger.info('Audit completed successfully', {
    reportPath: './audit-report.html',
    totalIssues: issues.length
  });
}

// 実行例
runFullAudit('./target-repository')
  .then(() => console.log('✅ Audit completed'))
  .catch(err => console.error('❌ Audit failed:', err));
```

**期待される結果**:
- `audit-metrics.db`: メトリクスデータベース
- `audit-issues.db`: イシューデータベース
- `audit-report.html`: HTML形式の監査レポート

---

### 例2: セキュリティ監査ワークフロー

**目的**: セキュリティ脆弱性に特化した監査を実行

**使用パッケージ**: `static-analyzer`, `metrics-model`, `report-generator`, `logger`

```typescript
import { StaticAnalyzer, AnalyzerTool } from '@it-supervisor/static-analyzer';
import { MetricsDatabase, MetricCategory } from '@it-supervisor/metrics-model';
import { ReportGenerator } from '@it-supervisor/report-generator';
import { createLogger, LogLevel } from '@it-supervisor/logger';

const logger = createLogger('security-audit', { level: LogLevel.INFO });

async function runSecurityAudit(repoPath: string): Promise<void> {
  logger.info('Starting security audit', { repoPath });

  const metricsDB = new MetricsDatabase('./security-metrics.db');
  const projectId = metricsDB.createProject({
    name: 'Security Audit',
    description: `Security scan of ${repoPath}`,
    metadata: { type: 'security', path: repoPath }
  });

  // セキュリティツールのみを実行
  const analyzer = new StaticAnalyzer();
  const result = await analyzer.analyze(repoPath, {
    tools: [AnalyzerTool.Gitleaks, AnalyzerTool.Snyk],
    parallel: true,
    timeout: 600000 // 10分
  });

  logger.info('Security scan completed', {
    totalIssues: result.summary.totalIssues,
    critical: result.summary.bySeverity.critical
  });

  // セキュリティメトリクス記録
  const securityMetrics = [
    {
      name: 'total_vulnerabilities',
      value: result.summary.totalIssues
    },
    {
      name: 'critical_vulnerabilities',
      value: result.summary.bySeverity.critical
    },
    {
      name: 'high_vulnerabilities',
      value: result.summary.bySeverity.high
    },
    {
      name: 'medium_vulnerabilities',
      value: result.summary.bySeverity.medium
    },
    {
      name: 'low_vulnerabilities',
      value: result.summary.bySeverity.low
    }
  ];

  metricsDB.recordBatch(securityMetrics.map(m => ({
    projectId,
    timestamp: new Date(),
    category: MetricCategory.Security,
    name: m.name,
    value: m.value
  })));

  // セキュリティレポート生成
  const reportGenerator = new ReportGenerator();
  await reportGenerator.generate({
    outputPath: './security-report.html',
    format: 'html',
    title: 'Security Audit Report',
    subtitle: `Critical vulnerabilities: ${result.summary.bySeverity.critical}`,
    data: {
      summary: result.summary,
      vulnerabilities: result.issues.filter(i => i.category === 'security'),
      recommendations: [
        'Fix critical vulnerabilities immediately',
        'Update dependencies with known CVEs',
        'Review secret detection findings',
        'Implement security best practices'
      ]
    }
  });

  logger.info('Security report generated', { path: './security-report.html' });

  // 閾値チェック
  if (result.summary.bySeverity.critical > 0) {
    logger.error('CRITICAL: Found critical vulnerabilities!', {
      count: result.summary.bySeverity.critical
    });
    process.exit(1);
  }
}

runSecurityAudit('./target-repository')
  .then(() => console.log('✅ Security audit completed'))
  .catch(err => {
    console.error('❌ Security audit failed:', err);
    process.exit(1);
  });
```

**CI/CD統合例** (GitHub Actions):

```yaml
name: Security Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - name: Install dependencies
        run: npm ci

      - name: Run security audit
        run: npx tsx security-audit.ts ./

      - name: Upload security report
        uses: actions/upload-artifact@v4
        with:
          name: security-report
          path: security-report.html
```

---

### 例3: コード品質モニタリング

**目的**: コード品質メトリクスを定期的に収集し、トレンド分析を実行

**使用パッケージ**: `repo-analyzer`, `metrics-model`, `logger`

```typescript
import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';
import { MetricsDatabase, MetricCategory } from '@it-supervisor/metrics-model';
import { createLogger, LogLevel } from '@it-supervisor/logger';

const logger = createLogger('quality-monitor', { level: LogLevel.INFO });

async function monitorCodeQuality(repoPath: string): Promise<void> {
  logger.info('Starting code quality monitoring', { repoPath });

  const metricsDB = new MetricsDatabase('./quality-metrics.db');
  const analyzer = new RepositoryAnalyzer();

  // プロジェクトを取得または作成
  const projects = metricsDB.getAllProjects();
  let projectId = projects.find(p => p.metadata?.path === repoPath)?.id;

  if (!projectId) {
    projectId = metricsDB.createProject({
      name: 'Code Quality Monitor',
      description: `Quality metrics for ${repoPath}`,
      metadata: { path: repoPath }
    });
    logger.info('Created new project', { projectId });
  }

  // リポジトリ分析
  const result = await analyzer.analyzeLocal(repoPath);

  // 品質メトリクス記録
  const qualityMetrics = [
    { name: 'total_files', value: result.fileStats.totalFiles },
    { name: 'total_lines', value: result.fileStats.totalLines },
    { name: 'avg_complexity', value: result.fileStats.avgComplexity },
    { name: 'max_complexity', value: result.fileStats.maxComplexity },
    { name: 'total_commits', value: result.gitHistory.totalCommits },
    { name: 'active_contributors', value: result.gitHistory.contributors.length },
    { name: 'test_files', value: result.fileStats.byType?.test || 0 },
    { name: 'documentation_files', value: result.fileStats.byType?.docs || 0 }
  ];

  metricsDB.recordBatch(qualityMetrics.map(m => ({
    projectId,
    timestamp: new Date(),
    category: MetricCategory.CodeQuality,
    name: m.name,
    value: m.value
  })));

  logger.info('Metrics recorded', { count: qualityMetrics.length });

  // トレンド分析（過去30日間）
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const trends = await analyzeTrends(metricsDB, projectId, thirtyDaysAgo);

  logger.info('Trend analysis completed', {
    totalLines: trends.total_lines,
    complexityChange: trends.avg_complexity
  });

  // アラート判定
  if (trends.avg_complexity > 10) {
    logger.warn('Code complexity is increasing!', {
      current: trends.avg_complexity,
      threshold: 10
    });
  }

  if (trends.total_lines > 20) {
    logger.info('Codebase growth detected', {
      percentageIncrease: trends.total_lines
    });
  }
}

async function analyzeTrends(
  db: MetricsDatabase,
  projectId: string,
  since: Date
): Promise<Record<string, number>> {
  const trends: Record<string, number> = {};
  const metricNames = [
    'total_lines',
    'avg_complexity',
    'total_commits',
    'active_contributors'
  ];

  for (const metricName of metricNames) {
    const comparison = db.compareMetrics(projectId, metricName, since, new Date());
    trends[metricName] = comparison.percentageChange || 0;
  }

  return trends;
}

// Cron job として実行（毎日午前2時）
// 0 2 * * * npx tsx quality-monitor.ts ./target-repository
monitorCodeQuality('./target-repository')
  .then(() => console.log('✅ Quality monitoring completed'))
  .catch(err => console.error('❌ Quality monitoring failed:', err));
```

**メトリクスダッシュボード生成例**:

```typescript
import { MetricsDatabase } from '@it-supervisor/metrics-model';
import { ReportGenerator } from '@it-supervisor/report-generator';

async function generateQualityDashboard(projectId: string): Promise<void> {
  const db = new MetricsDatabase('./quality-metrics.db');
  const reportGenerator = new ReportGenerator();

  // 過去90日間のメトリクス取得
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const metrics = db.getMetrics({
    projectId,
    startDate: ninetyDaysAgo,
    endDate: new Date()
  });

  // チャートデータ生成
  const chartData = reportGenerator.generateChartData({
    type: 'line',
    labels: metrics.map(m => new Date(m.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: 'Total Lines',
        data: metrics.filter(m => m.name === 'total_lines').map(m => m.value as number)
      },
      {
        label: 'Average Complexity',
        data: metrics.filter(m => m.name === 'avg_complexity').map(m => m.value as number)
      }
    ]
  });

  // ダッシュボード生成
  await reportGenerator.generateHTMLWithCharts({
    outputPath: './quality-dashboard.html',
    title: 'Code Quality Dashboard',
    subtitle: 'Last 90 days',
    data: { metrics },
    charts: [chartData]
  });

  console.log('✅ Dashboard generated: quality-dashboard.html');
}
```

---

### 例4: イシュー駆動開発ワークフロー

**目的**: 静的解析で検出したイシューをサンドボックス環境で修正

**使用パッケージ**: `static-analyzer`, `issue-manager`, `sandbox-builder`, `logger`

```typescript
import { StaticAnalyzer, AnalyzerTool } from '@it-supervisor/static-analyzer';
import { IssueManager, IssueStatus, IssueSeverity, IssueCategory } from '@it-supervisor/issue-manager';
import { SandboxBuilder, IsolationLevel } from '@it-supervisor/sandbox-builder';
import { createLogger, LogLevel } from '@it-supervisor/logger';

const logger = createLogger('issue-workflow', { level: LogLevel.INFO });

async function issueWorkflow(repoPath: string): Promise<void> {
  logger.info('Starting issue-driven workflow', { repoPath });

  const issueManager = new IssueManager('./workflow-issues.db');
  const projectId = 'project-workflow-001';

  // 1. 静的解析でイシュー検出
  logger.info('Step 1/4: Detecting issues');
  const analyzer = new StaticAnalyzer();
  const result = await analyzer.analyze(repoPath, {
    tools: [AnalyzerTool.ESLint],
    parallel: false
  });

  // 2. イシューを作成
  logger.info('Step 2/4: Creating issues');
  const issueIds: string[] = [];

  for (const issue of result.issues) {
    if (issue.severity === 'critical' || issue.severity === 'high') {
      const id = issueManager.createIssue({
        projectId,
        title: `[${issue.tool}] ${issue.message}`,
        description: `**File**: ${issue.file}:${issue.line}\n**Rule**: ${issue.rule}\n\n${issue.suggestion || 'No suggestion available'}`,
        category: IssueCategory.CodeQuality,
        severity: issue.severity as IssueSeverity,
        status: IssueStatus.Identified,
        tags: [issue.tool, issue.rule || 'unknown']
      });
      issueIds.push(id);
    }
  }

  logger.info('Issues created', { count: issueIds.length });

  // 3. サンドボックス環境を構築
  logger.info('Step 3/4: Building sandbox environment');
  const sandboxBuilder = new SandboxBuilder();

  const detection = await sandboxBuilder.detect(repoPath);
  logger.info('Environment detected', { type: detection.type });

  const sandbox = await sandboxBuilder.build(detection, {
    isolation: IsolationLevel.Medium,
    enablePersistence: true
  });

  logger.info('Sandbox built', {
    composeFile: sandbox.composeFile,
    services: Object.keys(sandbox.services).length
  });

  // 4. イシューを診断済みに更新
  logger.info('Step 4/4: Updating issue status');
  for (const issueId of issueIds) {
    issueManager.updateIssue(issueId, {
      status: IssueStatus.Diagnosed
    });

    issueManager.addComment(issueId, {
      author: 'automation',
      text: `Sandbox environment created for testing fixes.\n\nDocker Compose: ${sandbox.composeFile}`,
      attachments: [sandbox.composeFile]
    });
  }

  logger.info('Workflow completed', {
    issuesCreated: issueIds.length,
    sandboxReady: true
  });

  // イシュー詳細を出力
  const stats = issueManager.getStatistics(projectId);
  console.log('\n📊 Issue Statistics:');
  console.log(`  Total: ${stats.total}`);
  console.log(`  Critical: ${stats.bySeverity.critical}`);
  console.log(`  High: ${stats.bySeverity.high}`);
  console.log(`\n🐳 Sandbox Environment:`);
  console.log(`  Path: ${sandbox.composeFile}`);
  console.log(`  Services: ${Object.keys(sandbox.services).join(', ')}`);
}

issueWorkflow('./target-repository')
  .then(() => console.log('\n✅ Issue workflow completed'))
  .catch(err => console.error('\n❌ Workflow failed:', err));
```

**開発者向けの使い方**:

```bash
# 1. イシュー検出とサンドボックス構築
npx tsx issue-workflow.ts ./my-project

# 2. サンドボックス環境で作業
cd ./my-project
docker-compose up -d

# 3. イシュー修正
# (コードを編集)

# 4. イシューを解決済みに更新
npx tsx update-issue.ts <issue-id> resolved

# 5. サンドボックス停止
docker-compose down
```

---

### 例5: パフォーマンスベンチマークパイプライン

**目的**: リポジトリのパフォーマンスメトリクスを定期的に測定し、回帰を検出

**使用パッケージ**: `repo-analyzer`, `metrics-model`, `report-generator`, `logger`

```typescript
import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';
import { MetricsDatabase, MetricCategory } from '@it-supervisor/metrics-model';
import { ReportGenerator } from '@it-supervisor/report-generator';
import { createLogger, LogLevel } from '@it-supervisor/logger';
import { performance } from 'perf_hooks';

const logger = createLogger('perf-benchmark', { level: LogLevel.INFO });

interface BenchmarkResult {
  name: string;
  duration: number;
  memory: number;
  cpu: number;
}

async function benchmarkPipeline(repoPath: string): Promise<void> {
  logger.info('Starting performance benchmark', { repoPath });

  const metricsDB = new MetricsDatabase('./benchmark-metrics.db');
  const projectId = metricsDB.createProject({
    name: 'Performance Benchmark',
    description: `Benchmark of ${repoPath}`,
    metadata: { type: 'performance', path: repoPath }
  });

  const benchmarks: BenchmarkResult[] = [];

  // ベンチマーク1: リポジトリ分析
  const bench1 = await runBenchmark('Repository Analysis', async () => {
    const analyzer = new RepositoryAnalyzer();
    await analyzer.analyzeLocal(repoPath);
  });
  benchmarks.push(bench1);

  // ベンチマーク2: 依存関係グラフ分析
  const bench2 = await runBenchmark('Dependency Graph Analysis', async () => {
    const analyzer = new RepositoryAnalyzer();
    await analyzer.analyzeDependencyGraph(repoPath);
  });
  benchmarks.push(bench2);

  // ベンチマーク3: Git履歴分析
  const bench3 = await runBenchmark('Git History Analysis', async () => {
    const analyzer = new RepositoryAnalyzer();
    const result = await analyzer.analyzeLocal(repoPath);
    return result.gitHistory;
  });
  benchmarks.push(bench3);

  // ベンチマーク結果を記録
  for (const bench of benchmarks) {
    metricsDB.recordBatch([
      {
        projectId,
        timestamp: new Date(),
        category: MetricCategory.Performance,
        name: `${bench.name}_duration_ms`,
        value: bench.duration
      },
      {
        projectId,
        timestamp: new Date(),
        category: MetricCategory.Performance,
        name: `${bench.name}_memory_mb`,
        value: bench.memory
      }
    ]);

    logger.info('Benchmark recorded', {
      name: bench.name,
      duration: `${bench.duration.toFixed(2)}ms`,
      memory: `${bench.memory.toFixed(2)}MB`
    });
  }

  // 過去のベンチマークと比較
  const comparison = await compareWithBaseline(metricsDB, projectId, benchmarks);

  // レポート生成
  await generateBenchmarkReport(benchmarks, comparison);

  logger.info('Benchmark completed', { total: benchmarks.length });
}

async function runBenchmark(
  name: string,
  fn: () => Promise<unknown>
): Promise<BenchmarkResult> {
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
  const startTime = performance.now();

  await fn();

  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;

  return {
    name,
    duration: endTime - startTime,
    memory: endMemory - startMemory,
    cpu: 0 // CPU使用率は省略
  };
}

async function compareWithBaseline(
  db: MetricsDatabase,
  projectId: string,
  current: BenchmarkResult[]
): Promise<Record<string, { regression: boolean; change: number }>> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const comparison: Record<string, { regression: boolean; change: number }> = {};

  for (const bench of current) {
    const metricName = `${bench.name}_duration_ms`;
    const result = db.compareMetrics(projectId, metricName, sevenDaysAgo, new Date());

    const change = result.percentageChange || 0;
    const regression = change > 20; // 20%以上の劣化を回帰とみなす

    comparison[bench.name] = { regression, change };
  }

  return comparison;
}

async function generateBenchmarkReport(
  benchmarks: BenchmarkResult[],
  comparison: Record<string, { regression: boolean; change: number }>
): Promise<void> {
  const reportGenerator = new ReportGenerator();

  await reportGenerator.generate({
    outputPath: './benchmark-report.html',
    format: 'html',
    title: 'Performance Benchmark Report',
    subtitle: `Executed on ${new Date().toLocaleString()}`,
    data: {
      benchmarks,
      comparison,
      summary: {
        totalTests: benchmarks.length,
        regressions: Object.values(comparison).filter(c => c.regression).length,
        avgDuration: benchmarks.reduce((sum, b) => sum + b.duration, 0) / benchmarks.length
      }
    }
  });

  console.log('\n📊 Benchmark Results:');
  for (const bench of benchmarks) {
    const comp = comparison[bench.name];
    const icon = comp?.regression ? '🔴' : '🟢';
    const change = comp?.change ? `(${comp.change > 0 ? '+' : ''}${comp.change.toFixed(1)}%)` : '';
    console.log(`  ${icon} ${bench.name}: ${bench.duration.toFixed(2)}ms ${change}`);
  }
}

// CI/CD統合
benchmarkPipeline('./target-repository')
  .then(() => {
    console.log('\n✅ Benchmark completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Benchmark failed:', err);
    process.exit(1);
  });
```

---

## ベストプラクティス

### 1. ロギング戦略

すべてのワークフローで構造化ロギングを使用します。

```typescript
import { createLogger, LogLevel } from '@it-supervisor/logger';

// 環境変数でログレベルを制御
const level = process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO;
const logger = createLogger('my-workflow', { level });

// 構造化ログ
logger.info('Operation started', { userId: 123, operation: 'analyze' });
logger.debug('Detailed debug info', { data: { foo: 'bar' } });
logger.error('Operation failed', new Error('Connection timeout'));
```

### 2. エラーハンドリング

各ステップで適切なエラーハンドリングを実装します。

```typescript
async function robustWorkflow(repoPath: string): Promise<void> {
  const logger = createLogger('workflow');

  try {
    // ステップ1
    logger.info('Step 1: Analyzing repository');
    const result = await analyzeRepository(repoPath);

  } catch (error) {
    logger.error('Workflow failed', error as Error);

    // クリーンアップ処理
    await cleanup();

    throw error;
  }
}

async function analyzeRepository(path: string) {
  try {
    const analyzer = new RepositoryAnalyzer();
    return await analyzer.analyzeLocal(path);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not a git repository')) {
      throw new Error(`Invalid repository: ${path} is not a Git repository`);
    }
    throw error;
  }
}
```

### 3. リソース管理

データベース接続やファイルハンドルは適切に管理します。

```typescript
import { MetricsDatabase } from '@it-supervisor/metrics-model';
import { IssueManager } from '@it-supervisor/issue-manager';

async function workflowWithCleanup(): Promise<void> {
  const metricsDB = new MetricsDatabase('./metrics.db');
  const issueManager = new IssueManager('./issues.db');

  try {
    // ワークフロー処理
    // ...
  } finally {
    // リソース解放
    metricsDB.close();
    issueManager.close();
  }
}
```

### 4. パフォーマンス最適化

大規模リポジトリでは並列処理を活用します。

```typescript
import { StaticAnalyzer, AnalyzerTool } from '@it-supervisor/static-analyzer';

async function optimizedAnalysis(repoPath: string): Promise<void> {
  const analyzer = new StaticAnalyzer();

  // 並列実行を有効化
  const result = await analyzer.analyze(repoPath, {
    tools: [AnalyzerTool.ESLint, AnalyzerTool.Gitleaks],
    parallel: true, // ✅ 並列実行
    timeout: 600000 // 10分タイムアウト
  });

  console.log(`Analysis completed in parallel: ${result.summary.totalIssues} issues`);
}
```

### 5. 設定の外部化

環境変数や設定ファイルで動作をカスタマイズします。

```typescript
import * as fs from 'fs';

interface WorkflowConfig {
  repoPath: string;
  tools: string[];
  outputFormat: 'html' | 'pdf' | 'markdown';
  metricsDB: string;
  issuesDB: string;
}

function loadConfig(configPath: string): WorkflowConfig {
  const data = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(data);
}

const config = loadConfig('./workflow-config.json');

// 設定を使用
await runWorkflow(config);
```

---

## エラーハンドリング

### 一般的なエラーと対処法

#### 1. リポジトリアクセスエラー

```typescript
try {
  const result = await analyzer.analyzeLocal(repoPath);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('ENOENT')) {
      console.error('❌ Repository path does not exist:', repoPath);
    } else if (error.message.includes('not a git repository')) {
      console.error('❌ Path is not a Git repository:', repoPath);
    } else {
      console.error('❌ Analysis failed:', error.message);
    }
  }
  process.exit(1);
}
```

#### 2. データベースエラー

```typescript
import { MetricsDatabase } from '@it-supervisor/metrics-model';

try {
  const db = new MetricsDatabase('./metrics.db');
  // 操作...
} catch (error) {
  if (error instanceof Error && error.message.includes('database is locked')) {
    console.error('❌ Database is locked. Close other connections and try again.');
  } else {
    console.error('❌ Database error:', error);
  }
}
```

#### 3. タイムアウトエラー

```typescript
import { StaticAnalyzer } from '@it-supervisor/static-analyzer';

const analyzer = new StaticAnalyzer();

try {
  const result = await analyzer.analyze(repoPath, {
    tools: ['eslint'],
    timeout: 300000 // 5分
  });
} catch (error) {
  if (error instanceof Error && error.message.includes('timeout')) {
    console.error('❌ Analysis timed out. Try increasing the timeout or reducing scope.');
  }
}
```

---

## トラブルシューティング

### よくある問題

#### 1. パフォーマンスが遅い

**症状**: 大規模リポジトリの分析に時間がかかる

**解決策**:
- 並列処理を有効化 (`parallel: true`)
- タイムアウトを増やす (`timeout: 600000`)
- 分析対象を限定する（特定のディレクトリのみ）

```typescript
const result = await analyzer.analyze(repoPath, {
  tools: [AnalyzerTool.ESLint],
  parallel: true,
  timeout: 600000,
  // 特定のパスのみ分析（カスタム実装が必要）
});
```

#### 2. メモリ不足

**症状**: `JavaScript heap out of memory` エラー

**解決策**:
- Node.jsのヒープサイズを増やす
- バッチ処理で小さなチャンクに分割

```bash
# ヒープサイズを4GBに増やす
NODE_OPTIONS="--max-old-space-size=4096" npx tsx workflow.ts
```

#### 3. データベースロック

**症状**: `database is locked` エラー

**解決策**:
- 他のプロセスが同じDBを使用していないか確認
- `close()` メソッドを明示的に呼び出す

```typescript
const db = new MetricsDatabase('./metrics.db');
try {
  // 処理
} finally {
  db.close(); // ✅ 必ず閉じる
}
```

#### 4. パッケージバージョン不整合

**症状**: TypeScriptの型エラーやランタイムエラー

**解決策**:
- すべてのパッケージを最新バージョンに更新
- `npm install` を再実行

```bash
npm update @it-supervisor/repo-analyzer
npm update @it-supervisor/static-analyzer
npm install
```

---

## まとめ

このガイドでは、IT Supervisor Tools の7つのパッケージを組み合わせた、実世界のワークフロー例を紹介しました。

**主要なユースケース**:
1. ✅ **完全なリポジトリ監査** — 構造分析から問題検出、レポート生成まで
2. ✅ **セキュリティ監査** — 脆弱性検出とメトリクス記録
3. ✅ **コード品質モニタリング** — トレンド分析とアラート
4. ✅ **イシュー駆動開発** — 自動イシュー検出とサンドボックス環境構築
5. ✅ **パフォーマンスベンチマーク** — 継続的なパフォーマンス監視

**次のステップ**:
- 各例をカスタマイズして自分のプロジェクトに適用
- CI/CDパイプラインに統合
- 定期的な自動実行の設定（Cron, GitHub Actions等）

**追加リソース**:
- [各パッケージのAPI仕様](./api.md)
- [使用例](./USAGE_EXAMPLES.md)
- [貢献ガイド](../CONTRIBUTING.md)

---

**質問やフィードバック**: [GitHub Issues](https://github.com/your-org/it-supervisor-tools/issues)
