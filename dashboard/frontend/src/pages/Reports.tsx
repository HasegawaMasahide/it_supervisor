import { useState, useEffect } from 'react';
import { api } from '../api/mockData';
import type { Report } from '../types';

const reportTypeLabels: Record<string, string> = {
  analysis: '分析レポート',
  diagnosis: '診断レポート',
  proposal: '改善提案書',
  implementation: '実装報告書',
  final: '最終報告書'
};

export function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getReports('10000000-0000-0000-0000-000000000001');
        setReports(data);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="page reports-page">
      <div className="page-header">
        <h1 className="page-title">レポート</h1>
        <p className="page-description">
          各フェーズで作成されたレポートを閲覧・ダウンロードできます。
        </p>
      </div>

      <div className="reports-grid">
        {reports.map(report => (
          <div key={report.id} className="report-card">
            <div className="report-card__icon">
              {report.format === 'pdf' && '📄'}
              {report.format === 'html' && '🌐'}
              {report.format === 'markdown' && '📝'}
            </div>
            <div className="report-card__content">
              <h3 className="report-card__title">{report.title}</h3>
              <p className="report-card__type">
                {reportTypeLabels[report.type] || report.type}
              </p>
              <p className="report-card__date">
                作成日: {new Date(report.createdAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
            <div className="report-card__actions">
              <button className="btn btn--primary">
                📥 ダウンロード
              </button>
              <button className="btn btn--secondary">
                👁️ プレビュー
              </button>
            </div>
          </div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="no-reports">
          <p>まだレポートが作成されていません。</p>
          <p>分析が完了すると、ここにレポートが表示されます。</p>
        </div>
      )}

      {/* レポート作成スケジュール */}
      <div className="report-schedule">
        <h2 className="section-title">レポート作成スケジュール</h2>
        <div className="schedule-timeline">
          <div className="schedule-item schedule-item--completed">
            <span className="schedule-icon">✅</span>
            <div className="schedule-content">
              <span className="schedule-label">システム概要レポート</span>
              <span className="schedule-date">2025/01/20</span>
            </div>
          </div>
          <div className="schedule-item schedule-item--completed">
            <span className="schedule-icon">✅</span>
            <div className="schedule-content">
              <span className="schedule-label">分析レポート</span>
              <span className="schedule-date">2025/01/24</span>
            </div>
          </div>
          <div className="schedule-item schedule-item--current">
            <span className="schedule-icon">🔄</span>
            <div className="schedule-content">
              <span className="schedule-label">診断レポート</span>
              <span className="schedule-date">2025/01/28（予定）</span>
            </div>
          </div>
          <div className="schedule-item schedule-item--pending">
            <span className="schedule-icon">⏳</span>
            <div className="schedule-content">
              <span className="schedule-label">改善提案書</span>
              <span className="schedule-date">2025/02/04（予定）</span>
            </div>
          </div>
          <div className="schedule-item schedule-item--pending">
            <span className="schedule-icon">⏳</span>
            <div className="schedule-content">
              <span className="schedule-label">最終報告書</span>
              <span className="schedule-date">2025/03/15（予定）</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
