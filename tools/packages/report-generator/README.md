# @it-supervisor/report-generator

各フェーズの成果物レポートを自動生成します（PDF/HTML対応）。

## 機能

- Markdownテンプレートベースのレポート生成
- PDF/HTML出力
- グラフ・チャートの自動挿入
- 目次の自動生成
- テンプレートのカスタマイズ
- 変数埋め込み

## サポートするレポート種別

- システム概要書（調査フェーズ）
- 分析レポート（分析フェーズ）
- 診断レポート（診断フェーズ）
- 改善提案書（提案フェーズ）
- 実装報告書（実装フェーズ）
- 効果測定レポート（測定フェーズ）
- 最終報告書（報告フェーズ）

## インストール

```bash
npm install @it-supervisor/report-generator
```

## 使用例

```typescript
import { ReportGenerator, ReportType } from '@it-supervisor/report-generator';

const generator = new ReportGenerator();

// レポート生成
const report = await generator.generate(ReportType.Analysis, {
  projectName: 'Sample Project',
  customerName: 'ACME Corporation',
  date: new Date(),
  data: {
    repoAnalysis: repoResult,
    staticAnalysis: staticResult,
    issues: issues
  }
});

// PDF出力
await generator.exportToPDF(report, './analysis-report.pdf');

// HTML出力
await generator.exportToHTML(report, './analysis-report.html');
```

## テンプレート

テンプレートは `templates/` ディレクトリに配置されます:

```
templates/
├── system-overview.md
├── analysis.md
├── diagnosis.md
├── proposal.md
├── implementation.md
├── measurement.md
└── final-report.md
```

## API リファレンス

詳細は[API Documentation](./docs/api.md)を参照してください。
