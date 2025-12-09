/**
 * プログラミング言語情報
 */
export interface Language {
  name: string;
  extensions: string[];
  files: number;
  lines: number;
  percentage: number;
}

/**
 * フレームワーク情報
 */
export interface Framework {
  name: string;
  version?: string;
  detectionMethod: string; // 'package.json', 'composer.json', 'file-pattern' など
  confidence: 'high' | 'medium' | 'low';
}

/**
 * 依存ライブラリ情報
 */
export interface Dependency {
  name: string;
  version: string;
  type: 'direct' | 'dev' | 'peer';
  ecosystem: 'npm' | 'composer' | 'maven' | 'nuget' | 'pip' | 'rubygems' | 'unknown';
}

/**
 * 言語別統計
 */
export interface LanguageStats {
  files: number;
  lines: number;
  blankLines: number;
  commentLines: number;
  codeLines: number;
}

/**
 * ディレクトリノード
 */
export interface DirectoryNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: DirectoryNode[];
}

/**
 * コントリビューター情報
 */
export interface Contributor {
  name: string;
  email: string;
  commits: number;
  firstCommit: Date;
  lastCommit: Date;
}

/**
 * コミット頻度
 */
export interface CommitFrequency {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

/**
 * Git履歴情報
 */
export interface GitHistory {
  totalCommits: number;
  firstCommit?: Date;
  lastCommit?: Date;
  contributors: Contributor[];
  commitFrequency: CommitFrequency;
  branches: string[];
  tags: string[];
}

/**
 * ファイル統計
 */
export interface FileStats {
  totalFiles: number;
  totalLines: number;
  totalCodeLines: number;
  totalBlankLines: number;
  totalCommentLines: number;
  byLanguage: Record<string, LanguageStats>;
  byExtension: Record<string, number>;
}

/**
 * 技術スタック
 */
export interface TechStack {
  languages: Language[];
  frameworks: Framework[];
  dependencies: Dependency[];
}

/**
 * リポジトリ解析結果
 */
export interface RepositoryAnalysisResult {
  path: string;
  analyzedAt: Date;
  techStack: TechStack;
  fileStats: FileStats;
  structure: DirectoryNode;
  gitHistory?: GitHistory;
  metadata: {
    hasGit: boolean;
    hasReadme: boolean;
    hasLicense: boolean;
    hasDockerfile: boolean;
    hasCI: boolean;
    packageManagers: string[];
  };
}

/**
 * 解析オプション
 */
export interface AnalysisOptions {
  /** Git履歴を解析するか */
  includeGitHistory?: boolean;
  /** 除外するパターン */
  excludePatterns?: string[];
  /** 最大ディレクトリ深度 */
  maxDepth?: number;
  /** 依存関係を解析するか */
  includeDependencies?: boolean;
}
