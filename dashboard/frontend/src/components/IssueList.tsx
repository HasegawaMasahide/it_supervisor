import type { Issue } from '../types';

interface IssueListProps {
  issues: Issue[];
  onIssueClick?: (issue: Issue) => void;
}

const severityConfig = {
  critical: { label: 'Critical', color: '#dc2626', icon: '🔴' },
  high: { label: 'High', color: '#ea580c', icon: '🟠' },
  medium: { label: 'Medium', color: '#ca8a04', icon: '🟡' },
  low: { label: 'Low', color: '#16a34a', icon: '🟢' },
  info: { label: 'Info', color: '#2563eb', icon: '🔵' }
};

const statusConfig = {
  open: { label: '未対応', color: '#dc2626' },
  in_progress: { label: '対応中', color: '#ca8a04' },
  resolved: { label: '解決済み', color: '#16a34a' },
  wont_fix: { label: '対応不要', color: '#6b7280' }
};

export function IssueList({ issues, onIssueClick }: IssueListProps) {
  return (
    <div className="issue-list">
      {issues.map(issue => {
        const severity = severityConfig[issue.severity];
        const status = statusConfig[issue.status];

        return (
          <div
            key={issue.id}
            className="issue-item"
            onClick={() => onIssueClick?.(issue)}
          >
            <div className="issue-item__header">
              <span className="issue-item__severity" title={severity.label}>
                {severity.icon}
              </span>
              <span className="issue-item__title">{issue.title}</span>
              <span
                className="issue-item__status"
                style={{ backgroundColor: status.color }}
              >
                {status.label}
              </span>
            </div>
            <div className="issue-item__meta">
              {issue.file && (
                <span className="issue-item__file">
                  📁 {issue.file}
                  {issue.line && `:${issue.line}`}
                </span>
              )}
              <span className="issue-item__category">{issue.category}</span>
              <span className="issue-item__date">
                {new Date(issue.createdAt).toLocaleDateString('ja-JP')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
