/**
 * IT資産監査パイプライン（第2回実行）
 *
 * 使用方法:
 *   cd tools
 *   npx tsx scripts/run-audit-2.ts
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

// ── 入力パラメータ ──────────────────────────────────────
const TARGET_REPO_PATH = String.raw`C:\workspace\new_business\it_supervisor\demo\aspnet-legacy-system`;
const PROJECT_NAME = '顧客Webアプリ';
const CUSTOMER_NAME = '株式会社サンプル';
const OUTPUT_DIR = String.raw`C:\workspace\new_business\it_supervisor\demo\aspnet-legacy-system_output_2`;

// ── メイン処理 ──────────────────────────────────────────
async function main() {
  // ================================================================
  // Step 1: 初期化
  // ================================================================
  console.log('\n[Step 1] 初期化...');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, 'reports'), { recursive: true });

  const dbPath = path.join(OUTPUT_DIR, 'audit.db');
  const logger = createLogger('audit-pipeline', { level: LogLevel.INFO });
  const metricsDb = new MetricsDatabase(dbPath);
  const issueManager = new IssueManager(dbPath);

  logger.info('監査パイプライン開始', { target: TARGET_REPO_PATH });

  const project = metricsDb.createProject({
    name: PROJECT_NAME,
    description: `${CUSTOMER_NAME} - IT資産監査`,
    metadata: { path: TARGET_REPO_PATH, startedAt: new Date().toISOString() },
  });

  const projectId = project.id;
  const timestamp = new Date();

  console.log(`  プロジェクトID: ${projectId}`);
  console.log('  [Step 1 完了] プロジェクト初期化成功\n');

  // ================================================================
  // Step 2: リポジトリ解析
  // ================================================================
  console.log('[Step 2] リポジトリ解析...');

  const repoAnalyzer = new RepositoryAnalyzer();
  let repoResult;
  try {
    repoResult = await repoAnalyzer.analyzeLocal(TARGET_REPO_PATH, {
      includeGitHistory: true,
      includeDependencies: true,
      excludePatterns: ['node_modules', '.git', 'dist', 'vendor', 'coverage'],
    });
  } catch (error) {
    // Gitリポジトリではない場合のフォールバック
    logger.warn('Git履歴付き解析に失敗、Git無しで再試行します');
    repoResult = await repoAnalyzer.analyzeLocal(TARGET_REPO_PATH, {
      includeGitHistory: false,
      includeDependencies: true,
      excludePatterns: ['node_modules', '.git', 'dist', 'vendor', 'coverage'],
    });
  }

  // メトリクスDB保存
  const repoMetrics = [
    { name: 'total_files', value: repoResult.fileStats.totalFiles },
    { name: 'total_lines', value: repoResult.fileStats.totalLines },
    { name: 'total_code_lines', value: repoResult.fileStats.totalCodeLines },
    { name: 'total_comment_lines', value: repoResult.fileStats.totalCommentLines },
    { name: 'language_count', value: repoResult.techStack.languages.length },
    { name: 'framework_count', value: repoResult.techStack.frameworks.length },
    { name: 'dependency_count', value: repoResult.techStack.dependencies.length },
  ];

  if (repoResult.gitHistory) {
    repoMetrics.push(
      { name: 'total_commits', value: repoResult.gitHistory.totalCommits },
      { name: 'contributor_count', value: repoResult.gitHistory.contributors.length },
    );
  }

  metricsDb.recordMetricsBatch(
    repoMetrics.map((m) => ({
      projectId,
      timestamp,
      category: MetricCategory.CodeQuality,
      name: m.name,
      value: m.value,
      unit: 'count',
      source: 'repo-analyzer',
    })),
  );

  // ログ出力
  const langSummary = repoResult.techStack.languages
    .map((l) => `${l.name} (${l.percentage.toFixed(0)}%)`)
    .join(', ');
  const fwSummary = repoResult.techStack.frameworks.map((f) => f.name).join(', ') || 'なし';
  console.log(`  [リポジトリ解析完了]`);
  console.log(`    検出言語: ${langSummary}`);
  console.log(`    フレームワーク: ${fwSummary}`);
  console.log(`    総ファイル数: ${repoResult.fileStats.totalFiles}`);
  console.log(`    総行数: ${repoResult.fileStats.totalLines.toLocaleString()}`);
  if (repoResult.gitHistory) {
    console.log(`    コミット数: ${repoResult.gitHistory.totalCommits}`);
    console.log(`    コントリビューター: ${repoResult.gitHistory.contributors.length}名`);
  }
  console.log('');

  // ================================================================
  // Step 3: 静的解析
  // ================================================================
  console.log('[Step 3] 静的解析...');

  const staticAnalyzer = new StaticAnalyzer();

  // ツール選択ロジック
  const tools: AnalyzerTool[] = [];
  const languageNames = repoResult.techStack.languages.map((l) => l.name.toLowerCase());

  if (languageNames.some((l) => ['javascript', 'typescript'].includes(l))) {
    tools.push(AnalyzerTool.ESLint);
  }
  if (languageNames.includes('php')) {
    tools.push(
      AnalyzerTool.PHPStan,
      AnalyzerTool.PHPCodeSniffer,
      AnalyzerTool.Psalm,
      AnalyzerTool.PHPMessDetector,
      AnalyzerTool.PHPCPD,
      AnalyzerTool.Progpilot,
      AnalyzerTool.ComposerAudit,
    );
  }
  if (languageNames.includes('c#')) {
    tools.push(AnalyzerTool.RoslynAnalyzer);
  }

  // 共通セキュリティ・品質ツール
  tools.push(AnalyzerTool.Gitleaks);
  tools.push(AnalyzerTool.Semgrep);

  // SonarQube（環境変数がある場合のみ）
  if (process.env.SONARQUBE_URL) {
    tools.push(AnalyzerTool.SonarQube);
  }

  // Python / Django 検出
  if (languageNames.includes('python')) {
    tools.push(AnalyzerTool.Bandit, AnalyzerTool.Pylint, AnalyzerTool.Radon, AnalyzerTool.Opengrep);
    if (fs.existsSync(path.join(TARGET_REPO_PATH, 'requirements.txt'))) {
      tools.push(AnalyzerTool.PipAudit);
    }
    if (fs.existsSync(path.join(TARGET_REPO_PATH, 'manage.py'))) {
      tools.push(AnalyzerTool.DjangoCheckDeploy);
    }
  }

  let staticResult;
  try {
    staticResult = await staticAnalyzer.analyzeWithProgress(
      TARGET_REPO_PATH,
      {
        tools,
        parallel: true,
        timeout: 300000,
        removeDuplicates: true,
        excludePatterns: ['node_modules', 'dist', 'vendor', 'coverage', '__tests__'],
      },
      (progress) => {
        logger.info(`解析中: ${progress.tool} (${progress.current}/${progress.total})`);
      },
    );
  } catch (error) {
    // タイムアウト時の再試行
    logger.warn('静的解析タイムアウト、延長して再試行します');
    staticResult = await staticAnalyzer.analyzeWithProgress(
      TARGET_REPO_PATH,
      {
        tools,
        parallel: true,
        timeout: 600000,
        removeDuplicates: true,
        excludePatterns: ['node_modules', 'dist', 'vendor', 'coverage', '__tests__'],
      },
      (progress) => {
        logger.info(`解析中: ${progress.tool} (${progress.current}/${progress.total})`);
      },
    );
  }

  // セキュリティメトリクスを記録
  const severities = ['critical', 'high', 'medium', 'low', 'info'] as const;
  for (const severity of severities) {
    metricsDb.recordMetric({
      projectId,
      timestamp,
      category: MetricCategory.Security,
      name: `issues_${severity}`,
      value: staticResult.summary.bySeverity[severity] || 0,
      unit: 'count',
      source: 'static-analyzer',
    });
  }

  const toolNames = staticResult.toolResults.map((r) => r.tool).join(', ');
  console.log(`  [静的解析完了]`);
  console.log(`    実行ツール: ${toolNames}`);
  console.log(`    総問題数: ${staticResult.summary.totalIssues}`);
  console.log(`      Critical: ${staticResult.summary.bySeverity.critical || 0}`);
  console.log(`      High:     ${staticResult.summary.bySeverity.high || 0}`);
  console.log(`      Medium:   ${staticResult.summary.bySeverity.medium || 0}`);
  console.log(`      Low:      ${staticResult.summary.bySeverity.low || 0}`);
  console.log(`    解析時間: ${(staticResult.summary.executionTime / 1000).toFixed(1)}秒`);
  console.log('');

  // ================================================================
  // Step 4: Issue登録
  // ================================================================
  console.log('[Step 4] Issue登録...');

  function mapToIssueCategory(category: string): IssueCategory {
    const mapping: Record<string, IssueCategory> = {
      security: IssueCategory.Security,
      performance: IssueCategory.Performance,
      code_quality: IssueCategory.CodeQuality,
      best_practice: IssueCategory.CodeQuality,
      maintainability: IssueCategory.TechnicalDebt,
      complexity: IssueCategory.TechnicalDebt,
      documentation: IssueCategory.Enhancement,
    };
    return mapping[category] || IssueCategory.CodeQuality;
  }

  function mapToIssueSeverity(severity: string): IssueSeverity {
    const mapping: Record<string, IssueSeverity> = {
      critical: IssueSeverity.Critical,
      high: IssueSeverity.High,
      medium: IssueSeverity.Medium,
      low: IssueSeverity.Low,
      info: IssueSeverity.Low,
      error: IssueSeverity.High,
      warning: IssueSeverity.Medium,
    };
    return mapping[severity] || IssueSeverity.Low;
  }

  const createdIssueIds: string[] = [];

  for (const issue of staticResult.allIssues) {
    const created = issueManager.createIssue({
      projectId,
      title: `[${issue.tool}] ${issue.message}`,
      description: [
        `**ファイル**: ${issue.file}${issue.line ? `:${issue.line}` : ''}`,
        `**ルール**: ${issue.rule || 'N/A'}`,
        `**ツール**: ${issue.tool}`,
        issue.snippet ? `\n\`\`\`\n${issue.snippet}\n\`\`\`` : '',
        issue.fix?.description ? `\n**修正案**: ${issue.fix.description}` : '',
        issue.cwe?.length ? `\n**CWE**: ${issue.cwe.join(', ')}` : '',
        issue.cve?.length ? `\n**CVE**: ${issue.cve.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      category: mapToIssueCategory(issue.category),
      severity: mapToIssueSeverity(issue.severity),
      status: IssueStatus.Identified,
      location: {
        file: issue.file,
        line: issue.line,
        column: issue.column,
      },
      tags: [issue.tool, issue.category, issue.rule].filter(Boolean) as string[],
      createdBy: 'audit-agent',
    });
    createdIssueIds.push(created.id);
  }

  const issueStats = issueManager.getStatistics(projectId);

  console.log(`  [Issue登録完了]`);
  console.log(`    登録数: ${issueStats.total}件`);
  console.log(
    `    重要度別: Critical=${issueStats.bySeverity[IssueSeverity.Critical] || 0}, High=${issueStats.bySeverity[IssueSeverity.High] || 0}, Medium=${issueStats.bySeverity[IssueSeverity.Medium] || 0}, Low=${issueStats.bySeverity[IssueSeverity.Low] || 0}`,
  );
  console.log(
    `    カテゴリ別: Security=${issueStats.byCategory[IssueCategory.Security] || 0}, CodeQuality=${issueStats.byCategory[IssueCategory.CodeQuality] || 0}, TechnicalDebt=${issueStats.byCategory[IssueCategory.TechnicalDebt] || 0}, Performance=${issueStats.byCategory[IssueCategory.Performance] || 0}`,
  );
  console.log('');

  // ================================================================
  // Step 5: 改善提案の生成
  // ================================================================
  console.log('[Step 5] 改善提案の生成...');

  interface Recommendation {
    priority: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    effort: string;
    impact: string;
  }

  const recommendations: Recommendation[] = [];

  // Critical問題がある場合
  if ((issueStats.bySeverity[IssueSeverity.Critical] || 0) > 0) {
    recommendations.push({
      priority: 'critical',
      title: 'Critical セキュリティ問題の即座の修正',
      description: `${issueStats.bySeverity[IssueSeverity.Critical]}件のCritical問題が検出されました。セキュリティリスクが高いため、最優先で対応してください。`,
      effort: '1-3日',
      impact: 'セキュリティリスクの排除',
    });
  }

  // High問題がある場合
  if ((issueStats.bySeverity[IssueSeverity.High] || 0) > 0) {
    recommendations.push({
      priority: 'high',
      title: 'High レベル問題の早期修正',
      description: `${issueStats.bySeverity[IssueSeverity.High]}件のHigh問題が検出されました。品質とセキュリティの維持のため、早期対応を推奨します。`,
      effort: '1-2週間',
      impact: 'コード品質・セキュリティの大幅改善',
    });
  }

  // 依存関係が多い場合
  if (repoResult.techStack.dependencies.length > 50) {
    recommendations.push({
      priority: 'medium',
      title: '依存関係の整理',
      description: `${repoResult.techStack.dependencies.length}件の依存関係が検出されました。不要な依存の削除とバージョンの最新化を推奨します。`,
      effort: '2-3日',
      impact: 'セキュリティリスク低減・ビルド高速化',
    });
  }

  // コメント率が低い場合
  const commentRatio =
    repoResult.fileStats.totalCommentLines / repoResult.fileStats.totalLines || 0;
  if (commentRatio < 0.1) {
    recommendations.push({
      priority: 'low',
      title: 'コードドキュメンテーションの充実',
      description: `コメント率が${(commentRatio * 100).toFixed(1)}%と低めです。主要なビジネスロジックへのコメント追加を推奨します。`,
      effort: '1週間',
      impact: '保守性・チーム開発効率の向上',
    });
  }

  // CI/CD未設定
  if (!repoResult.metadata.hasCI) {
    recommendations.push({
      priority: 'medium',
      title: 'CI/CDパイプラインの導入',
      description:
        'CI/CD設定が検出されませんでした。自動テスト・ビルド・デプロイの導入を推奨します。',
      effort: '2-3日',
      impact: '開発生産性・品質の安定化',
    });
  }

  // Dockerfile未設定
  if (!repoResult.metadata.hasDockerfile) {
    recommendations.push({
      priority: 'low',
      title: 'コンテナ化の検討',
      description:
        'Dockerfileが検出されませんでした。環境の標準化・デプロイの自動化のため、コンテナ化を推奨します。',
      effort: '1-2日',
      impact: 'デプロイ効率化・環境差異の排除',
    });
  }

  console.log(`  改善提案数: ${recommendations.length}件`);
  for (const rec of recommendations) {
    console.log(`    [${rec.priority.toUpperCase()}] ${rec.title}`);
  }
  console.log('');

  // ================================================================
  // Step 6: レポート生成
  // ================================================================
  console.log('[Step 6] レポート生成...');

  const reportGenerator = new ReportGenerator();

  const reportConfig = {
    projectName: PROJECT_NAME,
    customerName: CUSTOMER_NAME,
    date: new Date(),
    author: 'IT Supervisor 監査エージェント',
    version: '1.0',
    data: {
      repository: {
        name: PROJECT_NAME,
        path: TARGET_REPO_PATH,
        hasGit: repoResult.metadata.hasGit,
        hasCI: repoResult.metadata.hasCI,
        hasDockerfile: repoResult.metadata.hasDockerfile,
      },
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
      languages: repoResult.techStack.languages.map((l) => ({
        name: l.name,
        percentage: l.percentage,
        lines: l.lines,
      })),
      frameworks: repoResult.techStack.frameworks.map((f) => ({
        name: f.name,
        version: f.version || '不明',
        confidence: f.confidence,
      })),
      securityIssues: staticResult.allIssues
        .filter((i) => i.severity === 'critical' || i.severity === 'high')
        .map((i) => ({
          severity: i.severity,
          category: i.category,
          title: i.message,
          description: i.rule || '',
          file: `${i.file}${i.line ? `:${i.line}` : ''}`,
          recommendation: i.fix?.description || '手動確認が必要',
        })),
      qualityMetrics: [
        {
          name: '総ファイル数',
          value: repoResult.fileStats.totalFiles,
          unit: 'files',
          status: 'info',
        },
        {
          name: '総コード行数',
          value: repoResult.fileStats.totalCodeLines,
          unit: 'lines',
          status: 'info',
        },
        {
          name: 'Critical問題数',
          value: issueStats.bySeverity[IssueSeverity.Critical] || 0,
          unit: 'issues',
          status:
            (issueStats.bySeverity[IssueSeverity.Critical] || 0) > 0 ? 'danger' : 'good',
        },
        {
          name: '依存パッケージ数',
          value: repoResult.techStack.dependencies.length,
          unit: 'packages',
          status: repoResult.techStack.dependencies.length > 100 ? 'warning' : 'good',
        },
      ],
      recommendations,
      issues: issueManager.searchIssues({
        projectId,
        orderBy: 'severity',
        order: 'desc',
        limit: 50,
      }),
    },
  };

  const htmlPath = path.join(OUTPUT_DIR, 'reports', 'audit-report.html');
  const mdPath = path.join(OUTPUT_DIR, 'reports', 'audit-report.md');

  const report = await reportGenerator.generate(ReportType.Analysis, reportConfig);

  await reportGenerator.exportToHTML(report, htmlPath);
  await reportGenerator.exportToMarkdown(report, mdPath);

  logger.info('レポート生成完了', { html: htmlPath, markdown: mdPath });

  // PDF生成（オプション）
  try {
    const pdfPath = path.join(OUTPUT_DIR, 'reports', 'audit-report.pdf');
    await reportGenerator.exportToPDF(report, pdfPath);
    logger.info('PDF生成完了', { pdf: pdfPath });
  } catch {
    logger.warn('PDF生成スキップ（Puppeteer未インストール）');
  }

  console.log(`  [レポート生成完了]`);
  console.log(`    HTML: ${htmlPath}`);
  console.log(`    Markdown: ${mdPath}`);
  console.log('');

  // ================================================================
  // Step 7: 完了処理
  // ================================================================
  console.log('[Step 7] 完了処理...');

  metricsDb.exportToJSONFile(path.join(OUTPUT_DIR, 'metrics-export.json'));
  const issuesCsv = issueManager.exportToCSV(projectId);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'issues-export.csv'), issuesCsv);

  metricsDb.close();
  issueManager.close();

  logger.info('監査パイプライン完了');

  // 最終サマリ
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  IT資産監査 完了レポート
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  プロジェクト: ${PROJECT_NAME}
  顧客: ${CUSTOMER_NAME}
  対象: ${TARGET_REPO_PATH}
  実行日: ${dateStr}

  ■ リポジトリ概要
    言語: ${langSummary}
    フレームワーク: ${fwSummary}
    ファイル数: ${repoResult.fileStats.totalFiles} / コード行数: ${repoResult.fileStats.totalCodeLines.toLocaleString()}

  ■ 検出された問題
    Critical: ${issueStats.bySeverity[IssueSeverity.Critical] || 0}件
    High:     ${issueStats.bySeverity[IssueSeverity.High] || 0}件
    Medium:   ${issueStats.bySeverity[IssueSeverity.Medium] || 0}件
    Low:      ${issueStats.bySeverity[IssueSeverity.Low] || 0}件
    合計:     ${issueStats.total}件

  ■ 改善提案: ${recommendations.length}件

  ■ 成果物
    ${OUTPUT_DIR}/audit.db              (メトリクス・IssueDB)
    ${OUTPUT_DIR}/metrics-export.json   (メトリクスバックアップ)
    ${OUTPUT_DIR}/issues-export.csv     (Issue一覧CSV)
    ${OUTPUT_DIR}/reports/audit-report.html
    ${OUTPUT_DIR}/reports/audit-report.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

// エントリーポイント
main().catch((error) => {
  console.error('監査パイプラインでエラーが発生しました:', error);
  process.exit(1);
});
