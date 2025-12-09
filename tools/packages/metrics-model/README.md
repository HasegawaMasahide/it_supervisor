# @it-supervisor/metrics-model

メトリクスデータの型定義とデータベース管理機能を提供します。

## 機能

- メトリクスデータの型定義
- SQLiteベースのメトリクス永続化
- 時系列データの管理
- Before/After比較機能
- メトリクスのエクスポート/インポート

## インストール

```bash
npm install @it-supervisor/metrics-model
```

## 使用例

```typescript
import { MetricsDatabase, MetricCategory } from '@it-supervisor/metrics-model';

// データベースの初期化
const db = new MetricsDatabase('./metrics.db');

// メトリクスの記録
await db.recordMetric({
  projectId: 'proj-001',
  category: MetricCategory.Security,
  name: 'vulnerabilities_critical',
  value: 5,
  unit: 'count',
  source: 'snyk',
  timestamp: new Date(),
  notes: 'Initial security scan'
});

// メトリクスの取得
const metrics = await db.getMetrics('proj-001', {
  category: MetricCategory.Security,
  from: new Date('2025-01-01'),
  to: new Date('2025-12-31')
});

// Before/After比較
const comparison = await db.compareMetrics('proj-001', {
  beforeDate: new Date('2025-06-01'),
  afterDate: new Date('2025-12-01')
});
```

## データモデル

### MetricRecord

```typescript
interface MetricRecord {
  id?: string;
  projectId: string;
  timestamp: Date;
  category: MetricCategory;
  name: string;
  value: number | string | boolean;
  unit?: string;
  source: string;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}
```

### MetricCategory

- Security: セキュリティ関連
- Performance: パフォーマンス関連
- CodeQuality: コード品質関連
- TechnicalDebt: 技術的負債関連
- Custom: カスタムメトリクス

## API リファレンス

詳細は[API Documentation](./docs/api.md)を参照してください。
