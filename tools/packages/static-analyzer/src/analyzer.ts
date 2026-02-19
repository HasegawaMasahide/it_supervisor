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
  ToolConfig,
  ToolExecutionStatus,
  ToolExecutionStatusType
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

interface PatternRule {
  id: string;
  pattern: RegExp;
  severity: Severity;
  category: IssueCategory;
  message: string;
  filePattern?: RegExp;
  fileCondition?: (content: string) => boolean;
  /** 前後の行も含めたコンテキストチェック（trueを返した場合のみ問題として報告） */
  contextCheck?: (lines: string[], matchLineIndex: number) => boolean;
}

// --- 追加ツール出力の型定義 ---

// npm audit
interface NpmAuditVia {
  name: string;
  title?: string;
  url?: string;
  severity: string;
  cwe?: string[];
}

interface NpmAuditVulnerability {
  name: string;
  severity: string;
  isDirect: boolean;
  via: (string | NpmAuditVia)[];
  effects: string[];
  range: string;
  fixAvailable: boolean | { name: string; version: string; isSemVerMajor: boolean };
}

// jscpd
interface JscpdFileLoc {
  name: string;
  start: number;
  end: number;
  startLoc: { line: number; column: number };
  endLoc: { line: number; column: number };
}

interface JscpdDuplicate {
  format: string;
  lines: number;
  tokens: number;
  firstFile: JscpdFileLoc;
  secondFile: JscpdFileLoc;
  fragment?: string;
}

interface JscpdResult {
  duplicates: JscpdDuplicate[];
  statistics?: Record<string, unknown>;
}

interface PsalmIssue {
  severity: string;
  line_from: number;
  line_to: number;
  type: string;
  message: string;
  file_name: string;
  file_path: string;
  snippet: string;
  selected_text: string;
  from: number;
  to: number;
  snippet_from: number;
  snippet_to: number;
  column_from: number;
  column_to: number;
  taint_trace?: Array<{
    file_name: string;
    file_path: string;
    line_from: number;
    line_to: number;
    snippet: string;
  }>;
}

interface PHPMDViolation {
  beginLine: number;
  endLine: number;
  package: string;
  function?: string;
  class?: string;
  method?: string;
  description: string;
  rule: string;
  ruleSet: string;
  externalInfoUrl: string;
  priority: number;
}

interface PHPMDFile {
  file: string;
  violations: PHPMDViolation[];
}

interface PHPMDResult {
  version: string;
  package: string;
  timestamp: string;
  files: PHPMDFile[];
}

interface ComposerAuditAdvisory {
  advisoryId: string;
  packageName: string;
  affectedVersions: string;
  title: string;
  cve?: string;
  link: string;
  reportedAt: string;
  sources?: Array<{ name: string; remoteId: string }>;
}

interface ComposerAuditResult {
  advisories: Record<string, ComposerAuditAdvisory[]>;
}

interface SemgrepFinding {
  check_id: string;
  path: string;
  start: { line: number; col: number };
  end: { line: number; col: number };
  extra: {
    message: string;
    severity: string;
    metadata?: {
      category?: string;
      cwe?: string[];
      owasp?: string[];
      confidence?: string;
      references?: string[];
    };
    lines?: string;
    fix?: string;
  };
}

interface SemgrepResult {
  results: SemgrepFinding[];
  errors?: Array<{ message: string }>;
}

// --- Trivy 出力の型定義 ---

interface TrivyResult {
  Results?: TrivyTarget[];
}

interface TrivyTarget {
  Target: string;
  Type: string;
  Vulnerabilities?: TrivyVulnerability[];
}

interface TrivyVulnerability {
  VulnerabilityID: string;
  PkgName: string;
  InstalledVersion: string;
  FixedVersion?: string;
  Severity: string;
  Title: string;
  Description?: string;
  PrimaryURL?: string;
}

// --- Bearer 出力の型定義 ---

interface BearerResult {
  findings?: BearerFinding[];
}

interface BearerFinding {
  rule_id: string;
  fingerprint?: string;
  severity: string;
  file: string;
  filename?: string;
  line_number?: number;
  start_line_number?: number;
  start_column_number?: number;
  end_line_number?: number;
  end_column_number?: number;
  source?: string;
  description?: string;
  cwe?: string;
  owasp_category?: string;
}

// --- njsscan 出力の型定義 ---

interface NjsscanResult {
  [ruleId: string]: NjsscanRule;
}

interface NjsscanRule {
  metadata: {
    description: string;
    severity: string;
    cwe?: string;
    owasp?: string;
  };
  files: NjsscanFile[];
}

interface NjsscanFile {
  file_path: string;
  match_position: [number, number];
  match_string: string;
  match_lines: [number, number];
}

// --- SpotBugs XML 出力の型定義 ---

interface SpotBugsBugInstance {
  type: string;
  priority: string;
  category: string;
  message: string;
  sourceLine?: {
    sourcepath?: string;
    start?: string;
    end?: string;
  };
}

interface ProgpilotVuln {
  source_name: string;
  source_file: string;
  source_line: number;
  source_column: number;
  source_type: string;
  sink_name: string;
  sink_file: string;
  sink_line: number;
  sink_column: number;
  vuln_name: string;
  vuln_cwe: string;
  vuln_id: string;
  vuln_type: string;
}

interface SonarQubeIssue {
  key: string;
  rule: string;
  severity: string;
  component: string;
  message: string;
  line?: number;
  type: string;
  tags?: string[];
  effort?: string;
  textRange?: {
    startLine: number;
    endLine: number;
    startOffset: number;
    endOffset: number;
  };
}

interface SonarQubeIssuesResponse {
  total: number;
  issues: SonarQubeIssue[];
  paging: { pageIndex: number; pageSize: number; total: number };
}

// --- PMD / OWASP DC 出力の型定義 ---

interface PMDViolation {
  beginline: number;
  begincolumn: number;
  endline: number;
  endcolumn: number;
  description: string;
  rule: string;
  ruleset: string;
  priority: number;
  externalInfoUrl?: string;
}

interface PMDFileReport {
  filename: string;
  violations: PMDViolation[];
}

interface PMDReport {
  formatVersion: number;
  pmdVersion: string;
  timestamp: string;
  files: PMDFileReport[];
  processingErrors?: Array<{ filename: string; message: string }>;
}

interface OWASPDCVulnerability {
  name: string;
  severity: string;
  cvssV3?: { baseScore: number; baseSeverity: string };
  cvssV2?: { score: number; severity: string };
  cwes?: string[];
  description?: string;
  references?: Array<{ url: string; name: string }>;
}

interface OWASPDCDependency {
  fileName: string;
  filePath: string;
  vulnerabilities?: OWASPDCVulnerability[];
  packages?: Array<{ id: string; confidence: string; url?: string }>;
}

interface OWASPDCReport {
  reportSchema: string;
  projectInfo: { name: string; reportDate: string };
  dependencies: OWASPDCDependency[];
}

/**
 * 外部ツールが未インストール時のエラー
 */
class ToolNotInstalledError extends Error {
  constructor(toolName: string, installUrl?: string) {
    const msg = installUrl
      ? `${toolName} is not installed. Install from ${installUrl}`
      : `${toolName} is not installed.`;
    super(msg);
    this.name = 'ToolNotInstalledError';
  }
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

    // 共通パターン解析（設定ファイル、依存関係、多言語対応）
    try {
      const commonIssues = await this.runCommonPatternAnalysis(absolutePath);
      allIssues.push(...commonIssues);
    } catch (error) {
      logger.warn('Common pattern analysis failed:', error);
    }

    // 重複除去
    let duplicatesRemoved = 0;
    if (options.removeDuplicates !== false) {
      const { unique, removed } = this.removeDuplicateIssues(allIssues);
      allIssues = unique;
      duplicatesRemoved = removed;
    }

    // ツール実行ステータス一覧を生成（Phase 1: ツール実行信頼性確保）
    const toolExecutionStatuses: ToolExecutionStatus[] = toolResults.map(result => {
      let status: ToolExecutionStatusType = result.success ? 'success' : 'failed';
      if (result.error?.includes('not installed') || result.error?.includes('not found') || result.error?.includes('ToolNotInstalled')) {
        status = 'not_installed';
      } else if (result.error?.includes('timeout') || result.error?.includes('TIMEOUT') || result.error?.includes('timed out')) {
        status = 'timeout';
      } else if (result.error === 'Tool not configured or disabled') {
        status = 'skipped';
      }
      return {
        tool: result.tool,
        status,
        issueCount: result.issues.length,
        executionTimeMs: result.executionTime,
        errorMessage: result.error,
        dockerFallback: result.warnings?.some(w => w.includes('Docker')) || false,
      };
    });

    // 検出件数0件のツールに警告を出す
    for (const ts of toolExecutionStatuses) {
      if (ts.status === 'success' && ts.issueCount === 0) {
        logger.warn(`[ツール実行警告] ${ts.tool}: 実行成功しましたが検出件数が0件です。ツールが正しく動作しているか確認してください。`);
      }
    }

    // サマリー作成
    const summary = this.createSummary(toolResults, allIssues, Date.now() - startTime);

    return {
      analyzedAt: new Date(),
      repoPath: absolutePath,
      toolResults,
      allIssues,
      summary,
      duplicatesRemoved,
      toolExecutionStatuses
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
      const isNotInstalled = error instanceof ToolNotInstalledError;
      return {
        tool,
        success: false,
        executionTime: Date.now() - startTime,
        issues: [],
        error: error instanceof Error ? error.message : String(error),
        warnings: isNotInstalled
          ? [`${tool}: ${error instanceof Error ? error.message : String(error)}`]
          : undefined
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

      case AnalyzerTool.Gitleaks:
        return this.runGitleaks(repoPath, options);

      case AnalyzerTool.Bandit:
        return this.runBandit(repoPath, options);

      case AnalyzerTool.PipAudit:
        return this.runPipAudit(repoPath, options);

      case AnalyzerTool.Opengrep:
        return this.runOpengrep(repoPath, options);

      case AnalyzerTool.Pylint:
        return this.runPylint(repoPath, options);

      case AnalyzerTool.Radon:
        return this.runRadon(repoPath, options);

      case AnalyzerTool.DjangoCheckDeploy:
        return this.runDjangoCheckDeploy(repoPath, options);

      case AnalyzerTool.PHPStan:
        return this.runPHPStan(repoPath, options);

      case AnalyzerTool.PHPCodeSniffer:
        return this.runPHPCS(repoPath, options);

      case AnalyzerTool.RoslynAnalyzer:
        return this.runRoslynAnalyzer(repoPath, options);

      case AnalyzerTool.Psalm:
        return this.runPsalm(repoPath, options);

      case AnalyzerTool.PHPMessDetector:
        return this.runPHPMD(repoPath, options);

      case AnalyzerTool.PHPCPD:
        return this.runPHPCPD(repoPath, options);

      case AnalyzerTool.ComposerAudit:
        return this.runComposerAudit(repoPath, options);

      case AnalyzerTool.Semgrep:
        return this.runSemgrep(repoPath, options);

      case AnalyzerTool.Progpilot:
        return this.runProgpilot(repoPath, options);

      case AnalyzerTool.SonarQube:
        return this.runSonarQube(repoPath, options);

      case AnalyzerTool.PMD:
        return this.runPMD(repoPath, options);

      case AnalyzerTool.DependencyCheck:
        return this.runDependencyCheck(repoPath, options);

      case AnalyzerTool.Trivy:
        return this.runTrivy(repoPath, options);

      case AnalyzerTool.NpmAudit:
        return this.runNpmAudit(repoPath, options);

      case AnalyzerTool.NpmCheckUpdates:
        return this.runNpmCheckUpdates(repoPath, options);

      case AnalyzerTool.Jscpd:
        return this.runJscpd(repoPath, options);

      case AnalyzerTool.Bearer:
        return this.runBearer(repoPath, options);

      case AnalyzerTool.Njsscan:
        return this.runNjsscan(repoPath, options);

      case AnalyzerTool.SpotBugs:
        return this.runSpotBugs(repoPath, options);

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
   *
   * 監査用ESLint設定ファイル（configs/audit-eslintrc.json）が存在する場合、
   * ターゲットリポの設定を無視し、セキュリティ・品質・React向けの包括的ルールで解析する。
   */
  private async runESLint(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      // package.jsonの存在確認
      const packageJsonPath = path.join(repoPath, 'package.json');
      await fs.access(packageJsonPath);

      // 監査用ESLint設定の検出
      const toolsRoot = path.resolve(__dirname, '..', '..', '..');
      const auditConfig = path.resolve(__dirname, '..', 'configs', 'audit-eslintrc.json');
      const hasAuditConfig = await this.fileExists(auditConfig);

      // ESLintコマンド実行
      const command = 'npx';
      const args = [
        'eslint',
        repoPath,
        '--format', 'json',
        '--ext', '.js,.ts,.jsx,.tsx,.vue'
      ];

      // 監査用設定がある場合はターゲットの設定を上書き
      let cwd = repoPath;
      if (hasAuditConfig) {
        args.push(
          '--no-eslintrc',
          '--config', auditConfig,
          '--resolve-plugins-relative-to', toolsRoot
        );
        cwd = toolsRoot;
        logger.info('Using audit ESLint config:', auditConfig);
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;

      const { stdout } = await execFileAsync(command, args, {
        cwd,
        maxBuffer: 10 * 1024 * 1024,
        timeout,
        shell: true // Windows では npx.cmd を解決するためにシェル経由が必要
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

  // ========================================
  // Python / Django ツール実装
  // ========================================

  /**
   * Bandit実行（Pythonセキュリティリンター）
   */
  private async runBandit(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      let command: string;
      let args: string[];

      if (options.useDocker) {
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPath}:/app:ro`,
          '-w', '/app',
          'python:3.11',
          'sh', '-c',
          'pip install bandit -q 2>/dev/null && bandit -r . -f json --exclude .venv,venv,env,__pycache__,migrations 2>/dev/null || true'
        ];
      } else {
        command = 'bandit';
        args = ['-r', repoPath, '-f', 'json', '--exclude', '.venv,venv,env,__pycache__,migrations'];
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;

      const { stdout } = await execFileAsync(command, args, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        // Banditは問題検出時にexit code 1を返す
        return { stdout: error.stdout || '{"results":[]}', stderr: error.stderr || '' };
      });

      let result: { results?: Array<{
        filename: string;
        test_id: string;
        test_name: string;
        severity: string;
        confidence: string;
        line_number: number;
        line_range: number[];
        code: string;
        issue_text: string;
        issue_cwe?: { id: number; link: string };
      }> };
      try {
        result = JSON.parse(stdout || '{"results":[]}');
      } catch {
        logger.error('Failed to parse Bandit output');
        return [];
      }

      return this.parseBanditResults(result.results || [], repoPath);
    } catch (error) {
      logger.error('Bandit execution failed:', error);
      return [];
    }
  }

  private parseBanditResults(
    results: Array<{
      filename: string;
      test_id: string;
      test_name: string;
      severity: string;
      confidence: string;
      line_number: number;
      line_range: number[];
      code: string;
      issue_text: string;
      issue_cwe?: { id: number; link: string };
    }>,
    repoPath: string
  ): AnalysisIssue[] {
    return results.map(r => ({
      id: randomUUID(),
      tool: AnalyzerTool.Bandit,
      severity: r.severity === 'HIGH' ? Severity.High
        : r.severity === 'MEDIUM' ? Severity.Medium
        : Severity.Low,
      category: IssueCategory.Security,
      rule: r.test_id,
      message: r.issue_text,
      file: path.relative(repoPath, r.filename),
      line: r.line_number,
      snippet: r.code,
      cwe: r.issue_cwe ? [`CWE-${r.issue_cwe.id}`] : undefined
    }));
  }

  /**
   * pip-audit実行（Python依存関係脆弱性チェック）
   */
  private async runPipAudit(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      const requirementsPath = path.join(repoPath, 'requirements.txt');
      if (!(await this.fileExists(requirementsPath))) {
        return [];
      }

      let command: string;
      let args: string[];

      if (options.useDocker) {
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPath}:/app:ro`,
          '-w', '/app',
          'python:3.11',
          'sh', '-c',
          'pip install pip-audit -q 2>/dev/null && pip-audit -r requirements.txt --format json --desc 2>/dev/null || echo "[]"'
        ];
      } else {
        command = 'pip-audit';
        args = ['-r', requirementsPath, '--format', 'json', '--desc'];
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;

      const { stdout } = await execFileAsync(command, args, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        return { stdout: error.stdout || '[]', stderr: error.stderr || '' };
      });

      let dependencies: Array<{
        name: string;
        version: string;
        vulns: Array<{
          id: string;
          fix_versions: string[];
          description: string;
        }>;
      }>;
      try {
        const parsed = JSON.parse(stdout || '[]');
        dependencies = Array.isArray(parsed) ? parsed : (parsed.dependencies || []);
      } catch {
        logger.error('Failed to parse pip-audit output');
        return [];
      }

      return this.parsePipAuditResults(dependencies);
    } catch (error) {
      logger.error('pip-audit execution failed:', error);
      return [];
    }
  }

  private parsePipAuditResults(
    dependencies: Array<{
      name: string;
      version: string;
      vulns: Array<{
        id: string;
        fix_versions: string[];
        description: string;
      }>;
    }>
  ): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    for (const dep of dependencies) {
      if (!dep.vulns || dep.vulns.length === 0) continue;

      for (const vuln of dep.vulns) {
        issues.push({
          id: randomUUID(),
          tool: AnalyzerTool.PipAudit,
          severity: Severity.High,
          category: IssueCategory.Security,
          rule: vuln.id,
          message: `${vuln.description || vuln.id} in ${dep.name}@${dep.version}`,
          file: 'requirements.txt',
          cve: vuln.id.startsWith('CVE-') ? [vuln.id] : undefined,
          fix: vuln.fix_versions && vuln.fix_versions.length > 0 ? {
            available: true,
            description: `Upgrade ${dep.name} to ${vuln.fix_versions[0]}`
          } : undefined
        });
      }
    }

    return issues;
  }

  /**
   * Opengrep実行（Semgrep互換オープンソースSAST）
   */
  private async runOpengrep(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      let command: string;
      let args: string[];

      if (options.useDocker) {
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPath}:/app:ro`,
          '-w', '/app',
          'wollomatic/opengrep:latest',
          'opengrep', 'scan', '--config', 'auto', '--json', '.'
        ];
      } else {
        command = 'opengrep';
        args = ['scan', '--config', 'auto', '--json', repoPath];
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;

      const { stdout } = await execFileAsync(command, args, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        return { stdout: error.stdout || '{"results":[]}', stderr: error.stderr || '' };
      });

      let output: {
        results?: Array<{
          path: string;
          check_id: string;
          extra: {
            message: string;
            severity: string;
            metadata?: {
              category?: string;
              cwe?: string[];
              confidence?: string;
            };
            lines: string;
            fix?: string;
          };
          start: { line: number; col: number };
          end: { line: number; col: number };
        }>;
      };
      try {
        output = JSON.parse(stdout || '{"results":[]}');
      } catch {
        logger.error('Failed to parse Opengrep output');
        return [];
      }

      return this.parseOpengrepResults(output.results || [], repoPath);
    } catch (error) {
      logger.error('Opengrep execution failed:', error);
      return [];
    }
  }

  private parseOpengrepResults(
    results: Array<{
      path: string;
      check_id: string;
      extra: {
        message: string;
        severity: string;
        metadata?: {
          category?: string;
          cwe?: string[];
          confidence?: string;
        };
        lines: string;
        fix?: string;
      };
      start: { line: number; col: number };
      end: { line: number; col: number };
    }>,
    repoPath: string
  ): AnalysisIssue[] {
    return results.map(r => {
      const metaCategory = r.extra.metadata?.category?.toLowerCase() || '';
      const category = metaCategory.includes('security') ? IssueCategory.Security
        : metaCategory.includes('performance') ? IssueCategory.Performance
        : metaCategory.includes('correctness') ? IssueCategory.CodeQuality
        : IssueCategory.Security;

      return {
        id: randomUUID(),
        tool: AnalyzerTool.Opengrep,
        severity: r.extra.severity === 'ERROR' ? Severity.High
          : r.extra.severity === 'WARNING' ? Severity.Medium
          : Severity.Low,
        category,
        rule: r.check_id,
        message: r.extra.message,
        file: path.relative(repoPath, r.path),
        line: r.start.line,
        column: r.start.col,
        endLine: r.end.line,
        endColumn: r.end.col,
        snippet: r.extra.lines,
        cwe: r.extra.metadata?.cwe,
        fix: r.extra.fix ? {
          available: true,
          description: r.extra.fix
        } : undefined
      };
    });
  }

  /**
   * pylint実行（Pythonコード品質リンター）
   */
  private async runPylint(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      let command: string;
      let args: string[];

      if (options.useDocker) {
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPath}:/app:ro`,
          '-w', '/app',
          'python:3.11',
          'sh', '-c',
          'pip install pylint -q 2>/dev/null && pylint --output-format=json --recursive=y --ignore=.venv,venv,env,__pycache__,migrations . 2>/dev/null || true'
        ];
      } else {
        command = 'pylint';
        args = [
          '--output-format=json',
          '--recursive=y',
          '--ignore=.venv,venv,env,__pycache__,migrations',
          repoPath
        ];
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;

      const { stdout } = await execFileAsync(command, args, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        // pylintは問題検出時にexit code 1-31を返す
        return { stdout: error.stdout || '[]', stderr: error.stderr || '' };
      });

      let results: Array<{
        type: string;
        symbol: string;
        message: string;
        path: string;
        line: number;
        column: number;
        'message-id': string;
      }>;
      try {
        results = JSON.parse(stdout || '[]');
      } catch {
        logger.error('Failed to parse pylint output');
        return [];
      }

      return this.parsePylintResults(results, repoPath);
    } catch (error) {
      logger.error('pylint execution failed:', error);
      return [];
    }
  }

  private parsePylintResults(
    results: Array<{
      type: string;
      symbol: string;
      message: string;
      path: string;
      line: number;
      column: number;
      'message-id': string;
    }>,
    repoPath: string
  ): AnalysisIssue[] {
    return results.map(r => {
      const severity = (r.type === 'F' || r.type === 'E') ? Severity.High
        : r.type === 'W' ? Severity.Medium
        : Severity.Low;

      const category = r.type === 'R' ? IssueCategory.Complexity
        : r.type === 'C' ? IssueCategory.BestPractice
        : IssueCategory.CodeQuality;

      return {
        id: randomUUID(),
        tool: AnalyzerTool.Pylint,
        severity,
        category,
        rule: r['message-id'],
        message: `[${r.symbol}] ${r.message}`,
        file: path.relative(repoPath, r.path),
        line: r.line,
        column: r.column
      };
    });
  }

  /**
   * radon実行（Python循環的複雑度）
   */
  private async runRadon(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      let command: string;
      let args: string[];

      if (options.useDocker) {
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPath}:/app:ro`,
          '-w', '/app',
          'python:3.11',
          'sh', '-c',
          'pip install radon -q 2>/dev/null && radon cc . -j -n C --exclude ".venv,venv,env,__pycache__,migrations" 2>/dev/null || echo "{}"'
        ];
      } else {
        command = 'radon';
        args = ['cc', repoPath, '-j', '-n', 'C', '--exclude', '.venv,venv,env,__pycache__,migrations'];
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;

      const { stdout } = await execFileAsync(command, args, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        return { stdout: error.stdout || '{}', stderr: error.stderr || '' };
      });

      let result: Record<string, Array<{
        name: string;
        type: string;
        complexity: number;
        rank: string;
        lineno: number;
        endline: number;
        col_offset: number;
        classname?: string;
      }>>;
      try {
        result = JSON.parse(stdout || '{}');
      } catch {
        logger.error('Failed to parse radon output');
        return [];
      }

      return this.parseRadonResults(result, repoPath);
    } catch (error) {
      logger.error('radon execution failed:', error);
      return [];
    }
  }

  private parseRadonResults(
    result: Record<string, Array<{
      name: string;
      type: string;
      complexity: number;
      rank: string;
      lineno: number;
      endline: number;
      col_offset: number;
      classname?: string;
    }>>,
    repoPath: string
  ): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    for (const [filePath, functions] of Object.entries(result)) {
      for (const fn of functions) {
        const severity = (fn.rank === 'F' || fn.rank === 'E') ? Severity.High
          : fn.rank === 'D' ? Severity.Medium
          : Severity.Low;

        const displayName = fn.classname ? `${fn.classname}.${fn.name}` : fn.name;

        issues.push({
          id: randomUUID(),
          tool: AnalyzerTool.Radon,
          severity,
          category: IssueCategory.Complexity,
          rule: `CC-${fn.rank}`,
          message: `${fn.type} '${displayName}' の循環的複雑度が ${fn.complexity} (ランク: ${fn.rank}) です。分割を検討してください`,
          file: path.relative(repoPath, filePath),
          line: fn.lineno,
          endLine: fn.endline
        });
      }
    }

    return issues;
  }

  /**
   * Django check --deploy 実行（Django組込みセキュリティチェック）
   */
  private async runDjangoCheckDeploy(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      const managePyPath = path.join(repoPath, 'manage.py');
      if (!(await this.fileExists(managePyPath))) {
        return [];
      }

      let command: string;
      let args: string[];

      if (options.useDocker !== false) {
        // Docker経由で実行（Django環境構築が必要なため）
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPath}:/app:ro`,
          'python:3.11',
          'sh', '-c',
          'cp -r /app /build && cd /build && pip install -r requirements.txt -q 2>/dev/null; python manage.py check --deploy 2>&1 || true'
        ];
      } else {
        command = 'python';
        args = ['manage.py', 'check', '--deploy'];
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;

      const { stdout } = await execFileAsync(command, args, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        return { stdout: error.stdout || '', stderr: error.stderr || '' };
      });

      return this.parseDjangoCheckResults(stdout || '');
    } catch (error) {
      logger.error('Django check --deploy execution failed:', error);
      return [];
    }
  }

  private parseDjangoCheckResults(output: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    // Django check --deploy の出力パターン:
    // ?: (security.W001) You do not have 'django.middleware.security.SecurityMiddleware' ...
    const pattern = /\?(?::)?\s*\(security\.(W\d+)\)\s*(.+)/g;
    let match;

    while ((match = pattern.exec(output)) !== null) {
      const checkId = match[1];
      const message = match[2].trim();

      // CSRF/XSS/セッション関連はHighに格上げ
      const highPriorityChecks = ['W004', 'W008', 'W012', 'W016', 'W017', 'W018', 'W019', 'W020', 'W021', 'W022'];
      const severity = highPriorityChecks.includes(checkId) ? Severity.High : Severity.Medium;

      issues.push({
        id: randomUUID(),
        tool: AnalyzerTool.DjangoCheckDeploy,
        severity,
        category: IssueCategory.Security,
        rule: `security.${checkId}`,
        message,
        file: 'settings.py'
      });
    }

    return issues;
  }

  // ========================================
  // PHP 追加ツール (Psalm, PHPMD, PHPCPD, ComposerAudit, Progpilot)
  // ========================================

  /**
   * Psalm実行（テイント解析）
   */
  private async runPsalm(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      if (!await this.fileExists(path.join(repoPath, 'composer.json'))) {
        return [];
      }

      let command: string;
      let args: string[];
      if (options.useDocker) {
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPath}:/app`,
          '-w', '/app',
          'vimeo/psalm',
          '--taint-analysis', '--output-format=json', '--no-progress'
        ];
      } else {
        command = './vendor/bin/psalm';
        args = ['--taint-analysis', '--output-format=json', '--no-progress'];
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;
      const { stdout } = await execFileAsync(command, args, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        return { stdout: error.stdout || '[]', stderr: error.stderr || '' };
      });

      let result: PsalmIssue[];
      try {
        result = JSON.parse(stdout || '[]') as PsalmIssue[];
      } catch {
        logger.error('Failed to parse Psalm output');
        return [];
      }

      return this.parsePsalmResults(result, repoPath);
    } catch (error) {
      logger.error('Psalm execution failed:', error);
      return [];
    }
  }

  private parsePsalmResults(issues: PsalmIssue[], repoPath: string): AnalysisIssue[] {
    return issues.map(issue => {
      const isTaint = issue.taint_trace && issue.taint_trace.length > 0;
      let severity: Severity;
      switch (issue.severity) {
        case 'error':
          severity = isTaint ? Severity.Critical : Severity.High;
          break;
        case 'info':
          severity = Severity.Low;
          break;
        default:
          severity = Severity.Medium;
      }

      const category = isTaint ? IssueCategory.Security : IssueCategory.CodeQuality;
      const filePath = path.relative(repoPath, issue.file_path);

      return {
        id: randomUUID(),
        tool: AnalyzerTool.Psalm,
        severity,
        category,
        rule: issue.type,
        message: issue.message,
        file: filePath,
        line: issue.line_from,
        column: issue.column_from,
        endLine: issue.line_to,
        endColumn: issue.column_to,
        snippet: issue.snippet || undefined,
      };
    });
  }

  /**
   * PHPMD実行（複雑度・メソッド長）
   */
  private async runPHPMD(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      if (!await this.fileExists(path.join(repoPath, 'composer.json'))) {
        return [];
      }

      let command: string;
      let args: string[];
      if (options.useDocker) {
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPath}:/app`,
          '-w', '/app',
          'phpmd/phpmd',
          '.', 'json', 'cleancode,codesize,design,unusedcode',
          '--exclude', 'vendor,node_modules'
        ];
      } else {
        command = './vendor/bin/phpmd';
        args = ['.', 'json', 'cleancode,codesize,design,unusedcode', '--exclude', 'vendor,node_modules'];
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;
      const { stdout } = await execFileAsync(command, args, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        return { stdout: error.stdout || '{"files":[]}', stderr: error.stderr || '' };
      });

      let result: PHPMDResult;
      try {
        result = JSON.parse(stdout || '{"files":[]}') as PHPMDResult;
      } catch {
        logger.error('Failed to parse PHPMD output');
        return [];
      }

      return this.parsePHPMDResults(result, repoPath);
    } catch (error) {
      logger.error('PHPMD execution failed:', error);
      return [];
    }
  }

  private parsePHPMDResults(result: PHPMDResult, repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    if (!result.files) return issues;

    for (const file of result.files) {
      const filePath = path.relative(repoPath, file.file);

      for (const v of file.violations) {
        let severity: Severity;
        switch (v.priority) {
          case 1: severity = Severity.Critical; break;
          case 2: severity = Severity.High; break;
          case 3: severity = Severity.Medium; break;
          default: severity = Severity.Low;
        }

        let category: IssueCategory;
        switch (v.ruleSet) {
          case 'Code Size Rules':
            category = IssueCategory.Complexity;
            break;
          case 'Unused Code Rules':
          case 'Clean Code Rules':
            category = IssueCategory.CodeQuality;
            break;
          case 'Design Rules':
            category = IssueCategory.Maintainability;
            break;
          default:
            category = IssueCategory.CodeQuality;
        }

        issues.push({
          id: randomUUID(),
          tool: AnalyzerTool.PHPMessDetector,
          severity,
          category,
          rule: v.rule,
          message: v.description,
          file: filePath,
          line: v.beginLine,
          endLine: v.endLine,
          references: v.externalInfoUrl ? [v.externalInfoUrl] : undefined,
        });
      }
    }
    return issues;
  }

  /**
   * PHPCPD実行（重複コード検出）
   */
  private async runPHPCPD(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      if (!await this.fileExists(path.join(repoPath, 'composer.json'))) {
        return [];
      }

      let command: string;
      let args: string[];
      if (options.useDocker) {
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPath}:/app`,
          '-w', '/app',
          'php:8.2-cli',
          'bash', '-c',
          'composer global require systemsdk/phpcpd 2>/dev/null && phpcpd --min-lines=5 --min-tokens=70 . --exclude vendor --exclude node_modules || true'
        ];
      } else {
        command = './vendor/bin/phpcpd';
        args = ['--min-lines=5', '--min-tokens=70', '.', '--exclude', 'vendor', '--exclude', 'node_modules'];
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;
      const { stdout } = await execFileAsync(command, args, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        return { stdout: error.stdout || '', stderr: error.stderr || '' };
      });

      return this.parsePHPCPDResults(stdout || '', repoPath);
    } catch (error) {
      logger.error('PHPCPD execution failed:', error);
      return [];
    }
  }

  private parsePHPCPDResults(output: string, _repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    // PHPCPD テキスト出力パターン: "  - /path/to/file.php:10-20 (30 lines)"
    const duplicationPattern = /^\s+-\s+(.+?):(\d+)-(\d+)\s+\((\d+)\s+lines?\)/gm;
    let match;
    const fileGroups: Array<{ file: string; startLine: number; endLine: number; lines: number }> = [];

    while ((match = duplicationPattern.exec(output)) !== null) {
      fileGroups.push({
        file: match[1],
        startLine: parseInt(match[2], 10),
        endLine: parseInt(match[3], 10),
        lines: parseInt(match[4], 10),
      });
    }

    // 2つずつペアにして報告（PHPCPD は重複元と重複先を出力）
    for (let i = 0; i < fileGroups.length; i += 2) {
      const first = fileGroups[i];
      const second = fileGroups[i + 1];
      if (!first) continue;

      const message = second
        ? `${first.lines}行の重複コード: ${first.file}:${first.startLine} と ${second.file}:${second.startLine}`
        : `${first.lines}行の重複コードが検出されました`;

      issues.push({
        id: randomUUID(),
        tool: AnalyzerTool.PHPCPD,
        severity: first.lines > 30 ? Severity.High : Severity.Medium,
        category: IssueCategory.Maintainability,
        rule: 'duplicate-code',
        message,
        file: first.file,
        line: first.startLine,
        endLine: first.endLine,
      });
    }
    return issues;
  }

  /**
   * Composer audit実行（依存関係脆弱性）
   */
  private async runComposerAudit(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      const hasComposerLock = await this.fileExists(path.join(repoPath, 'composer.lock'));
      const hasComposerJson = await this.fileExists(path.join(repoPath, 'composer.json'));
      if (!hasComposerLock && !hasComposerJson) {
        return [];
      }

      let command: string;
      let args: string[];
      if (options.useDocker) {
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPath}:/app`,
          '-w', '/app',
          'composer:latest',
          'audit', '--format=json'
        ];
      } else {
        command = 'composer';
        args = ['audit', '--format=json'];
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;
      const { stdout } = await execFileAsync(command, args, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        // composer audit は脆弱性があると exit code 非ゼロ
        return { stdout: error.stdout || '{"advisories":{}}', stderr: error.stderr || '' };
      });

      let result: ComposerAuditResult;
      try {
        result = JSON.parse(stdout || '{"advisories":{}}') as ComposerAuditResult;
      } catch {
        logger.error('Failed to parse Composer audit output');
        return [];
      }

      return this.parseComposerAuditResults(result);
    } catch (error) {
      logger.error('Composer audit execution failed:', error);
      return [];
    }
  }

  private parseComposerAuditResults(result: ComposerAuditResult): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    if (!result.advisories) return issues;

    for (const [packageName, advisories] of Object.entries(result.advisories)) {
      for (const adv of advisories) {
        issues.push({
          id: randomUUID(),
          tool: AnalyzerTool.ComposerAudit,
          severity: adv.cve ? Severity.High : Severity.Medium,
          category: IssueCategory.Security,
          rule: adv.advisoryId,
          message: `[${packageName}] ${adv.title} (${adv.affectedVersions})`,
          file: 'composer.json',
          references: adv.link ? [adv.link] : undefined,
          cve: adv.cve ? [adv.cve] : undefined,
        });
      }
    }
    return issues;
  }

  /**
   * Progpilot実行（PHP SAST）
   */
  private async runProgpilot(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      if (!await this.fileExists(path.join(repoPath, 'composer.json'))) {
        return [];
      }

      let command: string;
      let args: string[];
      if (options.useDocker) {
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPath}:/app`,
          '-w', '/app',
          'php:8.2-cli',
          'bash', '-c',
          'curl -sL https://github.com/designsecurity/progpilot/releases/latest/download/progpilot.phar -o /tmp/progpilot.phar && php /tmp/progpilot.phar .'
        ];
      } else {
        command = 'php';
        args = ['progpilot.phar', '.'];
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;
      const { stdout } = await execFileAsync(command, args, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        return { stdout: error.stdout || '[]', stderr: error.stderr || '' };
      });

      let result: ProgpilotVuln[];
      try {
        result = JSON.parse(stdout || '[]') as ProgpilotVuln[];
      } catch {
        logger.error('Failed to parse Progpilot output');
        return [];
      }

      return this.parseProgpilotResults(result, repoPath);
    } catch (error) {
      logger.error('Progpilot execution failed:', error);
      return [];
    }
  }

  private parseProgpilotResults(vulns: ProgpilotVuln[], repoPath: string): AnalysisIssue[] {
    return vulns.map(v => {
      let severity: Severity;
      const type = v.vuln_name.toLowerCase();
      if (type.includes('injection') || type.includes('exec') || type.includes('eval')) {
        severity = Severity.Critical;
      } else if (type.includes('xss') || type.includes('traversal') || type.includes('include')) {
        severity = Severity.High;
      } else {
        severity = Severity.Medium;
      }

      const filePath = path.relative(repoPath, v.sink_file);

      return {
        id: randomUUID(),
        tool: AnalyzerTool.Progpilot,
        severity,
        category: IssueCategory.Security,
        rule: v.vuln_name,
        message: `${v.vuln_name}: ${v.source_name} → ${v.sink_name}`,
        file: filePath,
        line: v.sink_line,
        column: v.sink_column,
        cwe: v.vuln_cwe ? [v.vuln_cwe] : undefined,
      };
    });
  }

  // ========================================
  // 汎用ツール (Semgrep, SonarQube)
  // ========================================

  /**
   * Semgrep実行（多言語SAST）
   */
  // --- OWASP Dependency-Check ---

  private async runDependencyCheck(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      const reportFileName = `dependency-check-report-${Date.now()}.json`;
      const reportPath = path.join(repoPath, reportFileName);
      // OWASP DC はNVD DBダウンロードで時間がかかるため長めのtimeout
      const timeout = Math.max(options.timeout || DEFAULT_TIMEOUT, 600000);

      let command: string;
      let args: string[];

      if (options.useDocker) {
        const repoPathForDocker = repoPath.replace(/\\/g, '/');
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPathForDocker}:/src:ro`,
          '-v', `${repoPathForDocker}:/output`,
          'owasp/dependency-check:latest',
          '--scan', '/src',
          '--format', 'JSON',
          '--out', '/output',
          '--project', 'audit',
          '--disableAssembly',
        ];

        // NVD API Key がある場合は追加
        if (process.env.NVD_API_KEY) {
          args.push('--nvdApiKey', process.env.NVD_API_KEY);
        }
      } else {
        command = 'dependency-check';
        args = [
          '--scan', repoPath,
          '--format', 'JSON',
          '--out', repoPath,
          '--project', 'audit',
          '--disableAssembly',
        ];
        if (process.env.NVD_API_KEY) {
          args.push('--nvdApiKey', process.env.NVD_API_KEY);
        }
      }

      await execFileAsync(command, args, {
        cwd: options.useDocker ? undefined : repoPath,
        maxBuffer: 50 * 1024 * 1024,
        timeout
      }).catch(error => {
        logger.warn('OWASP Dependency-Check finished with warnings:', error.message?.substring(0, 200));
      });

      // OWASP DC の出力ファイル名は固定: dependency-check-report.json
      const owaspReportPath = path.join(repoPath, 'dependency-check-report.json');
      const reportContent = await fs.readFile(owaspReportPath, 'utf-8').catch(() => '{"dependencies":[]}');

      let report: OWASPDCReport;
      try {
        report = JSON.parse(reportContent) as OWASPDCReport;
      } catch {
        logger.error('Failed to parse OWASP DC output');
        return [];
      }

      const issues = this.parseOWASPDCResults(report, repoPath);

      // レポートファイル削除
      await fs.unlink(owaspReportPath).catch(() => {});

      return issues;
    } catch (error) {
      logger.error('OWASP Dependency-Check execution failed:', error);
      return [];
    }
  }

  private parseOWASPDCResults(report: OWASPDCReport, _repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    for (const dep of report.dependencies || []) {
      if (!dep.vulnerabilities || dep.vulnerabilities.length === 0) continue;

      for (const vuln of dep.vulnerabilities) {
        // CVSSスコアから severity を決定
        const cvssScore = vuln.cvssV3?.baseScore || vuln.cvssV2?.score || 0;
        let severity: Severity;
        if (cvssScore >= 9.0) severity = Severity.Critical;
        else if (cvssScore >= 7.0) severity = Severity.High;
        else if (cvssScore >= 4.0) severity = Severity.Medium;
        else severity = Severity.Low;

        const cweList = vuln.cwes?.map(c => c.toString()) || [];

        issues.push({
          id: randomUUID(),
          tool: AnalyzerTool.DependencyCheck,
          severity,
          category: IssueCategory.Security,
          rule: vuln.name,
          message: `${dep.fileName}: ${vuln.description || vuln.name} (CVSS: ${cvssScore})`,
          file: dep.fileName || 'pom.xml',
          references: vuln.references?.map(r => r.url),
          cwe: cweList.length > 0 ? cweList : undefined,
          cve: [vuln.name],
        });
      }
    }

    return issues;
  }

  // --- PMD ---

  private async runPMD(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      // pom.xml or build.gradle の存在確認
      const hasPom = await this.fileExists(path.join(repoPath, 'pom.xml'));
      const hasGradle = await this.fileExists(path.join(repoPath, 'build.gradle'));
      const hasGradleKts = await this.fileExists(path.join(repoPath, 'build.gradle.kts'));
      if (!hasPom && !hasGradle && !hasGradleKts) {
        return [];
      }

      const reportFileName = `pmd-report-${Date.now()}.json`;
      const reportPath = path.join(repoPath, reportFileName);
      const timeout = options.timeout || DEFAULT_TIMEOUT;

      let command: string;
      let args: string[];

      if (options.useDocker) {
        const repoPathForDocker = repoPath.replace(/\\/g, '/');
        // PMD 7.x を JDK 17 上で実行
        const pmdVersion = '7.9.0';
        const pmdUrl = `https://github.com/pmd/pmd/releases/download/pmd_releases%2F${pmdVersion}/pmd-dist-${pmdVersion}-bin.zip`;
        const script = [
          `if [ ! -f /opt/pmd-bin-${pmdVersion}/bin/pmd ]; then`,
          `  curl -sL '${pmdUrl}' -o /tmp/pmd.zip && unzip -q /tmp/pmd.zip -d /opt 2>/dev/null;`,
          'fi;',
          `/opt/pmd-bin-${pmdVersion}/bin/pmd check`,
          '-d /src/src',
          `-R rulesets/java/quickstart.xml`,
          '-f json',
          '--no-cache',
          `> /output/${reportFileName} 2>/dev/null; true`
        ].join(' ');

        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPathForDocker}:/src:ro`,
          '-v', `${repoPathForDocker}:/output`,
          'openjdk:17-slim',
          'sh', '-c', script
        ];
      } else {
        command = 'pmd';
        args = ['check', '-d', path.join(repoPath, 'src'), '-R', 'rulesets/java/quickstart.xml', '-f', 'json', '--no-cache'];
      }

      await execFileAsync(command, args, {
        cwd: options.useDocker ? undefined : repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(() => {
        // PMDは問題を検出するとexit code 4を返す
      });

      const reportContent = await fs.readFile(reportPath, 'utf-8').catch(() => '{"files":[]}');

      let report: PMDReport;
      try {
        report = JSON.parse(reportContent) as PMDReport;
      } catch {
        logger.error('Failed to parse PMD output');
        return [];
      }

      const issues = this.parsePMDResults(report, repoPath);

      // レポートファイル削除
      await fs.unlink(reportPath).catch(() => {});

      return issues;
    } catch (error) {
      logger.error('PMD execution failed:', error);
      return [];
    }
  }

  private parsePMDResults(report: PMDReport, repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    for (const file of report.files || []) {
      const relativePath = path.relative(repoPath, file.filename).replace(/\\/g, '/');

      for (const v of file.violations || []) {
        let severity: Severity;
        switch (v.priority) {
          case 1: severity = Severity.Critical; break;
          case 2: severity = Severity.High; break;
          case 3: severity = Severity.Medium; break;
          case 4: severity = Severity.Low; break;
          default: severity = Severity.Info;
        }

        let category: IssueCategory;
        const rs = v.ruleset?.toLowerCase() || '';
        if (rs.includes('security')) {
          category = IssueCategory.Security;
        } else if (rs.includes('performance')) {
          category = IssueCategory.Performance;
        } else if (rs.includes('design') || rs.includes('codesize')) {
          category = IssueCategory.Complexity;
        } else if (rs.includes('errorprone')) {
          category = IssueCategory.CodeQuality;
        } else {
          category = IssueCategory.BestPractice;
        }

        issues.push({
          id: randomUUID(),
          tool: AnalyzerTool.PMD,
          severity,
          category,
          rule: v.rule,
          message: v.description,
          file: relativePath,
          line: v.beginline,
          column: v.begincolumn,
          endLine: v.endline,
          endColumn: v.endcolumn,
          references: v.externalInfoUrl ? [v.externalInfoUrl] : undefined,
        });
      }
    }

    return issues;
  }

  // --- Semgrep ---

  /**
   * Semgrep用のフレームワーク別ルールセットを構築
   */
  private async buildSemgrepConfigs(repoPath: string): Promise<string[]> {
    const configs = ['auto'];

    // Python / Django
    if (await this.fileExists(path.join(repoPath, 'manage.py'))) {
      configs.push('p/django');
    }
    const hasRequirements = await this.fileExists(path.join(repoPath, 'requirements.txt'));
    const hasPyproject = await this.fileExists(path.join(repoPath, 'pyproject.toml'));
    if (hasRequirements || hasPyproject) {
      configs.push('p/python');
    }

    // PHP / Laravel
    if (await this.fileExists(path.join(repoPath, 'composer.json'))) {
      configs.push('p/php');
      const composerContent = await fs.readFile(
        path.join(repoPath, 'composer.json'), 'utf-8'
      ).catch(() => '');
      if (composerContent.includes('laravel/framework')) {
        configs.push('p/laravel');
      }
    }

    // Java / Spring Boot
    if (await this.fileExists(path.join(repoPath, 'pom.xml')) ||
        await this.fileExists(path.join(repoPath, 'build.gradle'))) {
      configs.push('p/java');
      configs.push('p/spring');
    }

    // JavaScript / TypeScript / React / Vue
    if (await this.fileExists(path.join(repoPath, 'package.json'))) {
      configs.push('p/javascript');
      const pkgContent = await fs.readFile(
        path.join(repoPath, 'package.json'), 'utf-8'
      ).catch(() => '');
      if (pkgContent.includes('"react"')) configs.push('p/react');
      if (pkgContent.includes('"typescript"')) configs.push('p/typescript');
    }

    // C# / .NET
    const dirFiles = await fs.readdir(repoPath).catch(() => []);
    if (dirFiles.some(f => f.endsWith('.csproj'))) {
      configs.push('p/csharp');
    }

    return configs;
  }

  private async runSemgrep(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      let command: string;
      let args: string[];
      const useDocker = await this.shouldUseDocker(AnalyzerTool.Semgrep, options);

      // フレームワーク別ルールセットを構築
      const configs = await this.buildSemgrepConfigs(repoPath);
      const configArgs = configs.flatMap(c => ['--config', c]);

      if (useDocker) {
        const repoPathForDocker = repoPath.replace(/\\/g, '/');
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPathForDocker}:/src`,
          'semgrep/semgrep',
          'semgrep', 'scan', ...configArgs,
          '--json', '--quiet',
          '--max-target-bytes', '2000000'
        ];
      } else {
        command = 'semgrep';
        args = ['scan', ...configArgs, '--json', '--quiet', '--max-target-bytes', '2000000'];
      }

      // Semgrep はルールダウンロード + 解析に時間がかかるため 10分タイムアウト
      const timeout = options.timeout || 600_000;
      const { stdout } = await execFileAsync(command, args, {
        cwd: useDocker ? undefined : repoPath,
        maxBuffer: 20 * 1024 * 1024,
        timeout
      }).catch(error => {
        return { stdout: error.stdout || '{"results":[]}', stderr: error.stderr || '' };
      });

      let result: SemgrepResult;
      try {
        result = JSON.parse(stdout || '{"results":[]}') as SemgrepResult;
      } catch {
        logger.error('Failed to parse Semgrep output');
        return [];
      }

      return this.parseSemgrepResults(result, repoPath);
    } catch (error) {
      logger.error('Semgrep execution failed:', error);
      return [];
    }
  }

  private parseSemgrepResults(result: SemgrepResult, repoPath: string): AnalysisIssue[] {
    if (!result.results) return [];

    return result.results.map(finding => {
      let severity: Severity;
      switch (finding.extra.severity.toUpperCase()) {
        case 'ERROR':
          severity = Severity.High;
          break;
        case 'WARNING':
          severity = Severity.Medium;
          break;
        default:
          severity = Severity.Low;
      }

      const meta = finding.extra.metadata;
      let category: IssueCategory;
      if (meta?.category === 'security') {
        category = IssueCategory.Security;
        // セキュリティ問題は severity を格上げ
        if (severity === Severity.High) severity = Severity.Critical;
      } else if (meta?.category === 'performance') {
        category = IssueCategory.Performance;
      } else {
        category = IssueCategory.CodeQuality;
      }

      const filePath = path.relative(repoPath, finding.path);

      return {
        id: randomUUID(),
        tool: AnalyzerTool.Semgrep,
        severity,
        category,
        rule: finding.check_id,
        message: finding.extra.message,
        file: filePath,
        line: finding.start.line,
        column: finding.start.col,
        endLine: finding.end.line,
        endColumn: finding.end.col,
        snippet: finding.extra.lines || undefined,
        references: meta?.references,
        cwe: meta?.cwe,
      };
    });
  }

  /**
   * SonarQube実行（Docker Community Edition）
   */
  private async runSonarQube(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    const sonarUrl = process.env.SONARQUBE_URL || 'http://localhost:9000';
    const sonarToken = process.env.SONARQUBE_TOKEN || '';
    const projectKey = `audit-${path.basename(repoPath)}-${Date.now()}`;

    try {
      // SonarQubeサーバーの起動確認
      try {
        const healthCheck = await execFileAsync('curl', ['-sf', `${sonarUrl}/api/system/health`], {
          timeout: 5000
        });
        if (!healthCheck.stdout.includes('"health":"GREEN"') && !healthCheck.stdout.includes('"status":"UP"')) {
          logger.warn('SonarQube server is not healthy, skipping');
          return [];
        }
      } catch {
        logger.warn('SonarQube server not reachable, skipping');
        return [];
      }

      // sonar-scanner 実行
      const scannerArgs = [
        'run', '--rm',
        '-v', `${repoPath}:/usr/src`,
        '--network=host',
        'sonarsource/sonar-scanner-cli',
        `-Dsonar.projectKey=${projectKey}`,
        `-Dsonar.sources=.`,
        `-Dsonar.host.url=${sonarUrl}`,
        '-Dsonar.exclusions=vendor/**,node_modules/**,.git/**',
      ];
      if (sonarToken) {
        scannerArgs.push(`-Dsonar.token=${sonarToken}`);
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;
      await execFileAsync('docker', scannerArgs, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        logger.warn('SonarQube scanner warning:', error.stderr || '');
        return { stdout: '', stderr: error.stderr || '' };
      });

      // 解析完了を待機（最大60秒）
      for (let i = 0; i < 12; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        try {
          const { stdout: ceOutput } = await execFileAsync('curl', [
            '-sf',
            `${sonarUrl}/api/ce/component?component=${projectKey}`,
            ...(sonarToken ? ['-u', `${sonarToken}:`] : [])
          ], { timeout: 5000 });

          const ce = JSON.parse(ceOutput);
          if (ce.current?.status === 'SUCCESS') break;
          if (ce.current?.status === 'FAILED') {
            logger.warn('SonarQube analysis failed');
            return [];
          }
        } catch {
          // まだ結果が無い場合は続行
        }
      }

      // 結果取得
      const { stdout: issuesOutput } = await execFileAsync('curl', [
        '-sf',
        `${sonarUrl}/api/issues/search?componentKeys=${projectKey}&ps=500`,
        ...(sonarToken ? ['-u', `${sonarToken}:`] : [])
      ], { timeout: 10000 });

      let result: SonarQubeIssuesResponse;
      try {
        result = JSON.parse(issuesOutput) as SonarQubeIssuesResponse;
      } catch {
        logger.error('Failed to parse SonarQube issues');
        return [];
      }

      return this.parseSonarQubeResults(result, projectKey);
    } catch (error) {
      logger.error('SonarQube execution failed:', error);
      return [];
    }
  }

  private parseSonarQubeResults(result: SonarQubeIssuesResponse, projectKey: string): AnalysisIssue[] {
    if (!result.issues) return [];

    return result.issues.map(issue => {
      let severity: Severity;
      switch (issue.severity) {
        case 'BLOCKER':
        case 'CRITICAL':
          severity = Severity.Critical;
          break;
        case 'MAJOR':
          severity = Severity.High;
          break;
        case 'MINOR':
          severity = Severity.Medium;
          break;
        default:
          severity = Severity.Low;
      }

      let category: IssueCategory;
      switch (issue.type) {
        case 'VULNERABILITY':
        case 'SECURITY_HOTSPOT':
          category = IssueCategory.Security;
          break;
        case 'BUG':
          category = IssueCategory.CodeQuality;
          break;
        case 'CODE_SMELL':
          category = issue.tags?.includes('complexity')
            ? IssueCategory.Complexity
            : IssueCategory.Maintainability;
          break;
        default:
          category = IssueCategory.CodeQuality;
      }

      // component は "projectKey:path/to/file" 形式
      const file = issue.component.replace(`${projectKey}:`, '');

      return {
        id: randomUUID(),
        tool: AnalyzerTool.SonarQube,
        severity,
        category,
        rule: issue.rule,
        message: issue.message,
        file,
        line: issue.line || issue.textRange?.startLine,
        endLine: issue.textRange?.endLine,
      };
    });
  }

  /**
   * Gitleaks実行（実装版）
   */
  private async runGitleaks(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    const reportFileName = `gitleaks-report-${Date.now()}.json`;
    const reportPath = path.join(repoPath, reportFileName);

    try {
      // .gitディレクトリの存在確認
      await fs.access(path.join(repoPath, '.git'));

      let command: string;
      let args: string[];
      const timeout = options.timeout || DEFAULT_TIMEOUT;

      const useDocker = await this.shouldUseDocker(AnalyzerTool.Gitleaks, options);

      // Docker未使用時はCLI存在確認
      if (!useDocker) {
        const gitleaksAvailable = await this.isCommandAvailable('gitleaks');
        if (!gitleaksAvailable) {
          throw new ToolNotInstalledError(
            'Gitleaks',
            'https://github.com/gitleaks/gitleaks#install'
          );
        }
      }

      if (useDocker) {
        const repoPathForDocker = repoPath.replace(/\\/g, '/');
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPathForDocker}:/repo:ro`,
          '-v', `${repoPathForDocker}:/output`,
          'zricethezav/gitleaks:latest',
          'detect',
          '--source', '/repo',
          '--report-format', 'json',
          '--report-path', `/output/${reportFileName}`
        ];
      } else {
        command = 'gitleaks';
        args = [
          'detect',
          '--report-format', 'json',
          '--report-path', reportFileName
        ];
      }

      await execFileAsync(command, args, {
        cwd: useDocker ? undefined : repoPath,
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
      // ToolNotInstalledError は runTool() まで伝播させる
      if (error instanceof ToolNotInstalledError) throw error;
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

  // ========================================
  // npm audit / npm-check-updates / jscpd
  // ========================================

  /**
   * npm audit 実行（依存関係の脆弱性チェック）
   */
  private async runNpmAudit(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      const packageJsonPath = path.join(repoPath, 'package.json');
      if (!await this.fileExists(packageJsonPath)) return [];

      // node_modules が存在しない場合はスキップ
      if (!await this.fileExists(path.join(repoPath, 'node_modules'))) {
        logger.warn('node_modules not found. Skipping npm audit.');
        return [];
      }

      const timeout = options.timeout || DEFAULT_TIMEOUT;
      const { stdout } = await execFileAsync('npm', ['audit', '--json'], {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout,
        shell: true
      }).catch(error => {
        // npm audit は脆弱性があると exit code 1 を返す
        return { stdout: error.stdout || '{}', stderr: error.stderr || '' };
      });

      let result: { vulnerabilities?: Record<string, NpmAuditVulnerability> };
      try {
        result = JSON.parse(stdout || '{}');
      } catch {
        logger.error('Failed to parse npm audit output');
        return [];
      }

      return this.parseNpmAuditResults(result.vulnerabilities || {});
    } catch (error) {
      logger.error('npm audit execution failed:', error);
      return [];
    }
  }

  private parseNpmAuditResults(
    vulnerabilities: Record<string, NpmAuditVulnerability>
  ): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    for (const [pkgName, vuln] of Object.entries(vulnerabilities)) {
      const severity = this.mapNpmAuditSeverity(vuln.severity);
      const viaDetails = (vuln.via || [])
        .filter((v): v is NpmAuditVia => typeof v !== 'string')
        .map(v => v.title)
        .filter(Boolean)
        .join(', ');

      const cweList = (vuln.via || [])
        .filter((v): v is NpmAuditVia => typeof v !== 'string')
        .flatMap(v => v.cwe || []);

      const fixInfo = typeof vuln.fixAvailable === 'object'
        ? `Update to ${vuln.fixAvailable.name}@${vuln.fixAvailable.version}`
        : vuln.fixAvailable ? 'Fix available via npm audit fix' : 'No fix available';

      issues.push({
        id: randomUUID(),
        tool: AnalyzerTool.NpmAudit,
        severity,
        category: IssueCategory.Security,
        rule: `npm-audit-${vuln.severity}`,
        message: `パッケージ "${pkgName}" に${vuln.severity}レベルの脆弱性があります${viaDetails ? ': ' + viaDetails : ''}`,
        file: 'package.json',
        cwe: cweList.length > 0 ? cweList : undefined,
        fix: { available: !!vuln.fixAvailable, description: fixInfo }
      });
    }

    return issues;
  }

  private mapNpmAuditSeverity(severity: string): Severity {
    switch (severity) {
      case 'critical': return Severity.Critical;
      case 'high': return Severity.High;
      case 'moderate': return Severity.Medium;
      case 'low': return Severity.Low;
      case 'info': return Severity.Info;
      default: return Severity.Medium;
    }
  }

  /**
   * npm-check-updates 実行（依存関係の陳腐化チェック）
   */
  private static readonly DEPRECATED_PACKAGES: Record<string, string> = {
    'moment': 'day.js または date-fns への移行を推奨',
    'request': 'axios または node-fetch への移行を推奨',
    'vuex': 'Pinia への移行を推奨',
    'node-sass': 'sass (Dart Sass) への移行を推奨',
    'tslint': 'ESLint + @typescript-eslint への移行を推奨',
  };

  private async runNpmCheckUpdates(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      const packageJsonPath = path.join(repoPath, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      const timeout = options.timeout || DEFAULT_TIMEOUT;

      const { stdout } = await execFileAsync('npx', ['-y', 'npm-check-updates', '--jsonUpgraded'], {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout,
        shell: true
      }).catch(error => {
        return { stdout: error.stdout || '{}', stderr: error.stderr || '' };
      });

      let ncuResult: Record<string, string>;
      try {
        ncuResult = JSON.parse(stdout || '{}');
      } catch {
        logger.error('Failed to parse npm-check-updates output');
        return [];
      }

      return this.parseNcuResults(ncuResult, packageJson);
    } catch (error) {
      logger.error('npm-check-updates execution failed:', error);
      return [];
    }
  }

  private parseNcuResults(
    ncuResult: Record<string, string>,
    packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
  ): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const allDeps = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {})
    };

    // メジャーバージョン遅れの検出
    for (const [pkg, latestVersion] of Object.entries(ncuResult)) {
      const currentVersion = allDeps[pkg];
      if (!currentVersion) continue;

      const currentMajor = this.extractMajorVersion(currentVersion);
      const latestMajor = this.extractMajorVersion(latestVersion);

      if (currentMajor !== null && latestMajor !== null && latestMajor - currentMajor >= 1) {
        const lag = latestMajor - currentMajor;
        const severity = lag >= 3 ? Severity.High : lag >= 2 ? Severity.Medium : Severity.Low;

        issues.push({
          id: randomUUID(),
          tool: AnalyzerTool.NpmCheckUpdates,
          severity,
          category: IssueCategory.Maintainability,
          rule: 'ncu-outdated-major',
          message: `パッケージ "${pkg}" が ${lag} メジャーバージョン遅れています (${currentVersion} → ${latestVersion})`,
          file: 'package.json',
          fix: { available: true, description: `npm install ${pkg}@${latestVersion}` }
        });
      }
    }

    // 非推奨パッケージの検出
    for (const [pkg, recommendation] of Object.entries(StaticAnalyzer.DEPRECATED_PACKAGES)) {
      if (allDeps[pkg]) {
        issues.push({
          id: randomUUID(),
          tool: AnalyzerTool.NpmCheckUpdates,
          severity: Severity.Medium,
          category: IssueCategory.Maintainability,
          rule: 'ncu-deprecated',
          message: `非推奨パッケージ "${pkg}" が使用されています。${recommendation}`,
          file: 'package.json'
        });
      }
    }

    return issues;
  }

  private extractMajorVersion(version: string): number | null {
    const match = version.replace(/^[\^~>=<]*/, '').match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * jscpd 実行（コード重複検出）
   */
  private async runJscpd(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    const reportDir = path.join(repoPath, '.jscpd-audit-report');

    try {
      const timeout = options.timeout || DEFAULT_TIMEOUT;

      await execFileAsync('npx', [
        '-y', 'jscpd',
        repoPath,
        '--reporters', 'json',
        '--output', reportDir,
        '--ignore', 'node_modules,dist,vendor,.git,coverage,__pycache__,migrations',
        '--min-lines', '10',
        '--min-tokens', '50'
      ], {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout,
        shell: true
      }).catch(() => {
        // jscpd は重複があってもexit 0だが、パースエラー等を握りつぶす
      });

      const reportPath = path.join(reportDir, 'jscpd-report.json');
      const reportContent = await fs.readFile(reportPath, 'utf-8').catch(() => '{"duplicates":[],"statistics":{}}');

      let result: JscpdResult;
      try {
        result = JSON.parse(reportContent);
      } catch {
        logger.error('Failed to parse jscpd output');
        return [];
      }

      return this.parseJscpdResults(result, repoPath);
    } catch (error) {
      logger.error('jscpd execution failed:', error);
      return [];
    } finally {
      // レポートディレクトリをクリーンアップ
      await fs.rm(reportDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private parseJscpdResults(result: JscpdResult, repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    if (!result.duplicates) return issues;

    for (const dup of result.duplicates) {
      const severity = dup.lines >= 50 ? Severity.High
        : dup.lines >= 20 ? Severity.Medium
        : Severity.Low;

      const firstFile = path.relative(repoPath, dup.firstFile.name).replace(/\\/g, '/');
      const secondFile = path.relative(repoPath, dup.secondFile.name).replace(/\\/g, '/');

      issues.push({
        id: randomUUID(),
        tool: AnalyzerTool.Jscpd,
        severity,
        category: IssueCategory.Maintainability,
        rule: 'jscpd-duplicate',
        message: `コードの重複を検出 (${dup.lines}行): ${firstFile}:${dup.firstFile.startLoc.line} と ${secondFile}:${dup.secondFile.startLoc.line}`,
        file: firstFile,
        line: dup.firstFile.startLoc.line,
        snippet: dup.fragment?.substring(0, 200)
      });
    }

    return issues;
  }

  /**
   * Roslyn/.NET Analyzer 実行（Docker ベース + 正規表現フォールバック）
   */
  private async runRoslynAnalyzer(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    // .csproj ファイルの検索
    const csprojFiles = await this.findFilesByExtension(repoPath, '.csproj');
    if (csprojFiles.length === 0) {
      return [];
    }

    // Docker ベースの解析を試行（新しいフレームワークの場合のみ）
    if (options.useDocker !== false) {
      try {
        const csprojContent = await fs.readFile(csprojFiles[0], 'utf-8');
        const targetFramework = this.detectTargetFramework(csprojContent);
        const dockerImage = this.selectDotnetDockerImage(targetFramework);

        if (dockerImage) {
          const dockerIssues = await this.runDockerDotnetAnalysis(
            repoPath, dockerImage, options
          );
          if (dockerIssues.length > 0) {
            logger.info(`Docker analysis found ${dockerIssues.length} issues`);
            return dockerIssues;
          }
          logger.info('Docker analysis completed but found no issues, falling back to pattern analysis');
        } else {
          logger.info(`Target framework ${targetFramework} does not support Docker-based Roslyn analysis, using pattern analysis`);
        }
      } catch (error) {
        logger.warn('Docker-based C# analysis failed, falling back to pattern analysis:', error);
      }
    }

    // フォールバック: 正規表現パターンベースの解析
    try {
      const patternIssues = await this.runCSharpPatternAnalysis(repoPath);
      logger.info(`Pattern analysis found ${patternIssues.length} issues`);
      return patternIssues;
    } catch (error) {
      logger.warn('C# pattern analysis failed:', error);
      return [];
    }
  }

  /**
   * Docker 経由で dotnet build + Roslyn アナライザーを実行
   */
  private async runDockerDotnetAnalysis(
    repoPath: string,
    dockerImage: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    const repoPathForDocker = repoPath.replace(/\\/g, '/');
    const timeout = options.timeout || DEFAULT_TIMEOUT;

    // Docker 内でビルド + アナライザー実行
    // ソースを read-only マウントし、コンテナ内にコピーしてビルド
    const shellScript = [
      'mkdir -p /build',
      'cp -r /src/. /build/',
      'cd /build',
      'cat > Directory.Build.props << \'BUILDPROPS\'',
      '<Project>',
      '  <PropertyGroup>',
      '    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>',
      '    <AnalysisLevel>latest-all</AnalysisLevel>',
      '    <EnableNETAnalyzers>true</EnableNETAnalyzers>',
      '    <TreatWarningsAsErrors>false</TreatWarningsAsErrors>',
      '  </PropertyGroup>',
      '  <ItemGroup>',
      '    <PackageReference Include="Microsoft.CodeAnalysis.NetAnalyzers" Version="9.0.0">',
      '      <PrivateAssets>all</PrivateAssets>',
      '      <IncludeAssets>runtime; build; native; contentfiles; analyzers</IncludeAssets>',
      '    </PackageReference>',
      '  </ItemGroup>',
      '</Project>',
      'BUILDPROPS',
      'dotnet restore --verbosity quiet 2>&1',
      'dotnet build --no-restore -v normal 2>&1 || true'
    ].join('\n');

    const { stdout, stderr } = await execFileAsync('docker', [
      'run', '--rm',
      '-v', `${repoPathForDocker}:/src:ro`,
      dockerImage,
      'sh', '-c', shellScript
    ], {
      maxBuffer: 50 * 1024 * 1024,
      timeout
    }).catch(error => {
      return {
        stdout: (error as any).stdout || '',
        stderr: (error as any).stderr || ''
      };
    });

    const output = `${stdout}\n${stderr}`;
    return this.parseDotnetBuildWarnings(output, repoPath);
  }

  /**
   * .csproj からターゲットフレームワークを検出
   */
  private detectTargetFramework(csprojContent: string): string {
    const match = csprojContent.match(/<TargetFramework>(.*?)<\/TargetFramework>/);
    return match?.[1] ?? 'unknown';
  }

  /**
   * ターゲットフレームワークに適した Docker イメージを選択
   * 古いフレームワーク（netcoreapp2.x, netcoreapp3.x 等）は null を返す
   */
  private selectDotnetDockerImage(targetFramework: string): string | null {
    if (targetFramework.startsWith('net9.')) return 'mcr.microsoft.com/dotnet/sdk:9.0-alpine';
    if (targetFramework.startsWith('net8.')) return 'mcr.microsoft.com/dotnet/sdk:8.0-alpine';
    if (targetFramework.startsWith('net7.')) return 'mcr.microsoft.com/dotnet/sdk:7.0-alpine';
    if (targetFramework.startsWith('net6.')) return 'mcr.microsoft.com/dotnet/sdk:6.0-alpine';
    if (targetFramework.startsWith('net5.')) return 'mcr.microsoft.com/dotnet/sdk:5.0';
    // netcoreapp2.1, netcoreapp3.1 等の古いフレームワークは Roslyn Analyzer 非対応
    return null;
  }

  /**
   * dotnet build の出力から警告・エラーをパース
   * MSBuild 形式: path(line,column): warning/error CODE: message [project]
   */
  private parseDotnetBuildWarnings(output: string, _repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const diagnosticPattern = /^(.+?)\((\d+),(\d+)\):\s*(warning|error)\s+(\w+):\s*(.+?)(?:\s*\[.+\])?\s*$/gm;

    let match;
    while ((match = diagnosticPattern.exec(output)) !== null) {
      const [, filePath, lineStr, colStr, level, code, message] = match;
      const line = parseInt(lineStr, 10);
      const column = parseInt(colStr, 10);

      // /build/ プレフィックスを除去して相対パスに変換
      const relativePath = filePath.replace(/^\/build\//, '').replace(/\\/g, '/');

      const severity = this.mapDotnetDiagnosticSeverity(code, level);
      const category = this.categorizeDotnetDiagnostic(code);

      issues.push({
        id: randomUUID(),
        tool: AnalyzerTool.RoslynAnalyzer,
        severity,
        category,
        rule: code,
        message,
        file: relativePath,
        line,
        column
      });
    }

    return issues;
  }

  /**
   * dotnet 診断コードの重要度をマッピング
   */
  private mapDotnetDiagnosticSeverity(code: string, level: string): Severity {
    // セキュリティ系: CA2100, CA30xx, CA5xxx
    if (/^CA(2100|30\d{2}|5\d{3})$/.test(code)) {
      return Severity.Critical;
    }
    // セキュリティ系: CA31xx
    if (/^CA31\d{2}$/.test(code)) {
      return Severity.High;
    }
    // ビルドエラー
    if (level === 'error') {
      return Severity.High;
    }
    // コード解析警告
    if (code.startsWith('CA')) {
      return Severity.Medium;
    }
    // コンパイラ警告
    if (code.startsWith('CS')) {
      return Severity.Low;
    }
    return Severity.Medium;
  }

  /**
   * dotnet 診断コードをカテゴリ分類
   */
  private categorizeDotnetDiagnostic(code: string): IssueCategory {
    // Security: CA2xxx, CA3xxx, CA5xxx
    if (/^CA(2\d{3}|3\d{3}|5\d{3})$/.test(code)) {
      return IssueCategory.Security;
    }
    // Performance: CA18xx
    if (/^CA18\d{2}$/.test(code)) {
      return IssueCategory.Performance;
    }
    // Maintainability: CA15xx
    if (/^CA15\d{2}$/.test(code)) {
      return IssueCategory.Maintainability;
    }
    return IssueCategory.CodeQuality;
  }

  /**
   * C# ソースコードの正規表現パターンベース解析（フォールバック）
   */
  private async runCSharpPatternAnalysis(repoPath: string): Promise<AnalysisIssue[]> {
    const csFiles = await this.findFilesByExtension(repoPath, '.cs');
    const cshtmlFiles = await this.findFilesByExtension(repoPath, '.cshtml');
    const allFiles = [...csFiles, ...cshtmlFiles];
    if (allFiles.length === 0) {
      return [];
    }

    const issues: AnalysisIssue[] = [];
    const rules = this.getCSharpPatternRules();

    for (const filePath of allFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(repoPath, filePath).replace(/\\/g, '/');

        for (const rule of rules) {
          // ファイルパターンフィルタ
          if (rule.filePattern && !rule.filePattern.test(relativePath)) {
            continue;
          }

          // ファイルコンテンツ条件チェック
          if (rule.fileCondition && !rule.fileCondition(content)) {
            continue;
          }

          // 行ごとにパターンマッチング
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // コメント行をスキップ（コメントアウト検出ルールを除く）
            if (rule.id !== 'CS-SEC-010' && rule.id !== 'CS-SEC-023' && /^\s*\/\//.test(line)) {
              continue;
            }

            if (rule.pattern.test(line)) {
              issues.push({
                id: randomUUID(),
                tool: AnalyzerTool.RoslynAnalyzer,
                severity: rule.severity,
                category: rule.category,
                rule: rule.id,
                message: rule.message,
                file: relativePath,
                line: i + 1,
                snippet: line.trim().substring(0, 200)
              });
            }
            // RegExp の lastIndex をリセット
            rule.pattern.lastIndex = 0;
          }
        }
      } catch (error) {
        logger.warn(`Failed to analyze C# file ${filePath}:`, error);
      }
    }

    return issues;
  }

  /**
   * C# パターンルール定義
   */
  private getCSharpPatternRules(): PatternRule[] {
    return [
      // === セキュリティ: Critical ===
      {
        id: 'CS-SEC-001',
        pattern: /\$"(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC)\s.*\{/i,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'SQLインジェクションの脆弱性: パラメータ化されていないSQL文に変数を直接埋め込んでいます'
      },
      {
        id: 'CS-SEC-002',
        pattern: /(?:apiKey|api_key|secretKey|secret_key|apiSecret|api_secret|appSecret)\s*=\s*"[^"]{8,}"/i,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'APIキー/シークレットがハードコーディングされています'
      },
      {
        id: 'CS-SEC-003',
        pattern: /(?:Password|AdminPassword|DefaultPassword|MasterPassword)\s*=\s*"[^"]{3,}"/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'パスワードがコード内にハードコーディングされています'
      },
      {
        id: 'CS-SEC-004',
        pattern: /UseDeveloperExceptionPage\s*\(\)/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'DeveloperExceptionPageが使用されています。本番環境では詳細なエラー情報が漏洩する可能性があります'
      },
      {
        id: 'CS-SEC-005',
        pattern: /\.Password\s*=\s*(?:employee|user|model|input|request|dto|entity)\./i,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'パスワードが平文のまま保存されています。ハッシュ化が必要です'
      },
      {
        id: 'CS-SEC-006',
        pattern: /(?:(?:AppendLine|Append|WriteLine|Write)\s*\(.*\b(?:Password|SocialSecurityNumber|CreditCard|SSN)\b|(?:Password|SocialSecurityNumber|CreditCard|SSN)\b.*(?:AppendLine|Append|Write|csv))/i,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: '機密情報（パスワード、SSN等）がエクスポートまたはレスポンスに含まれています'
      },
      // === セキュリティ: High ===
      {
        id: 'CS-SEC-007',
        pattern: /Html\.Raw\s*\(/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'Html.Rawの使用によるXSS脆弱性の可能性があります。ユーザー入力をサニタイズしてください'
      },
      {
        id: 'CS-SEC-008',
        pattern: /AllowAnyOrigin\s*\(\)/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'CORS設定が緩すぎます。AllowAnyOriginは任意のオリジンからのアクセスを許可します'
      },
      {
        id: 'CS-SEC-010',
        pattern: /\/\/\s*app\.UseHttpsRedirection/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'HTTPSリダイレクトがコメントアウトされています。本番環境ではHTTPSを強制してください'
      },
      {
        id: 'CS-SEC-011',
        pattern: /\.HttpOnly\s*=\s*false/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'CookieのHttpOnlyがfalseです。XSS攻撃でCookieが窃取される可能性があります'
      },
      {
        id: 'CS-SEC-012',
        pattern: /SecurePolicy\s*=\s*CookieSecurePolicy\.None/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'CookieのSecurePolicyがNoneです。HTTP経由でCookieが送信される可能性があります'
      },
      {
        id: 'CS-SEC-013',
        pattern: /\[HttpPost\]/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'POSTエンドポイントに[Authorize]属性がありません。認証・認可チェックを追加してください',
        filePattern: /Controller\.cs$/,
        fileCondition: (content) => !content.includes('[Authorize]')
      },
      {
        id: 'CS-SEC-014',
        pattern: /ViewBag\.\w+\s*=\s*\w+\.(?:Password|SocialSecurityNumber|SSN|Salary)/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: '機密情報（パスワード、SSN、給与）がViewBag経由でビューに渡されています'
      },
      // === セキュリティ: Medium ===
      {
        id: 'CS-SEC-015',
        pattern: /Content\s*\([^)]*(?:ex\.Message|ex\.StackTrace|exception\.Message)/,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: '例外の詳細がユーザーに表示されています。攻撃者にシステム情報が漏洩する可能性があります'
      },
      {
        id: 'CS-SEC-016',
        pattern: /IdleTimeout\s*=\s*TimeSpan\.From\w+\s*\(\s*\d{4,}/,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: 'セッションのタイムアウトが非常に長く設定されています'
      },
      {
        id: 'CS-SEC-017',
        pattern: /Cookie\.HttpOnly\s*=\s*false/,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: 'セッションCookieのHttpOnlyがfalseに設定されています。セッションハイジャックのリスクがあります'
      },
      // === コード品質: High ===
      {
        id: 'CS-CQ-001',
        pattern: /AddSingleton<[^>]*DbContext/,
        severity: Severity.High,
        category: IssueCategory.CodeQuality,
        message: 'DbContextがSingletonとして登録されています。スレッドセーフでないため、AddDbContext（Scoped）で登録してください'
      },
      // === コード品質: Medium ===
      {
        id: 'CS-CQ-002',
        pattern: /private\s+static\s+(?:List|Dictionary|HashSet|Collection|Queue|Stack|ConcurrentDictionary)</,
        severity: Severity.Medium,
        category: IssueCategory.CodeQuality,
        message: '変更可能なstaticコレクションが使用されています。マルチスレッド環境で問題が発生する可能性があります'
      },
      {
        id: 'CS-CQ-003',
        pattern: /catch\s*\(\s*Exception\s+\w+\s*\)/,
        severity: Severity.Medium,
        category: IssueCategory.CodeQuality,
        message: '汎用例外（Exception）をキャッチしています。具体的な例外型をキャッチしてください'
      },
      {
        id: 'CS-CQ-004',
        pattern: /(?:int|long|double|float|decimal)\.Parse\s*\(/,
        severity: Severity.Medium,
        category: IssueCategory.CodeQuality,
        message: 'Parse()を使用しています。TryParse()で変換エラーを安全に処理してください'
      },
      {
        id: 'CS-CQ-005',
        pattern: /public\s+static\s+(?:IConfiguration|IServiceProvider|IHostEnvironment)\s+\w+/,
        severity: Severity.Medium,
        category: IssueCategory.CodeQuality,
        message: 'DIコンテナで管理すべきオブジェクトがグローバルstaticフィールドに保存されています'
      },
      // === コード品質: Low ===
      {
        id: 'CS-CQ-006',
        pattern: /ViewBag\.\w+\s*=/,
        severity: Severity.Low,
        category: IssueCategory.CodeQuality,
        message: 'ViewBagの使用。型安全なViewModelの使用を検討してください'
      },
      // === パフォーマンス: High ===
      {
        id: 'CS-PERF-001',
        pattern: /(?:_context|dbContext|_db|_repository)\.\w+\.ToList\s*\(\)/i,
        severity: Severity.High,
        category: IssueCategory.Performance,
        message: '同期的なデータベース操作（ToList）が使用されています。ToListAsync()を使用してください',
        filePattern: /Controller\.cs$/
      },
      // === C# 追加セキュリティ: High ===
      {
        id: 'CS-SEC-022',
        pattern: /UseUrls.*"http:\/\//,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'UseUrlsでHTTPが許可されています。本番環境ではHTTPSのみに制限してください',
        filePattern: /Program\.cs$/
      },
      // === C# 追加セキュリティ: Medium (コメント検出) ===
      {
        id: 'CS-SEC-023',
        pattern: /\/\/\s*app\.UseHsts/,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: 'UseHsts()がコメントアウトされています。本番環境ではHSTSを有効にしてください'
      },
      // === C# 追加コード品質: Medium ===
      {
        id: 'CS-CQ-007',
        pattern: /\[HttpPost\]/,
        severity: Severity.Medium,
        category: IssueCategory.CodeQuality,
        message: 'POSTエンドポイントでModelState.IsValidのチェックが行われていません',
        filePattern: /Controller\.cs$/,
        fileCondition: (content) => content.includes('[HttpPost]') && !content.includes('ModelState.IsValid')
      },
      {
        id: 'CS-CQ-008',
        pattern: /\.AddMvc\s*\(\)/,
        severity: Severity.Medium,
        category: IssueCategory.CodeQuality,
        message: 'AddMvc()は非推奨です。AddControllersWithViews()またはAddControllers()を使用してください'
      },
    ];
  }

  /**
   * 共通パターン解析（全言語対応）
   * 設定ファイル、依存関係ファイル、各言語のソースコードを対象とする
   */
  private async runCommonPatternAnalysis(repoPath: string): Promise<AnalysisIssue[]> {
    const extensions = [
      '.json', '.yml', '.yaml', '.env', '.properties',
      '.csproj', '.xml', '.txt',
      '.php',
      '.py',
      '.java',
      '.js', '.ts', '.tsx', '.jsx', '.vue',
      '.html'
    ];

    // 全対象ファイルを収集
    const filePromises = extensions.map(ext => this.findFilesByExtension(repoPath, ext));
    const fileArrays = await Promise.all(filePromises);
    const allFiles = fileArrays.flat();

    if (allFiles.length === 0) {
      return [];
    }

    const issues: AnalysisIssue[] = [];
    const rules: PatternRule[] = [
      ...this.getConfigSecurityRules(),
      ...this.getDependencyRules(),
      ...this.getPHPPatternRules(),
      ...this.getJavaScriptPatternRules(),
      ...this.getPythonPatternRules(),
      ...this.getJavaPatternRules(),
    ];

    // コメント検出ルール（コメント行スキップを除外するルール）
    const commentDetectionRules = new Set(['CS-SEC-023']);

    for (const filePath of allFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(repoPath, filePath).replace(/\\/g, '/');

        for (const rule of rules) {
          if (rule.filePattern && !rule.filePattern.test(relativePath)) {
            continue;
          }
          if (rule.fileCondition && !rule.fileCondition(content)) {
            continue;
          }

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // コメント行をスキップ（コメント検出ルールを除く）
            if (!commentDetectionRules.has(rule.id) && /^\s*(?:\/\/|#|<!--)/.test(line)) {
              continue;
            }

            if (rule.pattern.test(line)) {
              // contextCheck がある場合は前後の行も確認
              if (rule.contextCheck && !rule.contextCheck(lines, i)) {
                rule.pattern.lastIndex = 0;
                continue;
              }
              issues.push({
                id: randomUUID(),
                tool: this.resolveToolFromRuleId(rule.id),
                severity: rule.severity,
                category: rule.category,
                rule: rule.id,
                message: rule.message,
                file: relativePath,
                line: i + 1,
                snippet: line.trim().substring(0, 200)
              });
            }
            rule.pattern.lastIndex = 0;
          }
        }
      } catch (error) {
        logger.warn(`Failed to analyze file ${filePath}:`, error);
      }
    }

    return issues;
  }

  /**
   * 設定ファイルのシークレット検出ルール（全言語共通）
   */
  private getConfigSecurityRules(): PatternRule[] {
    return [
      {
        id: 'CONFIG-SEC-001',
        pattern: /(?:"[^"]*Connection[^"]*":\s*"[^"]*Password=[^"]+"|Password=[^\s;]+.*(?:Server|Database|Data Source))/i,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: '接続文字列に認証情報がハードコーディングされています。環境変数またはシークレット管理サービスを使用してください',
        filePattern: /(?:appsettings.*\.json|\.env|\.properties|database\.php|settings\.py|application\.(?:yml|yaml|properties))$/i
      },
      {
        id: 'CONFIG-SEC-002',
        pattern: /(?:"(?:ApiKey|api_key|Secret|SecretKey|secret_key|AccessKey|access_key)":\s*"[^"]{8,}"|(?:API_KEY|SECRET_KEY|ACCESS_KEY|APP_SECRET)\s*=\s*\S{8,})/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'APIキーまたはシークレットが設定ファイルにハードコーディングされています',
        filePattern: /(?:appsettings.*\.json|\.env|\.properties|application\.(?:yml|yaml|properties))$/i
      },
      {
        id: 'CONFIG-SEC-003',
        pattern: /SECRET_KEY\s*=\s*['"][^'"]{8,}['"]/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'SECRET_KEYがソースコードにハードコーディングされています。環境変数に移行してください',
        filePattern: /(?:settings\.py|\.env)$/
      },
      {
        id: 'CONFIG-SEC-004',
        pattern: /"Default"\s*:\s*"Debug"/,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: 'ログレベルがDebugに設定されています。本番環境ではWarning以上に変更してください',
        filePattern: /appsettings.*\.json$/i
      },
      {
        id: 'CONFIG-SEC-005',
        pattern: /^\s*DEBUG\s*=\s*True/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'DEBUG=Trueが設定されています。本番環境ではFalseに設定してください',
        filePattern: /settings\.py$/
      },
      {
        id: 'CONFIG-SEC-006',
        pattern: /verify\s*=\s*False/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'SSL検証が無効化されています（verify=False）。本番環境では有効にしてください',
        filePattern: /\.py$/
      },
      {
        id: 'CONFIG-SEC-007',
        pattern: /"\s*(?:Password|Passwd|Pwd)\s*"\s*:\s*"[^"]+"/i,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'パスワードが設定ファイルにハードコーディングされています。シークレット管理サービスまたは環境変数を使用してください',
        filePattern: /(?:appsettings.*\.json|\.env|composer\.json|database\.php|application\.(?:yml|yaml|properties))$/i
      },
    ];
  }

  /**
   * 依存関係の脆弱性検出ルール（全言語共通）
   */
  private getDependencyRules(): PatternRule[] {
    return [
      {
        id: 'DEP-001',
        pattern: /<TargetFramework>netcoreapp/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'EOL済みの.NETフレームワーク（netcoreapp）が使用されています。.NET 8以降にアップグレードしてください',
        filePattern: /\.csproj$/
      },
      {
        id: 'DEP-002',
        pattern: /Newtonsoft\.Json.*Version="(?:9|10|11|12)\./,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: '脆弱性のあるNewtonsoft.Jsonバージョンが使用されています。13.0.1以上にアップグレードしてください',
        filePattern: /\.csproj$/
      },
      {
        id: 'DEP-003',
        pattern: /System\.Data\.SqlClient.*Version="4\.[0-5]/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: '脆弱性のあるSystem.Data.SqlClientが使用されています。Microsoft.Data.SqlClientへ移行してください',
        filePattern: /\.csproj$/
      },
      {
        id: 'DEP-004',
        pattern: /Django[<>=!]+[12]\./,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'EOL済みのDjangoバージョンが使用されています。最新のLTSバージョンにアップグレードしてください',
        filePattern: /requirements.*\.txt$/
      },
      {
        id: 'DEP-005',
        pattern: /"laravel\/framework":\s*"[^"]*(?:5\.|6\.|7\.)/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'EOL済みのLaravelバージョンが使用されています。最新のLTSバージョンにアップグレードしてください',
        filePattern: /composer\.json$/
      },
      // ====================================================================
      // Phase 1: Python 依存関係の既知脆弱バージョン検出（fallback）
      // ====================================================================
      {
        id: 'DEP-PY-001',
        pattern: /requests\s*[=<>!~]+\s*[12]\.\d+/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'requestsの古いバージョンが使用されています。CVE-2023-32681等の脆弱性があります。2.31以上にアップグレードしてください',
        filePattern: /requirements.*\.txt$/,
        contextCheck: (lines: string[], index: number) => {
          const match = lines[index].match(/requests\s*[=<>!~]+\s*(\d+)\.(\d+)/);
          if (match) {
            const major = parseInt(match[1], 10);
            const minor = parseInt(match[2], 10);
            return major < 2 || (major === 2 && minor < 31);
          }
          return false;
        },
      },
      {
        id: 'DEP-PY-002',
        pattern: /[Pp]illow\s*[=<>!~]+\s*[0-8]\./,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'Pillowの古いバージョンには複数のCVEがあります。9.0以上にアップグレードしてください',
        filePattern: /requirements.*\.txt$/,
      },
      {
        id: 'DEP-PY-003',
        pattern: /urllib3\s*[=<>!~]+\s*1\.26\.[0-9]\b/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'urllib3の古いバージョンにはCVE-2023-43804等の脆弱性があります。1.26.18以上にアップグレードしてください',
        filePattern: /requirements.*\.txt$/,
      },
      {
        id: 'DEP-PY-004',
        pattern: /Django\s*[=<>!~]+\s*[12]\.\d+/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'DjangoのEOL済みバージョンが使用されています。セキュリティパッチが提供されません。Django 4.2 LTS以上にアップグレードしてください',
        filePattern: /requirements.*\.txt$/,
      },
      // ====================================================================
      // Phase 1: PHP/Laravel 依存関係の既知脆弱バージョン検出（fallback）
      // ====================================================================
      {
        id: 'DEP-PHP-001',
        pattern: /"laravel\/framework"\s*:\s*"[~^]?8\./,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'Laravel 8.xは2023年にサポートが終了しています。セキュリティアップデートがありません。Laravel 10.x以上にアップグレードしてください',
        filePattern: /composer\.json$/,
      },
      {
        id: 'DEP-PHP-002',
        pattern: /"guzzlehttp\/guzzle"\s*:\s*"[~^]?[0-6]\./,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'Guzzleの古いバージョンにはCVE-2022-31090等の脆弱性があります。7.0以上にアップグレードしてください',
        filePattern: /composer\.json$/,
      },
    ];
  }

  /**
   * PHP パターンルール
   */
  private getPHPPatternRules(): PatternRule[] {
    return [
      {
        id: 'PHP-SEC-001',
        pattern: /(?:DB::(?:select|raw|statement|insert|update|delete))\s*\(.*\$/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'SQLインジェクションの脆弱性: 変数を直接SQL文に埋め込んでいます。パラメータバインディングを使用してください',
        filePattern: /\.php$/
      },
      {
        id: 'PHP-SEC-002',
        pattern: /md5\s*\(\s*\$/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'MD5は暗号学的に安全ではありません。パスワードにはbcrypt（Hash::make）を使用してください',
        filePattern: /\.php$/
      },
      {
        id: 'PHP-SEC-003',
        pattern: /\{!!\s*\$/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'Bladeのエスケープなし出力（{!! !!}）が使用されています。XSS脆弱性のリスクがあります',
        filePattern: /\.(?:blade\.php|php)$/
      },
      {
        id: 'PHP-SEC-004',
        pattern: /'password'\s*=>\s*'[^']+'/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'パスワードが設定ファイルにハードコーディングされています',
        filePattern: /(?:config\/|\.env|database\.php).*\.php$/
      },
      {
        id: 'PHP-SEC-005',
        pattern: /->withoutMiddleware\s*\(.*auth/i,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: '認証ミドルウェアが除外されています。意図的でない場合はセキュリティリスクです',
        filePattern: /\.php$/
      },
      // --- N+1 クエリ検出 ---
      {
        id: 'PHP-PERF-001',
        pattern: /foreach\s*\(\s*\$/,
        severity: Severity.High,
        category: IssueCategory.Performance,
        message: 'ループ内でDBクエリが実行されている可能性があります（N+1問題）。Eagerロード（with）の使用を検討してください',
        filePattern: /\.php$/,
        contextCheck: (lines, i) => {
          const block = lines.slice(i, Math.min(i + 10, lines.length)).join('\n');
          return /(?:DB::(?:select|table)|->where\(|->find\(|->get\(\))/.test(block);
        }
      },
      // --- レート制限チェック ---
      {
        id: 'PHP-SEC-006',
        pattern: /Route::(?:post|put|patch|delete)\s*\(/,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: '状態変更ルートにthrottleミドルウェアが設定されていません。レート制限の追加を検討してください',
        filePattern: /routes\/.*\.php$/,
        fileCondition: (content) => !content.includes('throttle')
      },
      // --- 認証ミドルウェア確認 ---
      {
        id: 'PHP-SEC-007',
        pattern: /Route::(?:post|put|patch|delete)\s*\(/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: '状態変更ルートにauthミドルウェアが設定されていない可能性があります。認証の設定を確認してください',
        filePattern: /routes\/(?:web|api)\.php$/,
        fileCondition: (content) => !content.includes("middleware('auth") &&
          !content.includes("middleware(['auth") && !content.includes("middleware(\"auth")
      },
      // ====================================================================
      // Phase 1: Laravel 固有の検出ルール強化（PHP-SEC-008 ～ PHP-CQ-002）
      // ====================================================================
      // --- eval() の使用 ---
      {
        id: 'PHP-SEC-008',
        pattern: /\beval\s*\(/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'eval()の使用はコードインジェクションのリスクがあります',
        filePattern: /\.(?:php|blade\.php)$/,
      },
      // --- phpinfo() の使用 ---
      {
        id: 'PHP-SEC-009',
        pattern: /\bphpinfo\s*\(/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'phpinfo()が使用されています。本番環境では削除してください',
        filePattern: /\.php$/,
      },
      // --- パストラバーサル（ファイルダウンロード） ---
      {
        id: 'PHP-SEC-010',
        pattern: /(?:file_get_contents|readfile|fopen|include|require)\s*\(\s*\$(?:request|_GET|_POST|_REQUEST)/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'ユーザー入力がファイルパスに直接使用されています。パストラバーサル脆弱性のリスクがあります',
        filePattern: /\.php$/,
      },
      // --- CSRF 除外設定 ---
      {
        id: 'PHP-SEC-011',
        pattern: /\$except\s*=\s*\[/,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: 'CSRF保護の除外設定があります。除外ルートのセキュリティを確認してください',
        filePattern: /VerifyCsrfToken\.php$/,
      },
      // --- 入力バリデーション欠如 ---
      {
        id: 'PHP-CQ-001',
        pattern: /\$request->(?:input|get|post|all)\s*\(/,
        severity: Severity.High,
        category: IssueCategory.CodeQuality,
        message: '入力値を直接取得しています。$request->validate()またはFormRequestによるバリデーションを検討してください',
        filePattern: /Controller\.php$/,
        contextCheck: (lines: string[], index: number) => {
          // 前後20行以内に validate() がない場合のみ検出
          const block = lines.slice(Math.max(0, index - 20), Math.min(index + 20, lines.length)).join('\n');
          return !/->validate\s*\(/.test(block);
        },
      },
      // --- デバッグ関数の残留 ---
      {
        id: 'PHP-CQ-002',
        pattern: /\b(?:dd|dump|var_dump|print_r)\s*\(/,
        severity: Severity.Medium,
        category: IssueCategory.CodeQuality,
        message: 'デバッグ関数が残っています。本番環境では削除してください',
        filePattern: /\.php$/,
      },
      // ====================================================================
      // Phase 1 追加: Laravel 固有パターン
      // ====================================================================
      // --- DB変数補間によるSQLインジェクション（ダブルクォート内変数展開）---
      {
        id: 'PHP-SEC-012',
        pattern: /DB::(?:select|insert|update|delete|raw|statement)\s*\(\s*"/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'DB::クエリにダブルクォート文字列を使用しています。変数が展開されSQLインジェクションのリスクがあります。パラメータバインディングを使用してください',
        filePattern: /\.php$/,
      },
      // --- HTMLを直接returnでXSS ---
      {
        id: 'PHP-SEC-013',
        pattern: /return\s*"<\w+[^"]*\$/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'HTML文字列を直接返却しており、変数が含まれています。XSS脆弱性のリスクがあります。Bladeテンプレートを使用してください',
        filePattern: /\.php$/,
      },
      // --- デバッグルートの検出 ---
      {
        id: 'PHP-SEC-014',
        pattern: /Route::(?:get|post)\s*\(\s*['"]\/debug/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'デバッグエンドポイントが公開されています。本番環境では削除してください',
        filePattern: /\.php$/,
      },
      // --- config()で機密情報を返却 ---
      {
        id: 'PHP-SEC-015',
        pattern: /config\s*\(\s*['"](?:database|app\.key)/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: '機密設定情報（database/app.key）がレスポンスに含まれています。情報漏洩のリスクがあります',
        filePattern: /\.php$/,
        contextCheck: (lines: string[], index: number) => {
          const block = lines.slice(Math.max(0, index - 5), Math.min(index + 5, lines.length)).join('\n');
          return /response\(\)|return/.test(block);
        },
      },
      // --- session()に機密情報を直接保存 ---
      {
        id: 'PHP-SEC-016',
        pattern: /session\s*\(\s*\[.*(?:password|token|secret)/i,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: '機密情報をセッションに直接保存しています。暗号化されたセッションドライバを使用してください',
        filePattern: /\.php$/,
      },
      // --- 本番DB認証情報のハードコーディング ---
      {
        id: 'PHP-SEC-017',
        pattern: /['"]password['"]\s*=>\s*['"][^'"]{4,}['"]/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'データベースパスワードがハードコーディングされています。環境変数を使用してください',
        filePattern: /database\.php$/,
      },
      // --- パストラバーサル（storage_path/base_path でファイルアクセス） ---
      {
        id: 'PHP-SEC-018',
        pattern: /(?:storage_path|base_path|public_path)\s*\([^)]*\.\s*\$/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'ユーザー入力がファイルパスの構築に使用されています。パストラバーサル脆弱性のリスクがあります。パスの検証を行ってください',
        filePattern: /\.php$/,
      },
    ];
  }

  /**
   * JavaScript/TypeScript パターンルール
   */
  private getJavaScriptPatternRules(): PatternRule[] {
    return [
      {
        id: 'JS-SEC-001',
        pattern: /dangerouslySetInnerHTML/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'dangerouslySetInnerHTMLの使用はXSS脆弱性のリスクがあります。DOMPurify等でサニタイズしてください',
        filePattern: /\.(?:jsx?|tsx?|vue)$/
      },
      {
        id: 'JS-SEC-002',
        pattern: /\beval\s*\(/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'eval()の使用はコードインジェクションのリスクがあります。安全な代替手段を検討してください',
        filePattern: /\.(?:jsx?|tsx?|vue)$/
      },
      {
        id: 'JS-SEC-003',
        pattern: /\.innerHTML\s*=/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'innerHTMLへの直接代入はXSS脆弱性のリスクがあります。textContentまたはDOMPurifyを使用してください',
        filePattern: /\.(?:jsx?|tsx?|vue)$/
      },
      {
        id: 'JS-SEC-004',
        pattern: /localStorage\.setItem\s*\([^)]*(?:token|password|secret|credential)/i,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: '機密情報がlocalStorageに保存されています。HttpOnlyクッキーの使用を検討してください',
        filePattern: /\.(?:jsx?|tsx?|vue)$/
      },
      {
        id: 'JS-SEC-005',
        pattern: /console\.log\s*\([^)]*(?:password|token|secret|credential)/i,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: '機密情報がconsole.logで出力されています。本番環境では削除してください',
        filePattern: /\.(?:jsx?|tsx?|vue)$/
      },
      {
        id: 'JS-SEC-006',
        pattern: /v-html\s*=/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'v-htmlディレクティブの使用はXSS脆弱性のリスクがあります。v-textまたはDOMPurifyでサニタイズしてください',
        filePattern: /\.vue$/
      },
      {
        id: 'JS-SEC-007',
        pattern: /cors\s*\(\s*\{[^}]*origin\s*:\s*['"][*]['"]/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'CORS設定でワイルドカード(*)が使用されています。許可するオリジンを明示的に指定してください',
        filePattern: /\.(?:js|ts)$/
      },
      {
        id: 'JS-SEC-008',
        pattern: /origin\s*:\s*['"][*]['"]/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'CORS設定で全オリジンが許可されています。本番環境では許可するオリジンを明示的に指定してください',
        filePattern: /\.(?:js|ts)$/
      },
      // --- APIキーのハードコーディング検出 ---
      {
        id: 'JS-SEC-009',
        pattern: /(?:api[_-]?key|apiKey|API_KEY|secret[_-]?key|secretKey)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'APIキー/シークレットがハードコーディングされています。環境変数を使用してください',
        filePattern: /\.(?:js|ts|jsx|tsx|vue)$/
      },
      // --- HTTP通信の検出 ---
      {
        id: 'JS-SEC-010',
        pattern: /['"]http:\/\/(?!localhost|127\.0\.0\.1)/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'HTTPプロトコルが使用されています。本番環境ではHTTPSを使用してください',
        filePattern: /\.(?:js|ts|jsx|tsx|vue)$/
      },
      // --- N+1 クエリ検出 ---
      {
        id: 'JS-PERF-001',
        pattern: /for\s*\(|\.forEach\s*\(|\.map\s*\(/,
        severity: Severity.High,
        category: IssueCategory.Performance,
        message: 'ループ内でDBクエリまたはAPI呼び出しが実行されている可能性があります（N+1問題）。バッチ処理を検討してください',
        filePattern: /\.(?:js|ts)$/,
        contextCheck: (lines, i) => {
          const block = lines.slice(i, Math.min(i + 10, lines.length)).join('\n');
          return /await\s+.*\.(?:find|findOne|findById|query|fetch|get)\s*\(/.test(block);
        }
      },
      // --- レート制限チェック ---
      {
        id: 'JS-SEC-011',
        pattern: /app\.(?:post|put|patch|delete)\s*\(/,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: 'Express.jsの状態変更エンドポイントにレート制限が設定されていません。express-rate-limitの使用を検討してください',
        filePattern: /\.(?:js|ts)$/,
        fileCondition: (content) => !content.includes('rateLimit') && !content.includes('rate-limit') && !content.includes('rate_limit')
      },
    ];
  }

  /**
   * Python パターンルール
   */
  private getPythonPatternRules(): PatternRule[] {
    return [
      {
        id: 'PY-SEC-001',
        pattern: /\.execute\s*\(.*(?:f"|%s|\.format\s*\(|"\s*\+)/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'SQLインジェクションの脆弱性: パラメータ化クエリを使用してください',
        filePattern: /\.py$/
      },
      {
        id: 'PY-SEC-002',
        pattern: /(?:hashlib\.md5|md5\s*\()/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'MD5は暗号学的に安全ではありません。パスワードにはPBKDF2/bcrypt/Argon2を使用してください',
        filePattern: /\.py$/
      },
      {
        id: 'PY-SEC-003',
        pattern: /CORS_ALLOW_ALL_ORIGINS\s*=\s*True/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'CORS_ALLOW_ALL_ORIGINS=Trueはすべてのオリジンからのアクセスを許可します。ホワイトリストを使用してください',
        filePattern: /(?:settings|config)\.py$/
      },
      {
        id: 'PY-SEC-004',
        pattern: /ALLOWED_HOSTS\s*=\s*\[.*['"]\*['"]/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: "ALLOWED_HOSTSが'*'に設定されています。許可するホストを明示的に指定してください",
        filePattern: /settings\.py$/
      },
      {
        id: 'PY-SEC-005',
        pattern: /mark_safe\s*\(/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'mark_safe()の使用はXSS脆弱性のリスクがあります。入力値のサニタイズを確認してください',
        filePattern: /\.py$/
      },
      // --- N+1 クエリ検出 ---
      {
        id: 'PY-PERF-001',
        pattern: /for\s+\w+\s+in\s+\w+/,
        severity: Severity.High,
        category: IssueCategory.Performance,
        message: 'ループ内でORMクエリが実行されている可能性があります（N+1問題）。select_related/prefetch_relatedの使用を検討してください',
        filePattern: /\.py$/,
        contextCheck: (lines, i) => {
          const block = lines.slice(i, Math.min(i + 10, lines.length)).join('\n');
          return /\.objects\.(get|filter|all|exclude)\(/.test(block);
        }
      },
      // --- レート制限チェック ---
      {
        id: 'PY-SEC-006',
        pattern: /class\s+\w+.*(?:APIView|ViewSet|GenericAPIView)/,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: 'APIビューにthrottle_classesが設定されていません。レート制限の設定を検討してください',
        filePattern: /views\.py$/,
        fileCondition: (content) => !content.includes('throttle_classes')
      },
      // --- 認証ミドルウェア確認 ---
      {
        id: 'PY-SEC-007',
        pattern: /def\s+(?:post|put|patch|delete|create|update|destroy)\s*\(\s*self/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: '状態変更メソッドに認証が設定されていない可能性があります。LoginRequiredMixinまたはIsAuthenticatedの使用を確認してください',
        filePattern: /views\.py$/,
        fileCondition: (content) => !content.includes('LoginRequiredMixin') &&
          !content.includes('@login_required') && !content.includes('IsAuthenticated')
      },
      // ====================================================================
      // Phase 1: Django 固有の検出ルール強化（PY-SEC-008 ～ PY-SEC-016）
      // ====================================================================
      // --- @csrf_exempt デコレータの使用 ---
      {
        id: 'PY-SEC-008',
        pattern: /@csrf_exempt/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: '@csrf_exemptが使用されています。CSRF保護の無効化はセキュリティリスクです',
        filePattern: /\.py$/,
      },
      // --- raw() によるSQLインジェクション ---
      {
        id: 'PY-SEC-009',
        pattern: /\.raw\s*\([^)]*(%s|%d|\{|format|f['"]|['"].*\+)/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'raw()内で文字列フォーマットが使用されています。SQLインジェクションのリスクがあります。パラメータバインディングを使用してください',
        filePattern: /\.py$/,
      },
      // --- extra() によるSQLインジェクション ---
      {
        id: 'PY-SEC-010',
        pattern: /\.extra\s*\(/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'extra()は非推奨でSQLインジェクションのリスクがあります。annotate()やF式を使用してください',
        filePattern: /\.py$/,
      },
      // --- SESSION_COOKIE_HTTPONLY = False ---
      {
        id: 'PY-SEC-011',
        pattern: /SESSION_COOKIE_HTTPONLY\s*=\s*False/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'SESSION_COOKIE_HTTPONLYがFalseに設定されています。JavaScriptからセッションCookieにアクセス可能になります',
        filePattern: /settings\.py$/,
      },
      // --- CSRF_COOKIE_HTTPONLY = False ---
      {
        id: 'PY-SEC-012',
        pattern: /CSRF_COOKIE_HTTPONLY\s*=\s*False/,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: 'CSRF_COOKIE_HTTPONLYがFalseに設定されています',
        filePattern: /settings\.py$/,
      },
      // --- AUTH_PASSWORD_VALIDATORS 無効化 ---
      {
        id: 'PY-SEC-013',
        pattern: /AUTH_PASSWORD_VALIDATORS\s*=\s*\[/,
        contextCheck: (lines: string[], index: number) => {
          // AUTH_PASSWORD_VALIDATORS = [ の後に有効なバリデータがあるかチェック
          const block = lines.slice(index, Math.min(index + 20, lines.length)).join('\n');
          // 閉じ括弧 ] までの間に、コメントアウトされていない 'NAME' が無ければ問題
          const afterOpen = block.split('[').slice(1).join('[');
          const beforeClose = afterOpen.split(']')[0] || '';
          // コメント以外の行で 'NAME' を含むものがあるか
          const activeValidators = beforeClose.split('\n').filter(
            line => !line.trim().startsWith('#') && line.includes('NAME')
          );
          return activeValidators.length === 0;
        },
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: 'AUTH_PASSWORD_VALIDATORSが無効化されています。パスワード強度の検証が行われません',
        filePattern: /settings\.py$/,
      },
      // --- debug_toolbar の本番環境使用 ---
      {
        id: 'PY-SEC-014',
        pattern: /['"]debug_toolbar['"]/,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: 'debug_toolbarが有効です。本番環境では無効化してください',
        filePattern: /settings\.py$/,
      },
      // --- INTERNAL_IPS のワイルドカード ---
      {
        id: 'PY-SEC-015',
        pattern: /INTERNAL_IPS\s*=\s*\[.*['"]\*['"]/,
        severity: Severity.Low,
        category: IssueCategory.Security,
        message: 'INTERNAL_IPSにワイルドカード(*)が設定されています',
        filePattern: /settings\.py$/,
      },
      // --- デバッグ情報公開エンドポイント ---
      {
        id: 'PY-SEC-016',
        pattern: /def\s+\w*debug\w*\s*\(/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'デバッグ情報を公開するエンドポイントの可能性があります',
        filePattern: /views\.py$/,
        contextCheck: (lines: string[], index: number) => {
          const block = lines.slice(index, Math.min(index + 5, lines.length)).join('\n');
          return /HttpResponse|JsonResponse|render/.test(block);
        },
      },
      // ====================================================================
      // Phase 1: Django テンプレート用ルール
      // ====================================================================
      // --- {% autoescape off %} の使用 ---
      {
        id: 'PY-TEMPLATE-001',
        pattern: /\{%\s*autoescape\s+off\s*%\}/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'autoescape offが使用されています。XSS脆弱性のリスクがあります',
        filePattern: /\.html$/,
      },
      // --- |safe フィルタの使用 ---
      {
        id: 'PY-TEMPLATE-002',
        pattern: /\{\{.*\|\s*safe\s*\}\}/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: '|safeフィルタが使用されています。ユーザー入力に使用するとXSS脆弱性のリスクがあります',
        filePattern: /\.html$/,
      },
      // ====================================================================
      // Phase 1 追加: SQLインジェクション・機密情報漏洩・その他
      // ====================================================================
      // --- f-string によるSQL構築 ---
      {
        id: 'PY-SEC-017',
        pattern: /f["'](?:SELECT|INSERT|UPDATE|DELETE|DROP)\s/i,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'f-stringでSQL文を構築しています。SQLインジェクション脆弱性のリスクがあります。パラメータ化クエリを使用してください',
        filePattern: /\.py$/,
      },
      // --- cursor.execute に変数を渡す ---
      {
        id: 'PY-SEC-018',
        pattern: /cursor\.execute\s*\(\s*(?!['"])\w+/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'cursor.execute()に変数を直接渡しています。パラメータ化クエリを使用してください',
        filePattern: /\.py$/,
      },
      // --- 機密情報のprint/log出力 ---
      {
        id: 'PY-SEC-019',
        pattern: /(?:print|logging\.\w+)\s*\(.*(?:card|password|secret|token|credit)/i,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: '機密情報がprint/logで出力されています。本番環境では削除してください',
        filePattern: /\.py$/,
      },
      // --- HTTP URLの使用（本番向け） ---
      {
        id: 'PY-SEC-020',
        pattern: /['"]http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'HTTPプロトコルが使用されています。本番環境ではHTTPSを使用してください',
        filePattern: /\.py$/,
      },
      // --- X_FRAME_OPTIONS 不備 ---
      {
        id: 'PY-SEC-021',
        pattern: /X_FRAME_OPTIONS\s*=\s*['"]ALLOWALL['"]/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'X_FRAME_OPTIONSがALLOWALLに設定されています。クリックジャッキング攻撃のリスクがあります。DENYまたはSAMEORIGINを設定してください',
        filePattern: /settings\.py$/,
      },
      // --- SECURE_BROWSER_XSS_FILTER = False ---
      {
        id: 'PY-SEC-022',
        pattern: /SECURE_BROWSER_XSS_FILTER\s*=\s*False/,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: 'SECURE_BROWSER_XSS_FILTERがFalseに設定されています。XSS保護ヘッダーを有効にしてください',
        filePattern: /settings\.py$/,
      },
      // --- EMAIL_HOST_PASSWORD のハードコーディング ---
      {
        id: 'PY-SEC-023',
        pattern: /EMAIL_HOST_PASSWORD\s*=\s*['"][^'"]+['"]/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'メールパスワードがハードコーディングされています。環境変数を使用してください',
        filePattern: /settings\.py$/,
      },
      // --- N+1 クエリ: プロパティ内でのリレーション呼び出し ---
      {
        id: 'PY-PERF-002',
        pattern: /self\.\w+_set\.(?:all|filter|count|aggregate)\s*\(/,
        severity: Severity.High,
        category: IssueCategory.Performance,
        message: 'プロパティ/メソッド内でリレーション先のクエリを実行しています。N+1クエリ問題が発生する可能性があります。annotateやprefetch_relatedの使用を検討してください',
        filePattern: /models\.py$/,
      },
      // --- SESSION_COOKIE_AGE が長すぎる ---
      {
        id: 'PY-SEC-024',
        pattern: /SESSION_COOKIE_AGE\s*=\s*\d{7,}/,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: 'セッション有効期限が長すぎます。セキュリティのため適切な期間に設定してください',
        filePattern: /settings\.py$/,
      },
      // --- SESSION_SAVE_EVERY_REQUEST = True (パフォーマンス問題) ---
      {
        id: 'PY-PERF-003',
        pattern: /SESSION_SAVE_EVERY_REQUEST\s*=\s*True/,
        severity: Severity.Medium,
        category: IssueCategory.Performance,
        message: 'SESSION_SAVE_EVERY_REQUEST=Trueは全リクエストでセッション保存が発生しDB負荷が増加します',
        filePattern: /settings\.py$/,
      },
      // --- グローバル変数にAPIキー/シークレットをハードコード ---
      {
        id: 'PY-SEC-025',
        pattern: /^[A-Z_]*(?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)\s*=\s*['"]/,
        severity: Severity.Medium,
        category: IssueCategory.CodeQuality,
        message: 'APIキーやシークレットがグローバル変数にハードコーディングされています。settings.pyまたは環境変数を使用してください',
        filePattern: /(?:views|utils|services|helpers)\.py$/,
      },
      // --- 手動セッション管理 (request.session['user_id']) ---
      {
        id: 'PY-CQ-001',
        pattern: /request\.session\s*\[\s*['"]user_id['"]\s*\]/,
        severity: Severity.Medium,
        category: IssueCategory.CodeQuality,
        message: 'request.sessionで手動ユーザー管理をしています。Django組み込みの認証システム（login()/logout()）を使用してください',
        filePattern: /\.py$/,
      },
      // --- GETパラメータからユーザーIDを取得（改ざん可能） ---
      {
        id: 'PY-SEC-026',
        pattern: /request\.GET\.get\s*\(\s*['"]user_id['"]/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'GETパラメータからuser_idを取得しています。改ざん可能なため、request.userを使用してください',
        filePattern: /\.py$/,
      },
      // --- SECURE_CONTENT_TYPE_NOSNIFF = False ---
      {
        id: 'PY-SEC-027',
        pattern: /SECURE_CONTENT_TYPE_NOSNIFF\s*=\s*False/,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: 'SECURE_CONTENT_TYPE_NOSNIFFがFalseです。MIMEタイプスニッフィング攻撃のリスクがあります',
        filePattern: /settings\.py$/,
      },
      // --- CSRF_COOKIE_SECURE = False ---
      {
        id: 'PY-SEC-028',
        pattern: /(?:SESSION_COOKIE_SECURE|CSRF_COOKIE_SECURE)\s*=\s*False/,
        severity: Severity.Medium,
        category: IssueCategory.Security,
        message: 'Cookie Secureフラグが無効です。HTTP経由でCookieが送信され盗聴のリスクがあります',
        filePattern: /settings\.py$/,
      },
    ];
  }

  /**
   * Java パターンルール
   */
  private getJavaPatternRules(): PatternRule[] {
    return [
      {
        id: 'JAVA-SEC-001',
        pattern: /nativeQuery\s*=\s*true/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'nativeQuery使用時はSQLインジェクションのリスクがあります。パラメータバインディングを使用してください',
        filePattern: /\.java$/,
      },
      {
        id: 'JAVA-SEC-001b',
        pattern: /["']\s*\+\s*\w+.*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/i,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'SQL文内で文字列連結が使用されています。SQLインジェクション脆弱性のリスクがあります',
        filePattern: /\.java$/,
      },
      {
        id: 'JAVA-SEC-002',
        pattern: /th:utext/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'Thymeleafのth:utextはHTMLエスケープを行いません。XSS脆弱性のリスクがあります。th:textの使用を検討してください',
        filePattern: /\.html$/
      },
      {
        id: 'JAVA-SEC-003',
        pattern: /csrf\s*\(\s*\)\s*\.\s*disable\s*\(\)/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'CSRF対策が無効化されています。必要な場合を除き、CSRF保護を有効にしてください',
        filePattern: /\.java$/
      },
      {
        id: 'JAVA-SEC-004',
        pattern: /(?:logger|log)\s*\.(?:info|debug)\s*\([^)]*(?:password|Password|credential|Credential)/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: '機密情報（パスワード等）がログに出力されています。ログからの除外が必要です',
        filePattern: /\.java$/
      },
      // --- 追加ルール: セキュリティ ---
      {
        id: 'JAVA-SEC-005',
        pattern: /\.permitAll\s*\(\)/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: '全ユーザーにアクセスが許可されています。最小権限の原則に基づき、適切なロール制限を検討してください',
        filePattern: /\.java$/,
        fileCondition: (content) => /SecurityConfig|WebSecurityConfigurerAdapter|SecurityFilterChain/.test(content)
      },
      {
        id: 'JAVA-SEC-006',
        pattern: /(?:password|passwd)\s*=\s*"[^"]+"/i,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'パスワードがソースコードにハードコーディングされています。環境変数またはシークレット管理サービスを使用してください',
        filePattern: /\.java$/,
      },
      {
        id: 'JAVA-SEC-007',
        pattern: /spring\.datasource\.password\s*=\s*\S+/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'データベースパスワードが設定ファイルにハードコーディングされています。環境変数（${DB_PASSWORD}）を使用してください',
        filePattern: /\.properties$/,
      },
      {
        id: 'JAVA-SEC-008',
        pattern: /(?:api[._-]?key|secret[._-]?key|access[._-]?key)\s*=\s*\S+/i,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'APIキー/シークレットが設定ファイルにハードコーディングされています。環境変数を使用してください',
        filePattern: /\.properties$/,
      },
      // --- 追加ルール: パフォーマンス ---
      {
        id: 'JAVA-PERF-001',
        pattern: /@OneToMany/,
        severity: Severity.Medium,
        category: IssueCategory.Performance,
        message: '@OneToManyリレーションはN+1クエリ問題を引き起こす可能性があります。@EntityGraphまたはJOIN FETCHの使用を検討してください',
        filePattern: /\.java$/,
      },
      {
        id: 'JAVA-PERF-002',
        pattern: /FetchType\.LAZY/,
        severity: Severity.Medium,
        category: IssueCategory.Performance,
        message: 'FetchType.LAZYはトランザクション外アクセスでLazyInitializationExceptionを引き起こす可能性があります。@Transactionalの適切な設定を確認してください',
        filePattern: /\.java$/,
      },
      {
        id: 'JAVA-PERF-003',
        pattern: /maximum-pool-size\s*[=:]\s*[1-5]\s*$/,
        severity: Severity.High,
        category: IssueCategory.Performance,
        message: 'コネクションプールサイズが小さすぎます。本番環境では10以上を推奨します',
        filePattern: /\.(?:properties|yml|yaml)$/,
      },
      // --- 追加ルール: コード品質 ---
      {
        id: 'JAVA-CQ-001',
        pattern: /catch\s*\(\s*Exception\s+\w+\s*\)/,
        severity: Severity.Medium,
        category: IssueCategory.CodeQuality,
        message: '汎用的なException型でキャッチしています。具体的な例外型（IOException, SQLException等）を使用してください',
        filePattern: /\.java$/,
      },
      {
        id: 'JAVA-CQ-003',
        pattern: /(?:@Autowired|@Inject)[\s\S]*(?:Repository|JpaRepository)/,
        severity: Severity.Medium,
        category: IssueCategory.Maintainability,
        message: 'Controller層でRepositoryを直接使用しています。Service層を介したアクセスを推奨します',
        filePattern: /Controller\.java$/,
      },
      {
        id: 'JAVA-CQ-004',
        pattern: /new\s+Date\s*\(\)/,
        severity: Severity.Low,
        category: IssueCategory.CodeQuality,
        message: 'java.util.Dateは非推奨です。java.time.LocalDateTime等のjava.time APIを使用してください',
        filePattern: /\.java$/,
      },
      {
        id: 'JAVA-TX-001',
        pattern: /public\s+\w+\s+\w+\s*\([^)]*\)\s*\{/,
        severity: Severity.Medium,
        category: IssueCategory.BestPractice,
        message: 'Serviceクラスのpublicメソッドに@Transactionalが設定されていない可能性があります。トランザクション管理を確認してください',
        filePattern: /Service\.java$/,
        fileCondition: (content) => !/@Transactional/.test(content)
      },
      // --- 追加ルール: 依存関係（pom.xml） ---
      {
        id: 'DEP-JAVA-001',
        pattern: /spring-framework\.version.*4\./,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'Spring Framework 4.xはEOL済みです。Spring 5.x以上へのアップグレードを強く推奨します',
        filePattern: /pom\.xml$/,
      },
      {
        id: 'DEP-JAVA-002',
        pattern: /<java\.version>\s*(?:1\.[0-8]|[0-8])\s*<\//,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: '古いJavaバージョンが使用されています。Java 17以上（LTS）へのアップグレードを推奨します',
        filePattern: /pom\.xml$/,
      },
      {
        id: 'DEP-JAVA-003',
        pattern: /jackson-databind/,
        severity: Severity.High,
        category: IssueCategory.Security,
        message: 'jackson-databindのバージョンを確認してください。2.12未満には重大な脆弱性（CVE-2019-14540等）があります',
        filePattern: /pom\.xml$/,
        fileCondition: (content) => /jackson-databind[\s\S]*?<version>\s*2\.[0-9]\./.test(content)
      },
      {
        id: 'DEP-JAVA-004',
        pattern: /log4j-core/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'log4j-coreのバージョンを確認してください。2.17未満にはLog4Shell脆弱性（CVE-2021-44228）があります',
        filePattern: /pom\.xml$/,
        fileCondition: (content) => /log4j-core[\s\S]*?<version>\s*2\.(?:[0-9]|1[0-6])\./.test(content) || /log4j[\s\S]*?<version>\s*1\./.test(content)
      },
      {
        id: 'DEP-JAVA-005',
        pattern: /<version>\s*1\.\d+\.\d+/,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        message: 'Spring Boot 1.xはEOL済みです。Spring Boot 2.7以上へのアップグレードを強く推奨します',
        filePattern: /pom\.xml$/,
        fileCondition: (content) => /spring-boot-starter-parent[\s\S]*?<version>\s*1\./.test(content)
      },
    ];
  }

  /**
   * 指定拡張子のファイルを再帰的に検索
   */
  private async findFilesByExtension(dirPath: string, extension: string): Promise<string[]> {
    const results: string[] = [];
    const skipDirs = new Set(['node_modules', '.git', 'bin', 'obj', 'packages', '.vs', '.vscode', '.venv', 'venv', 'env', '__pycache__', 'migrations', '.mypy_cache', '.pytest_cache', 'target', 'build', '.gradle', '.mvn', '.settings', '.idea']);

    const walk = async (dir: string): Promise<void> => {
      let entries: string[];
      try {
        const rawEntries = await fs.readdir(dir);
        entries = rawEntries as unknown as string[];
      } catch {
        return;
      }

      for (const entry of entries) {
        if (skipDirs.has(entry)) continue;

        const fullPath = path.join(dir, entry);

        if (entry.endsWith(extension)) {
          results.push(fullPath);
        } else if (!entry.includes('.')) {
          // ドットを含まないエントリはディレクトリとして再帰
          await walk(fullPath);
        }
      }
    };

    await walk(dirPath);
    return results;
  }

  /**
   * ルールIDプレフィックスからツールを解決
   */
  private resolveToolFromRuleId(ruleId: string): AnalyzerTool {
    if (ruleId.startsWith('JAVA-')) return AnalyzerTool.Semgrep;
    if (ruleId.startsWith('CS-')) return AnalyzerTool.RoslynAnalyzer;
    if (ruleId.startsWith('PHP-')) return AnalyzerTool.PHPCodeSniffer;
    if (ruleId.startsWith('PY-')) return AnalyzerTool.Bandit;
    if (ruleId.startsWith('JS-')) return AnalyzerTool.ESLint;
    if (ruleId.startsWith('CONFIG-')) return AnalyzerTool.Gitleaks;
    if (ruleId.startsWith('DEP-')) return AnalyzerTool.DependencyCheck;
    return AnalyzerTool.Semgrep; // fallback（パターン解析）
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

    // 共通パターン解析（設定ファイル、依存関係、多言語対応）
    try {
      const commonIssues = await this.runCommonPatternAnalysis(absolutePath);
      allIssues.push(...commonIssues);
    } catch (error) {
      logger.warn('Common pattern analysis failed:', error);
    }

    if (options.removeDuplicates !== false) {
      const { unique } = this.removeDuplicateIssues(allIssues);
      allIssues = unique;
    }

    // ツール実行ステータス一覧を生成（Phase 1: ツール実行信頼性確保）
    const toolExecutionStatuses: ToolExecutionStatus[] = toolResults.map(result => {
      let status: ToolExecutionStatusType = result.success ? 'success' : 'failed';
      if (result.error?.includes('not installed') || result.error?.includes('not found') || result.error?.includes('ToolNotInstalled')) {
        status = 'not_installed';
      } else if (result.error?.includes('timeout') || result.error?.includes('TIMEOUT') || result.error?.includes('timed out')) {
        status = 'timeout';
      } else if (result.error === 'Tool not configured or disabled') {
        status = 'skipped';
      }
      return {
        tool: result.tool,
        status,
        issueCount: result.issues.length,
        executionTimeMs: result.executionTime,
        errorMessage: result.error,
        dockerFallback: result.warnings?.some(w => w.includes('Docker')) || false,
      };
    });

    // 検出件数0件のツールに警告を出す
    for (const ts of toolExecutionStatuses) {
      if (ts.status === 'success' && ts.issueCount === 0) {
        logger.warn(`[ツール実行警告] ${ts.tool}: 実行成功しましたが検出件数が0件です。ツールが正しく動作しているか確認してください。`);
      }
    }

    const summary = this.createSummary(toolResults, allIssues, 0);

    return {
      analyzedAt: new Date(),
      repoPath: absolutePath,
      toolResults,
      allIssues,
      summary,
      duplicatesRemoved: 0,
      toolExecutionStatuses
    };
  }

  /**
   * 実行するツールを自動選択
   */
  private async selectTools(repoPath: string): Promise<AnalyzerTool[]> {
    const tools: AnalyzerTool[] = [];

    // 常に実行するツール
    tools.push(AnalyzerTool.Gitleaks);

    // package.json存在確認 (JavaScript/TypeScript)
    if (await this.fileExists(path.join(repoPath, 'package.json'))) {
      tools.push(AnalyzerTool.ESLint);
      tools.push(AnalyzerTool.NpmAudit);
      tools.push(AnalyzerTool.NpmCheckUpdates);
      tools.push(AnalyzerTool.Jscpd);
      tools.push(AnalyzerTool.Semgrep);
      tools.push(AnalyzerTool.Bearer);
      tools.push(AnalyzerTool.Njsscan);

      if (await this.fileExists(path.join(repoPath, 'tsconfig.json'))) {
        tools.push(AnalyzerTool.TypeScriptCompiler);
      }
    }

    // composer.json存在確認 (PHP)
    if (await this.fileExists(path.join(repoPath, 'composer.json'))) {
      tools.push(AnalyzerTool.PHPCodeSniffer);
      tools.push(AnalyzerTool.PHPStan);
      tools.push(AnalyzerTool.Semgrep);
      tools.push(AnalyzerTool.Bearer);
    }

    // .csproj存在確認 (C#)
    const files = await fs.readdir(repoPath).catch(() => []);
    if (files.some(f => f.endsWith('.csproj'))) {
      tools.push(AnalyzerTool.RoslynAnalyzer);
      tools.push(AnalyzerTool.Semgrep);
    }

    // Java / Spring Boot 検出
    const hasPomXml = await this.fileExists(path.join(repoPath, 'pom.xml'));
    const hasBuildGradle = await this.fileExists(path.join(repoPath, 'build.gradle'));
    const hasGradleKts = await this.fileExists(path.join(repoPath, 'build.gradle.kts'));
    const isJavaProject = hasPomXml || hasBuildGradle || hasGradleKts;

    if (isJavaProject) {
      tools.push(AnalyzerTool.Semgrep);
      tools.push(AnalyzerTool.PMD);
      tools.push(AnalyzerTool.DependencyCheck);
      tools.push(AnalyzerTool.Bearer);
      if (hasPomXml) {
        tools.push(AnalyzerTool.SpotBugs);
      }
    }

    // Python / Django 検出
    const hasRequirementsTxt = await this.fileExists(path.join(repoPath, 'requirements.txt'));
    const hasPyprojectToml = await this.fileExists(path.join(repoPath, 'pyproject.toml'));
    const hasPipfile = await this.fileExists(path.join(repoPath, 'Pipfile'));
    const hasSetupPy = await this.fileExists(path.join(repoPath, 'setup.py'));
    const isPythonProject = hasRequirementsTxt || hasPyprojectToml || hasPipfile || hasSetupPy;

    if (isPythonProject) {
      tools.push(AnalyzerTool.Bandit);
      tools.push(AnalyzerTool.Pylint);
      tools.push(AnalyzerTool.Radon);
      tools.push(AnalyzerTool.Semgrep);
      tools.push(AnalyzerTool.Bearer);

      if (hasRequirementsTxt) {
        tools.push(AnalyzerTool.PipAudit);
      }

      if (await this.fileExists(path.join(repoPath, 'manage.py'))) {
        tools.push(AnalyzerTool.DjangoCheckDeploy);
      }
    }

    // 重複除去（複数言語プロジェクトで同一ツールが複数回追加される場合）
    return [...new Set(tools)];
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
   * ローカルコマンドが利用可能か確認
   */
  private async isCommandAvailable(command: string): Promise<boolean> {
    try {
      const which = process.platform === 'win32' ? 'where' : 'which';
      await execFileAsync(which, [command], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Docker利用可否とツールのDockerImage設定に基づいて、Docker実行すべきか判定
   * - useDocker が明示的に true → Docker実行
   * - useDocker が未設定で、ローカルコマンドが無い場合 → Docker fallback
   */
  private async shouldUseDocker(
    tool: AnalyzerTool,
    options: AnalysisOptions
  ): Promise<boolean> {
    if (options.useDocker === true) return true;
    if (options.useDocker === false) return false;

    // useDocker が未設定の場合: ローカルコマンドがなければDocker fallback
    const config = this.toolConfigs.get(tool);
    if (!config?.dockerImage) return false;

    const localAvailable = await this.isCommandAvailable(config.command);
    if (localAvailable) return false;

    // Dockerが利用可能か確認
    const dockerAvailable = await this.isCommandAvailable('docker');
    if (!dockerAvailable) return false;

    logger.info(`${tool}: local command not found, falling back to Docker (${config.dockerImage})`);
    return true;
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
      [AnalyzerTool.Gitleaks]: 0,
      [AnalyzerTool.DependencyCheck]: 0,
      [AnalyzerTool.Semgrep]: 0,
      [AnalyzerTool.Progpilot]: 0,
      [AnalyzerTool.PHPCPD]: 0,
      [AnalyzerTool.ComposerAudit]: 0,
      [AnalyzerTool.Bandit]: 0,
      [AnalyzerTool.PipAudit]: 0,
      [AnalyzerTool.Opengrep]: 0,
      [AnalyzerTool.Pylint]: 0,
      [AnalyzerTool.Radon]: 0,
      [AnalyzerTool.DjangoCheckDeploy]: 0,
      [AnalyzerTool.PMD]: 0,
      [AnalyzerTool.Trivy]: 0,
      [AnalyzerTool.NpmAudit]: 0,
      [AnalyzerTool.NpmCheckUpdates]: 0,
      [AnalyzerTool.Jscpd]: 0,
      [AnalyzerTool.Bearer]: 0,
      [AnalyzerTool.Njsscan]: 0,
      [AnalyzerTool.SpotBugs]: 0
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
   * Trivy実行（依存関係脆弱性チェック）
   */
  private async runTrivy(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      let command: string;
      let args: string[];
      const timeout = options.timeout || DEFAULT_TIMEOUT;

      const useDocker = await this.shouldUseDocker(AnalyzerTool.Trivy, options);

      if (useDocker) {
        const repoPathForDocker = repoPath.replace(/\\/g, '/');
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPathForDocker}:/repo:ro`,
          'aquasec/trivy',
          'fs', '--format', 'json',
          '--scanners', 'vuln',
          '--skip-dirs', 'node_modules,.git,vendor,dist',
          '/repo'
        ];
      } else {
        command = 'trivy';
        args = [
          'fs', '--format', 'json',
          '--scanners', 'vuln',
          '--skip-dirs', 'node_modules,.git,vendor,dist',
          repoPath
        ];
      }

      const { stdout } = await execFileAsync(command, args, {
        cwd: useDocker ? undefined : repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        return { stdout: error.stdout || '{"Results":[]}', stderr: error.stderr || '' };
      });

      let result: TrivyResult;
      try {
        result = JSON.parse(stdout || '{"Results":[]}') as TrivyResult;
      } catch {
        logger.error('Failed to parse Trivy output');
        return [];
      }

      return this.parseTrivyResults(result, repoPath);
    } catch (error) {
      logger.error('Trivy execution failed:', error);
      return [];
    }
  }

  /**
   * Trivy結果をパース
   */
  private parseTrivyResults(result: TrivyResult, _repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    if (!result.Results) return issues;

    for (const target of result.Results) {
      if (!target.Vulnerabilities) continue;

      for (const vuln of target.Vulnerabilities) {
        let severity: Severity;
        switch (vuln.Severity.toUpperCase()) {
          case 'CRITICAL':
            severity = Severity.Critical;
            break;
          case 'HIGH':
            severity = Severity.High;
            break;
          case 'MEDIUM':
            severity = Severity.Medium;
            break;
          case 'LOW':
            severity = Severity.Low;
            break;
          default:
            severity = Severity.Info;
        }

        const fixInfo = vuln.FixedVersion
          ? `Upgrade to ${vuln.PkgName}@${vuln.FixedVersion}`
          : 'No fix available';

        issues.push({
          id: randomUUID(),
          tool: AnalyzerTool.Trivy,
          severity,
          category: IssueCategory.Security,
          rule: vuln.VulnerabilityID,
          message: `${vuln.Title || vuln.VulnerabilityID}: ${vuln.PkgName}@${vuln.InstalledVersion}`,
          file: target.Target,
          cve: [vuln.VulnerabilityID],
          references: vuln.PrimaryURL ? [vuln.PrimaryURL] : undefined,
          fix: {
            available: !!vuln.FixedVersion,
            description: fixInfo
          }
        });
      }
    }

    return issues;
  }

  /**
   * Bearer実行
   */
  private async runBearer(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      let command: string;
      let args: string[];
      const timeout = options.timeout || 600_000;

      const useDocker = await this.shouldUseDocker(AnalyzerTool.Bearer, options);

      if (useDocker) {
        const repoPathForDocker = repoPath.replace(/\\/g, '/');
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPathForDocker}:/src`,
          'bearer/bearer',
          'scan', '/src',
          '--format', 'json',
          '--quiet'
        ];
      } else {
        command = 'bearer';
        args = ['scan', repoPath, '--format', 'json', '--quiet'];
      }

      const { stdout } = await execFileAsync(command, args, {
        cwd: useDocker ? undefined : repoPath,
        maxBuffer: 20 * 1024 * 1024,
        timeout
      }).catch(error => {
        return { stdout: error.stdout || '{"findings":[]}', stderr: error.stderr || '' };
      });

      let result: BearerResult;
      try {
        result = JSON.parse(stdout || '{"findings":[]}') as BearerResult;
      } catch {
        logger.error('Failed to parse Bearer output');
        return [];
      }

      return this.parseBearerResults(result, repoPath);
    } catch (error) {
      logger.error('Bearer execution failed:', error);
      return [];
    }
  }

  /**
   * Bearer結果をパース
   */
  private parseBearerResults(result: BearerResult, repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    if (!result.findings) return issues;

    for (const finding of result.findings) {
      let severity: Severity;
      switch (finding.severity?.toUpperCase()) {
        case 'CRITICAL':
          severity = Severity.Critical;
          break;
        case 'HIGH':
          severity = Severity.High;
          break;
        case 'MEDIUM':
          severity = Severity.Medium;
          break;
        case 'LOW':
          severity = Severity.Low;
          break;
        default:
          severity = Severity.Info;
      }

      // ファイルパスをリポジトリからの相対パスに変換
      let filePath = finding.file || '';
      if (filePath.startsWith('/src/')) {
        filePath = filePath.substring(5);
      }

      issues.push({
        id: randomUUID(),
        tool: AnalyzerTool.Bearer,
        severity,
        category: IssueCategory.Security,
        rule: finding.rule_id || 'bearer-finding',
        message: finding.description || `Bearer: ${finding.rule_id}`,
        file: filePath,
        line: finding.line_number || finding.start_line_number,
        column: finding.start_column_number,
        endLine: finding.end_line_number,
        endColumn: finding.end_column_number,
        snippet: finding.source,
        cwe: finding.cwe ? [finding.cwe] : undefined,
        references: finding.owasp_category ? [`OWASP ${finding.owasp_category}`] : undefined
      });
    }

    return issues;
  }

  /**
   * njsscan実行
   */
  private async runNjsscan(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      let command: string;
      let args: string[];
      const timeout = options.timeout || 300_000;

      const useDocker = await this.shouldUseDocker(AnalyzerTool.Njsscan, options);

      if (useDocker) {
        const repoPathForDocker = repoPath.replace(/\\/g, '/');
        command = 'docker';
        args = [
          'run', '--rm',
          '-v', `${repoPathForDocker}:/src`,
          'opensecurity/njsscan',
          '--json', '-o', '/dev/stdout', '/src'
        ];
      } else {
        command = 'njsscan';
        args = ['--json', '-o', '/dev/stdout', repoPath];
      }

      const { stdout } = await execFileAsync(command, args, {
        cwd: useDocker ? undefined : repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout
      }).catch(error => {
        return { stdout: error.stdout || '{}', stderr: error.stderr || '' };
      });

      let result: NjsscanResult;
      try {
        result = JSON.parse(stdout || '{}') as NjsscanResult;
      } catch {
        logger.error('Failed to parse njsscan output');
        return [];
      }

      return this.parseNjsscanResults(result, repoPath);
    } catch (error) {
      logger.error('njsscan execution failed:', error);
      return [];
    }
  }

  /**
   * njsscan結果をパース
   */
  private parseNjsscanResults(result: NjsscanResult, _repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    for (const [ruleId, rule] of Object.entries(result)) {
      // njsscanのトップレベルにはメタデータ以外のキーもある場合があるのでスキップ
      if (!rule?.metadata || !rule?.files) continue;

      let severity: Severity;
      switch (rule.metadata.severity?.toUpperCase()) {
        case 'ERROR':
        case 'CRITICAL':
          severity = Severity.Critical;
          break;
        case 'WARNING':
        case 'HIGH':
          severity = Severity.High;
          break;
        case 'INFO':
        case 'MEDIUM':
          severity = Severity.Medium;
          break;
        default:
          severity = Severity.Low;
      }

      for (const file of rule.files) {
        // ファイルパスをリポジトリからの相対パスに変換
        let filePath = file.file_path || '';
        if (filePath.startsWith('/src/')) {
          filePath = filePath.substring(5);
        }

        issues.push({
          id: randomUUID(),
          tool: AnalyzerTool.Njsscan,
          severity,
          category: IssueCategory.Security,
          rule: ruleId,
          message: rule.metadata.description || `njsscan: ${ruleId}`,
          file: filePath,
          line: file.match_lines?.[0],
          endLine: file.match_lines?.[1],
          snippet: file.match_string,
          cwe: rule.metadata.cwe ? [rule.metadata.cwe] : undefined
        });
      }
    }

    return issues;
  }

  /**
   * SpotBugs + Find Security Bugs 実行（Maven プロジェクト限定）
   */
  private async runSpotBugs(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      // pom.xml が必須
      if (!await this.fileExists(path.join(repoPath, 'pom.xml'))) {
        return [];
      }

      const timeout = options.timeout || 600_000;
      const repoPathForDocker = repoPath.replace(/\\/g, '/');
      const command = 'docker';

      // Maven でコンパイル + SpotBugs + Find Security Bugs プラグイン実行
      const mvnCommand = [
        'mvn', 'compile',
        'com.github.spotbugs:spotbugs-maven-plugin:4.8.3.1:spotbugs',
        '-Dspotbugs.effort=Max',
        '-Dspotbugs.threshold=Medium',
        '-Dspotbugs.xmlOutput=true',
        '-Dspotbugs.plugins.plugin.groupId=com.h3xstream.findsecbugs',
        '-Dspotbugs.plugins.plugin.artifactId=findsecbugs-plugin',
        '-Dspotbugs.plugins.plugin.version=1.13.0',
        '-q', '-B'
      ].join(' ');

      const args = [
        'run', '--rm',
        '-v', `${repoPathForDocker}:/src`,
        '-w', '/src',
        'maven:3.9-eclipse-temurin-17',
        'sh', '-c',
        `${mvnCommand} && cat target/spotbugsXml.xml 2>/dev/null || echo '<BugCollection></BugCollection>'`
      ];

      const { stdout } = await execFileAsync(command, args, {
        maxBuffer: 20 * 1024 * 1024,
        timeout
      }).catch(error => {
        logger.warn('SpotBugs execution failed (build may have failed):', error.message);
        return { stdout: '<BugCollection></BugCollection>', stderr: error.stderr || '' };
      });

      return this.parseSpotBugsResults(stdout || '', repoPath);
    } catch (error) {
      logger.error('SpotBugs execution failed:', error);
      return [];
    }
  }

  /**
   * SpotBugs XML結果をパース
   */
  private parseSpotBugsResults(xmlOutput: string, _repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    // 簡易XMLパース（BugInstance 要素を抽出）
    const bugInstanceRegex = /<BugInstance\s+([^>]*)>([\s\S]*?)<\/BugInstance>/g;
    let match;

    while ((match = bugInstanceRegex.exec(xmlOutput)) !== null) {
      const attrs = match[1];
      const content = match[2];

      // 属性取得
      const typeMatch = attrs.match(/type="([^"]*)"/);
      const priorityMatch = attrs.match(/priority="([^"]*)"/);
      const categoryMatch = attrs.match(/category="([^"]*)"/);

      const bugType = typeMatch?.[1] || 'unknown';
      const priority = priorityMatch?.[1] || '3';
      const bugCategory = categoryMatch?.[1] || '';

      // 重要度マッピング（SpotBugs priority: 1=high, 2=medium, 3=low）
      let severity: Severity;
      switch (priority) {
        case '1':
          severity = Severity.High;
          break;
        case '2':
          severity = Severity.Medium;
          break;
        default:
          severity = Severity.Low;
      }

      // Find Security Bugs のルールは Critical に引き上げ
      const isSecurityBug = bugCategory === 'SECURITY' || bugType.startsWith('SQL_') ||
        bugType.startsWith('XSS_') || bugType.startsWith('PATH_TRAVERSAL') ||
        bugType.startsWith('COMMAND_INJECTION') || bugType.startsWith('CRYPTO_');
      if (isSecurityBug && severity === Severity.High) {
        severity = Severity.Critical;
      }

      // ShortMessage 取得
      const shortMsgMatch = content.match(/<ShortMessage>([\s\S]*?)<\/ShortMessage>/);
      const message = shortMsgMatch?.[1] || bugType;

      // SourceLine 取得
      const sourceLineMatch = content.match(
        /<SourceLine[^>]*sourcepath="([^"]*)"[^>]*start="(\d+)"[^>]*end="(\d+)"/
      );
      const filePath = sourceLineMatch?.[1] || '';
      const startLine = sourceLineMatch ? parseInt(sourceLineMatch[2]) : undefined;
      const endLine = sourceLineMatch ? parseInt(sourceLineMatch[3]) : undefined;

      issues.push({
        id: randomUUID(),
        tool: AnalyzerTool.SpotBugs,
        severity,
        category: isSecurityBug ? IssueCategory.Security : IssueCategory.CodeQuality,
        rule: bugType,
        message: message,
        file: filePath,
        line: startLine,
        endLine: endLine
      });
    }

    return issues;
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

    configs.set(AnalyzerTool.RoslynAnalyzer, {
      tool: AnalyzerTool.RoslynAnalyzer,
      command: 'dotnet',
      args: ['build', '-v', 'normal'],
      dockerImage: 'mcr.microsoft.com/dotnet/sdk:8.0-alpine',
      languages: ['C#'],
      categories: [IssueCategory.Security, IssueCategory.CodeQuality, IssueCategory.Performance],
      enabled: true
    });

    // PHP 追加ツール
    configs.set(AnalyzerTool.Psalm, {
      tool: AnalyzerTool.Psalm,
      command: 'psalm',
      args: ['--taint-analysis', '--output-format=json', '--no-progress'],
      dockerImage: 'vimeo/psalm',
      languages: ['PHP'],
      categories: [IssueCategory.Security, IssueCategory.CodeQuality],
      enabled: true
    });

    configs.set(AnalyzerTool.PHPMessDetector, {
      tool: AnalyzerTool.PHPMessDetector,
      command: 'phpmd',
      args: ['.', 'json', 'cleancode,codesize,design,unusedcode'],
      dockerImage: 'phpmd/phpmd',
      languages: ['PHP'],
      categories: [IssueCategory.Complexity, IssueCategory.CodeQuality, IssueCategory.Maintainability],
      enabled: true
    });

    configs.set(AnalyzerTool.PHPCPD, {
      tool: AnalyzerTool.PHPCPD,
      command: 'phpcpd',
      args: ['--min-lines=5', '--min-tokens=70', '.'],
      languages: ['PHP'],
      categories: [IssueCategory.Maintainability],
      enabled: true
    });

    configs.set(AnalyzerTool.ComposerAudit, {
      tool: AnalyzerTool.ComposerAudit,
      command: 'composer',
      args: ['audit', '--format=json'],
      dockerImage: 'composer:latest',
      languages: ['PHP'],
      categories: [IssueCategory.Security],
      enabled: true
    });

    configs.set(AnalyzerTool.Progpilot, {
      tool: AnalyzerTool.Progpilot,
      command: 'php',
      args: ['progpilot.phar', '.'],
      dockerImage: 'php:8.2-cli',
      languages: ['PHP'],
      categories: [IssueCategory.Security],
      enabled: true
    });

    // Java ツール
    configs.set(AnalyzerTool.PMD, {
      tool: AnalyzerTool.PMD,
      command: 'pmd',
      args: ['check', '-f', 'json'],
      dockerImage: 'openjdk:17-slim',
      languages: ['Java'],
      categories: [IssueCategory.CodeQuality, IssueCategory.Complexity, IssueCategory.Security],
      enabled: true
    });

    configs.set(AnalyzerTool.DependencyCheck, {
      tool: AnalyzerTool.DependencyCheck,
      command: 'dependency-check',
      args: ['--format', 'JSON'],
      dockerImage: 'owasp/dependency-check:latest',
      languages: ['Java', 'JavaScript', 'C#'],
      categories: [IssueCategory.Security],
      enabled: true
    });

    // 汎用ツール
    configs.set(AnalyzerTool.Semgrep, {
      tool: AnalyzerTool.Semgrep,
      command: 'semgrep',
      args: ['scan', '--config=auto', '--json', '--quiet'],
      dockerImage: 'semgrep/semgrep',
      languages: ['*'],
      categories: [IssueCategory.Security, IssueCategory.CodeQuality],
      enabled: true
    });

    configs.set(AnalyzerTool.Trivy, {
      tool: AnalyzerTool.Trivy,
      command: 'trivy',
      args: ['fs', '--format', 'json', '--scanners', 'vuln'],
      dockerImage: 'aquasec/trivy',
      languages: ['*'],
      categories: [IssueCategory.Security],
      enabled: true
    });

    configs.set(AnalyzerTool.SonarQube, {
      tool: AnalyzerTool.SonarQube,
      command: 'sonar-scanner',
      args: [],
      dockerImage: 'sonarsource/sonar-scanner-cli',
      languages: ['*'],
      categories: [IssueCategory.Security, IssueCategory.CodeQuality, IssueCategory.Complexity, IssueCategory.Maintainability],
      enabled: true
    });

    // Python / Django ツール
    configs.set(AnalyzerTool.Bandit, {
      tool: AnalyzerTool.Bandit,
      command: 'bandit',
      args: ['-r', '.', '-f', 'json', '--exclude', '.venv,venv,env,__pycache__,migrations'],
      dockerImage: 'python:3.11',
      languages: ['Python'],
      categories: [IssueCategory.Security],
      enabled: true
    });

    configs.set(AnalyzerTool.PipAudit, {
      tool: AnalyzerTool.PipAudit,
      command: 'pip-audit',
      args: ['-r', 'requirements.txt', '--format', 'json', '--desc'],
      dockerImage: 'python:3.11',
      languages: ['Python'],
      categories: [IssueCategory.Security],
      enabled: true
    });

    configs.set(AnalyzerTool.Opengrep, {
      tool: AnalyzerTool.Opengrep,
      command: 'opengrep',
      args: ['scan', '--config', 'auto', '--json'],
      dockerImage: 'wollomatic/opengrep:latest',
      languages: ['Python'],
      categories: [IssueCategory.Security, IssueCategory.CodeQuality],
      enabled: true
    });

    configs.set(AnalyzerTool.Pylint, {
      tool: AnalyzerTool.Pylint,
      command: 'pylint',
      args: ['--output-format=json', '--recursive=y'],
      dockerImage: 'python:3.11',
      languages: ['Python'],
      categories: [IssueCategory.CodeQuality, IssueCategory.BestPractice],
      enabled: true
    });

    configs.set(AnalyzerTool.Radon, {
      tool: AnalyzerTool.Radon,
      command: 'radon',
      args: ['cc', '.', '-j', '-n', 'C'],
      dockerImage: 'python:3.11',
      languages: ['Python'],
      categories: [IssueCategory.Complexity],
      enabled: true
    });

    configs.set(AnalyzerTool.DjangoCheckDeploy, {
      tool: AnalyzerTool.DjangoCheckDeploy,
      command: 'python',
      args: ['manage.py', 'check', '--deploy'],
      dockerImage: 'python:3.11',
      languages: ['Python'],
      categories: [IssueCategory.Security],
      enabled: true
    });

    // JavaScript/Node.js 依存関係チェック
    configs.set(AnalyzerTool.NpmAudit, {
      tool: AnalyzerTool.NpmAudit,
      command: 'npm',
      args: ['audit', '--json'],
      languages: ['JavaScript', 'TypeScript'],
      categories: [IssueCategory.Security],
      enabled: true
    });

    configs.set(AnalyzerTool.NpmCheckUpdates, {
      tool: AnalyzerTool.NpmCheckUpdates,
      command: 'npx',
      args: ['-y', 'npm-check-updates', '--jsonUpgraded'],
      languages: ['JavaScript', 'TypeScript'],
      categories: [IssueCategory.Maintainability],
      enabled: true
    });

    configs.set(AnalyzerTool.Jscpd, {
      tool: AnalyzerTool.Jscpd,
      command: 'npx',
      args: ['-y', 'jscpd', '--reporters', 'json'],
      languages: ['*'],
      categories: [IssueCategory.Maintainability],
      enabled: true
    });

    configs.set(AnalyzerTool.Bearer, {
      tool: AnalyzerTool.Bearer,
      command: 'bearer',
      args: ['scan', '--format', 'json', '--quiet'],
      dockerImage: 'bearer/bearer',
      languages: ['php', 'python', 'javascript', 'typescript', 'java', 'go', 'ruby'],
      categories: [IssueCategory.Security],
      enabled: true
    });

    configs.set(AnalyzerTool.Njsscan, {
      tool: AnalyzerTool.Njsscan,
      command: 'njsscan',
      args: ['--json'],
      dockerImage: 'opensecurity/njsscan',
      languages: ['javascript', 'typescript'],
      categories: [IssueCategory.Security],
      enabled: true
    });

    configs.set(AnalyzerTool.SpotBugs, {
      tool: AnalyzerTool.SpotBugs,
      command: 'mvn',
      args: ['spotbugs:spotbugs'],
      dockerImage: 'maven:3.9-eclipse-temurin-17',
      languages: ['java'],
      categories: [IssueCategory.Security, IssueCategory.CodeQuality],
      enabled: true
    });

    return configs;
  }
}
