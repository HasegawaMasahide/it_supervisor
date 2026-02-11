# API Documentation - @it-supervisor/report-generator

複数の解析結果データを統合し、プロフェッショナルなレポート（PDF、HTML、Markdown）を自動生成するパッケージです。

## クラス

### `ReportGenerator`

レポート生成のメインクラス。テンプレートベースのレポート作成、複数フォーマットへの出力、チャート機能を提供します。

#### コンストラクタ

```typescript
new ReportGenerator(templatesDir?: string)
```

**パラメータ:**
- `templatesDir` (string, optional): カスタムテンプレートの格納ディレクトリ

**例:**
```typescript
import { ReportGenerator } from '@it-supervisor/report-generator';

// デフォルトテンプレートディレクトリを使用
const generator = new ReportGenerator();

// カスタムテンプレートディレクトリを指定
const customGenerator = new ReportGenerator('./my-templates');
```

---

### メソッド

#### `generate(type: ReportType, config: ReportConfig): Promise<Report>`

指定されたタイプとデータからレポートを生成します。

**パラメータ:**
- `type` (ReportType): レポートタイプ（SystemOverview, Analysis, Diagnosis など）
- `config` (ReportConfig): レポート設定

**戻り値:**
- `Promise<Report>`: 生成されたレポートオブジェクト

**throws:**
- テンプレートが見つからない場合にエラー
- 設定の不正な場合にエラー

**例:**
```typescript
const report = await generator.generate(ReportType.Analysis, {
  projectName: 'My Web App',
  customerName: 'ABC Company',
  date: new Date(),
  author: 'IT Team',
  version: '1.0.0',
  data: {
    issues: [],
    summary: { totalFiles: 150, totalLines: 25000 }
  }
});

console.log(`Generated report: ${report.type}`);
console.log(`Sections: ${report.sections.length}`);
```

---

#### `exportToHTML(report: Report, outputPath: string): Promise<void>`

レポートをHTML形式で出力します。

**パラメータ:**
- `report` (Report): レポートオブジェクト
- `outputPath` (string): 出力ファイルパス

**戻り値:**
- `Promise<void>`

**throws:**
- ファイル書き込みエラー

**例:**
```typescript
const report = await generator.generate(ReportType.Analysis, config);
await generator.exportToHTML(report, './output/report.html');
console.log('HTML report generated: ./output/report.html');
```

---

#### `exportToMarkdown(report: Report, outputPath: string): Promise<void>`

レポートをMarkdown形式で出力します。

**パラメータ:**
- `report` (Report): レポートオブジェクト
- `outputPath` (string): 出力ファイルパス

**戻り値:**
- `Promise<void>`

**throws:**
- ファイル書き込みエラー

**例:**
```typescript
await generator.exportToMarkdown(report, './output/report.md');
console.log('Markdown report generated: ./output/report.md');
```

---

#### `exportToPDF(report: Report, outputPath: string): Promise<void>`

レポートをPDF形式で出力します。（Puppeteerが必要）

**パラメータ:**
- `report` (Report): レポートオブジェクト
- `outputPath` (string): 出力ファイルパス

**戻り値:**
- `Promise<void>`

**throws:**
- PDF生成エラー
- Puppeteerが利用不可な場合

**例:**
```typescript
const report = await generator.generate(ReportType.Analysis, config);
try {
  await generator.exportToPDF(report, './output/report.pdf');
} catch (error) {
  console.warn('PDF generation failed, falling back to HTML');
  await generator.exportToHTML(report, './output/report.html');
}
```

---

#### `markdownToPDF(markdownPath: string, outputPath: string, config?: Partial<ReportConfig>): Promise<void>`

Markdownファイルから直接PDFを生成します。

**パラメータ:**
- `markdownPath` (string): MarkdownファイルのパスI
- `outputPath` (string): 出力PDFファイルパス
- `config` (Partial<ReportConfig>, optional): レポート設定

**戻り値:**
- `Promise<void>`

**throws:**
- ファイル読み込みエラー
- PDF生成エラー

**例:**
```typescript
await generator.markdownToPDF(
  './analysis.md',
  './output/analysis.pdf',
  {
    customerName: 'ABC Company',
    author: 'IT Team'
  }
);
```

---

#### `markdownToHTML(markdown: string, title?: string): string`

Markdownテキストから直接HTMLを生成します。（同期処理）

**パラメータ:**
- `markdown` (string): Markdownテキスト
- `title` (string, optional): ページタイトル

**戻り値:**
- `string`: 生成されたHTMLテキスト

**例:**
```typescript
const markdown = `# Report Title\n\nContent here`;
const html = generator.markdownToHTML(markdown, 'My Report');
console.log(html); // HTMLドキュメント
```

---

#### `generateChartData(type: 'bar' | 'pie' | 'line', labels: string[], data: number[], label?: string): string`

Chart.js用のチャートデータを生成します。

**パラメータ:**
- `type` ('bar' | 'pie' | 'line'): チャートタイプ
- `labels` (string[]): ラベル配列
- `data` (number[]): データ配列
- `label` (string, optional): チャートラベル

**戻り値:**
- `string`: JSON形式のチャート設定

**例:**
```typescript
const chartData = generator.generateChartData(
  'bar',
  ['Jan', 'Feb', 'Mar', 'Apr'],
  [12, 19, 3, 5],
  'Monthly Issues'
);

console.log(chartData); // Chart.js設定JSON
```

---

#### `generateHTMLWithCharts(report: Report, charts: Chart[]): Promise<string>`

チャートを含むHTMLを生成します。

**パラメータ:**
- `report` (Report): レポートオブジェクト
- `charts` (Chart[]): チャート定義配列

**戻り値:**
- `Promise<string>`: チャート埋め込み済みHTMLテキスト

**例:**
```typescript
const htmlWithCharts = await generator.generateHTMLWithCharts(report, [
  {
    id: 'severity-chart',
    type: 'pie',
    labels: ['Critical', 'High', 'Medium', 'Low'],
    data: [15, 35, 45, 20],
    title: 'Issues by Severity'
  },
  {
    id: 'timeline-chart',
    type: 'line',
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    data: [10, 15, 12, 20],
    title: 'Issues Over Time'
  }
]);
```

---

#### `registerTemplate(name: string, templateContent: string): Promise<void>`

カスタムテンプレートを登録します。

**パラメータ:**
- `name` (string): テンプレート名
- `templateContent` (string): Markdownテンプレートコンテンツ

**戻り値:**
- `Promise<void>`

**throws:**
- ディレクトリ作成エラー
- ファイル書き込みエラー

**例:**
```typescript
const customTemplate = `# {{projectName}}

顧客: {{customerName}}
日付: {{date}}
版: {{version}}

## 概要

{{overview}}

## 詳細

{{details}}

---

*Report auto-generated*
`;

await generator.registerTemplate('custom-report', customTemplate);
```

---

#### `listTemplates(): Promise<string[]>`

利用可能なテンプレート一覧を取得します。

**戻り値:**
- `Promise<string[]>`: テンプレート名配列

**例:**
```typescript
const templates = await generator.listTemplates();
console.log('Available templates:', templates);
// ['system-overview', 'analysis', 'diagnosis', 'custom-report']
```

---

#### `generateMultiLanguage(type: ReportType, config: ReportConfig, languages?: string[]): Promise<Record<string, Report>>`

複数言語でレポートを生成します。

**パラメータ:**
- `type` (ReportType): レポートタイプ
- `config` (ReportConfig): レポート設定
- `languages` (string[], optional): 言語コード配列（デフォルト: ['ja', 'en']）

**戻り値:**
- `Promise<Record<string, Report>>`: 言語別レポートマップ

**例:**
```typescript
const reports = await generator.generateMultiLanguage(
  ReportType.Analysis,
  config,
  ['ja', 'en', 'zh']
);

await generator.exportToHTML(reports['ja'], './output/report_ja.html');
await generator.exportToHTML(reports['en'], './output/report_en.html');
await generator.exportToHTML(reports['zh'], './output/report_zh.html');
```

---

#### `preview(report: Report, port?: number): Promise<void>`

レポートをHTTPサーバーでプレビューします。

**パラメータ:**
- `report` (Report): レポートオブジェクト
- `port` (number, optional): ポート番号（デフォルト: 3000）

**戻り値:**
- `Promise<void>`

**throws:**
- ポート使用中エラー

**例:**
```typescript
const report = await generator.generate(ReportType.Analysis, config);
await generator.preview(report, 8080);
// http://localhost:8080 でプレビュー可能
```

---

## インターフェース

### `ReportConfig`

レポート生成の設定。

```typescript
interface ReportConfig {
  /** プロジェクト名 */
  projectName: string;

  /** 顧客名 */
  customerName: string;

  /** レポート日付 */
  date: Date;

  /** 作成者 */
  author?: string;

  /** バージョン */
  version?: string;

  /** 会社ロゴパス */
  logoPath?: string;

  /** カスタムCSS */
  customCSS?: string;

  /** テンプレート変数データ */
  data: Record<string, unknown>;
}
```

### `Report`

生成されたレポートオブジェクト。

```typescript
interface Report {
  /** レポートタイプ */
  type: ReportType;

  /** レポート設定 */
  config: ReportConfig;

  /** レポートセクション一覧 */
  sections: ReportSection[];

  /** 目次 */
  toc: TableOfContents[];

  /** 生成日時 */
  generatedAt: Date;
}
```

### `ReportSection`

レポート内の1つのセクション。

```typescript
interface ReportSection {
  /** セクションタイトル */
  title: string;

  /** ヘッダーレベル（1-6） */
  level: number;

  /** セクションコンテンツ */
  content: string;

  /** サブセクション */
  subsections?: ReportSection[];
}
```

### `TableOfContents`

目次の1つのエントリ。

```typescript
interface TableOfContents {
  /** タイトル */
  title: string;

  /** ヘッダーレベル */
  level: number;

  /** アンカーID */
  anchor: string;

  /** ページ番号（PDF生成時） */
  page?: number;
}
```

### `TemplateVariables`

テンプレート展開用の変数。

```typescript
interface TemplateVariables {
  /** プロジェクト名 */
  projectName: string;

  /** 顧客名 */
  customerName: string;

  /** 日付文字列 */
  date: string;

  /** 作成者 */
  author?: string;

  /** バージョン */
  version?: string;

  /** その他のカスタム変数 */
  [key: string]: unknown;
}
```

---

## Enum

### `ReportType`

サポートされているレポートタイプ。

```typescript
enum ReportType {
  SystemOverview = 'system-overview',   // システム全体概要
  Analysis = 'analysis',                 // 分析レポート
  Diagnosis = 'diagnosis',               // 診断レポート
  Proposal = 'proposal',                 // 提案レポート
  Implementation = 'implementation',     // 実装レポート
  Measurement = 'measurement',           // 計測・測定レポート
  FinalReport = 'final-report'           // 最終レポート
}
```

### `OutputFormat`

サポートされている出力フォーマット。

```typescript
enum OutputFormat {
  PDF = 'pdf',                // PDF形式
  HTML = 'html',              // HTML形式
  Markdown = 'markdown'       // Markdown形式
}
```

---

## 使用例

### 基本的な使用法

```typescript
import { ReportGenerator, ReportType } from '@it-supervisor/report-generator';

const generator = new ReportGenerator();

const report = await generator.generate(ReportType.Analysis, {
  projectName: 'E-Commerce Platform',
  customerName: 'TechCorp Inc.',
  date: new Date(),
  author: 'IT Supervisor Team',
  version: '2.1.0',
  data: {
    totalIssues: 45,
    criticalCount: 5,
    highCount: 12,
    summary: 'Overall system health is good with some critical issues'
  }
});

await generator.exportToHTML(report, './output/analysis.html');
console.log('Report generated successfully');
```

### PDFレポート生成

```typescript
const report = await generator.generate(ReportType.Diagnosis, {
  projectName: 'Mobile App Backend',
  customerName: 'CloudStart Ltd.',
  date: new Date(),
  author: 'Security Team',
  data: {
    criticalFindings: [
      'SQL Injection vulnerability in user login',
      'Unencrypted password storage',
      'Missing rate limiting'
    ],
    recommendations: ['Apply prepared statements', 'Use bcrypt for passwords']
  }
});

try {
  await generator.exportToPDF(report, './output/diagnosis.pdf');
} catch (error) {
  console.error('PDF generation failed:', error);
  await generator.exportToHTML(report, './output/diagnosis.html');
}
```

### テンプレート変数の高度な使用

```typescript
const report = await generator.generate(ReportType.Analysis, {
  projectName: 'Legacy System Modernization',
  customerName: 'Enterprise Solutions Inc.',
  date: new Date(),
  author: 'Architecture Team',
  data: {
    repoAnalysis: {
      techStack: {
        languages: ['JavaScript', 'Python', 'Java'],
        frameworks: ['React', 'Django', 'Spring Boot']
      },
      fileStats: {
        totalFiles: 1250,
        totalLines: 350000
      }
    },
    staticAnalysis: {
      summary: {
        bySeverity: {
          critical: 8,
          high: 25,
          medium: 62,
          low: 145
        }
      }
    }
  }
});

await generator.exportToHTML(report, './output/modernization.html');
```

### カスタムテンプレートの登録と使用

```typescript
// カスタムテンプレートを登録
const securityAuditTemplate = `# {{projectName}} Security Audit Report

**Client:** {{customerName}}
**Date:** {{date}}
**Prepared by:** {{author}}

## Executive Summary

{{executiveSummary}}

## Vulnerabilities Found

### Critical Issues
{{#criticalIssues}}
- {{title}}: {{description}}
  - Impact: {{impact}}
  - Remediation: {{remediation}}
{{/criticalIssues}}

### High-Risk Issues
{{#highIssues}}
- {{title}}
{{/highIssues}}

## Compliance Status

- OWASP Top 10: {{owaspStatus}}
- CWE Coverage: {{cweStatus}}

## Recommendations

{{recommendations}}

---
Generated by IT Supervisor Security Module
`;

await generator.registerTemplate('security-audit', securityAuditTemplate);

// テンプレートを使用
const report = await generator.generate(ReportType.Proposal as any, {
  projectName: 'SecureBank API',
  customerName: 'FinanceFirst Bank',
  date: new Date(),
  data: {
    executiveSummary: 'Comprehensive security audit identified 8 critical vulnerabilities...',
    criticalIssues: [
      { title: 'SQL Injection', description: 'In user search endpoint', impact: 'High', remediation: 'Use parameterized queries' },
      { title: 'CSRF Token Missing', description: 'POST endpoints lack CSRF protection', impact: 'High', remediation: 'Implement SameSite cookies' }
    ],
    recommendations: '1. Implement WAF\n2. Add rate limiting\n3. Enable HSTS headers'
  }
});

await generator.exportToHTML(report, './output/security-audit.html');
```

### チャート付きレポート生成

```typescript
const report = await generator.generate(ReportType.Measurement, {
  projectName: 'Q4 Code Quality Report',
  customerName: 'DevOps Hub',
  date: new Date(),
  data: {
    issues: { critical: 12, high: 35, medium: 78, low: 120 }
  }
});

// HTMLにチャートを埋め込む
const htmlWithCharts = await generator.generateHTMLWithCharts(report, [
  {
    id: 'severity-dist',
    type: 'pie',
    labels: ['Critical', 'High', 'Medium', 'Low'],
    data: [12, 35, 78, 120],
    title: 'Issue Distribution by Severity'
  },
  {
    id: 'trends',
    type: 'line',
    labels: ['Oct', 'Nov', 'Dec'],
    data: [145, 168, 125],
    title: 'Issue Count Trend'
  },
  {
    id: 'category-breakdown',
    type: 'bar',
    labels: ['Security', 'Performance', 'Code Quality', 'Technical Debt'],
    data: [25, 40, 85, 50],
    title: 'Issues by Category'
  }
]);

await fs.writeFile('./output/measurement-with-charts.html', htmlWithCharts);
```

### 複数言語レポート生成

```typescript
const languages = ['ja', 'en', 'de', 'fr'];

const reports = await generator.generateMultiLanguage(
  ReportType.Implementation,
  {
    projectName: 'Global Platform Migration',
    customerName: 'International Corp',
    date: new Date(),
    data: { status: 'In Progress', completion: 65 }
  },
  languages
);

// 各言語のHTMLを出力
for (const [lang, report] of Object.entries(reports)) {
  await generator.exportToHTML(
    report,
    `./output/implementation_${lang}.html`
  );
}

console.log('Multi-language reports generated');
```

### MarkdownからPDFへの直接変換

```typescript
// 既存のMarkdownファイルをPDFに変換
const analysisMarkdown = `
# System Analysis Report

## Overview
Comprehensive analysis of the legacy system...

## Findings
1. **Technology Stack**: Node.js + Express + PostgreSQL
2. **Code Base Size**: ~50,000 lines
3. **Test Coverage**: 45%

## Recommendations
- Increase test coverage to 80%
- Refactor monolithic modules
- Implement microservices architecture
`;

await fs.writeFile('./analysis.md', analysisMarkdown);

await generator.markdownToPDF('./analysis.md', './output/analysis.pdf', {
  customerName: 'TechVision Ltd.',
  author: 'Chief Architect'
});
```

### レポートのプレビューサーバー起動

```typescript
const report = await generator.generate(ReportType.Proposal, {
  projectName: 'Cloud Migration Strategy',
  customerName: 'Enterprise Solutions',
  date: new Date(),
  data: { proposal: 'Migrate to AWS with 3-month timeline' }
});

// HTTPサーバーでプレビュー
await generator.preview(report, 3000);

// ブラウザで http://localhost:3000 にアクセス
// Ctrl+Cで停止
```

---

## エラーハンドリング

```typescript
try {
  const report = await generator.generate(ReportType.Analysis, config);
  await generator.exportToPDF(report, './output/report.pdf');
} catch (error) {
  if (error.message.includes('Puppeteer')) {
    console.error('PDF generation not available, using HTML fallback');
    await generator.exportToHTML(report, './output/report.html');
  } else if (error.code === 'ENOENT') {
    console.error('Template file not found');
  } else {
    console.error('Report generation failed:', error.message);
  }
}
```

---

## ベストプラクティス

### テンプレート管理

```typescript
// テンプレートを事前に登録して再利用
const commonTemplate = await generator.registerTemplate(
  'company-standard',
  `# {{projectName}}

  **Company:** {{customerName}}
  **Date:** {{date}}

  [共通フッター]
  `
);

// 複数のレポート生成で同じテンプレートを使用
```

### チャートデータの効率的な生成

```typescript
// チャート設定をJSON.parseして再利用
const chartConfigs = JSON.parse(
  generator.generateChartData('bar', labels, data, title)
);

// キャッシュして複数回の生成に利用
```

### リソースの適切なクリーンアップ

```typescript
const generator = new ReportGenerator('./templates');

try {
  const report = await generator.generate(type, config);
  await generator.exportToHTML(report, path);
} finally {
  // リソースをクリーンアップ（必要に応じて）
}
```

---

## トラブルシューティング

### PDF生成失敗時の対応

```typescript
async function generateReportWithFallback(
  generator: ReportGenerator,
  report: Report,
  outputPath: string
) {
  try {
    await generator.exportToPDF(report, outputPath);
  } catch (error) {
    console.warn('PDF generation failed, falling back to HTML');
    const htmlPath = outputPath.replace('.pdf', '.html');
    await generator.exportToHTML(report, htmlPath);
  }
}
```

### テンプレート変数の確認

```typescript
// 展開前に使用可能な変数を確認
const report = await generator.generate(type, {
  projectName: 'Test',
  customerName: 'Client',
  date: new Date(),
  data: {
    debug: true,
    // 変数リスト...
  }
});
```

---

## 関連リンク

- [パッケージREADME](../README.md)
- [使用例](../../../docs/USAGE_EXAMPLES.md)
