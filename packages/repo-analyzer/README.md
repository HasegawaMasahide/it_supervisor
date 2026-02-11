# @it-supervisor/repo-analyzer

Gitリポジトリを解析し、技術スタック・ファイル構成・コミット履歴などを収集します。

## 機能

- ディレクトリ構造の解析
- 使用言語・フレームワークの自動判定
- 依存ライブラリのリストアップ
- コミット履歴の分析
- コード統計情報の収集

## インストール

```bash
npm install @it-supervisor/repo-analyzer
```

## 使用例

```typescript
import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';

const analyzer = new RepositoryAnalyzer();

// ローカルリポジトリを解析
const result = await analyzer.analyzeLocal('./target-repo');

console.log('技術スタック:', result.techStack);
console.log('ファイル数:', result.fileStats.totalFiles);
console.log('総行数:', result.fileStats.totalLines);
console.log('コミット数:', result.gitHistory.totalCommits);
```

## 出力データ

### RepositoryAnalysisResult

```typescript
{
  path: string;
  techStack: {
    languages: Language[];
    frameworks: Framework[];
    dependencies: Dependency[];
  };
  fileStats: {
    totalFiles: number;
    totalLines: number;
    byLanguage: Record<string, LanguageStats>;
  };
  structure: DirectoryNode;
  gitHistory: {
    totalCommits: number;
    firstCommit: Date;
    lastCommit: Date;
    contributors: Contributor[];
    commitFrequency: CommitFrequency;
  };
}
```

## API リファレンス

詳細は[API Documentation](./docs/api.md)を参照してください。
