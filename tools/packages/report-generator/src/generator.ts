import { promises as fs } from 'fs';
import * as path from 'path';
import { marked } from 'marked';
import Handlebars from 'handlebars';
import * as http from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { createLogger, LogLevel } from '@it-supervisor/logger';
import {
  Report,
  ReportType,
  ReportConfig,
  ReportSection,
  TableOfContents,
  TemplateVariables
} from './types.js';

const logger = createLogger('report-generator', {
  level: process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO,
});

// Handlebars ヘルパー登録
Handlebars.registerHelper('formatNumber', (value: unknown) => {
  if (typeof value === 'number') return value.toLocaleString('ja-JP');
  return String(value ?? '');
});

Handlebars.registerHelper('calcPercent', (value: unknown, total: unknown) => {
  const v = Number(value);
  const t = Number(total);
  if (!t || isNaN(v) || isNaN(t)) return '0.0';
  return (v / t * 100).toFixed(1);
});

Handlebars.registerHelper('severityBadge', (severity: string) => {
  const badges: Record<string, string> = {
    critical: 'CRITICAL',
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW',
    info: 'INFO',
  };
  return badges[severity?.toLowerCase()] || String(severity ?? '');
});

Handlebars.registerHelper('gt', (a: unknown, b: unknown) => Number(a) > Number(b));
Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
Handlebars.registerHelper('add', (a: unknown, b: unknown) => Number(a) + Number(b));
Handlebars.registerHelper('scoreLabel', (score: unknown) => {
  const s = Number(score);
  if (s >= 80) return 'A (良好)';
  if (s >= 60) return 'B (普通)';
  if (s >= 40) return 'C (要改善)';
  if (s >= 20) return 'D (問題あり)';
  return 'E (危険)';
});

/**
 * レポートジェネレータークラス
 */
export class ReportGenerator {
  private templatesDir: string;

  constructor(templatesDir?: string) {
    // ESM/CJS両対応のパス解決
    const defaultDir = typeof __dirname !== 'undefined'
      ? path.join(__dirname, '../templates')
      : path.join(process.cwd(), 'templates');
    this.templatesDir = templatesDir || defaultDir;
  }

  /**
   * MarkdownファイルからPDFを直接生成（簡易版）
   */
  async markdownToPDF(markdownPath: string, outputPath: string, config?: Partial<ReportConfig>): Promise<void> {
    const fs = await import('fs');
    const markdown = await fs.promises.readFile(markdownPath, 'utf-8');

    const defaultConfig: ReportConfig = {
      projectName: path.basename(markdownPath, '.md'),
      customerName: '顧客名未設定',
      date: new Date(),
      data: {}
    };

    const mergedConfig = { ...defaultConfig, ...config };

    // Markdownをパースしてレポート構造を生成
    const sections = this.parseMarkdown(markdown);
    const toc = this.generateTOC(sections);

    const report: Report = {
      type: ReportType.Analysis,
      config: mergedConfig,
      sections,
      toc,
      generatedAt: new Date()
    };

    await this.exportToPDF(report, outputPath);
  }

  /**
   * Markdownテキストから直接HTMLを生成
   */
  markdownToHTML(markdown: string, title: string = 'レポート'): string {
    const sections = this.parseMarkdown(markdown);
    const toc = this.generateTOC(sections);

    const report: Report = {
      type: ReportType.Analysis,
      config: {
        projectName: title,
        customerName: '',
        date: new Date(),
        data: {}
      },
      sections,
      toc,
      generatedAt: new Date()
    };

    return this.generateHTML(report);
  }

  /**
   * レポートを生成
   *
   * 指定されたタイプとデータから、Markdown形式のレポートを生成します。
   * テンプレートエンジンで変数を展開し、目次を自動生成します。
   *
   * @param type - レポートタイプ（AnalysisSummary, SecurityAudit, ComplianceCheck）
   * @param config - レポート設定（プロジェクト名、バージョン、データなど）
   * @returns 生成されたレポートオブジェクト
   *
   * @example
   * ```typescript
   * const generator = new ReportGenerator();
   * const report = await generator.generate(ReportType.AnalysisSummary, {
   *   projectName: 'My Project',
   *   version: '1.0.0',
   *   date: new Date(),
   *   author: 'DevTeam',
   *   data: { issues: [], summary: {} }
   * });
   * await generator.exportToHTML(report, '/output/report.html');
   * ```
   */
  async generate(type: ReportType, config: ReportConfig): Promise<Report> {
    // テンプレート読み込み
    const template = await this.loadTemplate(type);

    // 変数展開
    const variables = this.prepareVariables(config);
    const content = this.expandTemplate(template, variables);

    // Markdownパース
    const sections = this.parseMarkdown(content);

    // 目次生成
    const toc = this.generateTOC(sections);

    return {
      type,
      config,
      sections,
      toc,
      generatedAt: new Date()
    };
  }

  /**
   * HTMLに出力
   */
  async exportToHTML(report: Report, outputPath: string): Promise<void> {
    const html = this.generateHTML(report);
    await fs.writeFile(outputPath, html, 'utf-8');
  }

  /**
   * Markdownに出力
   */
  async exportToMarkdown(report: Report, outputPath: string): Promise<void> {
    const markdown = this.generateMarkdown(report);
    await fs.writeFile(outputPath, markdown, 'utf-8');
  }

  /**
   * PDFに出力（puppeteer使用）
   */
  async exportToPDF(report: Report, outputPath: string): Promise<void> {
    try {
      // puppeteerを使用してPDF生成
      const puppeteer = await import('puppeteer').catch(() => null);
      if (!puppeteer) {
        throw new Error('Puppeteer not available');
      }
      const html = this.generateHTML(report);

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      await page.pdf({
        path: outputPath,
        format: 'A4',
        margin: {
          top: '25mm',
          right: '18mm',
          bottom: '25mm',
          left: '18mm'
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 8px; color: #718096; width: 100%; padding: 8px 24px; display: flex; justify-content: space-between; font-family: 'Noto Sans JP', sans-serif;">
            <span>${report.config.projectName} — ${report.config.customerName}</span>
            <span>CONFIDENTIAL</span>
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 8px; color: #718096; width: 100%; padding: 8px 24px; display: flex; justify-content: space-between; font-family: 'Noto Sans JP', sans-serif;">
            <span>IT Supervisor</span>
            <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
          </div>
        `
      });

      await browser.close();
      logger.info(`PDF generated: ${outputPath}`);
    } catch (error) {
      logger.error('PDF generation failed:', error);
      // フォールバック: HTMLを生成
      const html = this.generateHTML(report);
      await fs.writeFile(outputPath.replace('.pdf', '.html'), html, 'utf-8');
      logger.info(`Note: PDF generation failed. HTML saved to ${outputPath.replace('.pdf', '.html')}`);
    }
  }

  /**
   * テンプレートを読み込み
   */
  private async loadTemplate(type: ReportType): Promise<string> {
    const templatePath = path.join(this.templatesDir, `${type}.md`);

    try {
      return await fs.readFile(templatePath, 'utf-8');
    } catch (_error) {
      // テンプレートがない場合はデフォルトテンプレートを使用
      return this.getDefaultTemplate(type);
    }
  }

  /**
   * デフォルトテンプレートを取得
   */
  private getDefaultTemplate(type: ReportType): string {
    switch (type) {
      case ReportType.Analysis:
        return `# {{projectName}} 分析レポート

**顧客名**: {{customerName}}
**作成日**: {{date}}
{{#if author}}**作成者**: {{author}}{{/if}}
{{#if version}}**バージョン**: {{version}}{{/if}}

---

## エグゼクティブサマリー

本レポートは、{{projectName}}の技術的な分析結果をまとめたものです。
静的解析ツールおよびリポジトリ解析ツールを使用し、コード品質、セキュリティ、技術的負債の観点から評価を行いました。

### 総合評価

| 評価項目 | スコア | 判定 |
|---------|--------|------|
{{#if scores}}| コード品質 | {{scores.codeQuality}}/100 | {{scoreLabel scores.codeQuality}} |
| セキュリティ | {{scores.security}}/100 | {{scoreLabel scores.security}} |
| 保守性 | {{scores.maintainability}}/100 | {{scoreLabel scores.maintainability}} |
| 技術的負債 | {{scores.technicalDebt}}/100 | {{scoreLabel scores.technicalDebt}} |{{else}}| コード品質 | -/100 | 未評価 |
| セキュリティ | -/100 | 未評価 |
| 保守性 | -/100 | 未評価 |
| 技術的負債 | -/100 | 未評価 |{{/if}}

### 重要な発見事項

{{#if summary}}- **Critical問題**: {{summary.criticalIssues}}件
- **High問題**: {{summary.highIssues}}件
- **Medium問題**: {{summary.mediumIssues}}件
- **Low問題**: {{summary.lowIssues}}件
- **合計**: {{summary.totalIssues}}件{{else}}- 問題の検出結果はありません。{{/if}}

---

## リポジトリ分析

{{#if repository}}| 項目 | 内容 |
|------|------|
| リポジトリ名 | {{repository.name}} |
| Gitリポジトリ | {{#if repository.hasGit}}はい{{else}}いいえ{{/if}} |
| CI/CD | {{#if repository.hasCI}}設定済み{{else}}未設定{{/if}} |
| Dockerfile | {{#if repository.hasDockerfile}}あり{{else}}なし{{/if}} |{{/if}}

### 技術スタック

{{#if languages}}| 言語 | 割合 | 行数 |
|------|------|------|
{{#each languages}}| {{name}} | {{percentage}}% | {{formatNumber lines}} |
{{/each}}{{else}}言語情報が取得できませんでした。{{/if}}

### フレームワーク

{{#if frameworks}}| フレームワーク | バージョン | 検出信頼度 |
|--------------|----------|-----------|
{{#each frameworks}}| {{name}} | {{version}} | {{confidence}} |
{{/each}}{{else}}フレームワークは検出されませんでした。{{/if}}

### コード統計

{{#if summary}}| 指標 | 値 |
|------|-----|
| 総ファイル数 | {{formatNumber summary.totalFiles}} |
| 総行数 | {{formatNumber summary.totalLines}} |
| コード行数 | {{formatNumber summary.totalCodeLines}} |{{/if}}

---

## 静的解析結果

### 問題の分布

#### 重要度別

{{#if summary}}| 重要度 | 件数 | 割合 |
|--------|------|------|
| Critical | {{summary.criticalIssues}} | {{calcPercent summary.criticalIssues summary.totalIssues}}% |
| High | {{summary.highIssues}} | {{calcPercent summary.highIssues summary.totalIssues}}% |
| Medium | {{summary.mediumIssues}} | {{calcPercent summary.mediumIssues summary.totalIssues}}% |
| Low | {{summary.lowIssues}} | {{calcPercent summary.lowIssues summary.totalIssues}}% |{{else}}静的解析結果がありません。{{/if}}

{{#if categoryCounts}}#### カテゴリ別

| カテゴリ | 件数 |
|---------|------|
{{#each categoryCounts}}| {{name}} | {{count}} |
{{/each}}{{/if}}

{{#if securityIssues}}### Critical/High問題の詳細

| 重要度 | カテゴリ | 問題 | ファイル | 推奨対応 |
|--------|---------|------|---------|---------|
{{#each securityIssues}}| {{severityBadge severity}} | {{category}} | {{title}} | {{file}} | {{recommendation}} |
{{/each}}{{/if}}

---

## 品質メトリクス

{{#if qualityMetrics}}| 指標 | 値 | 単位 | 状態 |
|------|-----|------|------|
{{#each qualityMetrics}}| {{name}} | {{formatNumber value}} | {{unit}} | {{status}} |
{{/each}}{{/if}}

---

## 推奨事項

{{#if recommendations}}{{#each recommendations}}### {{priority}}: {{title}}

{{description}}

- **想定工数**: {{effort}}
- **期待効果**: {{impact}}

{{/each}}{{else}}改善提案はありません。{{/if}}

---

## 次のステップ

{{#if summary}}{{#if (gt summary.criticalIssues 0)}}1. Critical問題の即時修正（{{summary.criticalIssues}}件）
{{/if}}{{#if (gt summary.highIssues 0)}}1. High問題の早期修正計画策定（{{summary.highIssues}}件）
{{/if}}1. 詳細診断の実施（オプション）
1. 改善提案書の作成{{else}}1. 詳細な解析の実施
1. 改善提案書の作成{{/if}}

---

## 付録

### A. 使用した解析ツール

{{#if toolsUsed}}{{#each toolsUsed}}- {{this}}
{{/each}}{{else}}- 情報がありません{{/if}}

### B. 解析対象サマリー

{{#if summary}}- 対象ファイル数: {{formatNumber summary.totalFiles}}
- 対象コード行数: {{formatNumber summary.totalCodeLines}}{{/if}}

---

*このレポートは IT Supervisor により自動生成されました*
*生成日時: {{generatedAt}}*
`;

      case ReportType.Diagnosis:
        return `# {{projectName}} - 診断レポート

## エグゼクティブサマリー

顧客: {{customerName}}
診断日: {{date}}

## 主要な発見事項

### Critical問題

{{#if criticalIssues}}{{#each criticalIssues}}- **{{title}}**: {{description}}
{{/each}}{{else}}Critical問題は検出されませんでした。{{/if}}

### リスク評価

{{#if scores}}| 評価項目 | スコア |
|---------|--------|
| セキュリティ | {{scores.security}}/100 |
| コード品質 | {{scores.codeQuality}}/100 |{{/if}}

## 改善の優先順位

1. セキュリティ問題の修正
2. パフォーマンスボトルネックの解消
3. コード品質の向上

## 次のステップ

{{#if recommendations}}{{#each recommendations}}1. {{title}}（{{priority}}）
{{/each}}{{else}}1. 詳細な診断の実施{{/if}}

---

*このレポートは自動生成されました*
`;

      default:
        return `# {{projectName}} - レポート

顧客: {{customerName}}
日付: {{date}}

## 内容

[レポート内容]

---

*このレポートは自動生成されました*
`;
    }
  }

  /**
   * テンプレート変数を準備
   */
  private prepareVariables(config: ReportConfig): TemplateVariables {
    const data = config.data || {};
    const variables: TemplateVariables = {
      projectName: config.projectName,
      customerName: config.customerName,
      date: config.date.toLocaleDateString('ja-JP'),
      author: config.author,
      version: config.version,
      generatedAt: new Date().toLocaleString('ja-JP'),
      ...data
    };

    // 言語の percentage を小数1桁にフォーマット
    if (Array.isArray(variables.languages)) {
      variables.languages = (variables.languages as Array<Record<string, unknown>>).map(lang => ({
        ...lang,
        percentage: typeof lang.percentage === 'number' ? (lang.percentage as number).toFixed(1) : lang.percentage,
      }));
    }

    // スコア計算（summary データがある場合）
    const summary = data.summary as Record<string, number> | undefined;
    if (summary) {
      const totalIssues = summary.totalIssues ?? 0;
      const criticalIssues = summary.criticalIssues ?? 0;
      const highIssues = summary.highIssues ?? 0;
      const mediumIssues = summary.mediumIssues ?? 0;
      const totalLines = summary.totalCodeLines ?? summary.totalLines ?? 1;

      // コード品質スコア（問題密度ベース）
      const issueDensity = totalIssues / Math.max(totalLines / 1000, 1);
      const codeQualityScore = Math.max(0, Math.min(100, Math.round(100 - issueDensity * 10)));

      // セキュリティスコア（Critical/High問題の影響が大きい）
      const securityPenalty = criticalIssues * 25 + highIssues * 10;
      const securityScore = Math.max(0, Math.min(100, 100 - securityPenalty));

      // 保守性スコア（Medium/Low問題ベース）
      const maintainabilityPenalty = mediumIssues * 3 + (totalIssues - criticalIssues - highIssues - mediumIssues) * 1;
      const maintainabilityScore = Math.max(0, Math.min(100, 100 - maintainabilityPenalty));

      // 技術的負債スコア
      const debtScore = Math.round((codeQualityScore + maintainabilityScore) / 2);

      variables.scores = {
        codeQuality: codeQualityScore,
        security: securityScore,
        maintainability: maintainabilityScore,
        technicalDebt: debtScore,
      };
    }

    // toolsUsed: securityIssues や issues から使用ツール一覧を自動生成
    if (!variables.toolsUsed) {
      const toolSet = new Set<string>();
      const securityIssues = data.securityIssues as Array<Record<string, string>> | undefined;
      if (securityIssues) {
        for (const issue of securityIssues) {
          const tool = issue.tool || issue.description;
          if (tool) toolSet.add(tool);
        }
      }
      const issues = data.issues;
      if (Array.isArray(issues)) {
        for (const issue of issues) {
          const tags = (issue as Record<string, unknown>).tags as string[] | undefined;
          if (tags && tags.length > 0) toolSet.add(tags[0]);
        }
      }
      // フォールバック: languages から推測
      if (toolSet.size === 0) {
        const languages = data.languages as Array<Record<string, string>> | undefined;
        if (languages) {
          for (const lang of languages) {
            const name = lang.name?.toLowerCase();
            if (name === 'c#') toolSet.add('Roslyn Analyzer（C#静的解析）');
            if (name === 'javascript' || name === 'typescript') toolSet.add('ESLint（JavaScript/TypeScript）');
            if (name === 'php') toolSet.add('PHPStan（PHP静的解析）');
          }
        }
        toolSet.add('Gitleaks（シークレット検出）');
      }
      if (toolSet.size > 0) {
        variables.toolsUsed = Array.from(toolSet);
      }
    }

    // categoryCounts: issues/securityIssues からカテゴリ別件数を集計
    if (!variables.categoryCounts) {
      const allIssues = Array.isArray(data.securityIssues) ? data.securityIssues as Array<Record<string, string>> : [];
      const issuesArr = Array.isArray(data.issues) ? data.issues as Array<Record<string, unknown>> : [];
      if (allIssues.length > 0 || issuesArr.length > 0) {
        const categoryMap = new Map<string, number>();
        const categoryLabels: Record<string, string> = {
          security: 'セキュリティ',
          performance: 'パフォーマンス',
          code_quality: 'コード品質',
          CodeQuality: 'コード品質',
          Security: 'セキュリティ',
          Performance: 'パフォーマンス',
          TechnicalDebt: '技術的負債',
        };
        if (issuesArr.length > 0) {
          for (const issue of issuesArr) {
            const cat = String(issue.category || 'other');
            const label = categoryLabels[cat] || cat;
            categoryMap.set(label, (categoryMap.get(label) || 0) + 1);
          }
        } else {
          for (const issue of allIssues) {
            const cat = issue.category || 'other';
            const label = categoryLabels[cat] || cat;
            categoryMap.set(label, (categoryMap.get(label) || 0) + 1);
          }
        }
        variables.categoryCounts = Array.from(categoryMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }));
      }
    }

    return variables;
  }

  /**
   * テンプレートを展開（Handlebars ベース）
   */
  private expandTemplate(template: string, variables: TemplateVariables): string {
    try {
      const compiled = Handlebars.compile(template, { noEscape: true });
      return compiled(variables);
    } catch (error) {
      logger.warn('Handlebars template expansion failed, falling back to simple replacement', error);
      // フォールバック: 単純な変数置換
      let result = template;
      Object.entries(variables).forEach(([key, value]) => {
        if (typeof value !== 'object' || value === null) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          result = result.replace(regex, String(value ?? ''));
        }
      });
      return result;
    }
  }

  /**
   * Markdownをパース
   */
  private parseMarkdown(content: string): ReportSection[] {
    const lines = content.split('\n');
    const sections: ReportSection[] = [];
    let currentSection: ReportSection | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        // 前のセクションを保存
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          sections.push(currentSection);
        }

        // 新しいセクション
        const level = headingMatch[1].length;
        const title = headingMatch[2];

        currentSection = {
          title,
          level,
          content: '',
          subsections: []
        };
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // 最後のセクション
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * 目次を生成
   */
  private generateTOC(sections: ReportSection[]): TableOfContents[] {
    return sections.map((section, index) => ({
      title: section.title,
      level: section.level,
      anchor: `section-${index}`,
      page: undefined // PDF生成時にページ番号を設定
    }));
  }

  /**
   * HTMLを生成
   */
  private generateHTML(report: Report): string {
    const tocHtml = this.generateTOCHTML(report.toc);
    const sectionsHtml = report.sections.map((section, index) => {
      const contentHtml = marked(section.content);
      return `
        <section id="section-${index}" class="level-${section.level}">
          <h${section.level}>${section.title}</h${section.level}>
          ${contentHtml}
        </section>
      `;
    }).join('\n');

    // テーブル内の重要度テキストをバッジに変換
    const styledSectionsHtml = this.addSeverityBadges(sectionsHtml);

    const reportTypeLabel: Record<string, string> = {
      'system-overview': 'システム概要',
      'analysis': '分析レポート',
      'diagnosis': '診断レポート',
      'proposal': '改善提案書',
      'implementation': '実装報告書',
      'measurement': '効果測定レポート',
      'final-report': '最終報告書',
    };
    const typeLabel = reportTypeLabel[report.type] || report.type;

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.config.projectName} - ${typeLabel}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    /* === Base === */
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.8;
      max-width: 960px;
      margin: 0 auto;
      padding: 0;
      color: #2d3748;
      background: #fff;
      font-size: 15px;
      font-weight: 400;
    }

    /* === Cover Header === */
    .report-header {
      background: linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%);
      color: #fff;
      padding: 48px 48px 40px;
      margin-bottom: 0;
    }
    .report-header .report-type-badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      color: #fff;
      font-size: 0.75em;
      font-weight: 500;
      padding: 4px 14px;
      border-radius: 20px;
      letter-spacing: 0.08em;
      margin-bottom: 16px;
      text-transform: uppercase;
    }
    .report-header h1 {
      font-size: 2em;
      font-weight: 700;
      margin: 0 0 24px 0;
      letter-spacing: 0.02em;
      line-height: 1.3;
    }
    .report-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      font-size: 0.9em;
      opacity: 0.92;
    }
    .report-meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .report-meta-item .label {
      font-weight: 300;
      opacity: 0.8;
    }
    .report-meta-item .value {
      font-weight: 500;
    }

    /* === Content Area === */
    .report-body {
      padding: 0 48px 48px;
    }

    /* === Table of Contents === */
    .toc {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 28px 32px;
      margin: 32px 0 40px;
    }
    .toc h2 {
      margin: 0 0 16px 0;
      font-size: 1.1em;
      font-weight: 700;
      color: #1a365d;
      border: none;
      padding: 0;
      letter-spacing: 0.04em;
    }
    .toc h2::before {
      content: none;
    }
    .toc ul {
      list-style: none;
      padding-left: 0;
      margin: 0;
    }
    .toc ul ul { padding-left: 20px; }
    .toc li { margin: 6px 0; }
    .toc a {
      text-decoration: none;
      color: #2b6cb0;
      font-size: 0.92em;
      transition: color 0.15s;
    }
    .toc a:hover { color: #1a365d; text-decoration: underline; }

    /* === Headings === */
    h1 {
      font-size: 1.75em;
      color: #1a202c;
      margin-top: 48px;
      font-weight: 700;
    }
    h2 {
      font-size: 1.4em;
      color: #1a365d;
      margin-top: 48px;
      padding-bottom: 10px;
      border-bottom: 3px solid #2b6cb0;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    h2::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 0.9em;
      background: #2b6cb0;
      margin-right: 10px;
      border-radius: 2px;
      vertical-align: baseline;
    }
    h3 {
      font-size: 1.15em;
      color: #2d3748;
      margin-top: 32px;
      font-weight: 700;
      padding-left: 14px;
      border-left: 3px solid #63b3ed;
    }
    h4 {
      font-size: 1em;
      color: #4a5568;
      margin-top: 24px;
      font-weight: 700;
    }

    /* === Sections === */
    section { margin: 32px 0; }
    section.level-2 { margin-top: 48px; }

    /* === Tables === */
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 20px 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      font-size: 0.93em;
    }
    thead th {
      background: #1a365d;
      color: #fff;
      font-weight: 500;
      padding: 12px 16px;
      text-align: left;
      font-size: 0.92em;
      letter-spacing: 0.03em;
      border: none;
    }
    thead th:first-child { border-radius: 0; }
    thead th:last-child  { border-radius: 0; }
    tbody td {
      padding: 10px 16px;
      border-bottom: 1px solid #edf2f7;
      border-right: none;
      border-left: none;
      vertical-align: top;
    }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:nth-child(even) { background: #f7fafc; }
    tbody tr:hover { background: #edf2f7; }

    /* === Severity Badges === */
    .badge {
      display: inline-block;
      font-size: 0.78em;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 4px;
      letter-spacing: 0.04em;
      line-height: 1.4;
      white-space: nowrap;
    }
    .badge-critical { background: #fff5f5; color: #c53030; border: 1px solid #feb2b2; }
    .badge-high     { background: #fffaf0; color: #c05621; border: 1px solid #fbd38d; }
    .badge-medium   { background: #fffff0; color: #975a16; border: 1px solid #f6e05e; }
    .badge-low      { background: #f0fff4; color: #276749; border: 1px solid #9ae6b4; }
    .badge-info     { background: #ebf8ff; color: #2b6cb0; border: 1px solid #90cdf4; }

    /* === Score/Status indicators === */
    .status-danger  { color: #c53030; font-weight: 700; }
    .status-warning { color: #c05621; font-weight: 700; }
    .status-good    { color: #276749; font-weight: 700; }
    .status-info    { color: #2b6cb0; font-weight: 500; }

    /* === Lists === */
    ul, ol { padding-left: 24px; }
    li { margin: 6px 0; }
    li strong { color: #1a202c; }

    /* === Horizontal Rule === */
    hr {
      border: none;
      height: 1px;
      background: #e2e8f0;
      margin: 40px 0;
    }

    /* === Code === */
    code {
      background: #edf2f7;
      color: #2d3748;
      padding: 2px 7px;
      border-radius: 4px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
    pre {
      background: #1a202c;
      color: #e2e8f0;
      padding: 20px 24px;
      border-radius: 8px;
      overflow-x: auto;
      line-height: 1.6;
      font-size: 0.88em;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }

    /* === Blockquote === */
    blockquote {
      border-left: 4px solid #2b6cb0;
      background: #ebf8ff;
      margin: 20px 0;
      padding: 16px 24px;
      border-radius: 0 8px 8px 0;
      color: #2a4365;
    }
    blockquote p { margin: 0; }

    /* === Footer === */
    .report-footer {
      margin-top: 60px;
      padding: 24px 48px;
      background: #f7fafc;
      border-top: 3px solid #1a365d;
      color: #718096;
      font-size: 0.85em;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .report-footer .brand {
      font-weight: 500;
      color: #1a365d;
    }

    /* === Print / PDF === */
    @media print {
      body { padding: 0; font-size: 12pt; }
      .report-header { break-after: avoid; }
      .toc { break-after: page; }
      section.level-2 { break-before: page; }
      section.level-2:first-of-type { break-before: auto; }
      table { break-inside: avoid; }
      tbody tr { break-inside: avoid; }
      .report-footer { break-before: avoid; }
      a { color: inherit; text-decoration: none; }
    }

    ${report.config.customCSS || ''}
  </style>
</head>
<body>
  <div class="report-header">
    <div class="report-type-badge">${typeLabel}</div>
    <h1>${report.config.projectName}</h1>
    <div class="report-meta">
      <div class="report-meta-item">
        <span class="label">顧客</span>
        <span class="value">${report.config.customerName}</span>
      </div>
      <div class="report-meta-item">
        <span class="label">日付</span>
        <span class="value">${report.config.date.toLocaleDateString('ja-JP')}</span>
      </div>
      ${report.config.author ? `
      <div class="report-meta-item">
        <span class="label">作成者</span>
        <span class="value">${report.config.author}</span>
      </div>` : ''}
      ${report.config.version ? `
      <div class="report-meta-item">
        <span class="label">版</span>
        <span class="value">${report.config.version}</span>
      </div>` : ''}
    </div>
  </div>

  <div class="report-body">
    <div class="toc">
      <h2>目次</h2>
      ${tocHtml}
    </div>

    <main>
      ${styledSectionsHtml}
    </main>
  </div>

  <div class="report-footer">
    <span class="brand">IT Supervisor</span>
    <span>生成日時: ${report.generatedAt.toLocaleString('ja-JP')}</span>
  </div>
</body>
</html>`;
  }

  /**
   * 目次HTMLを生成
   */
  private generateTOCHTML(toc: TableOfContents[]): string {
    let html = '<ul>';

    let currentLevel = 1;

    toc.forEach(item => {
      if (item.level > currentLevel) {
        html += '<ul>'.repeat(item.level - currentLevel);
      } else if (item.level < currentLevel) {
        html += '</ul>'.repeat(currentLevel - item.level);
      }

      html += `<li><a href="#${item.anchor}">${item.title}</a></li>`;
      currentLevel = item.level;
    });

    html += '</ul>'.repeat(currentLevel);

    return html;
  }

  /**
   * HTML内の重要度テキストをバッジ要素に変換
   */
  private addSeverityBadges(html: string): string {
    const badgeMap: Record<string, string> = {
      'CRITICAL': '<span class="badge badge-critical">CRITICAL</span>',
      'HIGH':     '<span class="badge badge-high">HIGH</span>',
      'MEDIUM':   '<span class="badge badge-medium">MEDIUM</span>',
      'LOW':      '<span class="badge badge-low">LOW</span>',
      'INFO':     '<span class="badge badge-info">INFO</span>',
    };
    // テーブルセル内の重要度テキストのみ置換（<td>CRITICAL</td> → <td><span ...>CRITICAL</span></td>）
    return html.replace(/<td>(CRITICAL|HIGH|MEDIUM|LOW|INFO)<\/td>/g, (_match, severity) => {
      return `<td>${badgeMap[severity] || severity}</td>`;
    });
  }

  /**
   * Markdownを生成
   */
  private generateMarkdown(report: Report): string {
    let markdown = `# ${report.config.projectName}\n\n`;
    markdown += `**顧客:** ${report.config.customerName}\n`;
    markdown += `**日付:** ${report.config.date.toLocaleDateString('ja-JP')}\n\n`;

    markdown += `## 目次\n\n`;
    report.toc.forEach(item => {
      const indent = '  '.repeat(item.level - 1);
      markdown += `${indent}- [${item.title}](#${item.anchor})\n`;
    });
    markdown += '\n';

    report.sections.forEach(section => {
      markdown += `${'#'.repeat(section.level)} ${section.title}\n\n`;
      markdown += `${section.content}\n\n`;
    });

    markdown += `---\n\n`;
    markdown += `*生成日時: ${report.generatedAt.toLocaleString('ja-JP')}*\n`;

    return markdown;
  }

  /**
   * チャートデータを生成（Chart.js用）
   */
  generateChartData(
    type: 'bar' | 'pie' | 'line',
    labels: string[],
    data: number[],
    label: string = 'データ'
  ): string {
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
      '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
    ];

    const chartConfig = {
      type,
      data: {
        labels,
        datasets: [{
          label,
          data,
          backgroundColor: colors.slice(0, data.length),
          borderColor: colors.slice(0, data.length),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top' as const
          },
          title: {
            display: true,
            text: label
          }
        }
      }
    };

    return JSON.stringify(chartConfig);
  }

  /**
   * チャートを含むHTMLを生成
   */
  async generateHTMLWithCharts(
    report: Report,
    charts: Array<{ id: string; type: 'bar' | 'pie' | 'line'; labels: string[]; data: number[]; title: string }>
  ): Promise<string> {
    const baseHTML = this.generateHTML(report);

    // Chart.jsスクリプトを追加
    const chartScripts = charts.map(chart => {
      const chartData = this.generateChartData(chart.type, chart.labels, chart.data, chart.title);
      return `
        <div style="max-width: 600px; margin: 30px auto;">
          <canvas id="${chart.id}"></canvas>
        </div>
        <script>
          new Chart(document.getElementById('${chart.id}'), ${chartData});
        </script>
      `;
    }).join('\n');

    // Chart.jsライブラリと生成したチャートを追加
    const htmlWithCharts = baseHTML.replace(
      '</body>',
      `
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        ${chartScripts}
      </body>
      `
    );

    return htmlWithCharts;
  }

  /**
   * カスタムテンプレートを登録
   */
  async registerTemplate(name: string, templateContent: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, `${name}.md`);
    await fs.mkdir(this.templatesDir, { recursive: true });
    await fs.writeFile(templatePath, templateContent, 'utf-8');
  }

  /**
   * テンプレート一覧を取得
   */
  async listTemplates(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.templatesDir);
      return files
        .filter(file => file.endsWith('.md'))
        .map(file => file.replace('.md', ''));
    } catch {
      return [];
    }
  }

  /**
   * 多言語対応レポート生成
   */
  async generateMultiLanguage(
    type: ReportType,
    config: ReportConfig,
    languages: string[] = ['ja', 'en']
  ): Promise<Record<string, Report>> {
    const reports: Record<string, Report> = {};

    for (const lang of languages) {
      const localizedConfig = { ...config };

      // 言語別のテンプレートを読み込み
      const templateName = `${type}_${lang}`;
      const template = await this.loadTemplate(templateName as ReportType)
        .catch(() => this.getDefaultTemplate(type));

      const variables = this.prepareVariables(localizedConfig);
      const content = this.expandTemplate(template, variables);
      const sections = this.parseMarkdown(content);
      const toc = this.generateTOC(sections);

      reports[lang] = {
        type,
        config: localizedConfig,
        sections,
        toc,
        generatedAt: new Date()
      };
    }

    return reports;
  }

  /**
   * レポートをプレビュー（サーバー起動）
   */
  async preview(report: Report, port: number = 3000): Promise<void> {
    const html = this.generateHTML(report);

    const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });

    server.listen(port, () => {
      logger.info(`レポートプレビューサーバー起動: http://localhost:${port}`);
      logger.info('Ctrl+Cで停止します');
    });
  }
}
