/**
 * Issue重要度
 */
export enum IssueSeverity {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low'
}

/**
 * Issueステータス
 */
export enum IssueStatus {
  Identified = 'identified',
  Diagnosed = 'diagnosed',
  Approved = 'approved',
  InProgress = 'in_progress',
  Resolved = 'resolved',
  Closed = 'closed'
}

/**
 * Issueカテゴリ
 */
export enum IssueCategory {
  Security = 'security',
  Performance = 'performance',
  CodeQuality = 'code_quality',
  TechnicalDebt = 'technical_debt',
  Bug = 'bug',
  Enhancement = 'enhancement'
}

/**
 * Issue位置情報
 */
export interface IssueLocation {
  file: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  function?: string;
  class?: string;
}

/**
 * Issue
 */
export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  location?: IssueLocation;
  evidence?: string[];
  tags?: string[];
  assignee?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  relatedIssues?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Issueコメント
 */
export interface IssueComment {
  id: string;
  issueId: string;
  author: string;
  content: string;
  createdAt: Date;
  attachments?: string[];
}

/**
 * Issue検索条件
 */
export interface IssueQuery {
  projectId?: string;
  category?: IssueCategory;
  severity?: IssueSeverity | IssueSeverity[];
  status?: IssueStatus | IssueStatus[];
  tags?: string[];
  assignee?: string;
  keyword?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  orderBy?: 'severity' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Issue統計
 */
export interface IssueStatistics {
  total: number;
  bySeverity: Record<IssueSeverity, number>;
  byStatus: Record<IssueStatus, number>;
  byCategory: Record<IssueCategory, number>;
  avgResolutionTime?: number;
}

/**
 * Issue作成パラメータ
 */
export type CreateIssueParams = Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Issue更新パラメータ
 */
export type UpdateIssueParams = Partial<Omit<Issue, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>;
