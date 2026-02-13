# API Documentation - @it-supervisor/issue-manager

プロジェクトの問題(Issue)を一元管理し、優先度計算、関連Issue検出、ラベル分類などの高度な機能を提供するパッケージです。

## クラス

### `IssueManager`

Issue管理のメインクラス。SQLiteデータベース上でIssueのCRUD操作、検索、優先度計算、関連Issue検出などを管理します。

#### コンストラクタ

```typescript
new IssueManager(filepath: string)
```

**パラメータ:**
- `filepath` (string): SQLiteデータベースファイルパス

**例:**
```typescript
import { IssueManager } from '@it-supervisor/issue-manager';

const manager = new IssueManager('./issues.db');
```

---

### メソッド

#### `createIssue(params: CreateIssueParams): Issue`

新しいIssueを作成します。

**パラメータ:**
- `params` (CreateIssueParams): Issue作成パラメータ

**戻り値:**
- `Issue`: 作成されたIssue

**例:**
```typescript
const issue = manager.createIssue({
  projectId: 'project-123',
  title: 'SQL Injection vulnerability in user search',
  description: 'The search endpoint accepts user input without sanitization...',
  category: IssueCategory.Security,
  severity: IssueSeverity.Critical,
  status: IssueStatus.Identified,
  assignee: 'security-team',
  dueDate: new Date('2024-03-15'),
  location: {
    file: 'src/controllers/user.ts',
    line: 45,
    column: 20
  },
  tags: ['security', 'database', 'high-priority']
});

console.log(`Issue created with ID: ${issue.id}`);
```

---

#### `getIssue(issueId: string): Issue | null`

IDでIssueを取得します。

**パラメータ:**
- `issueId` (string): IssueのID

**戻り値:**
- `Issue | null`: Issueオブジェクト、見つからない場合はnull

**例:**
```typescript
const issue = manager.getIssue('issue-uuid-123');

if (issue) {
  console.log(`Issue: ${issue.title}`);
  console.log(`Severity: ${issue.severity}`);
  console.log(`Status: ${issue.status}`);
} else {
  console.log('Issue not found');
}
```

---

#### `updateIssue(issueId: string, params: UpdateIssueParams): Issue | null`

Issueを更新します。

**パラメータ:**
- `issueId` (string): IssueのID
- `params` (UpdateIssueParams): 更新内容

**戻り値:**
- `Issue | null`: 更新されたIssue、見つからない場合はnull

**例:**
```typescript
const updated = manager.updateIssue('issue-uuid-123', {
  title: 'SQL Injection in user search endpoint',
  status: IssueStatus.InProgress,
  assignee: 'john.doe@company.com',
  description: 'Applied parameterized queries in the search module'
});

if (updated) {
  console.log(`Issue updated: ${updated.updatedAt}`);
}
```

---

#### `updateIssueStatus(issueId: string, status: IssueStatus): Issue | null`

Issueのステータスを更新します。

**パラメータ:**
- `issueId` (string): IssueのID
- `status` (IssueStatus): 新しいステータス

**戻り値:**
- `Issue | null`: 更新されたIssue

**例:**
```typescript
const issue = manager.updateIssueStatus('issue-uuid-123', IssueStatus.Resolved);
console.log(`Status updated to: ${issue?.status}`);
```

---

#### `deleteIssue(issueId: string): boolean`

Issueを削除します。

**パラメータ:**
- `issueId` (string): IssueのID

**戻り値:**
- `boolean`: 削除成功時true

**例:**
```typescript
const deleted = manager.deleteIssue('issue-uuid-123');
console.log(deleted ? 'Issue deleted' : 'Issue not found');
```

---

#### `searchIssues(query: IssueQuery): Issue[]`

複合条件でIssueを検索します。

**パラメータ:**
- `query` (IssueQuery): 検索条件

**戻り値:**
- `Issue[]`: マッチしたIssue配列

**例:**
```typescript
// プロジェクト内の重大度High以上の未解決Issue
const criticalIssues = manager.searchIssues({
  projectId: 'project-123',
  severity: [IssueSeverity.Critical, IssueSeverity.High],
  status: [IssueStatus.Identified, IssueStatus.Diagnosed],
  orderBy: 'severity',
  order: 'desc',
  limit: 10
});

criticalIssues.forEach(issue => {
  console.log(`${issue.severity.toUpperCase()}: ${issue.title}`);
});
```

---

#### `addComment(issueId: string, comment: Omit<IssueComment, 'id' | 'issueId' | 'createdAt'>): IssueComment`

Issueにコメントを追加します。

**パラメータ:**
- `issueId` (string): IssueのID
- `comment` (Omit<IssueComment, 'id' | 'issueId' | 'createdAt'>): コメント内容

**戻り値:**
- `IssueComment`: 作成されたコメント

**例:**
```typescript
const comment = manager.addComment('issue-uuid-123', {
  author: 'john@company.com',
  content: 'Applied fix in PR #456. Ready for testing.',
  attachments: ['pr-456-changes.md', 'test-report.pdf']
});

console.log(`Comment added at ${comment.createdAt}`);
```

---

#### `getComments(issueId: string): IssueComment[]`

Issueのコメント一覧を取得します。

**パラメータ:**
- `issueId` (string): IssueのID

**戻り値:**
- `IssueComment[]`: コメント配列

**例:**
```typescript
const comments = manager.getComments('issue-uuid-123');

comments.forEach(comment => {
  console.log(`${comment.author} (${comment.createdAt}):`);
  console.log(comment.content);
});
```

---

#### `getStatistics(projectId?: string): IssueStatistics`

Issue統計情報を取得します。

**パラメータ:**
- `projectId` (string, optional): プロジェクトID（未指定時は全プロジェクト）

**戻り値:**
- `IssueStatistics`: 統計情報

**例:**
```typescript
const stats = manager.getStatistics('project-123');

console.log(`Total Issues: ${stats.total}`);
console.log(`Critical: ${stats.bySeverity.critical}`);
console.log(`High: ${stats.bySeverity.high}`);
console.log(`By Status:`);
Object.entries(stats.byStatus).forEach(([status, count]) => {
  console.log(`  ${status}: ${count}`);
});
```

---

#### `calculatePriority(issue: Issue): number`

Issueの優先度スコアを計算します。

**パラメータ:**
- `issue` (Issue): Issue

**戻り値:**
- `number`: 優先度スコア（0-300）

**計算ロジック:**
- 重要度: Critical=100, High=75, Medium=50, Low=25
- セキュリティ: +50
- 期限切れ: +100、3日以内: +50、1週間以内: +25

**例:**
```typescript
const issue = manager.getIssue('issue-uuid-123');
if (issue) {
  const priority = manager.calculatePriority(issue);
  console.log(`Priority Score: ${priority}`);

  if (priority > 150) {
    console.log('This is a high-priority issue');
  }
}
```

---

#### `getIssuesWithPriority(projectId: string, limit?: number): Array<Issue & { priority: number }>`

優先度付きでIssueを取得します。

**パラメータ:**
- `projectId` (string): プロジェクトID
- `limit` (number, optional): 最大件数

**戻り値:**
- `Array<Issue & { priority: number }>`: 優先度付きIssue配列（優先度順）

**例:**
```typescript
const topIssues = manager.getIssuesWithPriority('project-123', 10);

topIssues.forEach((issue, index) => {
  console.log(`${index + 1}. [${issue.priority}] ${issue.title}`);
  console.log(`   Severity: ${issue.severity}, Status: ${issue.status}`);
});
```

---

#### `findRelatedIssues(issueId: string, threshold?: number): Issue[]`

関連するIssueを検出します。

**パラメータ:**
- `issueId` (string): IssueのID
- `threshold` (number, optional): 類似度閾値（0-1、デフォルト: 0.5）

**戻り値:**
- `Issue[]`: 類似度順の関連Issue配列

**類似度計算:**
- カテゴリが同じ: +30
- 重要度が同じ: +20
- 同じファイル: +25
- タグの重複: 最大+25

**例:**
```typescript
const relatedIssues = manager.findRelatedIssues('issue-uuid-123', 0.6);

if (relatedIssues.length > 0) {
  console.log('Related issues found:');
  relatedIssues.forEach(issue => {
    console.log(`- ${issue.title} (${issue.category})`);
  });
}
```

---

#### `addLabel(issueId: string, label: string): Issue | null`

Issueにラベルを追加します。

**パラメータ:**
- `issueId` (string): IssueのID
- `label` (string): ラベル名

**戻り値:**
- `Issue | null`: 更新されたIssue

**例:**
```typescript
manager.addLabel('issue-uuid-123', 'urgent');
manager.addLabel('issue-uuid-123', 'backend');
manager.addLabel('issue-uuid-123', 'database-related');
```

---

#### `removeLabel(issueId: string, label: string): Issue | null`

Issueからラベルを削除します。

**パラメータ:**
- `issueId` (string): IssueのID
- `label` (string): ラベル名

**戻り値:**
- `Issue | null`: 更新されたIssue

**例:**
```typescript
manager.removeLabel('issue-uuid-123', 'in-review');
```

---

#### `getAllLabels(projectId: string): Array<{ label: string; count: number }>`

プロジェクト内の全ラベルを取得します。

**パラメータ:**
- `projectId` (string): プロジェクトID

**戻り値:**
- `Array<{ label: string; count: number }>`: ラベルと使用数の配列

**例:**
```typescript
const labels = manager.getAllLabels('project-123');

labels.forEach(({ label, count }) => {
  console.log(`${label}: ${count} issues`);
});

// 出力例:
// security: 12 issues
// performance: 8 issues
// backend: 15 issues
```

---

#### `exportToCSV(projectId?: string): string`

IssueをCSV形式でエクスポートします。

**パラメータ:**
- `projectId` (string, optional): プロジェクトID（未指定時は全プロジェクト）

**戻り値:**
- `string`: CSV形式のテキスト

**例:**
```typescript
const csv = manager.exportToCSV('project-123');
fs.writeFileSync('./issues.csv', csv, 'utf-8');
console.log('Issues exported to issues.csv');
```

---

#### `bulkUpdateStatus(issueIds: string[], status: IssueStatus): number`

複数のIssueのステータスを一括更新します。

**パラメータ:**
- `issueIds` (string[]): IssueID配列
- `status` (IssueStatus): 新しいステータス

**戻り値:**
- `number`: 更新されたIssue数

**例:**
```typescript
const issueIds = ['issue-1', 'issue-2', 'issue-3'];
const updated = manager.bulkUpdateStatus(issueIds, IssueStatus.Resolved);
console.log(`${updated} issues marked as resolved`);
```

---

#### `close(): void`

データベース接続を閉じます。

**例:**
```typescript
manager.close();
console.log('Database connection closed');
```

---

## インターフェース

### `Issue`

Issue情報。

```typescript
interface Issue {
  /** 一意のID */
  id: string;

  /** プロジェクトID */
  projectId: string;

  /** タイトル */
  title: string;

  /** 説明 */
  description: string;

  /** カテゴリ */
  category: IssueCategory;

  /** 重要度 */
  severity: IssueSeverity;

  /** ステータス */
  status: IssueStatus;

  /** 位置情報（ファイル、行番号など） */
  location?: IssueLocation;

  /** 証拠となるテキスト */
  evidence?: string[];

  /** タグ */
  tags?: string[];

  /** 担当者 */
  assignee?: string;

  /** 期限日時 */
  dueDate?: Date;

  /** 作成日時 */
  createdAt: Date;

  /** 更新日時 */
  updatedAt: Date;

  /** 作成者 */
  createdBy?: string;

  /** 関連Issue ID */
  relatedIssues?: string[];

  /** メタデータ */
  metadata?: Record<string, unknown>;
}
```

### `IssueLocation`

Issueの位置情報。

```typescript
interface IssueLocation {
  /** ファイルパス */
  file: string;

  /** 行番号 */
  line?: number;

  /** 列番号 */
  column?: number;

  /** 終了行番号 */
  endLine?: number;

  /** 終了列番号 */
  endColumn?: number;

  /** 関数名 */
  function?: string;

  /** クラス名 */
  class?: string;
}
```

### `IssueComment`

Issue内のコメント。

```typescript
interface IssueComment {
  /** コメントID */
  id: string;

  /** Issue ID */
  issueId: string;

  /** 作成者 */
  author: string;

  /** コメント内容 */
  content: string;

  /** 作成日時 */
  createdAt: Date;

  /** 添付ファイル */
  attachments?: string[];
}
```

### `IssueQuery`

Issue検索条件。

```typescript
interface IssueQuery {
  /** プロジェクトID */
  projectId?: string;

  /** カテゴリフィルター */
  category?: IssueCategory;

  /** 重要度（単一または配列） */
  severity?: IssueSeverity | IssueSeverity[];

  /** ステータス（単一または配列） */
  status?: IssueStatus | IssueStatus[];

  /** タグフィルター */
  tags?: string[];

  /** 担当者フィルター */
  assignee?: string;

  /** キーワード検索 */
  keyword?: string;

  /** 作成日時の下限 */
  createdAfter?: Date;

  /** 作成日時の上限 */
  createdBefore?: Date;

  /** ソート順 */
  orderBy?: 'severity' | 'createdAt' | 'updatedAt';

  /** 昇順/降順 */
  order?: 'asc' | 'desc';

  /** 取得件数上限 */
  limit?: number;

  /** オフセット */
  offset?: number;
}
```

### `IssueStatistics`

Issue統計情報。

```typescript
interface IssueStatistics {
  /** 総Issue数 */
  total: number;

  /** 重要度別の集計 */
  bySeverity: Record<IssueSeverity, number>;

  /** ステータス別の集計 */
  byStatus: Record<IssueStatus, number>;

  /** カテゴリ別の集計 */
  byCategory: Record<IssueCategory, number>;

  /** 平均解決時間（ミリ秒） */
  avgResolutionTime?: number;
}
```

---

## Enum

### `IssueSeverity`

Issueの重要度。

```typescript
enum IssueSeverity {
  Critical = 'critical',  // 即座の対応が必要
  High = 'high',          // 高優先度
  Medium = 'medium',      // 中程度
  Low = 'low'             // 低優先度
}
```

### `IssueStatus`

Issueのステータス。

```typescript
enum IssueStatus {
  Identified = 'identified',      // 検出済み
  Diagnosed = 'diagnosed',        // 診断完了
  Approved = 'approved',          // 承認済み
  InProgress = 'in_progress',     // 対応中
  Resolved = 'resolved',          // 解決済み
  Closed = 'closed'               // クローズ済み
}
```

### `IssueCategory`

Issueのカテゴリ。

```typescript
enum IssueCategory {
  Security = 'security',          // セキュリティ脆弱性
  Performance = 'performance',    // パフォーマンス問題
  CodeQuality = 'code_quality',   // コード品質
  TechnicalDebt = 'technical_debt', // 技術的負債
  Bug = 'bug',                    // バグ
  Enhancement = 'enhancement'     // 機能拡張
}
```

---

## 使用例

### 基本的な使用法

```typescript
import { IssueManager, IssueSeverity, IssueStatus, IssueCategory } from '@it-supervisor/issue-manager';

const manager = new IssueManager('./project-issues.db');

// Issue作成
const issue = manager.createIssue({
  projectId: 'web-app-2024',
  title: 'Memory leak in data processing module',
  description: 'The data processing service consumes increasing memory over time...',
  category: IssueCategory.Performance,
  severity: IssueSeverity.High,
  location: {
    file: 'src/services/dataProcessor.ts',
    line: 125
  }
});

console.log(`Created issue: ${issue.id}`);

// Issue検索
const highPriorityIssues = manager.searchIssues({
  projectId: 'web-app-2024',
  severity: [IssueSeverity.Critical, IssueSeverity.High],
  status: [IssueStatus.Identified, IssueStatus.Diagnosed]
});

// Issue更新
manager.updateIssueStatus(issue.id, IssueStatus.InProgress);
manager.updateIssue(issue.id, { assignee: 'alice@company.com' });

manager.close();
```

### 優先度に基づくタスク管理

```typescript
// 優先度スコア付きで取得
const priorityIssues = manager.getIssuesWithPriority('web-app-2024', 20);

console.log('Top Priority Tasks:');
priorityIssues.forEach((issue, index) => {
  const urgencyLevel = issue.priority > 200 ? 'URGENT' : issue.priority > 100 ? 'HIGH' : 'MEDIUM';
  console.log(`${index + 1}. [${urgencyLevel}] ${issue.title} (Score: ${issue.priority})`);
  console.log(`   Assigned to: ${issue.assignee || 'Unassigned'}`);
  console.log(`   Due: ${issue.dueDate?.toLocaleDateString() || 'No deadline'}`);
});
```

### コメントとディスカッション

```typescript
const issueId = 'issue-123';

// コメント追加
manager.addComment(issueId, {
  author: 'bob@company.com',
  content: 'This is a critical bug affecting production users. Needs immediate attention.'
});

manager.addComment(issueId, {
  author: 'alice@company.com',
  content: 'Working on the fix. Should have a PR ready by tomorrow.'
});

// コメント取得
const comments = manager.getComments(issueId);
comments.forEach(comment => {
  console.log(`${comment.author}: ${comment.content}`);
});
```

### 関連Issue検出と分析

```typescript
const issueId = 'security-issue-456';

// 関連Issueを検出
const relatedIssues = manager.findRelatedIssues(issueId, 0.6);

if (relatedIssues.length > 0) {
  console.log(`Found ${relatedIssues.length} related issues:`);
  relatedIssues.forEach(related => {
    console.log(`- [${related.severity}] ${related.title}`);
    console.log(`  Category: ${related.category}`);
    console.log(`  Status: ${related.status}`);
  });

  // 関連Issueをリンク
  const mainIssue = manager.getIssue(issueId);
  if (mainIssue) {
    manager.updateIssue(issueId, {
      relatedIssues: relatedIssues.map(i => i.id)
    });
  }
}
```

### ラベルの活用

```typescript
// ラベル追加
manager.addLabel('issue-789', 'database');
manager.addLabel('issue-789', 'urgent');
manager.addLabel('issue-789', 'backend');

// すべてのラベル取得
const labels = manager.getAllLabels('project-id');
console.log('Project Labels:');
labels.forEach(({ label, count }) => {
  console.log(`  ${label}: ${count} issues`);
});

// ラベルで検索
const databaseIssues = manager.searchIssues({
  projectId: 'project-id',
  tags: ['database']
});
console.log(`Found ${databaseIssues.length} database-related issues`);
```

### 統計とレポート生成

```typescript
const stats = manager.getStatistics('project-id');

console.log('=== Issue Statistics ===');
console.log(`Total: ${stats.total}`);
console.log(`\nBy Severity:`);
Object.entries(stats.bySeverity).forEach(([severity, count]) => {
  const percentage = ((count / stats.total) * 100).toFixed(1);
  console.log(`  ${severity}: ${count} (${percentage}%)`);
});

console.log(`\nBy Status:`);
Object.entries(stats.byStatus).forEach(([status, count]) => {
  console.log(`  ${status}: ${count}`);
});

console.log(`\nBy Category:`);
Object.entries(stats.byCategory).forEach(([category, count]) => {
  console.log(`  ${category}: ${count}`);
});
```

### CSVエクスポート

```typescript
// プロジェクトのすべてのIssueをCSVでエクスポート
const csv = manager.exportToCSV('project-id');
fs.writeFileSync('./issues-export.csv', csv, 'utf-8');

console.log('Issues exported to CSV');

// 例:
// ID,Project ID,Title,Category,Severity,Status,Assignee,Created At,Updated At
// 550e8400-e29b-41d4-a716-446655440000,project-id,"SQL Injection vulnerability",security,critical,identified,alice@company.com,2024-02-01T10:00:00Z,2024-02-05T15:30:00Z
```

### 一括更新

```typescript
// 特定の条件のIssueを検索
const resolvedIssues = manager.searchIssues({
  projectId: 'project-id',
  status: IssueStatus.InProgress,
  createdBefore: new Date('2024-01-01')
});

// 一括でクローズ
if (resolvedIssues.length > 0) {
  const issueIds = resolvedIssues.map(i => i.id);
  const updated = manager.bulkUpdateStatus(issueIds, IssueStatus.Closed);
  console.log(`${updated} old in-progress issues closed`);
}
```

---

## エラーハンドリング

```typescript
try {
  const issue = manager.createIssue({
    projectId: 'project-123',
    title: 'Bug Report',
    description: 'Something is broken',
    category: IssueCategory.Bug,
    severity: IssueSeverity.Medium
  });
} catch (error) {
  console.error('Failed to create issue:', error.message);
}

const issue = manager.getIssue('nonexistent-id');
if (!issue) {
  console.error('Issue not found');
}

try {
  manager.updateIssue('issue-id', { severity: 'invalid' as any });
} catch (error) {
  console.error('Invalid severity value');
}
```

---

## ベストプラクティス

### トランザクション的な操作

```typescript
// 複数のIssueを連続作成
const issues = [];
try {
  for (let i = 0; i < 10; i++) {
    const issue = manager.createIssue({
      projectId: 'batch-project',
      title: `Issue ${i + 1}`,
      description: 'Batch created issue',
      category: IssueCategory.Bug,
      severity: IssueSeverity.Medium
    });
    issues.push(issue);
  }
  console.log(`Created ${issues.length} issues`);
} catch (error) {
  console.error('Batch creation failed:', error);
}
```

### リソース管理

```typescript
const manager = new IssueManager('./issues.db');

try {
  // Issue操作
  const issues = manager.searchIssues({ projectId: 'project-id' });
  // 処理...
} finally {
  manager.close(); // 常にクローズ
}
```

### 効率的な検索

```typescript
// ページネーション付き検索
const pageSize = 20;
let offset = 0;
let hasMore = true;

while (hasMore) {
  const issues = manager.searchIssues({
    projectId: 'project-id',
    limit: pageSize,
    offset: offset,
    orderBy: 'createdAt',
    order: 'desc'
  });

  if (issues.length < pageSize) {
    hasMore = false;
  }

  // 各ページを処理
  console.log(`Processing ${issues.length} issues...`);

  offset += pageSize;
}
```

---

## 関連リンク

- [パッケージREADME](../README.md)
- [使用例](../../../docs/USAGE_EXAMPLES.md)
