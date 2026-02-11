/**
 * 問題の重要度
 */
export enum Severity {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
  Info = 'info'
}

/**
 * 問題のカテゴリ
 */
export enum IssueCategory {
  Security = 'security',
  Performance = 'performance',
  CodeQuality = 'code_quality',
  BestPractice = 'best_practice',
  Maintainability = 'maintainability',
  Complexity = 'complexity',
  Documentation = 'documentation'
}

/**
 * 静的解析ツール名
 */
export enum AnalyzerTool {
  ESLint = 'eslint',
  TypeScriptCompiler = 'typescript',
  PHPCodeSniffer = 'phpcs',
  PHPStan = 'phpstan',
  Psalm = 'psalm',
  PHPMessDetector = 'phpmd',
  RoslynAnalyzer = 'roslyn',
  StyleCop = 'stylecop',
  SonarQube = 'sonarqube',
  Snyk = 'snyk',
  Gitleaks = 'gitleaks',
  DependencyCheck = 'owasp-dependency-check'
}

/**
 * 静的解析の問題
 */
export interface AnalysisIssue {
  id: string;
  tool: AnalyzerTool;
  severity: Severity;
  category: IssueCategory;
  rule: string;
  message: string;
  file: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  snippet?: string;
  fix?: {
    available: boolean;
    description?: string;
    code?: string;
  };
  references?: string[];
  cwe?: string[];
  cve?: string[];
}

/**
 * ツール実行結果
 */
export interface ToolResult {
  tool: AnalyzerTool;
  success: boolean;
  executionTime: number;
  issues: AnalysisIssue[];
  error?: string;
  warnings?: string[];
  metadata?: {
    version?: string;
    configFile?: string;
    excludedFiles?: number;
  };
}

/**
 * 解析サマリー
 */
export interface AnalysisSummary {
  totalIssues: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<IssueCategory, number>;
  byTool: Record<AnalyzerTool, number>;
  filesAnalyzed: number;
  executionTime: number;
}

/**
 * 静的解析結果
 */
export interface AnalysisResult {
  analyzedAt: Date;
  repoPath: string;
  toolResults: ToolResult[];
  allIssues: AnalysisIssue[];
  summary: AnalysisSummary;
  duplicatesRemoved: number;
}

/**
 * 解析オプション
 */
export interface AnalysisOptions {
  /** 実行するツール（未指定の場合は自動選択） */
  tools?: AnalyzerTool[];
  /** 並列実行するか */
  parallel?: boolean;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** 除外パターン */
  excludePatterns?: string[];
  /** 重複を除去するか */
  removeDuplicates?: boolean;
  /** Docker内で実行するか */
  useDocker?: boolean;
  /** 設定ファイルのパス */
  configFiles?: Record<AnalyzerTool, string>;
}

/**
 * ツール設定
 */
export interface ToolConfig {
  tool: AnalyzerTool;
  command: string;
  args: string[];
  dockerImage?: string;
  languages: string[];
  categories: IssueCategory[];
  enabled: boolean;
}
