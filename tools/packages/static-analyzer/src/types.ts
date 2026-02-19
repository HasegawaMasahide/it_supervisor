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
  Gitleaks = 'gitleaks',
  DependencyCheck = 'owasp-dependency-check',
  // PHP 追加ツール
  Semgrep = 'semgrep',
  Progpilot = 'progpilot',
  PHPCPD = 'phpcpd',
  ComposerAudit = 'composer-audit',
  // Java
  PMD = 'pmd',
  // Python / Django
  Bandit = 'bandit',
  PipAudit = 'pip-audit',
  Opengrep = 'opengrep',
  Pylint = 'pylint',
  Radon = 'radon',
  DjangoCheckDeploy = 'django-check-deploy',
  // 汎用依存関係チェック
  Trivy = 'trivy',
  // JavaScript/Node.js 依存関係チェック
  NpmAudit = 'npm-audit',
  NpmCheckUpdates = 'npm-check-updates',
  // コード重複検出
  Jscpd = 'jscpd',
  // クロスファンクション データフロー解析
  Bearer = 'bearer',
  // Node.js セキュリティスキャナー
  Njsscan = 'njsscan',
  // Java セキュリティ解析（SpotBugs + Find Security Bugs）
  SpotBugs = 'spotbugs'
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
 * ツール実行ステータス（Phase 1: ツール実行信頼性確保）
 */
export type ToolExecutionStatusType = 'success' | 'failed' | 'timeout' | 'skipped' | 'not_installed';

export interface ToolExecutionStatus {
  tool: AnalyzerTool;
  status: ToolExecutionStatusType;
  issueCount: number;
  executionTimeMs: number;
  errorMessage?: string;
  dockerFallback?: boolean;
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
  toolExecutionStatuses?: ToolExecutionStatus[];
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
