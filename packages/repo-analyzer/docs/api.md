# API Documentation - @it-supervisor/repo-analyzer

Gitリポジトリを解析し、技術スタック・ファイル構成・コミット履歴などを収集するパッケージです。

## クラス

### `RepositoryAnalyzer`

リポジトリの包括的な解析を行うメインクラス。

#### コンストラクタ

```typescript
new RepositoryAnalyzer()
```

パラメータなしでインスタンスを生成します。

**例:**
```typescript
import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';

const analyzer = new RepositoryAnalyzer();
```

---

### メソッド

#### `analyzeLocal(repoPath: string): Promise<RepositoryAnalysisResult>`

ローカルのGitリポジトリを解析します。

**パラメータ:**
- `repoPath` (string): 解析対象のリポジトリパス

**戻り値:**
- `Promise<RepositoryAnalysisResult>`: 解析結果

**throws:**
- パスが存在しない場合にエラー
- Git リポジトリでない場合にエラー

**例:**
```typescript
const result = await analyzer.analyzeLocal('/path/to/repo');

console.log('技術スタック:', result.techStack);
console.log('ファイル数:', result.fileStats.totalFiles);
console.log('総行数:', result.fileStats.totalLines);
console.log('コミット数:', result.gitHistory.totalCommits);
```

---

#### `calculateComplexity(code: string, language: string): number`

ソースコードの循環的複雑度を計算します。

**パラメータ:**
- `code` (string): ソースコード
- `language` (string): プログラミング言語 ('javascript', 'typescript', 'php', 'python', 'csharp', 'java')

**戻り値:**
- `number`: 循環的複雑度 (McCabe Complexity)

**例:**
```typescript
const code = `
function example(x) {
  if (x > 0) {
    return x * 2;
  } else {
    return x * 3;
  }
}
`;

const complexity = analyzer.calculateComplexity(code, 'javascript');
console.log('Complexity:', complexity); // 2
```

---

#### `detectEntryPoints(repoPath: string): Promise<string[]>`

アプリケーションのエントリーポイント(メインファイル)を検出します。

**パラメータ:**
- `repoPath` (string): リポジトリパス

**戻り値:**
- `Promise<string[]>`: エントリーポイントファイルのパス一覧

**throws:**
- パスが存在しない場合にエラー

**例:**
```typescript
const entryPoints = await analyzer.detectEntryPoints('/path/to/repo');
console.log('Entry points:', entryPoints);
// ['index.js', 'src/main.ts', 'public/index.php']
```

---

#### `analyzeDependencyGraph(repoPath: string): Promise<DependencyGraph>`

依存関係グラフを解析します。

**パラメータ:**
- `repoPath` (string): リポジトリパス

**戻り値:**
- `Promise<DependencyGraph>`: 依存関係グラフ

**throws:**
- パスが存在しない場合にエラー
- package.json等の依存関係ファイルが存在しない場合にエラー

**例:**
```typescript
const graph = await analyzer.analyzeDependencyGraph('/path/to/repo');

console.log('Total dependencies:', graph.nodes.length);
console.log('Cyclic dependencies:', graph.cycles.length);

if (graph.cycles.length > 0) {
  console.log('Cyclic dependency detected:', graph.cycles[0]);
}
```

---

## インターフェース

### `RepositoryAnalysisResult`

リポジトリ解析の結果。

```typescript
interface RepositoryAnalysisResult {
  /** リポジトリパス */
  path: string;

  /** 技術スタック情報 */
  techStack: {
    languages: Language[];
    frameworks: Framework[];
    dependencies: Dependency[];
  };

  /** ファイル統計情報 */
  fileStats: {
    totalFiles: number;
    totalLines: number;
    byLanguage: Record<string, LanguageStats>;
  };

  /** ディレクトリ構造 */
  structure: DirectoryNode;

  /** Git履歴情報 */
  gitHistory: GitHistory;

  /** エントリーポイント */
  entryPoints?: string[];

  /** 依存関係グラフ */
  dependencyGraph?: DependencyGraph;

  /** コード品質メトリクス */
  metrics?: {
    averageComplexity: number;
    maxComplexity: number;
    filesOverThreshold: number;
  };
}
```

### `Language`

プログラミング言語情報。

```typescript
interface Language {
  /** 言語名 */
  name: string;

  /** ファイル拡張子一覧 */
  extensions: string[];

  /** ファイル数 */
  files: number;

  /** 総行数 */
  lines: number;

  /** 全体に占める割合(0-100) */
  percentage: number;
}
```

### `Framework`

フレームワーク情報。

```typescript
interface Framework {
  /** フレームワーク名 */
  name: string;

  /** バージョン */
  version?: string;

  /** 検出方法 */
  detectionMethod: string; // 'package.json', 'composer.json', 'file-pattern' など

  /** 検出の信頼度 */
  confidence: 'high' | 'medium' | 'low';
}
```

### `Dependency`

依存ライブラリ情報。

```typescript
interface Dependency {
  /** ライブラリ名 */
  name: string;

  /** バージョン */
  version: string;

  /** 依存タイプ */
  type: 'direct' | 'dev' | 'peer';

  /** エコシステム */
  ecosystem: 'npm' | 'composer' | 'maven' | 'nuget' | 'pip' | 'rubygems' | 'unknown';
}
```

### `LanguageStats`

言語別の統計情報。

```typescript
interface LanguageStats {
  /** ファイル数 */
  files: number;

  /** 総行数 */
  lines: number;

  /** 空行数 */
  blankLines: number;

  /** コメント行数 */
  commentLines: number;

  /** コード行数 */
  codeLines: number;
}
```

### `DirectoryNode`

ディレクトリツリーのノード。

```typescript
interface DirectoryNode {
  /** ノード名 */
  name: string;

  /** フルパス */
  path: string;

  /** タイプ */
  type: 'file' | 'directory';

  /** ファイルサイズ(バイト) */
  size?: number;

  /** 子ノード */
  children?: DirectoryNode[];
}
```

### `GitHistory`

Git履歴情報。

```typescript
interface GitHistory {
  /** 総コミット数 */
  totalCommits: number;

  /** 最初のコミット日時 */
  firstCommit?: Date;

  /** 最後のコミット日時 */
  lastCommit?: Date;

  /** コントリビューター一覧 */
  contributors: Contributor[];

  /** コミット頻度 */
  commitFrequency: CommitFrequency;

  /** ブランチ一覧 */
  branches?: string[];

  /** タグ一覧 */
  tags?: string[];
}
```

### `Contributor`

コントリビューター情報。

```typescript
interface Contributor {
  /** 名前 */
  name: string;

  /** メールアドレス */
  email: string;

  /** コミット数 */
  commits: number;

  /** 最初のコミット日時 */
  firstCommit: Date;

  /** 最後のコミット日時 */
  lastCommit: Date;
}
```

### `CommitFrequency`

コミット頻度統計。

```typescript
interface CommitFrequency {
  /** 1日あたりの平均コミット数 */
  daily: number;

  /** 1週間あたりの平均コミット数 */
  weekly: number;

  /** 1ヶ月あたりの平均コミット数 */
  monthly: number;

  /** 1年あたりの平均コミット数 */
  yearly: number;
}
```

### `DependencyGraph`

依存関係グラフ。

```typescript
interface DependencyGraph {
  /** ノード一覧(パッケージ/モジュール) */
  nodes: DependencyNode[];

  /** エッジ一覧(依存関係) */
  edges: DependencyEdge[];

  /** 循環依存のパス */
  cycles: string[][];
}
```

### `DependencyNode`

依存関係グラフのノード。

```typescript
interface DependencyNode {
  /** ノードID */
  id: string;

  /** パッケージ/モジュール名 */
  name: string;

  /** バージョン */
  version?: string;

  /** タイプ */
  type: 'package' | 'module' | 'file';
}
```

### `DependencyEdge`

依存関係グラフのエッジ。

```typescript
interface DependencyEdge {
  /** 依存元ノードID */
  from: string;

  /** 依存先ノードID */
  to: string;

  /** 依存タイプ */
  type: 'direct' | 'dev' | 'peer';
}
```

---

## 使用例

### 基本的な使用法

```typescript
import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';

const analyzer = new RepositoryAnalyzer();

// リポジトリを解析
const result = await analyzer.analyzeLocal('./my-project');

console.log('=== 技術スタック ===');
result.techStack.languages.forEach(lang => {
  console.log(`${lang.name}: ${lang.percentage}% (${lang.files} files, ${lang.lines} lines)`);
});

console.log('\n=== フレームワーク ===');
result.techStack.frameworks.forEach(fw => {
  console.log(`${fw.name} ${fw.version || ''} (confidence: ${fw.confidence})`);
});

console.log('\n=== Git統計 ===');
console.log(`Total commits: ${result.gitHistory.totalCommits}`);
console.log(`Contributors: ${result.gitHistory.contributors.length}`);
console.log(`Commits per month: ${result.gitHistory.commitFrequency.monthly.toFixed(2)}`);
```

### 複雑度分析

```typescript
const result = await analyzer.analyzeLocal('./my-project');

if (result.metrics) {
  console.log('=== コード品質メトリクス ===');
  console.log(`Average complexity: ${result.metrics.averageComplexity.toFixed(2)}`);
  console.log(`Max complexity: ${result.metrics.maxComplexity}`);
  console.log(`Files over threshold: ${result.metrics.filesOverThreshold}`);
}

// 個別ファイルの複雑度をチェック
const fs = require('fs').promises;
const code = await fs.readFile('./src/complex-file.js', 'utf-8');
const complexity = analyzer.calculateComplexity(code, 'javascript');

if (complexity > 10) {
  console.warn(`Warning: Complexity ${complexity} exceeds threshold (10)`);
}
```

### 依存関係分析

```typescript
const graph = await analyzer.analyzeDependencyGraph('./my-project');

console.log('=== 依存関係分析 ===');
console.log(`Total packages: ${graph.nodes.length}`);
console.log(`Total dependencies: ${graph.edges.length}`);

if (graph.cycles.length > 0) {
  console.warn('⚠️  循環依存が検出されました:');
  graph.cycles.forEach((cycle, i) => {
    console.log(`  Cycle ${i + 1}: ${cycle.join(' -> ')}`);
  });
}

// 依存数が多いパッケージを特定
const dependencyCounts = graph.edges.reduce((acc, edge) => {
  acc[edge.from] = (acc[edge.from] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

const topDependencies = Object.entries(dependencyCounts)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5);

console.log('\n=== 依存数トップ5 ===');
topDependencies.forEach(([nodeId, count]) => {
  const node = graph.nodes.find(n => n.id === nodeId);
  console.log(`${node?.name}: ${count} dependencies`);
});
```

### エントリーポイント検出

```typescript
const entryPoints = await analyzer.detectEntryPoints('./my-project');

console.log('=== エントリーポイント ===');
entryPoints.forEach(entry => {
  console.log(`- ${entry}`);
});
```

### ディレクトリ構造のトラバース

```typescript
const result = await analyzer.analyzeLocal('./my-project');

function printTree(node: DirectoryNode, indent: string = '') {
  console.log(`${indent}${node.name}${node.type === 'directory' ? '/' : ''}`);
  if (node.children) {
    node.children.forEach(child => {
      printTree(child, indent + '  ');
    });
  }
}

console.log('=== ディレクトリ構造 ===');
printTree(result.structure);
```

### コントリビューター分析

```typescript
const result = await analyzer.analyzeLocal('./my-project');

console.log('=== コントリビューター分析 ===');
const sortedContributors = result.gitHistory.contributors
  .sort((a, b) => b.commits - a.commits);

sortedContributors.forEach((contributor, i) => {
  console.log(`${i + 1}. ${contributor.name} <${contributor.email}>`);
  console.log(`   Commits: ${contributor.commits}`);
  console.log(`   First: ${contributor.firstCommit.toLocaleDateString()}`);
  console.log(`   Last: ${contributor.lastCommit.toLocaleDateString()}`);
});
```

---

## エラーハンドリング

```typescript
try {
  const result = await analyzer.analyzeLocal('./my-project');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Repository path does not exist');
  } else if (error.message.includes('not a git repository')) {
    console.error('Path is not a Git repository');
  } else {
    console.error('Analysis failed:', error.message);
  }
}
```

---

## パフォーマンス考慮事項

### 大規模リポジトリ

大規模なリポジトリ(10,000ファイル以上)では、解析に時間がかかる場合があります:

```typescript
// タイムアウトを設定
const timeout = setTimeout(() => {
  console.warn('Analysis is taking longer than expected...');
}, 30000);

const result = await analyzer.analyzeLocal('./large-project');
clearTimeout(timeout);
```

### メモリ使用量

ファイルキャッシュは自動的にクリアされますが、手動でガベージコレクションを促すこともできます:

```typescript
const result = await analyzer.analyzeLocal('./my-project');

// 解析後、不要なデータを破棄
if (global.gc) {
  global.gc();
}
```

---

## 関連リンク

- [パッケージREADME](../README.md)
- [使用例](../../../docs/USAGE_EXAMPLES.md)
