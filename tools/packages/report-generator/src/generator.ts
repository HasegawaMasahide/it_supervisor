import { promises as fs } from 'fs';
import * as path from 'path';
import { marked } from 'marked';
import {
  Report,
  ReportType,
  ReportConfig,
  ReportSection,
  TableOfContents,
  OutputFormat,
  TemplateVariables
} from './types.js';

/**
 * レポートジェネレータークラス
 */
export class ReportGenerator {
  private templatesDir: string;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || path.join(__dirname, '../templates');
  }

  /**
   * レポートを生成
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
   * PDFに出力（プロトタイプ実装）
   */
  async exportToPDF(report: Report, outputPath: string): Promise<void> {
    // 実際には puppeteer や pdfkit を使用してPDF生成
    // プロトタイプではHTMLを生成してファイル名に.pdfを付ける
    const html = this.generateHTML(report);
    await fs.writeFile(outputPath.replace('.pdf', '.html'), html, 'utf-8');
    console.log(`Note: PDF generation not implemented in prototype. HTML saved to ${outputPath.replace('.pdf', '.html')}`);
  }

  /**
   * テンプレートを読み込み
   */
  private async loadTemplate(type: ReportType): Promise<string> {
    const templatePath = path.join(this.templatesDir, `${type}.md`);

    try {
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
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
        return `# {{projectName}} - 分析レポート

## 概要

顧客: {{customerName}}
作成日: {{date}}

## リポジトリ分析

### 技術スタック

{{#repoAnalysis.techStack}}
- **言語**: {{languages}}
- **フレームワーク**: {{frameworks}}
{{/repoAnalysis.techStack}}

### コード統計

- 総ファイル数: {{repoAnalysis.fileStats.totalFiles}}
- 総行数: {{repoAnalysis.fileStats.totalLines}}

## 静的解析結果

### 検出された問題

- Critical: {{staticAnalysis.summary.bySeverity.critical}}
- High: {{staticAnalysis.summary.bySeverity.high}}
- Medium: {{staticAnalysis.summary.bySeverity.medium}}
- Low: {{staticAnalysis.summary.bySeverity.low}}

## 推奨事項

[推奨事項をここに記載]

---

*このレポートは自動生成されました*
`;

      case ReportType.Diagnosis:
        return `# {{projectName}} - 診断レポート

## エグゼクティブサマリー

顧客: {{customerName}}
診断日: {{date}}

## 主要な発見事項

### Critical問題

{{#criticalIssues}}
- **{{title}}**: {{description}}
{{/criticalIssues}}

### リスク評価

[リスクマトリクスをここに挿入]

## 改善の優先順位

1. セキュリティ問題の修正
2. パフォーマンスボトルネックの解消
3. コード品質の向上

## 次のステップ

[次のステップをここに記載]

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
    return {
      projectName: config.projectName,
      customerName: config.customerName,
      date: config.date.toLocaleDateString('ja-JP'),
      author: config.author,
      version: config.version,
      ...config.data
    };
  }

  /**
   * テンプレートを展開
   */
  private expandTemplate(template: string, variables: TemplateVariables): string {
    let result = template;

    // 単純な変数置換 {{variable}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value ?? ''));
    });

    // ドット記法のサポート {{object.property}}
    const dotNotationRegex = /{{(\w+)\.(\w+)(?:\.(\w+))?}}/g;
    result = result.replace(dotNotationRegex, (match, obj, prop1, prop2) => {
      try {
        if (prop2) {
          return String(variables[obj]?.[prop1]?.[prop2] ?? '');
        }
        return String(variables[obj]?.[prop1] ?? '');
      } catch {
        return '';
      }
    });

    return result;
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

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.config.projectName} - ${report.type}</title>
  <style>
    body {
      font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.8;
      max-width: 1000px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    h1 { font-size: 2.5em; color: #1a1a1a; margin-top: 1em; }
    h2 { font-size: 2em; color: #2a2a2a; margin-top: 1.5em; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.5em; }
    h3 { font-size: 1.5em; color: #3a3a3a; margin-top: 1.2em; }
    .toc {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
    }
    .toc h2 { margin-top: 0; border: none; }
    .toc ul { list-style: none; padding-left: 20px; }
    .toc li { margin: 8px 0; }
    .toc a { text-decoration: none; color: #0066cc; }
    .toc a:hover { text-decoration: underline; }
    section { margin: 40px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border: 1px solid #ddd; }
    th { background: #f0f0f0; font-weight: bold; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #666;
      font-size: 0.9em;
    }
    ${report.config.customCSS || ''}
  </style>
</head>
<body>
  <header>
    <h1>${report.config.projectName}</h1>
    <p><strong>顧客:</strong> ${report.config.customerName}</p>
    <p><strong>日付:</strong> ${report.config.date.toLocaleDateString('ja-JP')}</p>
    ${report.config.author ? `<p><strong>作成者:</strong> ${report.config.author}</p>` : ''}
  </header>

  <div class="toc">
    <h2>目次</h2>
    ${tocHtml}
  </div>

  <main>
    ${sectionsHtml}
  </main>

  <footer class="footer">
    <p>生成日時: ${report.generatedAt.toLocaleString('ja-JP')}</p>
    <p>このレポートは IT Supervisor により自動生成されました</p>
  </footer>
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
}
