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
   * ESLint実行（プロトタイプ）
   */
  private async runESLint(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      // package.jsonの存在確認
      const packageJsonPath = path.join(repoPath, 'package.json');
      await fs.access(packageJsonPath);

      // ESLintがインストールされているか確認（簡易版）
      // 実際には eslint --format json を実行して結果をパース

      // プロトタイプのためダミーデータ
      return [
        {
          id: randomUUID(),
          tool: AnalyzerTool.ESLint,
          severity: Severity.Medium,
          category: IssueCategory.CodeQuality,
          rule: 'no-unused-vars',
          message: 'Variable is declared but never used',
          file: path.join(repoPath, 'src/example.ts'),
          line: 42,
          column: 10
        }
      ];
    } catch {
      return [];
    }
  }

  /**
   * Snyk実行（プロトタイプ）
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

      // プロトタイプのためダミーデータ
      return [
        {
          id: randomUUID(),
          tool: AnalyzerTool.Snyk,
          severity: Severity.High,
          category: IssueCategory.Security,
          rule: 'SNYK-JS-AXIOS-1234567',
          message: 'Cross-Site Request Forgery vulnerability in axios',
          file: 'package.json',
          cve: ['CVE-2023-12345'],
          references: ['https://snyk.io/vuln/SNYK-JS-AXIOS-1234567']
        }
      ];
    } catch {
      return [];
    }
  }

  /**
   * Gitleaks実行（プロトタイプ）
   */
  private async runGitleaks(
    repoPath: string,
    options: AnalysisOptions
  ): Promise<AnalysisIssue[]> {
    try {
      // .gitディレクトリの存在確認
      await fs.access(path.join(repoPath, '.git'));

      // プロトタイプのためダミーデータ
      return [
        {
          id: randomUUID(),
          tool: AnalyzerTool.Gitleaks,
          severity: Severity.Critical,
          category: IssueCategory.Security,
          rule: 'generic-api-key',
          message: 'Potential API key detected',
          file: path.join(repoPath, '.env.example'),
          line: 5,
          snippet: 'API_KEY=sk_live_1234567890abcdef'
        }
      ];
    } catch {
      return [];
    }
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
