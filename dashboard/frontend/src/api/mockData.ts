import type { Project, ProjectSummary, Issue, Report, MetricHistory } from '../types';

// モックプロジェクト
export const mockProject: Project = {
  id: '10000000-0000-0000-0000-000000000001',
  name: 'Laravel TODO アプリ',
  customerName: '株式会社サンプル',
  status: 'active',
  progress: 45,
  phase: 'analysis',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-25T00:00:00Z'
};

// モックメトリクス履歴
const mockMetricsHistory: MetricHistory[] = [
  { date: '2025-01-19', codeQuality: 58, securityScore: 45 },
  { date: '2025-01-20', codeQuality: 62, securityScore: 52 },
  { date: '2025-01-21', codeQuality: 65, securityScore: 58 },
  { date: '2025-01-22', codeQuality: 68, securityScore: 62 },
  { date: '2025-01-23', codeQuality: 70, securityScore: 68 },
  { date: '2025-01-24', codeQuality: 72, securityScore: 72 },
  { date: '2025-01-25', codeQuality: 75, securityScore: 78 }
];

// モックプロジェクトサマリー
export const mockProjectSummary: ProjectSummary = {
  project: mockProject,
  metrics: {
    codeQuality: 75,
    securityScore: 78,
    technicalDebtDays: 8,
    testCoverage: 42,
    performanceScore: 85
  },
  metricsHistory: mockMetricsHistory,
  issuesSummary: {
    total: 47,
    critical: 3,
    high: 12,
    medium: 20,
    low: 12,
    resolved: 15
  },
  recentActivity: [
    {
      id: '1',
      type: 'issue_resolved',
      message: 'SQL Injection脆弱性を修正しました',
      timestamp: '2025-01-25T10:30:00Z'
    },
    {
      id: '2',
      type: 'report_generated',
      message: '分析レポートを生成しました',
      timestamp: '2025-01-24T15:00:00Z'
    },
    {
      id: '3',
      type: 'phase_changed',
      message: 'フェーズが「調査」から「分析」に移行しました',
      timestamp: '2025-01-23T09:00:00Z'
    },
    {
      id: '4',
      type: 'issue_created',
      message: '新しいセキュリティ問題を12件検出しました',
      timestamp: '2025-01-22T14:00:00Z'
    }
  ]
};

// モックIssue一覧
export const mockIssues: Issue[] = [
  {
    id: '1',
    projectId: mockProject.id,
    title: 'SQL Injection vulnerability in UserController',
    description: 'User input is directly concatenated in SQL query without proper sanitization.',
    severity: 'critical',
    category: 'security',
    status: 'open',
    file: 'app/Http/Controllers/UserController.php',
    line: 45,
    createdAt: '2025-01-22T14:00:00Z',
    updatedAt: '2025-01-22T14:00:00Z'
  },
  {
    id: '2',
    projectId: mockProject.id,
    title: 'Cross-Site Scripting (XSS) in comment display',
    description: 'User comments are rendered without escaping HTML entities.',
    severity: 'critical',
    category: 'security',
    status: 'open',
    file: 'resources/views/comments/show.blade.php',
    line: 23,
    createdAt: '2025-01-22T14:05:00Z',
    updatedAt: '2025-01-22T14:05:00Z'
  },
  {
    id: '3',
    projectId: mockProject.id,
    title: 'Hardcoded API key in configuration',
    description: 'API key is hardcoded instead of using environment variables.',
    severity: 'critical',
    category: 'security',
    status: 'in_progress',
    file: 'config/services.php',
    line: 12,
    createdAt: '2025-01-22T14:10:00Z',
    updatedAt: '2025-01-24T10:00:00Z'
  },
  {
    id: '4',
    projectId: mockProject.id,
    title: 'N+1 query problem in Todo listing',
    description: 'Todo items are queried individually instead of using eager loading.',
    severity: 'high',
    category: 'performance',
    status: 'open',
    file: 'app/Http/Controllers/TodoController.php',
    line: 28,
    createdAt: '2025-01-22T14:15:00Z',
    updatedAt: '2025-01-22T14:15:00Z'
  },
  {
    id: '5',
    projectId: mockProject.id,
    title: 'Missing input validation on create endpoint',
    description: 'The create endpoint does not validate required fields.',
    severity: 'high',
    category: 'security',
    status: 'resolved',
    file: 'app/Http/Controllers/TodoController.php',
    line: 52,
    createdAt: '2025-01-22T14:20:00Z',
    updatedAt: '2025-01-25T10:30:00Z'
  },
  {
    id: '6',
    projectId: mockProject.id,
    title: 'Unused variable in helper function',
    description: 'Variable $tempData is declared but never used.',
    severity: 'low',
    category: 'code_quality',
    status: 'open',
    file: 'app/Helpers/utils.php',
    line: 78,
    createdAt: '2025-01-22T14:25:00Z',
    updatedAt: '2025-01-22T14:25:00Z'
  },
  {
    id: '7',
    projectId: mockProject.id,
    title: 'Complex method exceeds cyclomatic complexity threshold',
    description: 'Method processTodo has cyclomatic complexity of 15, exceeding threshold of 10.',
    severity: 'medium',
    category: 'maintainability',
    status: 'open',
    file: 'app/Services/TodoService.php',
    line: 102,
    createdAt: '2025-01-22T14:30:00Z',
    updatedAt: '2025-01-22T14:30:00Z'
  },
  {
    id: '8',
    projectId: mockProject.id,
    title: 'Missing index on frequently queried column',
    description: 'Column user_id in todos table is frequently queried but not indexed.',
    severity: 'medium',
    category: 'performance',
    status: 'open',
    file: 'database/migrations/create_todos_table.php',
    line: 18,
    createdAt: '2025-01-22T14:35:00Z',
    updatedAt: '2025-01-22T14:35:00Z'
  }
];

// モックレポート一覧
export const mockReports: Report[] = [
  {
    id: '1',
    projectId: mockProject.id,
    title: 'システム概要レポート',
    type: 'analysis',
    format: 'pdf',
    createdAt: '2025-01-20T10:00:00Z',
    downloadUrl: '/reports/analysis-report.pdf'
  },
  {
    id: '2',
    projectId: mockProject.id,
    title: '分析レポート',
    type: 'analysis',
    format: 'pdf',
    createdAt: '2025-01-24T15:00:00Z',
    downloadUrl: '/reports/full-analysis-report.pdf'
  }
];

// API関数（モック）
export const api = {
  getProjectSummary: async (projectId: string): Promise<ProjectSummary> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockProjectSummary;
  },

  getIssues: async (projectId: string): Promise<Issue[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockIssues;
  },

  getReports: async (projectId: string): Promise<Report[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockReports;
  }
};
