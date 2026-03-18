/**
 * レポート生成の検証スクリプト
 * run-audit.ts と同じデータ構造でレポートのみ再生成する
 */
import { createLogger, LogLevel } from '@it-supervisor/logger';
import { MetricsDatabase, MetricCategory } from '@it-supervisor/metrics-model';
import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';
import { StaticAnalyzer, AnalyzerTool } from '@it-supervisor/static-analyzer';
import {
  IssueManager,
  IssueCategory,
  IssueSeverity,
  IssueStatus,
} from '@it-supervisor/issue-manager';
import { ReportGenerator, ReportType } from '@it-supervisor/report-generator';
import * as path from 'path';
import * as fs from 'fs';

const TARGET_REPO_PATH = String.raw`C:\workspace\new_business\it_supervisor\demo\aspnet-legacy-system`;
const PROJECT_NAME = '顧客Webアプリ';
const CUSTOMER_NAME = '株式会社サンプル';
const OUTPUT_DIR = String.raw`C:\workspace\new_business\it_supervisor\demo\aspnet-legacy-system_output_3`;

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, 'reports'), { recursive: true });

  const dbPath = path.join(OUTPUT_DIR, 'audit.db');
  const logger = createLogger('verify', { level: LogLevel.INFO });
  const metricsDb = new MetricsDatabase(dbPath);
  const issueManager = new IssueManager(dbPath);

  const project = metricsDb.createProject({
    name: PROJECT_NAME,
    description: `${CUSTOMER_NAME} - IT資産監査`,
    metadata: { path: TARGET_REPO_PATH, startedAt: new Date().toISOString() },
  });
  const projectId = project.id;
  const timestamp = new Date();

  // Step 2: リポジトリ解析
  console.log('[Step 2] リポジトリ解析...');
  const repoAnalyzer = new RepositoryAnalyzer();
  const repoResult = await repoAnalyzer.analyzeLocal(TARGET_REPO_PATH, {
    includeGitHistory: true,
    includeDependencies: true,
    excludePatterns: ['node_modules', '.git', 'dist', 'vendor', 'coverage'],
  });
  console.log(`  言語: ${repoResult.techStack.languages.map(l => `${l.name}(${l.percentage.toFixed(0)}%)`).join(', ')}`);
  console.log(`  依存関係: ${repoResult.techStack.dependencies.length}件`);
  console.log(`  FW: ${repoResult.techStack.frameworks.map(f => f.name).join(', ') || 'なし'}`);

  // Step 3: 静的解析
  console.log('[Step 3] 静的解析...');
  const staticAnalyzer = new StaticAnalyzer();
  const tools: AnalyzerTool[] = [];
  const langNames = repoResult.techStack.languages.map(l => l.name.toLowerCase());
  if (langNames.includes('c#')) tools.push(AnalyzerTool.RoslynAnalyzer);
  tools.push(AnalyzerTool.Gitleaks);
  const staticResult = await staticAnalyzer.analyzeWithProgress(
    TARGET_REPO_PATH,
    { tools, parallel: true, timeout: 300000, removeDuplicates: true, excludePatterns: ['node_modules'] },
    () => {},
  );
  console.log(`  問題数: ${staticResult.summary.totalIssues}`);

  // Step 4: Issue登録
  console.log('[Step 4] Issue登録...');
  const catMap: Record<string, IssueCategory> = {
    security: IssueCategory.Security,
    performance: IssueCategory.Performance,
    code_quality: IssueCategory.CodeQuality,
  };
  const sevMap: Record<string, IssueSeverity> = {
    critical: IssueSeverity.Critical,
    high: IssueSeverity.High,
    medium: IssueSeverity.Medium,
    low: IssueSeverity.Low,
  };
  for (const issue of staticResult.allIssues) {
    issueManager.createIssue({
      projectId,
      title: `[${issue.tool}] ${issue.message}`,
      description: `${issue.file}:${issue.line || ''}`,
      category: catMap[issue.category] || IssueCategory.CodeQuality,
      severity: sevMap[issue.severity] || IssueSeverity.Low,
      status: IssueStatus.Identified,
      location: { file: issue.file, line: issue.line },
      tags: [issue.tool, issue.category].filter(Boolean) as string[],
      createdBy: 'audit-agent',
    });
  }
  const issueStats = issueManager.getStatistics(projectId);
  console.log(`  登録: ${issueStats.total}件 (Critical=${issueStats.bySeverity[IssueSeverity.Critical] || 0}, High=${issueStats.bySeverity[IssueSeverity.High] || 0})`);

  // Step 5: 改善提案
  const recommendations = [];
  if ((issueStats.bySeverity[IssueSeverity.Critical] || 0) > 0)
    recommendations.push({ priority: 'critical', title: 'Critical問題の即時修正', description: `${issueStats.bySeverity[IssueSeverity.Critical]}件のCritical問題を最優先で修正`, effort: '1-3日', impact: 'セキュリティリスクの排除' });
  if ((issueStats.bySeverity[IssueSeverity.High] || 0) > 0)
    recommendations.push({ priority: 'high', title: 'High問題の早期修正', description: `${issueStats.bySeverity[IssueSeverity.High]}件のHigh問題を早期に修正`, effort: '1-2週間', impact: 'コード品質・セキュリティの改善' });
  recommendations.push({ priority: 'low', title: 'コードドキュメンテーションの充実', description: 'コメント追加を推奨', effort: '1週間', impact: '保守性向上' });

  // Step 6: レポート生成
  console.log('[Step 6] レポート生成...');
  const reportGenerator = new ReportGenerator();
  const reportConfig = {
    projectName: PROJECT_NAME,
    customerName: CUSTOMER_NAME,
    date: new Date(),
    author: 'IT Supervisor 監査エージェント',
    version: '1.0',
    data: {
      repository: { name: PROJECT_NAME, hasGit: repoResult.metadata.hasGit, hasCI: repoResult.metadata.hasCI, hasDockerfile: repoResult.metadata.hasDockerfile },
      summary: {
        totalFiles: repoResult.fileStats.totalFiles,
        totalLines: repoResult.fileStats.totalLines,
        totalCodeLines: repoResult.fileStats.totalCodeLines,
        totalIssues: issueStats.total,
        criticalIssues: issueStats.bySeverity[IssueSeverity.Critical] || 0,
        highIssues: issueStats.bySeverity[IssueSeverity.High] || 0,
        mediumIssues: issueStats.bySeverity[IssueSeverity.Medium] || 0,
        lowIssues: issueStats.bySeverity[IssueSeverity.Low] || 0,
      },
      languages: repoResult.techStack.languages.map(l => ({ name: l.name, percentage: l.percentage, lines: l.lines })),
      frameworks: repoResult.techStack.frameworks.map(f => ({ name: f.name, version: f.version || '不明', confidence: f.confidence })),
      securityIssues: staticResult.allIssues
        .filter(i => i.severity === 'critical' || i.severity === 'high')
        .map(i => ({ severity: i.severity, category: i.category, title: i.message, file: `${i.file}:${i.line || ''}`, recommendation: i.fix?.description || '手動確認が必要' })),
      qualityMetrics: [
        { name: '総ファイル数', value: repoResult.fileStats.totalFiles, unit: 'files', status: 'info' },
        { name: '総コード行数', value: repoResult.fileStats.totalCodeLines, unit: 'lines', status: 'info' },
        { name: 'Critical問題数', value: issueStats.bySeverity[IssueSeverity.Critical] || 0, unit: 'issues', status: (issueStats.bySeverity[IssueSeverity.Critical] || 0) > 0 ? 'danger' : 'good' },
        { name: '依存パッケージ数', value: repoResult.techStack.dependencies.length, unit: 'packages', status: 'good' },
      ],
      recommendations,
      issues: issueManager.searchIssues({ projectId, orderBy: 'severity', order: 'desc', limit: 50 }),
    },
  };

  const report = await reportGenerator.generate(ReportType.Analysis, reportConfig);
  const mdPath = path.join(OUTPUT_DIR, 'reports', 'audit-report.md');
  const htmlPath = path.join(OUTPUT_DIR, 'reports', 'audit-report.html');
  await reportGenerator.exportToMarkdown(report, mdPath);
  await reportGenerator.exportToHTML(report, htmlPath);

  // Step 7: 完了
  metricsDb.exportToJSONFile(path.join(OUTPUT_DIR, 'metrics-export.json'));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'issues-export.csv'), issueManager.exportToCSV(projectId));
  metricsDb.close();
  issueManager.close();

  console.log(`[完了] 出力先: ${OUTPUT_DIR}`);
}

main().catch(e => { console.error(e); process.exit(1); });
