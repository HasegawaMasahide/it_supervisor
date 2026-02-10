# @it-supervisor/static-analyzer

複数の静的解析ツールを統合的に実行し、結果を統一フォーマットで出力します。

## 機能

- 言語ごとの静的解析ツールの自動選択
- 複数ツールの並列実行
- 結果の統一フォーマット化
- セキュリティ・コード品質・複雑度の評価
- Docker上での安全な実行

## サポートツール

### JavaScript/TypeScript
- ESLint
- TypeScript Compiler

### PHP
- PHP_CodeSniffer
- PHPStan/Psalm

### C#
- Roslyn Analyzers

### 共通
- SonarQube
- Snyk (セキュリティ・依存関係)
- Gitleaks (シークレット検出)
- OWASP Dependency-Check (脆弱性)

## インストール

```bash
npm install @it-supervisor/static-analyzer
```

## 使用例

```typescript
import { StaticAnalyzer } from '@it-supervisor/static-analyzer';

const analyzer = new StaticAnalyzer();

// 解析実行
const results = await analyzer.analyze('./target-repo', {
  tools: ['eslint', 'snyk', 'gitleaks'],
  parallel: true,
  timeout: 300000 // 5分
});

// 結果確認
console.log(`Total issues: ${results.summary.totalIssues}`);
console.log(`Critical: ${results.summary.bySeverity.critical}`);
```

## API リファレンス

詳細は[API Documentation](./docs/api.md)を参照してください。
