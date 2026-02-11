# API Documentation - @it-supervisor/metrics-model

プロジェクトのパフォーマンス・セキュリティ・コード品質などのメトリクスを一元管理し、時系列データの記録、比較分析、エクスポート機能を提供するパッケージです。

## クラス

### `MetricsDatabase`

メトリクス管理のメインクラス。SQLiteデータベース上でプロジェクト情報とメトリクスを管理し、集計、比較、インポート/エクスポート機能を提供します。

#### コンストラクタ

```typescript
new MetricsDatabase(filepath: string, options?: { validate?: boolean })
```

**パラメータ:**
- `filepath` (string): SQLiteデータベースファイルパス
- `options.validate` (boolean, optional): データバリデーション有効化（デフォルト: true）

**例:**
```typescript
import { MetricsDatabase } from '@it-supervisor/metrics-model';

const db = new MetricsDatabase('./metrics.db');

// バリデーション無効化（大量インポート時など）
const dbNoValidation = new MetricsDatabase('./metrics.db', { validate: false });
```

---

### メソッド

#### `createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project`

新しいプロジェクトを作成します。

**パラメータ:**
- `project` (Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): プロジェクト情報

**戻り値:**
- `Project`: 作成されたプロジェクト

**throws:**
- プロジェクト名が空の場合
- プロジェクト名が255文字を超える場合

**例:**
```typescript
const project = db.createProject({
  name: 'E-Commerce Platform',
  description: 'Main web application for online sales',
  metadata: {
    team: 'Backend Team',
    repository: 'github.com/company/ecommerce'
  }
});

console.log(`Project created with ID: ${project.id}`);
console.log(`Created at: ${project.createdAt}`);
```

---

#### `getProject(projectId: string): Project | null`

プロジェクトを取得します。

**パラメータ:**
- `projectId` (string): プロジェクトID

**戻り値:**
- `Project | null`: プロジェクトオブジェクト、見つからない場合はnull

**例:**
```typescript
const project = db.getProject('project-uuid-123');

if (project) {
  console.log(`Project: ${project.name}`);
  console.log(`Description: ${project.description}`);
}
```

---

#### `getAllProjects(): Project[]`

すべてのプロジェクトを取得します。

**戻り値:**
- `Project[]`: プロジェクト配列（作成日時の新しい順）

**例:**
```typescript
const projects = db.getAllProjects();

console.log(`Total projects: ${projects.length}`);
projects.forEach(project => {
  console.log(`- ${project.name} (${project.id})`);
});
```

---

#### `updateProject(projectId: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | null`

プロジェクト情報を更新します。

**パラメータ:**
- `projectId` (string): プロジェクトID
- `updates` (Partial<Omit<Project, 'id' | 'createdAt'>>): 更新内容

**戻り値:**
- `Project | null`: 更新されたプロジェクト

**例:**
```typescript
const updated = db.updateProject('project-uuid-123', {
  description: 'Updated: Main platform for global e-commerce',
  metadata: { version: '2.0', status: 'production' }
});

console.log(`Updated at: ${updated?.updatedAt}`);
```

---

#### `deleteProject(projectId: string): boolean`

プロジェクトと関連メトリクスをすべて削除します。

**パラメータ:**
- `projectId` (string): プロジェクトID

**戻り値:**
- `boolean`: 削除成功時true

**例:**
```typescript
const deleted = db.deleteProject('project-uuid-123');
if (deleted) {
  console.log('Project and all associated metrics deleted');
}
```

---

#### `recordMetric(metric: Omit<MetricRecord, 'id'>): MetricRecord`

メトリクスを記録します。

**パラメータ:**
- `metric` (Omit<MetricRecord, 'id'>): メトリクスデータ

**戻り値:**
- `MetricRecord`: 記録されたメトリクス

**throws:**
- 必須フィールド（projectId、name、value、source）が不足
- プロジェクトが存在しない場合

**例:**
```typescript
const metric = db.recordMetric({
  projectId: 'project-uuid-123',
  timestamp: new Date(),
  category: MetricCategory.Performance,
  name: 'response-time-avg',
  value: 245,
  unit: 'ms',
  source: 'monitoring-agent',
  notes: 'Peak traffic period',
  tags: ['api', 'production']
});

console.log(`Metric recorded with ID: ${metric.id}`);
```

---

#### `getMetrics(query?: MetricQuery): MetricRecord[]`

メトリクスを検索します。

**パラメータ:**
- `query` (MetricQuery, optional): 検索条件

**戻り値:**
- `MetricRecord[]`: マッチしたメトリクス配列

**例:**
```typescript
// プロジェクトのセキュリティメトリクスを最新から10件取得
const metrics = db.getMetrics({
  projectId: 'project-uuid-123',
  category: MetricCategory.Security,
  limit: 10,
  order: 'desc',
  orderBy: 'timestamp'
});

metrics.forEach(metric => {
  console.log(`${metric.timestamp.toISOString()}: ${metric.name} = ${metric.value} ${metric.unit}`);
});
```

---

#### `aggregateMetrics(projectId: string, category?: MetricCategory): MetricAggregation[]`

メトリクスを集計します。

**パラメータ:**
- `projectId` (string): プロジェクトID
- `category` (MetricCategory, optional): カテゴリフィルター

**戻り値:**
- `MetricAggregation[]`: 集計結果配列

**例:**
```typescript
const aggregations = db.aggregateMetrics('project-uuid-123', MetricCategory.Performance);

aggregations.forEach(agg => {
  console.log(`${agg.name}:`);
  console.log(`  Count: ${agg.count}`);
  console.log(`  Min: ${agg.min}`);
  console.log(`  Max: ${agg.max}`);
  console.log(`  Avg: ${agg.avg?.toFixed(2)}`);
});
```

---

#### `compareMetrics(projectId: string, beforeDate: Date, afterDate: Date): MetricComparison[]`

Before/Afterで同一メトリクスを比較します。

**パラメータ:**
- `projectId` (string): プロジェクトID
- `beforeDate` (Date): Before期間の終了日時
- `afterDate` (Date): After期間の開始日時

**戻り値:**
- `MetricComparison[]`: 比較結果配列

**例:**
```typescript
const beforeDate = new Date('2024-02-01');
const afterDate = new Date('2024-03-01');

const comparisons = db.compareMetrics('project-uuid-123', beforeDate, afterDate);

console.log('Metrics Comparison:');
comparisons.forEach(comp => {
  console.log(`${comp.name}:`);
  console.log(`  Before: ${comp.beforeValue} ${comp.unit}`);
  console.log(`  After: ${comp.afterValue} ${comp.unit}`);
  if (comp.change !== null) {
    const sign = comp.change > 0 ? '+' : '';
    console.log(`  Change: ${sign}${comp.change} (${comp.changePercentage?.toFixed(1)}%)`);
  }
});
```

---

#### `recordMetricsBatch(metrics: Array<Omit<MetricRecord, 'id'>>): MetricRecord[]`

複数のメトリクスを一括記録します。

**パラメータ:**
- `metrics` (Array<Omit<MetricRecord, 'id'>>): メトリクス配列

**戻り値:**
- `MetricRecord[]`: 記録されたメトリクス配列

**例:**
```typescript
const batchMetrics = [
  {
    projectId: 'project-123',
    timestamp: new Date(),
    category: MetricCategory.Performance,
    name: 'response-time-avg',
    value: 250,
    source: 'monitoring'
  },
  {
    projectId: 'project-123',
    timestamp: new Date(),
    category: MetricCategory.CodeQuality,
    name: 'test-coverage',
    value: 75.5,
    unit: '%',
    source: 'ci-pipeline'
  },
  {
    projectId: 'project-123',
    timestamp: new Date(),
    category: MetricCategory.Security,
    name: 'vulnerabilities-critical',
    value: 2,
    source: 'snyk'
  }
];

const recorded = db.recordMetricsBatch(batchMetrics);
console.log(`Recorded ${recorded.length} metrics`);
```

---

#### `deleteMetric(metricId: string): boolean`

単一のメトリクスを削除します。

**パラメータ:**
- `metricId` (string): メトリクスID

**戻り値:**
- `boolean`: 削除成功時true

**例:**
```typescript
const deleted = db.deleteMetric('metric-id');
console.log(deleted ? 'Metric deleted' : 'Metric not found');
```

---

#### `exportMetrics(projectIds?: string[]): MetricsExport`

メトリクスをエクスポート形式で取得します。

**パラメータ:**
- `projectIds` (string[], optional): プロジェクトID配列（未指定時は全プロジェクト）

**戻り値:**
- `MetricsExport`: エクスポートデータ

**例:**
```typescript
const exportData = db.exportMetrics(['project-1', 'project-2']);

console.log(`Version: ${exportData.version}`);
console.log(`Exported: ${exportData.exportDate}`);
console.log(`Projects: ${exportData.projects.length}`);
console.log(`Metrics: ${exportData.metrics.length}`);
```

---

#### `importMetrics(data: MetricsExport): void`

メトリクスデータをインポートします。

**パラメータ:**
- `data` (MetricsExport): インポートするデータ

**throws:**
- データ形式エラー

**例:**
```typescript
const fs = require('fs').promises;

const data = JSON.parse(await fs.readFile('./metrics-backup.json', 'utf-8'));
db.importMetrics(data);

console.log('Metrics imported successfully');
```

---

#### `exportToCSV(projectIds?: string[]): string`

メトリクスをCSV形式でエクスポートします。

**パラメータ:**
- `projectIds` (string[], optional): プロジェクトID配列

**戻り値:**
- `string`: CSV形式のテキスト

**例:**
```typescript
const csv = db.exportToCSV(['project-123']);
fs.writeFileSync('./metrics.csv', csv, 'utf-8');

console.log('Metrics exported to CSV');
```

---

#### `exportToJSONFile(filepath: string, projectIds?: string[]): void`

メトリクスをJSONファイルにエクスポートします。

**パラメータ:**
- `filepath` (string): 出力ファイルパス
- `projectIds` (string[], optional): プロジェクトID配列

**throws:**
- ファイル書き込みエラー

**例:**
```typescript
db.exportToJSONFile('./metrics-export.json', ['project-123']);
console.log('Exported to metrics-export.json');
```

---

#### `backup(backupPath: string): void`

データベースのバックアップを作成します。

**パラメータ:**
- `backupPath` (string): バックアップファイルパス

**throws:**
- バックアップ作成エラー

**例:**
```typescript
db.backup('./metrics-backup.db');
console.log('Backup created');
```

---

#### `transaction<T>(fn: () => T): T`

トランザクション内で処理を実行します。

**パラメータ:**
- `fn` (function): 実行する関数

**戻り値:**
- `T`: 関数の戻り値

**例:**
```typescript
const results = db.transaction(() => {
  const project = db.createProject({ name: 'New Project' });

  db.recordMetric({
    projectId: project.id,
    timestamp: new Date(),
    category: MetricCategory.Performance,
    name: 'baseline',
    value: 100,
    source: 'init'
  });

  return project;
});

console.log(`Created project: ${results.id}`);
```

---

#### `close(): void`

データベース接続を閉じます。

**例:**
```typescript
db.close();
console.log('Database connection closed');
```

---

## インターフェース

### `MetricRecord`

メトリクスレコード。

```typescript
interface MetricRecord {
  /** レコードID（自動生成） */
  id?: string;

  /** プロジェクトID */
  projectId: string;

  /** 収集日時 */
  timestamp: Date;

  /** メトリクスカテゴリ */
  category: MetricCategory;

  /** メトリクス名 */
  name: string;

  /** メトリクス値（数値・文字列・真偽値） */
  value: MetricValue;

  /** 単位（例: ms, %, count） */
  unit?: string;

  /** 収集元ツール名 */
  source: string;

  /** 備考・メモ */
  notes?: string;

  /** タグ配列 */
  tags?: string[];

  /** メタデータ */
  metadata?: Record<string, unknown>;
}
```

### `MetricQuery`

メトリクス検索条件。

```typescript
interface MetricQuery {
  /** プロジェクトID */
  projectId?: string;

  /** カテゴリフィルター */
  category?: MetricCategory;

  /** メトリクス名フィルター */
  name?: string;

  /** 開始日時 */
  from?: Date;

  /** 終了日時 */
  to?: Date;

  /** タグフィルター */
  tags?: string[];

  /** ソート順 */
  orderBy?: 'timestamp' | 'category' | 'name';

  /** 昇順/降順 */
  order?: 'asc' | 'desc';

  /** 取得件数上限 */
  limit?: number;

  /** オフセット */
  offset?: number;
}
```

### `MetricAggregation`

メトリクス集計結果。

```typescript
interface MetricAggregation {
  /** カテゴリ */
  category: MetricCategory;

  /** メトリクス名 */
  name: string;

  /** 件数 */
  count: number;

  /** 最小値 */
  min?: number;

  /** 最大値 */
  max?: number;

  /** 平均値 */
  avg?: number;

  /** 合計 */
  sum?: number;

  /** 最新値 */
  latest?: MetricValue;
}
```

### `MetricComparison`

Before/After比較結果。

```typescript
interface MetricComparison {
  /** プロジェクトID */
  projectId: string;

  /** カテゴリ */
  category: MetricCategory;

  /** メトリクス名 */
  name: string;

  /** Before値 */
  beforeValue: MetricValue;

  /** After値 */
  afterValue: MetricValue;

  /** Before日時 */
  beforeDate: Date;

  /** After日時 */
  afterDate: Date;

  /** 差分（数値のみ） */
  change: number | null;

  /** 変化率（数値のみ） */
  changePercentage: number | null;

  /** 単位 */
  unit?: string;
}
```

### `Project`

プロジェクト情報。

```typescript
interface Project {
  /** プロジェクトID */
  id: string;

  /** プロジェクト名 */
  name: string;

  /** 説明 */
  description?: string;

  /** 作成日時 */
  createdAt: Date;

  /** 更新日時 */
  updatedAt: Date;

  /** メタデータ */
  metadata?: Record<string, unknown>;
}
```

---

## Enum

### `MetricCategory`

メトリクスのカテゴリ。

```typescript
enum MetricCategory {
  Security = 'security',              // セキュリティ関連
  Performance = 'performance',        // パフォーマンス関連
  CodeQuality = 'code_quality',       // コード品質関連
  TechnicalDebt = 'technical_debt',   // 技術的負債関連
  Custom = 'custom'                   // カスタム
}
```

---

## 使用例

### 基本的な使用法

```typescript
import { MetricsDatabase, MetricCategory } from '@it-supervisor/metrics-model';

const db = new MetricsDatabase('./metrics.db');

// プロジェクト作成
const project = db.createProject({
  name: 'Mobile App Backend',
  description: 'REST API for mobile applications'
});

console.log(`Project ID: ${project.id}`);

// メトリクス記録
const metric = db.recordMetric({
  projectId: project.id,
  timestamp: new Date(),
  category: MetricCategory.Performance,
  name: 'api-response-time',
  value: 182,
  unit: 'ms',
  source: 'newrelic'
});

console.log(`Metric recorded: ${metric.id}`);

db.close();
```

### パフォーマンス監視

```typescript
const projectId = 'mobile-backend';

// 定期的にメトリクスを記録
setInterval(() => {
  const now = new Date();
  const metrics = [
    {
      projectId,
      timestamp: now,
      category: MetricCategory.Performance,
      name: 'cpu-usage',
      value: Math.random() * 80,
      unit: '%',
      source: 'prometheus'
    },
    {
      projectId,
      timestamp: now,
      category: MetricCategory.Performance,
      name: 'memory-usage',
      value: Math.random() * 70,
      unit: '%',
      source: 'prometheus'
    },
    {
      projectId,
      timestamp: now,
      category: MetricCategory.Performance,
      name: 'response-time-p95',
      value: Math.random() * 500 + 100,
      unit: 'ms',
      source: 'newrelic'
    }
  ];

  db.recordMetricsBatch(metrics);
}, 60000); // 1分ごと
```

### セキュリティメトリクス追跡

```typescript
const projectId = 'ecommerce-platform';

// セキュリティスキャン結果を記録
const scanResults = {
  vulnerabilities: 3,
  criticalCount: 1,
  coveragePercent: 85.2
};

db.recordMetric({
  projectId,
  timestamp: new Date(),
  category: MetricCategory.Security,
  name: 'total-vulnerabilities',
  value: scanResults.vulnerabilities,
  source: 'snyk',
  tags: ['scan-result']
});

db.recordMetric({
  projectId,
  timestamp: new Date(),
  category: MetricCategory.Security,
  name: 'critical-vulnerabilities',
  value: scanResults.criticalCount,
  source: 'snyk',
  tags: ['scan-result']
});

db.recordMetric({
  projectId,
  timestamp: new Date(),
  category: MetricCategory.CodeQuality,
  name: 'test-coverage',
  value: scanResults.coveragePercent,
  unit: '%',
  source: 'codecov'
});
```

### メトリクス比較分析

```typescript
const projectId = 'web-app';

// リリース前後のメトリクスを比較
const releaseDate = new Date('2024-02-15');
const beforeDate = new Date('2024-02-10');
const afterDate = new Date('2024-02-20');

const comparisons = db.compareMetrics(projectId, beforeDate, afterDate);

console.log('Performance Metrics - Before/After Release:');
comparisons.forEach(comp => {
  if (comp.category === MetricCategory.Performance) {
    console.log(`\n${comp.name}:`);
    console.log(`  Before: ${comp.beforeValue} ${comp.unit}`);
    console.log(`  After: ${comp.afterValue} ${comp.unit}`);
    if (comp.change !== null) {
      const improvement = comp.change < 0 ? '✓' : '✗';
      console.log(`  ${improvement} Change: ${comp.change} (${comp.changePercentage?.toFixed(1)}%)`);
    }
  }
});
```

### 集計とレポート

```typescript
const projectId = 'data-pipeline';

// コード品質メトリクスの集計
const aggregations = db.aggregateMetrics(projectId, MetricCategory.CodeQuality);

console.log('Code Quality Metrics Summary:');
aggregations.forEach(agg => {
  console.log(`\n${agg.name}:`);
  console.log(`  Records: ${agg.count}`);
  console.log(`  Range: ${agg.min?.toFixed(2)} - ${agg.max?.toFixed(2)}`);
  console.log(`  Average: ${agg.avg?.toFixed(2)}`);
  console.log(`  Latest: ${agg.latest}`);
});
```

### バックアップとエクスポート

```typescript
const db = new MetricsDatabase('./metrics.db');

// JSONエクスポート
db.exportToJSONFile('./metrics-export.json', ['project-1', 'project-2']);

// CSVエクスポート（スプレッドシート用）
const csv = db.exportToCSV(['project-1']);
fs.writeFileSync('./metrics.csv', csv);

// データベースバックアップ
db.backup('./backups/metrics-2024-02-15.db');

db.close();
```

### トランザクション処理

```typescript
const db = new MetricsDatabase('./metrics.db');

// 複数の操作をトランザクション内で実行
try {
  db.transaction(() => {
    // プロジェクト作成
    const project = db.createProject({
      name: 'New Initiative',
      description: 'Q1 2024 Project'
    });

    // 初期メトリクスを記録
    const now = new Date();
    db.recordMetricsBatch([
      {
        projectId: project.id,
        timestamp: now,
        category: MetricCategory.Performance,
        name: 'baseline-response-time',
        value: 500,
        unit: 'ms',
        source: 'initial'
      },
      {
        projectId: project.id,
        timestamp: now,
        category: MetricCategory.CodeQuality,
        name: 'baseline-test-coverage',
        value: 0,
        unit: '%',
        source: 'initial'
      }
    ]);

    return project;
  });

  console.log('Project and baseline metrics created successfully');
} catch (error) {
  console.error('Transaction failed:', error);
}

db.close();
```

### インポート/エクスポートワークフロー

```typescript
// SourceDB からデータをエクスポート
const sourceDb = new MetricsDatabase('./source-metrics.db');
const exportData = sourceDb.exportMetrics();
sourceDb.close();

// JSONで保存
fs.writeFileSync('./metrics-snapshot.json', JSON.stringify(exportData, null, 2));

// Target DB にインポート
const targetDb = new MetricsDatabase('./target-metrics.db');
const importData = JSON.parse(fs.readFileSync('./metrics-snapshot.json', 'utf-8'));
targetDb.importMetrics(importData);

console.log('Metrics migrated successfully');
targetDb.close();
```

### 時系列データ分析

```typescript
const projectId = 'api-service';

// 過去7日間のレスポンスタイムを取得
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const metrics = db.getMetrics({
  projectId,
  category: MetricCategory.Performance,
  name: 'response-time-avg',
  from: sevenDaysAgo,
  orderBy: 'timestamp',
  order: 'asc'
});

// トレンド分析
const values = metrics.map(m => m.value as number);
const avg = values.reduce((a, b) => a + b, 0) / values.length;
const trend = values[values.length - 1] - values[0];
const trendPercent = ((trend / values[0]) * 100).toFixed(2);

console.log(`7-Day Performance Trend:`);
console.log(`  Average: ${avg.toFixed(2)}ms`);
console.log(`  Trend: ${trend > 0 ? '↑' : '↓'} ${Math.abs(trend).toFixed(2)}ms (${trendPercent}%)`);
```

---

## エラーハンドリング

```typescript
try {
  const db = new MetricsDatabase('./metrics.db');

  // バリデーション有効時はエラーをキャッチ
  db.recordMetric({
    projectId: 'nonexistent',
    timestamp: new Date(),
    category: MetricCategory.Performance,
    name: 'test',
    value: 100,
    source: 'test'
  });
} catch (error) {
  if (error.message.includes('does not exist')) {
    console.error('Project does not exist');
  } else {
    console.error('Recording failed:', error.message);
  }
} finally {
  db.close();
}
```

---

## ベストプラクティス

### バリデーション管理

```typescript
// 通常はバリデーション有効
const db = new MetricsDatabase('./metrics.db');

// 大量データのインポート時はバリデーション無効化
const bulkDb = new MetricsDatabase('./bulk-metrics.db', { validate: false });
```

### リソース管理

```typescript
const db = new MetricsDatabase('./metrics.db');

try {
  // メトリクス操作
  const metrics = db.getMetrics({ projectId: 'project-123' });
  // 処理...
} finally {
  db.close(); // 常にクローズ
}
```

### 効率的なバッチ処理

```typescript
const db = new MetricsDatabase('./metrics.db');

// 複数メトリクスを一括記録（トランザクション利用）
const metrics = [];
for (let i = 0; i < 100; i++) {
  metrics.push({
    projectId: 'project-123',
    timestamp: new Date(Date.now() - i * 60000),
    category: MetricCategory.Performance,
    name: 'cpu-usage',
    value: Math.random() * 100,
    unit: '%',
    source: 'monitoring'
  });
}

db.recordMetricsBatch(metrics);
console.log('Bulk metrics recorded successfully');
```

---

## トラブルシューティング

### バリデーション失敗

```typescript
// プロジェクトが存在することを確認
const project = db.getProject(projectId);
if (!project) {
  console.error('Project not found, creating...');
  const newProject = db.createProject({ name: 'New Project' });
  projectId = newProject.id;
}
```

### パフォーマンス最適化

```typescript
// 大量データ検索の場合はページネーション使用
const pageSize = 1000;
let offset = 0;

while (true) {
  const metrics = db.getMetrics({
    projectId,
    limit: pageSize,
    offset
  });

  if (metrics.length === 0) break;

  // 各ページを処理
  offset += pageSize;
}
```

---

## 関連リンク

- [パッケージREADME](../README.md)
- [使用例](../../../docs/USAGE_EXAMPLES.md)
