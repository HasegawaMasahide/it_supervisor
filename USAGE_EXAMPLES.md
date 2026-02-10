# IT Supervisor Tools - 使用例

このドキュメントでは、各ツールの具体的な使用例を示します。

## 1. 完全なワークフロー例

### 新規プロジェクトの解析から報告まで

```typescript
import { MetricsDatabase } from '@it-supervisor/metrics-model';
import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';
import { StaticAnalyzer } from '@it-supervisor/static-analyzer';
import { SandboxBuilder } from '@it-supervisor/sandbox-builder';
import { IssueManager } from '@it-supervisor/issue-manager';
import { ReportGenerator, ReportType } from '@it-supervisor/report-generator';

async function analyzeProject(projectPath: string) {
  // 1. プロジェクト作成
  const metricsDb = new MetricsDatabase('./data/metrics.db');
  const project = metricsDb.createProject({
    name: 'Customer Project Alpha',
    description: '顧客の既存Webアプリケーション'
  });

  console.log(`プロジェクト作成: ${project.id}`);

  // 2. リポジトリ解析
  const repoAnalyzer = new RepositoryAnalyzer();
  const repoResult = await repoAnalyzer.analyzeLocal(projectPath, {
    includeGitHistory: true,
    includeDependencies: true
  });

  console.log(`検出された言語: ${repoResult.techStack.languages.map(l => l.name).join(', ')}`);
  console.log(`総ファイル数: ${repoResult.fileStats.totalFiles}`);
  console.log(`総行数: ${repoResult.fileStats.totalLines}`);

  // メトリクスをDBに記録
  metricsDb.recordMetric({
    projectId: project.id,
    timestamp: new Date(),
    category: 'code_quality' as any,
    name: 'total_files',
    value: repoResult.fileStats.totalFiles,
    unit: 'count',
    source: 'repo-analyzer'
  });

  metricsDb.recordMetric({
    projectId: project.id,
    timestamp: new Date(),
    category: 'code_quality' as any,
    name: 'total_lines',
    value: repoResult.fileStats.totalLines,
    unit: 'count',
    source: 'repo-analyzer'
  });

  // 3. 静的解析
  const staticAnalyzer = new StaticAnalyzer();
  const staticResult = await staticAnalyzer.analyze(projectPath, {
    parallel: true,
    removeDuplicates: true,
    timeout: 300000
  });

  console.log(`\n静的解析結果:`);
  console.log(`  Critical問題: ${staticResult.summary.bySeverity.critical}`);
  console.log(`  High問題: ${staticResult.summary.bySeverity.high}`);
  console.log(`  Medium問題: ${staticResult.summary.bySeverity.medium}`);
  console.log(`  Low問題: ${staticResult.summary.bySeverity.low}`);

  // メトリクスをDBに記録
  Object.entries(staticResult.summary.bySeverity).forEach(([severity, count]) => {
    metricsDb.recordMetric({
      projectId: project.id,
      timestamp: new Date(),
      category: 'security' as any,
      name: `issues_${severity}`,
      value: count,
      unit: 'count',
      source: 'static-analyzer'
    });
  });

  // 4. Issue管理に登録
  const issueManager = new IssueManager('./data/issues.db');

  for (const issue of staticResult.allIssues.slice(0, 10)) { // 上位10件のみ
    issueManager.createIssue({
      projectId: project.id,
      title: issue.message,
      description: `Tool: ${issue.tool}\nRule: ${issue.rule}\nFile: ${issue.file}`,
      category: issue.category as any,
      severity: issue.severity as any,
      status: 'identified' as any,
      location: {
        file: issue.file,
        line: issue.line,
        column: issue.column
      },
      tags: [issue.tool, issue.category],
      createdBy: 'auto-analyzer'
    });
  }

  console.log(`\n${staticResult.allIssues.length}件のIssueを登録しました`);

  // 5. サンドボックス環境構築
  const sandboxBuilder = new SandboxBuilder();
  const detection = await sandboxBuilder.detect(projectPath);

  console.log(`\n環境検出: ${detection.type} (信頼度: ${detection.confidence})`);

  const sandbox = await sandboxBuilder.build(projectPath, {
    outputDir: './sandbox',
    includeDatabase: detection.databases.length > 0,
    isolation: 'RESTRICTED' as any
  });

  console.log(`サンドボックス環境を構築しました: ${sandbox.path}`);

  // 6. レポート生成
  const reportGenerator = new ReportGenerator();

  const report = await reportGenerator.generate(ReportType.Analysis, {
    projectName: project.name,
    customerName: 'ACME Corporation',
    date: new Date(),
    author: 'IT Supervisor Team',
    data: {
      repoAnalysis: repoResult,
      staticAnalysis: staticResult,
      issues: staticResult.allIssues.slice(0, 10)
    }
  });

  await reportGenerator.exportToHTML(report, './reports/analysis-report.html');
  await reportGenerator.exportToMarkdown(report, './reports/analysis-report.md');

  console.log(`\nレポートを生成しました:`);
  console.log(`  HTML: ./reports/analysis-report.html`);
  console.log(`  Markdown: ./reports/analysis-report.md`);

  // 7. Before/After比較（後日の改善後に実行）
  const stats = issueManager.getStatistics(project.id);
  console.log(`\nIssue統計:`);
  console.log(`  総数: ${stats.total}`);
  console.log(`  Critical: ${stats.bySeverity.critical}`);
  console.log(`  Status別:`, stats.byStatus);

  // クリーンアップ
  metricsDb.close();
  issueManager.close();

  return {
    project,
    repoResult,
    staticResult,
    sandbox,
    report
  };
}

// 実行例
const projectPath = process.argv[2] || './target-project';
analyzeProject(projectPath).then(() => {
  console.log('\n解析が完了しました！');
}).catch(error => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
});
```

## 2. 個別ツールの使用例

### メトリクスデータベース

```typescript
import { MetricsDatabase, MetricCategory } from '@it-supervisor/metrics-model';

const db = new MetricsDatabase('./metrics.db');

// プロジェクト作成
const project = db.createProject({
  name: 'My Project',
  description: 'Test project'
});

// メトリクス記録
db.recordMetric({
  projectId: project.id,
  timestamp: new Date(),
  category: MetricCategory.Security,
  name: 'vulnerabilities_critical',
  value: 5,
  unit: 'count',
  source: 'snyk'
});

// メトリクス取得
const metrics = db.getMetrics({
  projectId: project.id,
  category: MetricCategory.Security
});

console.log('メトリクス:', metrics);

// Before/After比較
const comparison = db.compareMetrics(
  project.id,
  new Date('2025-01-01'),
  new Date('2025-12-01')
);

console.log('比較結果:', comparison);

db.close();
```

### リポジトリ解析

```typescript
import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';

const analyzer = new RepositoryAnalyzer();

const result = await analyzer.analyzeLocal('./my-repo', {
  includeGitHistory: true,
  includeDependencies: true,
  excludePatterns: ['node_modules', 'dist', 'vendor']
});

console.log('技術スタック:');
result.techStack.languages.forEach(lang => {
  console.log(`  ${lang.name}: ${lang.files} files, ${lang.lines} lines`);
});

console.log('\nフレームワーク:');
result.techStack.frameworks.forEach(fw => {
  console.log(`  ${fw.name} ${fw.version || ''}`);
});

console.log('\nGit履歴:');
if (result.gitHistory) {
  console.log(`  総コミット数: ${result.gitHistory.totalCommits}`);
  console.log(`  コントリビューター数: ${result.gitHistory.contributors.length}`);
}
```

### 静的解析

```typescript
import { StaticAnalyzer, AnalyzerTool } from '@it-supervisor/static-analyzer';

const analyzer = new StaticAnalyzer();

const result = await analyzer.analyze('./my-repo', {
  tools: [AnalyzerTool.ESLint, AnalyzerTool.Snyk, AnalyzerTool.Gitleaks],
  parallel: true,
  timeout: 300000
});

console.log(`総問題数: ${result.summary.totalIssues}`);
console.log('重要度別:');
Object.entries(result.summary.bySeverity).forEach(([severity, count]) => {
  console.log(`  ${severity}: ${count}`);
});

// Critical問題のみフィルタ
const criticalIssues = result.allIssues.filter(
  issue => issue.severity === 'critical'
);

console.log(`\nCritical問題: ${criticalIssues.length}件`);
criticalIssues.forEach(issue => {
  console.log(`  - ${issue.message} (${issue.file}:${issue.line})`);
});
```

### サンドボックス環境構築

```typescript
import { SandboxBuilder, SandboxController } from '@it-supervisor/sandbox-builder';

// 環境検出
const builder = new SandboxBuilder();
const detection = await builder.detect('./my-app');

console.log(`検出された環境: ${detection.type}`);
console.log(`フレームワーク: ${detection.details.framework}`);

// 環境構築
const sandbox = await builder.build('./my-app', {
  outputDir: './sandbox-env',
  includeDatabase: true,
  isolation: 'RESTRICTED'
});

console.log(`サンドボックス構築完了: ${sandbox.id}`);

// 環境操作
const controller = new SandboxController('./sandbox-env');
await controller.load();

// 起動
await controller.up();
console.log('サンドボックス起動');

// ヘルスチェック
const health = await controller.health();
console.log('ヘルスチェック:', health.healthy ? 'OK' : 'NG');

// スナップショット作成
await controller.createSnapshot('before-change');
console.log('スナップショット作成');

// 停止
await controller.down();
console.log('サンドボックス停止');
```

### Issue管理

```typescript
import { IssueManager, IssueSeverity, IssueStatus, IssueCategory } from '@it-supervisor/issue-manager';

const manager = new IssueManager('./issues.db');

// Issue作成
const issue = manager.createIssue({
  projectId: 'proj-001',
  title: 'SQL Injection vulnerability',
  description: 'User input is not sanitized in login form',
  category: IssueCategory.Security,
  severity: IssueSeverity.Critical,
  status: IssueStatus.Identified,
  location: {
    file: 'src/auth/login.php',
    line: 42
  },
  tags: ['security', 'sql-injection'],
  createdBy: 'security-scanner'
});

console.log(`Issue作成: ${issue.id}`);

// コメント追加
manager.addComment(issue.id, {
  author: 'engineer@example.com',
  content: 'Fixing this issue using prepared statements'
});

// ステータス更新
manager.updateIssueStatus(issue.id, IssueStatus.InProgress);

// 検索
const criticalIssues = manager.searchIssues({
  projectId: 'proj-001',
  severity: IssueSeverity.Critical,
  status: [IssueStatus.Identified, IssueStatus.InProgress]
});

console.log(`Critical問題: ${criticalIssues.length}件`);

// 統計
const stats = manager.getStatistics('proj-001');
console.log('統計情報:');
console.log(`  総数: ${stats.total}`);
console.log(`  Critical: ${stats.bySeverity.critical}`);

manager.close();
```

### レポート生成

```typescript
import { ReportGenerator, ReportType } from '@it-supervisor/report-generator';

const generator = new ReportGenerator();

// 分析レポート生成
const report = await generator.generate(ReportType.Analysis, {
  projectName: 'Customer Project',
  customerName: 'ACME Corporation',
  date: new Date(),
  author: 'IT Supervisor Team',
  data: {
    repoAnalysis: {
      techStack: {
        languages: ['JavaScript', 'TypeScript'],
        frameworks: ['React', 'Express']
      },
      fileStats: {
        totalFiles: 250,
        totalLines: 15000
      }
    },
    staticAnalysis: {
      summary: {
        bySeverity: {
          critical: 3,
          high: 12,
          medium: 45,
          low: 78
        }
      }
    }
  }
});

// 出力
await generator.exportToHTML(report, './analysis-report.html');
await generator.exportToMarkdown(report, './analysis-report.md');
await generator.exportToPDF(report, './analysis-report.pdf');

console.log('レポート生成完了');
```

## 3. CI/CD統合例

```typescript
// .github/workflows/analyze.yml での使用例

import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';
import { StaticAnalyzer } from '@it-supervisor/static-analyzer';
import { MetricsDatabase } from '@it-supervisor/metrics-model';

async function ciAnalyze() {
  const projectId = process.env.PROJECT_ID || 'ci-project';

  // リポジトリ解析
  const repoAnalyzer = new RepositoryAnalyzer();
  const repoResult = await repoAnalyzer.analyzeLocal('.');

  // 静的解析
  const staticAnalyzer = new StaticAnalyzer();
  const staticResult = await staticAnalyzer.analyze('.', {
    parallel: true
  });

  // メトリクス記録
  const db = new MetricsDatabase('./metrics.db');
  const project = db.createProject({
    name: 'CI Project',
    description: 'Continuous Integration Project'
  });

  db.recordMetric({
    projectId: project.id,
    timestamp: new Date(),
    category: 'security' as any,
    name: 'critical_issues',
    value: staticResult.summary.bySeverity.critical,
    unit: 'count',
    source: 'ci-pipeline'
  });

  // Critical問題がある場合は失敗
  if (staticResult.summary.bySeverity.critical > 0) {
    console.error(`Critical問題が${staticResult.summary.bySeverity.critical}件見つかりました`);
    process.exit(1);
  }

  console.log('CI解析成功');
  db.close();
}

ciAnalyze().catch(error => {
  console.error('CI解析失敗:', error);
  process.exit(1);
});
```

## まとめ

これらのツールを組み合わせることで、IT資産の監査から改善、効果測定までのワークフローを自動化できます。

各ツールの詳細なAPIドキュメントは、各パッケージの `README.md` を参照してください。
