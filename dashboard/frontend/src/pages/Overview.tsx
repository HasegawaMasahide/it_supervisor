import { useState, useEffect } from 'react';
import { MetricCard } from '../components/MetricCard';
import { MetricsChart, IssueDonutChart } from '../components/Chart';
import { api } from '../api/mockData';
import type { ProjectSummary } from '../types';

const phaseLabels: Record<string, string> = {
  discovery: '調査',
  analysis: '分析',
  diagnosis: '診断',
  proposal: '提案',
  implementation: '実装',
  measurement: '効果測定',
  reporting: '報告'
};

export function Overview() {
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getProjectSummary('10000000-0000-0000-0000-000000000001');
        setSummary(data);
      } catch (error) {
        console.error('Failed to fetch project summary:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  if (!summary) {
    return <div className="error">データの取得に失敗しました</div>;
  }

  const { project, metrics, metricsHistory, issuesSummary, recentActivity } = summary;

  return (
    <div className="page overview">
      {/* プロジェクトヘッダー */}
      <div className="project-header">
        <div className="project-header__info">
          <h1 className="project-header__name">{project.name}</h1>
          <p className="project-header__customer">{project.customerName}</p>
        </div>
        <div className="project-header__status">
          <span className="phase-badge">
            {phaseLabels[project.phase] || project.phase}フェーズ
          </span>
          <div className="progress-bar">
            <div
              className="progress-bar__fill"
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <span className="progress-text">{project.progress}%完了</span>
        </div>
      </div>

      {/* メトリクスカード */}
      <div className="metrics-grid">
        <MetricCard
          title="コード品質"
          value={metrics.codeQuality}
          unit="/100"
          icon="📊"
          trend="up"
          trendValue="+5"
          color={metrics.codeQuality >= 70 ? 'green' : metrics.codeQuality >= 50 ? 'yellow' : 'red'}
        />
        <MetricCard
          title="セキュリティ"
          value={metrics.securityScore}
          unit="/100"
          icon="🔒"
          trend="up"
          trendValue="+10"
          color={metrics.securityScore >= 70 ? 'green' : metrics.securityScore >= 50 ? 'yellow' : 'red'}
        />
        <MetricCard
          title="技術的負債"
          value={metrics.technicalDebtDays}
          unit="日"
          icon="⏱️"
          trend="down"
          trendValue="-2"
          color={metrics.technicalDebtDays <= 5 ? 'green' : metrics.technicalDebtDays <= 15 ? 'yellow' : 'red'}
        />
        <MetricCard
          title="テストカバレッジ"
          value={metrics.testCoverage}
          unit="%"
          icon="🧪"
          color={metrics.testCoverage >= 80 ? 'green' : metrics.testCoverage >= 50 ? 'yellow' : 'red'}
        />
      </div>

      {/* チャートとサマリー */}
      <div className="charts-section">
        <div className="chart-card">
          <h2 className="chart-card__title">メトリクス推移（過去7日間）</h2>
          <MetricsChart data={metricsHistory} />
        </div>
        <div className="chart-card">
          <h2 className="chart-card__title">Issue分布</h2>
          <IssueDonutChart
            critical={issuesSummary.critical}
            high={issuesSummary.high}
            medium={issuesSummary.medium}
            low={issuesSummary.low}
          />
          <div className="issue-summary-stats">
            <div className="issue-stat">
              <span className="issue-stat__label">総Issue数</span>
              <span className="issue-stat__value">{issuesSummary.total}</span>
            </div>
            <div className="issue-stat issue-stat--resolved">
              <span className="issue-stat__label">解決済み</span>
              <span className="issue-stat__value">{issuesSummary.resolved}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 最近のアクティビティ */}
      <div className="activity-section">
        <h2 className="section-title">最近のアクティビティ</h2>
        <div className="activity-list">
          {recentActivity.map(activity => (
            <div key={activity.id} className="activity-item">
              <span className="activity-item__icon">
                {activity.type === 'issue_resolved' && '✅'}
                {activity.type === 'issue_created' && '🔍'}
                {activity.type === 'report_generated' && '📄'}
                {activity.type === 'phase_changed' && '🔄'}
              </span>
              <span className="activity-item__message">{activity.message}</span>
              <span className="activity-item__time">
                {new Date(activity.timestamp).toLocaleString('ja-JP')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
