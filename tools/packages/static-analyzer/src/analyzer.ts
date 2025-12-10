import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
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

const execAsync = promisify(exec);

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
    } catch (error) {
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

      default:
        // その他のツールは未実装
        return [];
    }
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
      const command = `npx eslint "${repoPath}" --format json --ext .js,.ts,.jsx,.tsx`;
      const { stdout, stderr } = await execAsync(command, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024 // 10MB
      }).catch(error => {
        // ESLintは問題があるとexit code 1を返すので、エラーを無視
        return { stdout: error.stdout || '[]', stderr: error.stderr || '' };
      });

      // 結果をパース
      const results = JSON.parse(stdout || '[]');
      return this.parseESLintResults(results, repoPath);
    } catch (error) {
      console.error('ESLint execution failed:', error);
      return [];
    }
  }

  /**
   * ESLint結果をパース
   */
  private parseESLintResults(results: any[], repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    for (const result of results) {
      if (!result.messages) continue;

      for (const message of result.messages) {
        const severity = this.mapESLintSeverity(message.severity);
        const category = this.categorizeESLintRule(message.ruleId);

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
      const command = `snyk test --json`;
      const { stdout } = await execAsync(command, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024
      }).catch(error => {
        // Snykは脆弱性があるとexit code 1を返す
        return { stdout: error.stdout || '{}', stderr: error.stderr || '' };
      });

      // 結果をパース
      const result = JSON.parse(stdout || '{}');
      return this.parseSnykResults(result, repoPath);
    } catch (error) {
      console.error('Snyk execution failed:', error);
      return [];
    }
  }

  /**
   * Snyk結果をパース
   */
  private parseSnykResults(result: any, repoPath: string): AnalysisIssue[] {
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
        references: [vuln.url].filter(Boolean),
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
    try {
      // .gitディレクトリの存在確認
      await fs.access(path.join(repoPath, '.git'));

      // Gitleaksコマンド実行
      const command = `gitleaks detect --report-format json --report-path gitleaks-report.json`;
      await execAsync(command, {
        cwd: repoPath
      }).catch(() => {
        // Gitleaksは検出があるとexit code 1を返す
      });

      // 結果ファイルを読み込み
      const reportPath = path.join(repoPath, 'gitleaks-report.json');
      const reportContent = await fs.readFile(reportPath, 'utf-8').catch(() => '[]');
      const results = JSON.parse(reportContent);

      // レポートファイルを削除
      await fs.unlink(reportPath).catch(() => {});

      return this.parseGitleaksResults(results, repoPath);
    } catch (error) {
      console.error('Gitleaks execution failed:', error);
      return [];
    }
  }

  /**
   * Gitleaks結果をパース
   */
  private parseGitleaksResults(results: any[], repoPath: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    for (const finding of results) {
      issues.push({
        id: randomUUID(),
        tool: AnalyzerTool.Gitleaks,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        rule: finding.RuleID || 'secret-detected',
        message: `${finding.Description || 'Secret detected'}: ${finding.Match}`,
        file: finding.File,
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

    const byTool: Record<AnalyzerTool, number> = {} as any;

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
