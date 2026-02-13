# @it-supervisor/issue-manager

発見された問題を管理し、優先順位付け・ステータス管理を行います。

## 機能

- Issue作成・更新・削除
- ステータス管理（Identified → Diagnosed → Approved → InProgress → Resolved）
- 優先順位付け
- タグ・カテゴリ分類
- コメント・添付ファイル
- 検索・フィルタリング
- レポート出力

## インストール

```bash
npm install @it-supervisor/issue-manager
```

## 使用例

```typescript
import { IssueManager } from '@it-supervisor/issue-manager';

const manager = new IssueManager('./issues.db');

// Issue作成
const issue = await manager.createIssue({
  projectId: 'proj-001',
  title: 'SQL Injection vulnerability in login form',
  description: 'User input is not properly sanitized',
  category: IssueCategory.Security,
  severity: IssueSeverity.Critical,
  location: {
    file: 'src/auth/login.php',
    line: 42
  }
});

// ステータス更新
await manager.updateIssueStatus(issue.id, IssueStatus.InProgress);

// コメント追加
await manager.addComment(issue.id, {
  author: 'engineer@example.com',
  content: 'Working on the fix using prepared statements'
});

// 検索
const criticalIssues = await manager.searchIssues({
  projectId: 'proj-001',
  severity: IssueSeverity.Critical,
  status: [IssueStatus.Identified, IssueStatus.Diagnosed]
});
```

## API リファレンス

詳細は[API Documentation](./docs/api.md)を参照してください。
