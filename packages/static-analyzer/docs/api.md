# API Documentation - @it-supervisor/static-analyzer

複数の静的解析ツールを統合的に実行し、結果を統一フォーマットで出力するパッケージです。

## クラス

### `StaticAnalyzer`

静的解析ツールのオーケストレーター。複数のツールを自動選択・実行し、結果を統合します。

#### コンストラクタ

```typescript
new StaticAnalyzer()
```

パラメータなしでインスタンスを生成します。

**例:**
```typescript
import { StaticAnalyzer } from '@it-supervisor/static-analyzer';

const analyzer = new StaticAnalyzer();
```

---

### メソッド

#### `analyze(repoPath: string, options?: AnalysisOptions): Promise<AnalysisResult>`

指定されたリポジトリに対して静的解析を実行します。

**パラメータ:**
- `repoPath` (string): 解析対象のリポジトリパス
- `options` (AnalysisOptions, optional): 解析オプション

**戻り値:**
- `Promise<AnalysisResult>`: 解析結果

**throws:**
- リポジトリパスが存在しない場合にエラー
- ツール実行に失敗した場合にエラー

**例:**
```typescript
const result = await analyzer.analyze('/path/to/repo', {
  tools: ['eslint', 'snyk'],
  parallel: true,
  timeout: 300000
});

console.log(`Total issues: ${result.summary.totalIssues}`);
console.log(`Critical: ${result.summary.bySeverity.critical}`);
```

---

#### `analyzeWithProgress(repoPath: string, options: AnalysisOptions, onProgress: (progress: ProgressEvent) => void): Promise<AnalysisResult>`

進捗状況を通知しながら静的解析を実行します。

**パラメータ:**
- `repoPath` (string): 解析対象のリポジトリパス
- `options` (AnalysisOptions): 解析オプション
- `onProgress` (callback): 進捗通知コールバック関数

**戻り値:**
- `Promise<AnalysisResult>`: 解析結果

**throws:**
- リポジトリパスが存在しない場合にエラー
- ツール実行に失敗した場合にエラー

**例:**
```typescript
const result = await analyzer.analyzeWithProgress(
  '/path/to/repo',
  { tools: ['eslint', 'snyk'], parallel: false },
  (progress) => {
    console.log(`Progress: ${progress.currentTool} - ${progress.message}`);
  }
);
```

---

## インターフェース

### `AnalysisOptions`

静的解析の実行オプション。

```typescript
interface AnalysisOptions {
  /** 使用するツールのリスト (未指定時は自動選択) */
  tools?: AnalyzerTool[];

  /** ツールを並列実行するか (デフォルト: false) */
  parallel?: boolean;

  /** タイムアウト時間(ミリ秒, デフォルト: 300000 = 5分) */
  timeout?: number;

  /** Dockerコンテナ内で実行するか (デフォルト: false) */
  useDocker?: boolean;

  /** 重複した問題を除外するか (デフォルト: true) */
  removeDuplicates?: boolean;

  /** 出力フォーマット (デフォルト: 'json') */
  outputFormat?: 'json' | 'sarif';

  /** 追加のツール設定 */
  toolConfigs?: Map<AnalyzerTool, ToolConfig>;
}
```

### `AnalysisResult`

静的解析の実行結果。

```typescript
interface AnalysisResult {
  /** 実行したツールの結果一覧 */
  results: ToolResult[];

  /** 検出された問題の一覧 */
  issues: AnalysisIssue[];

  /** 統計情報サマリー */
  summary: AnalysisSummary;

  /** 総実行時間(ミリ秒) */
  totalExecutionTime: number;

  /** 解析対象のリポジトリパス */
  repoPath: string;

  /** 解析実行日時 */
  timestamp: Date;
}
```

### `AnalysisIssue`

検出された問題の詳細情報。

```typescript
interface AnalysisIssue {
  /** 問題の一意ID */
  id: string;

  /** 検出ツール名 */
  tool: AnalyzerTool;

  /** 重要度 */
  severity: Severity;

  /** カテゴリ */
  category: IssueCategory;

  /** ルール名 */
  rule: string;

  /** 問題の説明 */
  message: string;

  /** ファイルパス */
  file: string;

  /** 行番号 (オプション) */
  line?: number;

  /** 列番号 (オプション) */
  column?: number;

  /** 終了行番号 (オプション) */
  endLine?: number;

  /** 終了列番号 (オプション) */
  endColumn?: number;

  /** コードスニペット (オプション) */
  snippet?: string;

  /** 自動修正情報 (オプション) */
  fix?: {
    available: boolean;
    description?: string;
    code?: string;
  };

  /** 参考リンク (オプション) */
  references?: string[];

  /** CWE ID (オプション) */
  cwe?: string[];

  /** CVE ID (オプション) */
  cve?: string[];
}
```

### `AnalysisSummary`

統計情報のサマリー。

```typescript
interface AnalysisSummary {
  /** 問題の総数 */
  totalIssues: number;

  /** 重要度別の問題数 */
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };

  /** カテゴリ別の問題数 */
  byCategory: {
    security: number;
    performance: number;
    code_quality: number;
    best_practice: number;
    maintainability: number;
    complexity: number;
    documentation: number;
  };

  /** ツール別の問題数 */
  byTool: Record<string, number>;

  /** 自動修正可能な問題数 */
  fixableIssues: number;
}
```

---

## Enum

### `AnalyzerTool`

サポートされている静的解析ツール。

```typescript
enum AnalyzerTool {
  ESLint = 'eslint',
  TypeScriptCompiler = 'typescript',
  PHPCodeSniffer = 'phpcs',
  PHPStan = 'phpstan',
  Psalm = 'psalm',
  PHPMessDetector = 'phpmd',
  RoslynAnalyzer = 'roslyn',
  StyleCop = 'stylecop',
  SonarQube = 'sonarqube',
  Snyk = 'snyk',
  Gitleaks = 'gitleaks',
  DependencyCheck = 'owasp-dependency-check'
}
```

### `Severity`

問題の重要度。

```typescript
enum Severity {
  Critical = 'critical',  // 即座の対応が必要
  High = 'high',          // 高優先度で対応すべき
  Medium = 'medium',      // 中程度の優先度
  Low = 'low',            // 低優先度
  Info = 'info'           // 情報提供のみ
}
```

### `IssueCategory`

問題のカテゴリ。

```typescript
enum IssueCategory {
  Security = 'security',              // セキュリティ脆弱性
  Performance = 'performance',        // パフォーマンス問題
  CodeQuality = 'code_quality',       // コード品質
  BestPractice = 'best_practice',     // ベストプラクティス違反
  Maintainability = 'maintainability', // 保守性
  Complexity = 'complexity',          // 複雑度
  Documentation = 'documentation'     // ドキュメント
}
```

---

## 使用例

### 基本的な使用法

```typescript
import { StaticAnalyzer } from '@it-supervisor/static-analyzer';

const analyzer = new StaticAnalyzer();

// 自動ツール選択で解析
const result = await analyzer.analyze('./my-project');

console.log(`Total issues: ${result.summary.totalIssues}`);
console.log(`Critical: ${result.summary.bySeverity.critical}`);
```

### ツールを指定して解析

```typescript
const result = await analyzer.analyze('./my-project', {
  tools: ['eslint', 'snyk', 'gitleaks'],
  parallel: true,
  timeout: 600000 // 10分
});
```

### 進捗状況を表示しながら解析

```typescript
const result = await analyzer.analyzeWithProgress(
  './my-project',
  { tools: ['eslint', 'snyk'], parallel: false },
  (progress) => {
    console.log(`[${progress.currentTool}] ${progress.message}`);
  }
);
```

### セキュリティ問題のみフィルタリング

```typescript
const result = await analyzer.analyze('./my-project');

const securityIssues = result.issues.filter(
  issue => issue.category === IssueCategory.Security
);

console.log(`Security issues: ${securityIssues.length}`);
```

### 重要度が高い問題をファイル別に集計

```typescript
const result = await analyzer.analyze('./my-project');

const criticalByFile = result.issues
  .filter(issue => issue.severity === Severity.Critical || issue.severity === Severity.High)
  .reduce((acc, issue) => {
    acc[issue.file] = (acc[issue.file] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

console.log('Critical issues by file:', criticalByFile);
```

---

## エラーハンドリング

```typescript
try {
  const result = await analyzer.analyze('./my-project');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Repository path does not exist');
  } else if (error.message.includes('timeout')) {
    console.error('Analysis timed out');
  } else {
    console.error('Analysis failed:', error.message);
  }
}
```

---

## パフォーマンス最適化

### 並列実行

複数のツールを並列実行することで、全体の実行時間を短縮できます。

```typescript
const result = await analyzer.analyze('./my-project', {
  parallel: true  // ツールを並列実行
});
```

### タイムアウト設定

大規模なリポジトリでは、タイムアウトを調整してください。

```typescript
const result = await analyzer.analyze('./my-project', {
  timeout: 900000  // 15分
});
```

### ツールの選択的実行

必要なツールのみを指定することで、実行時間を短縮できます。

```typescript
const result = await analyzer.analyze('./my-project', {
  tools: ['eslint', 'snyk']  // 必要なツールのみ
});
```

---

## 関連リンク

- [サポートツール一覧](../README.md#サポートツール)
- [使用例](../../../docs/USAGE_EXAMPLES.md)
