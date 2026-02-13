import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { createLogger, LogLevel } from '@it-supervisor/logger';
import {
  AnalysisResult,
  AnalysisOptions,
  ToolResult,
  AnalysisIssue,
  AnalysisSummary,
  AnalyzerTool,
  Severity,
  IssueCategory,
  ToolConfig
} from './types.js';

const execFileAsync = promisify(execFile);
const logger = createLogger('static-analyzer', {
  level: process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.WARN,
});

// デフォルトのタイムアウト（ミリ秒）
const DEFAULT_TIMEOUT = 300000; // 5分

// 外部ツール出力の型定義

interface ESLintMessage {
  ruleId?: string;
  severity: number;
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  fix?: {
    text: string;
    range: [number, number];
  };
}

interface ESLintResult {
  filePath: string;
  messages: ESLintMessage[];
  errorCount?: number;
  warningCount?: number;
}

interface PHPStanError {
  message: string;
  line: number;
  identifier?: string;
  tip?: string;
  ignorable?: boolean;
}

interface PHPStanFileData {
  errors: PHPStanError[];
  messages?: string[];
}

interface PHPStanResult {
  totals?: {
    errors: number;
    file_errors: number;
  };
  files?: Record<string, PHPStanFileData>;
  errors?: (string | { message: string })[];
}

interface PHPCSFile {
  errors: number;
  warnings: number;
  messages: Array<{
    message: string;
    source: string;
    severity: number;
    type: 'ERROR' | 'WARNING';
    line: number;
    column: number;
    fixable?: boolean;
  }>;
}

interface PHPCSResult {
  totals?: {
    errors: number;
    warnings: number;
    fixable: number;
  };
  files?: Record<string, PHPCSFile>;
}

interface SnykVulnerability {
  id: string;
  title: string;
  severity: string;
  packageName?: string;
  version?: string;
  from?: string[];
  upgradePath?: unknown[];
  isUpgradable?: boolean;
  isPatchable?: boolean;
  CVSSv3?: string;
  credit?: string[];
  description?: string;
  fixedIn?: string[];
  identifiers?: {
    CVE?: string[];
    CWE?: string[];
  };
  url?: string;
}

interface SnykResult {
  vulnerabilities?: SnykVulnerability[];
  error?: string;
  ok?: boolean;
}

interface GitleaksFinding {
  Description?: string;
  RuleID?: string;
  Match?: string;
  Secret?: string;
  File?: string;
  SymlinkFile?: string;
  Commit?: string;
  Entropy?: number;
  Author?: string;
  Email?: string;
  Date?: string;
  Message?: string;
  Tags?: string[];
  Line?: string;
  Fingerprint?: string;
  StartLine?: number;
  StartColumn?: number;
  EndLine?: number;
  EndColumn?: number;
}

/**
 * 静的解析オーケストレータークラス
 */
export class StaticAnalyzer {
  private toolConfigs: Map<AnalyzerTool, ToolConfig>;

  constructor() {
    this.toolConfigs = this.initializeToolConfigs();
  }

  /**
   * 静的解析を実行
   *
   * @param repoPath - 解析対象のリポジトリパス
   * @param options - 解析オプション（ツール選択、並列実行など）
   * @returns 解析結果（問題一覧、サマリー、統計情報）
   * @throws リポジトリパスが存在しない場合
   *
   * @example
   * ```typescript
   * const analyzer = new StaticAnalyzer();
   * const result = await analyzer.analyze('/path/to/repo', {
   *   tools: [AnalyzerTool.ESLint, AnalyzerTool.Gitleaks],
   *   parallel: true
   * });
   * console.log(`Found ${result.summary.totalIssues} issues`);
   * ```
   */
  async analyze(
    repoPath: string,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const absolutePath = path.resolve(repoPath);

    // ディレクトリの存在確認
    try {
      await fs.access(absolutePath);
    } catch (_error) {
      throw new Error(`Repository path not found: ${absolutePath}`);
    }

    // 実行するツールを決定
    const toolsToRun = options.tools || await this.selectTools(absolutePath);

    // ツール実行
    const toolResults = options.parallel
      ? await this.runToolsParallel(absolutePath, toolsToRun, options)
      : await this.runToolsSequential(absolutePath, toolsToRun, options);

    // 全問題を集約
    let allIssues: AnalysisIssue[] = [];
    toolResults.forEach(result => {
      allIssues.push(...result.issues);
    });

    // 重複除去
    let duplicatesRemoved = 0;
    if (options.removeDuplicates !== false) {
      const { unique, removed } = this.removeDuplicateIssues(allIssues);
      allIssues = unique;
      duplicatesRemoved = removed;
    }

    // サマリー作成
    const summary = this.createSummary(toolResults, allIssues, Date.now() - startTime);

    return {
      analyzedAt: new Date(),
      repoPath: absolutePath,
      toolResults,
      allIssues,
      summary,
      duplicatesRemoved
    };
  }

  /**
   * ツールを並列実行
   */
  private async runToolsParallel(
    repoPath: string,
    tools: AnalyzerTool[],
    options: AnalysisOptions
  ): Promise<ToolResult[]> {
    const promises = tools.map(tool => this.runTool(repoPath, tool, options));
    return Promise.all(promises);
  }

  /**
   * ツールを順次実行
   */
  private async runToolsSequential(
    repoPath: string,
    tools: AnalyzerTool[],
    options: AnalysisOptions
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const tool of tools) {
      const result = await this.runTool(repoPath, tool, options);
      results.push(result);
    }

    return results;
  }

  /**
   * 単一ツールを実行
   */
  private async runTool(
    repoPath: string,
    tool: AnalyzerTool,
    options: AnalysisOptions
  ): Promise<ToolResult> {
    const config = this.toolConfigs.get(tool);

    if (!config || !config.enabled) {
      return {
        tool,
        success: false,
        executionTime: 0,
        issues: [],
        error: 'Tool not configured or disabled'
      };
    }

    const startTime = Date.now();

    try {
      // ツール実行（実際の実装ではDockerコンテナ内で実行）
      const issues = await this.executeToolAnalysis(repoPath, tool, config, options);

      return {
        tool,
        success: true,
        executionTime: Date.now() - startTime,
        issues,
        metadata: {
          version: 'unknown' // 実際にはツールのバージョンを取得
        }
      };
    } catch (error) {
      return {
        tool,
        success: false,
        executionTime: Date.now() - startTime,
        issues: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * ツール解析を実行（プロトタイプ実装）
   */
  private async executeToolAnalysis(
    repoPath: string,
    tool: AnalyzerTool,
    config: ToolConfig,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    // プロトタイプ実装：実際にはツールを実行して結果をパース
    // ここではダミーデータを返す

    switch (tool) {
      case AnalyzerTool.ESLint:
        return this.runESLint(repoPath, options);

      case AnalyzerTool.Snyk:
        return this.runSnyk(repoPath, options);

      case AnalyzerTool.Gitleaks:
        return this.runGitleaks(repoPath, options);

      case AnalyzerTool.PHPStan:
        return this.runPHPStan(repoPath, options);

      case AnalyzerTool.PHPCodeSniffer:
        return this.runPHPCS(repoPath, options);

      default:
        // その他のツールは未実装
        return [];
    }
  }

  /**
   * PHPStan実行（実装版）
   */
  private async runPHPStan(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      // composer.jsonの存在確認
      const composerJsonPath = path.join(repoPath, 'composer.json');
      if (!await this.fileExists(composerJsonPath)) {
        return [];
      }

      // PHPStanコマンド実行
      // Docker経由またはローカルで実行
      let command: string;
      let args: string[];
      if (options.useDocker) {
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPath}:/app`,
          '-w', '/app',
          'ghcr.io/phpstan/phpstan',
          'analyse', '--error-format=json', '--no-progress'
        ];
      } else {
        command = './vendor/bin/phpstan';
        args = ['analyse', '--error-format=json', '--no-progress'];
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;

      const { stdout } = await execFileAsync(command, args, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        // PHPStanは問題があるとexit code 1を返す
        return { stdout: error.stdout || '{"files":{},"errors":[]}', stderr: error.stderr || '' };
      });

      // 結果をパース
      let result: PHPStanResult;
      try {
        result = JSON.parse(stdout || '{"files":{},"errors":[]}') as PHPStanResult;
      } catch (parseError) {
        logger.error('Failed to parse PHPStan output:', parseError);
        return [];
      }

      return this.parsePHPStanResults(result, repoPath);
    } catch (error) {
      logger.error('PHPStan execution failed:', error);
      return [];
    }
  }

  /**
   * PHPStan結果をパース
   */
  private parsePHPStanResults(result: PHPStanResult, __repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    // ファイルごとのエラーを解析
    issues.push(...this.parsePHPStanFileErrors(result));

    // グローバルエラーを解析
    issues.push(...this.parsePHPStanGlobalErrors(result));

    return issues;
  }

  /**
   * PHPStanファイルごとのエラーを解析
   */
  private parsePHPStanFileErrors(result: PHPStanResult): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    if (result.files) {
      for (const [filePath, fileData] of Object.entries(result.files)) {
        if (!fileData.errors) continue;

        for (const error of fileData.errors) {
          const severity = this.mapPHPStanSeverity(error);
          const category = this.categorizePHPStanError(error.message);

          issues.push({
            id: randomUUID(),
            tool: AnalyzerTool.PHPStan,
            severity,
            category,
            rule: error.identifier || 'phpstan-error',
            message: error.message,
            file: filePath,
            line: error.line,
            snippet: error.tip,
            fix: error.tip ? {
              available: true,
              description: error.tip
            } : undefined
          });
        }
      }
    }

    return issues;
  }

  /**
   * PHPStanグローバルエラーを解析
   */
  private parsePHPStanGlobalErrors(result: PHPStanResult): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    if (result.errors && Array.isArray(result.errors)) {
      for (const error of result.errors) {
        issues.push({
          id: randomUUID(),
          tool: AnalyzerTool.PHPStan,
          severity: Severity.High,
          category: IssueCategory.CodeQuality,
          rule: 'phpstan-global-error',
          message: typeof error === 'string' ? error : error.message,
          file: 'global'
        });
      }
    }

    return issues;
  }

  /**
   * PHPStanの重要度をマッピング
   */
  private mapPHPStanSeverity(error: PHPStanError): Severity {
    const message = error.message?.toLowerCase() || '';

    // セキュリティ関連は高優先度
    if (message.includes('sql') || message.includes('injection') || message.includes('xss')) {
      return Severity.Critical;
    }

    // 型エラーは中優先度
    if (message.includes('type') || message.includes('parameter') || message.includes('return')) {
      return Severity.Medium;
    }

    // 未定義変数は高優先度
    if (message.includes('undefined variable') || message.includes('does not exist')) {
      return Severity.High;
    }

    return Severity.Medium;
  }

  /**
   * PHPStanエラーをカテゴリ分類
   */
  private categorizePHPStanError(message: string): IssueCategory {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('security') || lowerMessage.includes('sql') ||
        lowerMessage.includes('injection') || lowerMessage.includes('xss')) {
      return IssueCategory.Security;
    }

    if (lowerMessage.includes('deprecated')) {
      return IssueCategory.Maintainability;
    }

    if (lowerMessage.includes('complexity') || lowerMessage.includes('too many')) {
      return IssueCategory.Complexity;
    }

    return IssueCategory.CodeQuality;
  }

  /**
   * PHP_CodeSniffer実行（実装版）
   */
  private async runPHPCS(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      // PHPファイルの存在確認
      const files = await fs.readdir(repoPath).catch(() => []);
      const hasPhpFiles = files.some(f => f.endsWith('.php')) ||
        await this.fileExists(path.join(repoPath, 'composer.json'));

      if (!hasPhpFiles) {
        return [];
      }

      // PHPCSコマンド実行
      let command: string;
      let args: string[];
      if (options.useDocker) {
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPath}:/app`,
          '-w', '/app',
          'php:8.2-cli',
          'php', './vendor/bin/phpcs',
          '--report=json', '--standard=PSR12'
        ];
      } else {
        command = './vendor/bin/phpcs';
        args = ['--report=json', '--standard=PSR12'];
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;

      const { stdout } = await execFileAsync(command, args, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        // PHPCSは問題があるとexit code 1を返す
        return { stdout: error.stdout || '{"files":{},"totals":{}}', stderr: error.stderr || '' };
      });

      // 結果をパース
      let result: PHPCSResult;
      try {
        result = JSON.parse(stdout || '{"files":{},"totals":{}}') as PHPCSResult;
      } catch (parseError) {
        logger.error('Failed to parse PHPCS output:', parseError);
        return [];
      }

      return this.parsePHPCSResults(result, repoPath);
    } catch (error) {
      logger.error('PHP_CodeSniffer execution failed:', error);
      return [];
    }
  }

  /**
   * PHPCS結果をパース
   */
  private parsePHPCSResults(result: PHPCSResult, _repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    if (!result.files) return issues;

    for (const [filePath, fileData] of Object.entries(result.files as Record<string, PHPCSFile>)) {
      if (!fileData.messages) continue;

      for (const message of fileData.messages) {
        const severity = this.mapPHPCSSeverity(message.type);
        const category = this.categorizePHPCSRule(message.source);

        issues.push({
          id: randomUUID(),
          tool: AnalyzerTool.PHPCodeSniffer,
          severity,
          category,
          rule: message.source || 'phpcs-error',
          message: message.message,
          file: filePath,
          line: message.line,
          column: message.column,
          fix: message.fixable ? {
            available: true,
            description: 'Auto-fixable with phpcbf'
          } : undefined
        });
      }
    }

    return issues;
  }

  /**
   * PHPCSの重要度をマッピング
   */
  private mapPHPCSSeverity(phpcsType: string): Severity {
    switch (phpcsType.toUpperCase()) {
      case 'ERROR':
        return Severity.High;
      case 'WARNING':
        return Severity.Medium;
      default:
        return Severity.Low;
    }
  }

  /**
   * PHPCSルールをカテゴリ分類
   */
  private categorizePHPCSRule(source: string | null): IssueCategory {
    if (!source) return IssueCategory.CodeQuality;

    const lowerSource = source.toLowerCase();

    if (lowerSource.includes('security')) {
      return IssueCategory.Security;
    }

    if (lowerSource.includes('performance')) {
      return IssueCategory.Performance;
    }

    if (lowerSource.includes('complexity') || lowerSource.includes('npath')) {
      return IssueCategory.Complexity;
    }

    if (lowerSource.includes('documentation') || lowerSource.includes('comment')) {
      return IssueCategory.Documentation;
    }

    return IssueCategory.CodeQuality;
  }

  /**
   * ESLint実行（実装版）
   */
  private async runESLint(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      // package.jsonの存在確認
      const packageJsonPath = path.join(repoPath, 'package.json');
      await fs.access(packageJsonPath);

      // ESLintコマンド実行
      const command = 'npx';
      const args = [
        'eslint',
        repoPath,
        '--format', 'json',
        '--ext', '.js,.ts,.jsx,.tsx'
      ];

      const timeout = options.timeout || DEFAULT_TIMEOUT;

      const { stdout } = await execFileAsync(command, args, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        // ESLintは問題があるとexit code 1を返すので、エラーを無視
        return { stdout: error.stdout || '[]', stderr: error.stderr || '' };
      });

      // 結果をパース
      let results: ESLintResult[];
      try {
        results = JSON.parse(stdout || '[]') as ESLintResult[];
      } catch (parseError) {
        logger.error('Failed to parse ESLint output:', parseError);
        return [];
      }

      return this.parseESLintResults(results, repoPath);
    } catch (error) {
      logger.error('ESLint execution failed:', error);
      return [];
    }
  }

  /**
   * ESLint結果をパース
   */
  private parseESLintResults(results: ESLintResult[], _repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    for (const result of results) {
      if (!result.messages) continue;

      for (const message of result.messages) {
        const severity = this.mapESLintSeverity(message.severity);
        const category = this.categorizeESLintRule(message.ruleId ?? null);

        issues.push({
          id: randomUUID(),
          tool: AnalyzerTool.ESLint,
          severity,
          category,
          rule: message.ruleId || 'unknown',
          message: message.message,
          file: result.filePath,
          line: message.line,
          column: message.column,
          endLine: message.endLine,
          endColumn: message.endColumn,
          fix: message.fix ? {
            available: true,
            description: 'Auto-fixable',
            code: message.fix.text
          } : undefined
        });
      }
    }

    return issues;
  }

  /**
   * ESLintの重要度をマッピング
   */
  private mapESLintSeverity(eslintSeverity: number): Severity {
    switch (eslintSeverity) {
      case 2:
        return Severity.High;
      case 1:
        return Severity.Medium;
      default:
        return Severity.Low;
    }
  }

  /**
   * ESLintルールをカテゴリ分類
   */
  private categorizeESLintRule(ruleId: string | null): IssueCategory {
    if (!ruleId) return IssueCategory.CodeQuality;

    if (ruleId.includes('security') || ruleId.includes('no-eval') || ruleId.includes('no-unsafe')) {
      return IssueCategory.Security;
    }

    if (ruleId.includes('complexity') || ruleId.includes('max-')) {
      return IssueCategory.Complexity;
    }

    if (ruleId.includes('performance')) {
      return IssueCategory.Performance;
    }

    return IssueCategory.CodeQuality;
  }

  /**
   * Snyk実行（実装版）
   */
  private async runSnyk(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      // package.jsonまたはcomposer.jsonの存在確認
      const hasPackageJson = await fs.access(path.join(repoPath, 'package.json'))
        .then(() => true)
        .catch(() => false);

      const hasComposerJson = await fs.access(path.join(repoPath, 'composer.json'))
        .then(() => true)
        .catch(() => false);

      if (!hasPackageJson && !hasComposerJson) {
        return [];
      }

      // Snykコマンド実行
      const command = 'snyk';
      const args = ['test', '--json'];

      const timeout = options.timeout || DEFAULT_TIMEOUT;

      const { stdout } = await execFileAsync(command, args, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        // Snykは脆弱性があるとexit code 1を返す
        return { stdout: error.stdout || '{}', stderr: error.stderr || '' };
      });

      // 結果をパース
      let result: SnykResult;
      try {
        result = JSON.parse(stdout || '{}') as SnykResult;
      } catch (parseError) {
        logger.error('Failed to parse Snyk output:', parseError);
        return [];
      }

      return this.parseSnykResults(result, repoPath);
    } catch (error) {
      logger.error('Snyk execution failed:', error);
      return [];
    }
  }

  /**
   * Snyk結果をパース
   */
  private parseSnykResults(result: SnykResult, _repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    if (!result.vulnerabilities) return issues;

    for (const vuln of result.vulnerabilities) {
      const severity = this.mapSnykSeverity(vuln.severity);

      issues.push({
        id: randomUUID(),
        tool: AnalyzerTool.Snyk,
        severity,
        category: IssueCategory.Security,
        rule: vuln.id,
        message: `${vuln.title} in ${vuln.packageName}@${vuln.version}`,
        file: 'package.json',
        cve: vuln.identifiers?.CVE || [],
        references: [vuln.url].filter((url): url is string => Boolean(url)),
        fix: vuln.fixedIn && vuln.fixedIn.length > 0 ? {
          available: true,
          description: `Upgrade to ${vuln.packageName}@${vuln.fixedIn[0]}`
        } : undefined
      });
    }

    return issues;
  }

  /**
   * Snykの重要度をマッピング
   */
  private mapSnykSeverity(snykSeverity: string): Severity {
    switch (snykSeverity.toLowerCase()) {
      case 'critical':
        return Severity.Critical;
      case 'high':
        return Severity.High;
      case 'medium':
        return Severity.Medium;
      case 'low':
        return Severity.Low;
      default:
        return Severity.Info;
    }
  }

  /**
   * Gitleaks実行（実装版）
   */
  private async runGitleaks(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    const reportPath = path.join(repoPath, 'gitleaks-report.json');

    try {
      // .gitディレクトリの存在確認
      await fs.access(path.join(repoPath, '.git'));

      // Gitleaksコマンド実行
      const command = 'gitleaks';
      const args = [
        'detect',
        '--report-format', 'json',
        '--report-path', 'gitleaks-report.json'
      ];

      const timeout = options.timeout || DEFAULT_TIMEOUT;

      await execFileAsync(command, args, {
        cwd: repoPath,
        timeout
      }).catch(() => {
        // Gitleaksは検出があるとexit code 1を返す
      });

      // 結果ファイルを読み込み
      const reportContent = await fs.readFile(reportPath, 'utf-8').catch(() => '[]');

      let results: GitleaksFinding[];
      try {
        results = JSON.parse(reportContent) as GitleaksFinding[];
      } catch (parseError) {
        logger.error('Failed to parse Gitleaks output:', parseError);
        return [];
      }

      return this.parseGitleaksResults(results, repoPath);
    } catch (error) {
      logger.error('Gitleaks execution failed:', error);
      return [];
    } finally {
      // レポートファイルを確実に削除
      await fs.unlink(reportPath).catch(() => {
        // ファイルが存在しない場合は無視
      });
    }
  }

  /**
   * Gitleaks結果をパース
   */
  private parseGitleaksResults(results: GitleaksFinding[], _repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    for (const finding of results) {
      issues.push({
        id: randomUUID(),
        tool: AnalyzerTool.Gitleaks,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        rule: finding.RuleID || 'secret-detected',
        message: `${finding.Description || 'Secret detected'}: ${finding.Match}`,
        file: finding.File ?? 'unknown',
        line: finding.StartLine,
        snippet: finding.Secret,
        references: finding.Tags ? finding.Tags.map((tag: string) => `Tag: ${tag}`) : undefined
      });
    }

    return issues;
  }

  /**
   * 修正サジェスチョンを生成
   */
  generateFixSuggestion(issue: AnalysisIssue): string | null {
    if (issue.fix?.available) {
      return issue.fix.description || null;
    }

    // ルールベースのサジェスチョン
    switch (issue.rule) {
      case 'no-unused-vars':
        return 'Remove the unused variable or use it in your code';
      case 'no-console':
        return 'Replace console.log with a proper logging library';
      case 'eqeqeq':
        return 'Use === instead of ==';
      default:
        return null;
    }
  }

  /**
   * 進捗コールバック付き解析
   *
   * @param repoPath - 解析対象のリポジトリパス
   * @param options - 解析オプション
   * @param onProgress - 進捗更新時に呼ばれるコールバック関数
   * @returns 解析結果
   *
   * @example
   * ```typescript
   * const result = await analyzer.analyzeWithProgress(
   *   '/path/to/repo',
   *   { tools: [AnalyzerTool.ESLint] },
   *   ({ current, total, tool }) => {
   *     console.log(`[${current}/${total}] Running ${tool}...`);
   *   }
   * );
   * ```
   */
  async analyzeWithProgress(
    repoPath: string,
    options: AnalysisOptions,
    onProgress?: (progress: { current: number; total: number; tool: string }) => void
  ): Promise<AnalysisResult> {
    const absolutePath = path.resolve(repoPath);
    const toolsToRun = options.tools || await this.selectTools(absolutePath);
    const total = toolsToRun.length;

    const toolResults: ToolResult[] = [];

    for (let i = 0; i < toolsToRun.length; i++) {
      const tool = toolsToRun[i];

      if (onProgress) {
        onProgress({ current: i + 1, total, tool });
      }

      const result = await this.runTool(absolutePath, tool, options);
      toolResults.push(result);
    }

    // 結果を集約（既存のロジックを使用）
    let allIssues: AnalysisIssue[] = [];
    toolResults.forEach(result => {
      allIssues.push(...result.issues);
    });

    if (options.removeDuplicates !== false) {
      const { unique } = this.removeDuplicateIssues(allIssues);
      allIssues = unique;
    }

    const summary = this.createSummary(toolResults, allIssues, 0);

    return {
      analyzedAt: new Date(),
      repoPath: absolutePath,
      toolResults,
      allIssues,
      summary,
      duplicatesRemoved: 0
    };
  }

  /**
   * 実行するツールを自動選択
   */
  private async selectTools(repoPath: string): Promise<AnalyzerTool[]> {
    const tools: AnalyzerTool[] = [];

    // 常に実行するツール
    tools.push(AnalyzerTool.Gitleaks);

    // package.json存在確認
    if (await this.fileExists(path.join(repoPath, 'package.json'))) {
      tools.push(AnalyzerTool.ESLint);
      tools.push(AnalyzerTool.Snyk);

      // TypeScript判定
      if (await this.fileExists(path.join(repoPath, 'tsconfig.json'))) {
        tools.push(AnalyzerTool.TypeScriptCompiler);
      }
    }

    // composer.json存在確認
    if (await this.fileExists(path.join(repoPath, 'composer.json'))) {
      tools.push(AnalyzerTool.PHPCodeSniffer);
      tools.push(AnalyzerTool.PHPStan);
      tools.push(AnalyzerTool.Snyk);
    }

    // .csproj存在確認
    const files = await fs.readdir(repoPath).catch(() => []);
    if (files.some(f => f.endsWith('.csproj'))) {
      tools.push(AnalyzerTool.RoslynAnalyzer);
    }

    return tools;
  }

  /**
   * ファイル存在確認
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 重複問題を除去
   */
  private removeDuplicateIssues(
    issues: AnalysisIssue[]
  ): { unique: AnalysisIssue[]; removed: number } {
    const seen = new Set<string>();
    const unique: AnalysisIssue[] = [];

    for (const issue of issues) {
      // 重複判定キー: ファイル+行+ルール
      const key = `${issue.file}:${issue.line}:${issue.rule}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(issue);
      }
    }

    return {
      unique,
      removed: issues.length - unique.length
    };
  }

  /**
   * サマリーを作成
   */
  private createSummary(
    toolResults: ToolResult[],
    allIssues: AnalysisIssue[],
    executionTime: number
  ): AnalysisSummary {
    const bySeverity: Record<Severity, number> = {
      [Severity.Critical]: 0,
      [Severity.High]: 0,
      [Severity.Medium]: 0,
      [Severity.Low]: 0,
      [Severity.Info]: 0
    };

    const byCategory: Record<IssueCategory, number> = {
      [IssueCategory.Security]: 0,
      [IssueCategory.Performance]: 0,
      [IssueCategory.CodeQuality]: 0,
      [IssueCategory.BestPractice]: 0,
      [IssueCategory.Maintainability]: 0,
      [IssueCategory.Complexity]: 0,
      [IssueCategory.Documentation]: 0
    };

    const byTool: Record<AnalyzerTool, number> = {
      [AnalyzerTool.ESLint]: 0,
      [AnalyzerTool.TypeScriptCompiler]: 0,
      [AnalyzerTool.PHPCodeSniffer]: 0,
      [AnalyzerTool.PHPStan]: 0,
      [AnalyzerTool.Psalm]: 0,
      [AnalyzerTool.PHPMessDetector]: 0,
      [AnalyzerTool.RoslynAnalyzer]: 0,
      [AnalyzerTool.StyleCop]: 0,
      [AnalyzerTool.SonarQube]: 0,
      [AnalyzerTool.Snyk]: 0,
      [AnalyzerTool.Gitleaks]: 0,
      [AnalyzerTool.DependencyCheck]: 0
    };

    allIssues.forEach(issue => {
      bySeverity[issue.severity]++;
      byCategory[issue.category]++;
      byTool[issue.tool] = (byTool[issue.tool] || 0) + 1;
    });

    // ファイル数の推定（実際には解析されたファイル数を正確にカウント）
    const filesAnalyzed = new Set(allIssues.map(i => i.file)).size;

    return {
      totalIssues: allIssues.length,
      bySeverity,
      byCategory,
      byTool,
      filesAnalyzed,
      executionTime
    };
  }

  /**
   * ツール設定を初期化
   */
  private initializeToolConfigs(): Map<AnalyzerTool, ToolConfig> {
    const configs = new Map<AnalyzerTool, ToolConfig>();

    configs.set(AnalyzerTool.ESLint, {
      tool: AnalyzerTool.ESLint,
      command: 'eslint',
      args: ['--format', 'json'],
      languages: ['JavaScript', 'TypeScript'],
      categories: [IssueCategory.CodeQuality, IssueCategory.BestPractice],
      enabled: true
    });

    configs.set(AnalyzerTool.Snyk, {
      tool: AnalyzerTool.Snyk,
      command: 'snyk',
      args: ['test', '--json'],
      dockerImage: 'snyk/snyk:node',
      languages: ['JavaScript', 'TypeScript', 'PHP', 'Python', 'Java'],
      categories: [IssueCategory.Security],
      enabled: true
    });

    configs.set(AnalyzerTool.Gitleaks, {
      tool: AnalyzerTool.Gitleaks,
      command: 'gitleaks',
      args: ['detect', '--report-format', 'json'],
      dockerImage: 'zricethezav/gitleaks:latest',
      languages: ['*'],
      categories: [IssueCategory.Security],
      enabled: true
    });

    configs.set(AnalyzerTool.PHPCodeSniffer, {
      tool: AnalyzerTool.PHPCodeSniffer,
      command: 'phpcs',
      args: ['--report=json'],
      languages: ['PHP'],
      categories: [IssueCategory.CodeQuality, IssueCategory.BestPractice],
      enabled: true
    });

    configs.set(AnalyzerTool.PHPStan, {
      tool: AnalyzerTool.PHPStan,
      command: 'phpstan',
      args: ['analyse', '--error-format=json'],
      languages: ['PHP'],
      categories: [IssueCategory.CodeQuality, IssueCategory.BestPractice],
      enabled: true
    });

    return configs;
  }
}
