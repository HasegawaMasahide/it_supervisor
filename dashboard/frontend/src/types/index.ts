// プロジェクト
export interface Project {
  id: string;
  name: string;
  customerName: string;
  status: ProjectStatus;
  progress: number;
  phase: Phase;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'active' | 'completed' | 'paused' | 'pending';

export type Phase =
  | 'discovery'
  | 'analysis'
  | 'diagnosis'
  | 'proposal'
  | 'implementation'
  | 'measurement'
  | 'reporting';

// メトリクス
export interface Metrics {
  codeQuality: number;
  securityScore: number;
  technicalDebtDays: number;
  testCoverage: number;
  performanceScore: number;
}

export interface MetricHistory {
  date: string;
  codeQuality: number;
  securityScore: number;
}

// Issue
export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string;
  severity: Severity;
  category: IssueCategory;
  status: IssueStatus;
  file?: string;
  line?: number;
  createdAt: string;
  updatedAt: string;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type IssueCategory =
  | 'security'
  | 'performance'
  | 'code_quality'
  | 'best_practice'
  | 'maintainability';

export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'wont_fix';

// レポート
export interface Report {
  id: string;
  projectId: string;
  title: string;
  type: ReportType;
  format: 'pdf' | 'html' | 'markdown';
  createdAt: string;
  downloadUrl: string;
}

export type ReportType =
  | 'analysis'
  | 'diagnosis'
  | 'proposal'
  | 'implementation'
  | 'final';

// サマリー
export interface ProjectSummary {
  project: Project;
  metrics: Metrics;
  metricsHistory: MetricHistory[];
  issuesSummary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    resolved: number;
  };
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'issue_created' | 'issue_resolved' | 'report_generated' | 'phase_changed';
  message: string;
  timestamp: string;
}
