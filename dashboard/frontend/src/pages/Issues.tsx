import { useState, useEffect } from 'react';
import { IssueList } from '../components/IssueList';
import { api } from '../api/mockData';
import type { Issue, Severity, IssueStatus } from '../types';

export function Issues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus | 'all'>('all');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getIssues('10000000-0000-0000-0000-000000000001');
        setIssues(data);
      } catch (error) {
        console.error('Failed to fetch issues:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredIssues = issues.filter(issue => {
    if (selectedSeverity !== 'all' && issue.severity !== selectedSeverity) return false;
    if (selectedStatus !== 'all' && issue.status !== selectedStatus) return false;
    return true;
  });

  const severityCounts = {
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="page issues-page">
      <div className="page-header">
        <h1 className="page-title">Issues</h1>
        <p className="page-description">
          検出された問題の一覧です。重要度順に対応を推奨します。
        </p>
      </div>

      {/* サマリーバッジ */}
      <div className="severity-badges">
        <button
          className={`severity-badge severity-badge--all ${selectedSeverity === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedSeverity('all')}
        >
          すべて ({issues.length})
        </button>
        <button
          className={`severity-badge severity-badge--critical ${selectedSeverity === 'critical' ? 'active' : ''}`}
          onClick={() => setSelectedSeverity('critical')}
        >
          🔴 Critical ({severityCounts.critical})
        </button>
        <button
          className={`severity-badge severity-badge--high ${selectedSeverity === 'high' ? 'active' : ''}`}
          onClick={() => setSelectedSeverity('high')}
        >
          🟠 High ({severityCounts.high})
        </button>
        <button
          className={`severity-badge severity-badge--medium ${selectedSeverity === 'medium' ? 'active' : ''}`}
          onClick={() => setSelectedSeverity('medium')}
        >
          🟡 Medium ({severityCounts.medium})
        </button>
        <button
          className={`severity-badge severity-badge--low ${selectedSeverity === 'low' ? 'active' : ''}`}
          onClick={() => setSelectedSeverity('low')}
        >
          🟢 Low ({severityCounts.low})
        </button>
      </div>

      {/* フィルター */}
      <div className="filters">
        <select
          className="filter-select"
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value as IssueStatus | 'all')}
        >
          <option value="all">すべてのステータス</option>
          <option value="open">未対応</option>
          <option value="in_progress">対応中</option>
          <option value="resolved">解決済み</option>
          <option value="wont_fix">対応不要</option>
        </select>
      </div>

      {/* Issue一覧 */}
      <div className="issues-content">
        <div className="issues-list-container">
          <IssueList
            issues={filteredIssues}
            onIssueClick={setSelectedIssue}
          />
          {filteredIssues.length === 0 && (
            <div className="no-issues">
              条件に一致するIssueはありません
            </div>
          )}
        </div>

        {/* Issue詳細サイドパネル */}
        {selectedIssue && (
          <div className="issue-detail-panel">
            <div className="issue-detail-header">
              <h2 className="issue-detail-title">{selectedIssue.title}</h2>
              <button
                className="close-button"
                onClick={() => setSelectedIssue(null)}
              >
                ✕
              </button>
            </div>
            <div className="issue-detail-content">
              <div className="issue-detail-meta">
                <span className={`severity-tag severity-tag--${selectedIssue.severity}`}>
                  {selectedIssue.severity.toUpperCase()}
                </span>
                <span className="category-tag">{selectedIssue.category}</span>
              </div>

              <div className="issue-detail-section">
                <h3>説明</h3>
                <p>{selectedIssue.description}</p>
              </div>

              {selectedIssue.file && (
                <div className="issue-detail-section">
                  <h3>ファイル</h3>
                  <code>
                    {selectedIssue.file}
                    {selectedIssue.line && `:${selectedIssue.line}`}
                  </code>
                </div>
              )}

              <div className="issue-detail-section">
                <h3>ステータス</h3>
                <p>{selectedIssue.status}</p>
              </div>

              <div className="issue-detail-section">
                <h3>作成日</h3>
                <p>{new Date(selectedIssue.createdAt).toLocaleString('ja-JP')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
