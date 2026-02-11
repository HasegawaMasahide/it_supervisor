import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReportGenerator } from '../generator.js';
import { ReportType, ReportConfig } from '../types.js';
import { promises as fs } from 'fs';

// fs.promises をモック
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
  }
}));

describe('ReportGenerator', () => {
  let generator: ReportGenerator;

  beforeEach(() => {
    generator = new ReportGenerator('/test/templates');
    vi.clearAllMocks();
  });

  describe('parseMarkdown', () => {
    it('should parse simple markdown with single heading', () => {
      const markdown = `# Title

Content here`;

      // @ts-ignore - accessing private method for testing
      const sections = generator['parseMarkdown'](markdown);

      expect(sections).toHaveLength(1);
      expect(sections[0]).toEqual({
        title: 'Title',
        level: 1,
        content: 'Content here',
        subsections: []
      });
    });

    it('should parse markdown with multiple heading levels', () => {
      const markdown = `# Level 1

Content 1

## Level 2

Content 2

### Level 3

Content 3`;

      // @ts-ignore
      const sections = generator['parseMarkdown'](markdown);

      expect(sections).toHaveLength(3);
      expect(sections[0].title).toBe('Level 1');
      expect(sections[0].level).toBe(1);
      expect(sections[1].title).toBe('Level 2');
      expect(sections[1].level).toBe(2);
      expect(sections[2].title).toBe('Level 3');
      expect(sections[2].level).toBe(3);
    });

    it('should handle content with code blocks', () => {
      const markdown = `# Section

\`\`\`javascript
const x = 1;
\`\`\``;

      // @ts-ignore
      const sections = generator['parseMarkdown'](markdown);

      expect(sections).toHaveLength(1);
      expect(sections[0].content).toContain('```javascript');
      expect(sections[0].content).toContain('const x = 1;');
    });

    it('should handle empty markdown', () => {
      const markdown = '';

      // @ts-ignore
      const sections = generator['parseMarkdown'](markdown);

      expect(sections).toHaveLength(0);
    });

    it('should handle markdown without headings', () => {
      const markdown = `Just plain text
with multiple lines
and no headings`;

      // @ts-ignore
      const sections = generator['parseMarkdown'](markdown);

      expect(sections).toHaveLength(0);
    });

    it('should trim whitespace from content', () => {
      const markdown = `# Title


Content with extra newlines


`;

      // @ts-ignore
      const sections = generator['parseMarkdown'](markdown);

      expect(sections[0].content).toBe('Content with extra newlines');
    });

    it('should handle headings with special characters', () => {
      const markdown = `# Title with **bold** and *italic*

Content`;

      // @ts-ignore
      const sections = generator['parseMarkdown'](markdown);

      expect(sections[0].title).toBe('Title with **bold** and *italic*');
    });

    it('should handle all heading levels (h1-h6)', () => {
      const markdown = `# H1
## H2
### H3
#### H4
##### H5
###### H6`;

      // @ts-ignore
      const sections = generator['parseMarkdown'](markdown);

      expect(sections).toHaveLength(6);
      expect(sections[0].level).toBe(1);
      expect(sections[1].level).toBe(2);
      expect(sections[2].level).toBe(3);
      expect(sections[3].level).toBe(4);
      expect(sections[4].level).toBe(5);
      expect(sections[5].level).toBe(6);
    });
  });

  describe('generateTOC', () => {
    it('should generate table of contents from sections', () => {
      const sections = [
        { title: 'Introduction', level: 1, content: 'intro', subsections: [] },
        { title: 'Analysis', level: 2, content: 'analysis', subsections: [] },
        { title: 'Conclusion', level: 1, content: 'conclusion', subsections: [] }
      ];

      // @ts-ignore
      const toc = generator['generateTOC'](sections);

      expect(toc).toHaveLength(3);
      expect(toc[0]).toEqual({
        title: 'Introduction',
        level: 1,
        anchor: 'section-0',
        page: undefined
      });
      expect(toc[1]).toEqual({
        title: 'Analysis',
        level: 2,
        anchor: 'section-1',
        page: undefined
      });
      expect(toc[2]).toEqual({
        title: 'Conclusion',
        level: 1,
        anchor: 'section-2',
        page: undefined
      });
    });

    it('should handle empty sections array', () => {
      const sections: any[] = [];

      // @ts-ignore
      const toc = generator['generateTOC'](sections);

      expect(toc).toHaveLength(0);
    });

    it('should generate unique anchors for each section', () => {
      const sections = [
        { title: 'Same Title', level: 1, content: '', subsections: [] },
        { title: 'Same Title', level: 1, content: '', subsections: [] },
        { title: 'Same Title', level: 1, content: '', subsections: [] }
      ];

      // @ts-ignore
      const toc = generator['generateTOC'](sections);

      expect(toc[0].anchor).toBe('section-0');
      expect(toc[1].anchor).toBe('section-1');
      expect(toc[2].anchor).toBe('section-2');
    });
  });

  describe('prepareVariables', () => {
    it('should prepare basic variables from config', () => {
      const config: ReportConfig = {
        projectName: 'Test Project',
        customerName: 'Test Customer',
        date: new Date('2024-01-15'),
        data: {}
      };

      // @ts-ignore
      const variables = generator['prepareVariables'](config);

      expect(variables.projectName).toBe('Test Project');
      expect(variables.customerName).toBe('Test Customer');
      expect(variables.date).toBe('2024/1/15');
    });

    it('should include optional author and version', () => {
      const config: ReportConfig = {
        projectName: 'Test',
        customerName: 'Customer',
        date: new Date('2024-01-15'),
        author: 'John Doe',
        version: '1.0.0',
        data: {}
      };

      // @ts-ignore
      const variables = generator['prepareVariables'](config);

      expect(variables.author).toBe('John Doe');
      expect(variables.version).toBe('1.0.0');
    });

    it('should merge custom data from config', () => {
      const config: ReportConfig = {
        projectName: 'Test',
        customerName: 'Customer',
        date: new Date('2024-01-15'),
        data: {
          customField: 'custom value',
          nested: {
            field: 'nested value'
          }
        }
      };

      // @ts-ignore
      const variables = generator['prepareVariables'](config);

      expect(variables.customField).toBe('custom value');
      expect(variables.nested).toEqual({ field: 'nested value' });
    });
  });

  describe('expandTemplate', () => {
    it('should replace simple variables', () => {
      const template = 'Hello {{name}}, welcome to {{place}}!';
      const variables = {
        projectName: '',
        customerName: '',
        date: '',
        name: 'Alice',
        place: 'Wonderland'
      };

      // @ts-ignore
      const result = generator['expandTemplate'](template, variables);

      expect(result).toBe('Hello Alice, welcome to Wonderland!');
    });

    it('should leave undefined variables as-is', () => {
      const template = 'Hello {{name}}, age: {{age}}';
      const variables = {
        projectName: '',
        customerName: '',
        date: '',
        name: 'Bob'
      };

      // @ts-ignore
      const result = generator['expandTemplate'](template, variables);

      // expandTemplate only replaces variables that exist in the variables object
      // Missing variables are left as {{variable}}
      expect(result).toBe('Hello Bob, age: {{age}}');
    });

    it('should support dot notation for nested objects', () => {
      const template = 'Project: {{project.name}}, Version: {{project.version}}';
      const variables = {
        projectName: '',
        customerName: '',
        date: '',
        project: {
          name: 'MyApp',
          version: '2.0'
        }
      };

      // @ts-ignore
      const result = generator['expandTemplate'](template, variables);

      expect(result).toBe('Project: MyApp, Version: 2.0');
    });

    it('should support three-level dot notation', () => {
      const template = 'Value: {{data.nested.value}}';
      const variables = {
        projectName: '',
        customerName: '',
        date: '',
        data: {
          nested: {
            value: 'deep'
          }
        }
      };

      // @ts-ignore
      const result = generator['expandTemplate'](template, variables);

      expect(result).toBe('Value: deep');
    });

    it('should handle undefined nested properties gracefully', () => {
      const template = 'Value: {{data.missing.property}}';
      const variables = {
        projectName: '',
        customerName: '',
        date: '',
        data: {}
      };

      // @ts-ignore
      const result = generator['expandTemplate'](template, variables);

      expect(result).toBe('Value: ');
    });

    it('should replace multiple occurrences of same variable', () => {
      const template = '{{name}} loves {{name}}';
      const variables = {
        projectName: '',
        customerName: '',
        date: '',
        name: 'JavaScript'
      };

      // @ts-ignore
      const result = generator['expandTemplate'](template, variables);

      expect(result).toBe('JavaScript loves JavaScript');
    });

    it('should handle templates with no variables', () => {
      const template = 'Static text with no variables';
      const variables = {
        projectName: '',
        customerName: '',
        date: ''
      };

      // @ts-ignore
      const result = generator['expandTemplate'](template, variables);

      expect(result).toBe('Static text with no variables');
    });

    it('should handle numeric values', () => {
      const template = 'Count: {{count}}, Price: {{price}}';
      const variables = {
        projectName: '',
        customerName: '',
        date: '',
        count: 42,
        price: 99.99
      };

      // @ts-ignore
      const result = generator['expandTemplate'](template, variables);

      expect(result).toBe('Count: 42, Price: 99.99');
    });

    it('should handle null and undefined values', () => {
      const template = 'Value1: {{val1}}, Value2: {{val2}}';
      const variables = {
        projectName: '',
        customerName: '',
        date: '',
        val1: null,
        val2: undefined
      };

      // @ts-ignore
      const result = generator['expandTemplate'](template, variables);

      expect(result).toBe('Value1: , Value2: ');
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return Analysis template', () => {
      // @ts-ignore
      const template = generator['getDefaultTemplate'](ReportType.Analysis);

      expect(template).toContain('# {{projectName}} - 分析レポート');
      expect(template).toContain('顧客: {{customerName}}');
      expect(template).toContain('## リポジトリ分析');
      expect(template).toContain('## 静的解析結果');
    });

    it('should return Diagnosis template', () => {
      // @ts-ignore
      const template = generator['getDefaultTemplate'](ReportType.Diagnosis);

      expect(template).toContain('# {{projectName}} - 診断レポート');
      expect(template).toContain('## エグゼクティブサマリー');
      expect(template).toContain('### リスク評価');
    });

    it('should return default template for unknown type', () => {
      // @ts-ignore
      const template = generator['getDefaultTemplate'](ReportType.SystemOverview);

      expect(template).toContain('# {{projectName}} - レポート');
      expect(template).toContain('顧客: {{customerName}}');
    });

    it('should return default template for Implementation type', () => {
      // @ts-ignore
      const template = generator['getDefaultTemplate'](ReportType.Implementation);

      expect(template).toContain('# {{projectName}} - レポート');
    });

    it('should include common footer in all templates', () => {
      const types = [ReportType.Analysis, ReportType.Diagnosis, ReportType.Proposal];

      types.forEach(type => {
        // @ts-ignore
        const template = generator['getDefaultTemplate'](type);
        expect(template).toContain('このレポートは自動生成されました');
      });
    });
  });

  describe('markdownToHTML', () => {
    it('should convert simple markdown to HTML', () => {
      const markdown = `# Title

Simple content`;

      const html = generator.markdownToHTML(markdown, 'Test Report');

      expect(html).toContain('<h1>Test Report</h1>');
      expect(html).toContain('<h1>Title</h1>');
      expect(html).toContain('Simple content');
    });

    it('should use default title when not provided', () => {
      const markdown = '# Test';

      const html = generator.markdownToHTML(markdown);

      expect(html).toContain('<title>レポート - analysis</title>');
    });

    it('should generate table of contents', () => {
      const markdown = `# Section 1
Content 1
## Section 2
Content 2`;

      const html = generator.markdownToHTML(markdown);

      expect(html).toContain('目次');
      expect(html).toContain('Section 1');
      expect(html).toContain('Section 2');
    });
  });

  describe('Integration: generate()', () => {
    it('should generate complete report', async () => {
      const config: ReportConfig = {
        projectName: 'Test Project',
        customerName: 'Test Customer',
        date: new Date('2024-01-15'),
        data: {}
      };

      // Mock fs.readFile to throw (use default template)
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Template not found'));

      const report = await generator.generate(ReportType.Analysis, config);

      expect(report.type).toBe(ReportType.Analysis);
      expect(report.config).toBe(config);
      expect(report.sections.length).toBeGreaterThan(0);
      expect(report.toc.length).toBeGreaterThan(0);
      expect(report.generatedAt).toBeInstanceOf(Date);
    });

    it('should use custom template when available', async () => {
      const customTemplate = `# {{projectName}} Custom

Custom content for {{customerName}}`;

      vi.mocked(fs.readFile).mockResolvedValue(customTemplate);

      const config: ReportConfig = {
        projectName: 'MyProject',
        customerName: 'MyCustomer',
        date: new Date(),
        data: {}
      };

      const report = await generator.generate(ReportType.Analysis, config);

      expect(report.sections[0].title).toBe('MyProject Custom');
      expect(report.sections[0].content).toContain('Custom content for MyCustomer');
    });

    it('should handle template with data variables', async () => {
      const template = `# Report

Total files: {{stats.totalFiles}}`;

      vi.mocked(fs.readFile).mockResolvedValue(template);

      const config: ReportConfig = {
        projectName: 'Test',
        customerName: 'Customer',
        date: new Date(),
        data: {
          stats: {
            totalFiles: 42
          }
        }
      };

      const report = await generator.generate(ReportType.Analysis, config);

      expect(report.sections[0].content).toContain('Total files: 42');
    });
  });

  describe('generateHTML', () => {
    it('should generate complete HTML structure', () => {
      const report = {
        type: ReportType.Analysis,
        config: {
          projectName: 'Test Project',
          customerName: 'Test Customer',
          date: new Date('2024-01-15'),
          data: {}
        },
        sections: [
          { title: 'Introduction', level: 1, content: 'This is the introduction.', subsections: [] },
          { title: 'Analysis', level: 2, content: 'Analysis content here.', subsections: [] }
        ],
        toc: [
          { title: 'Introduction', level: 1, anchor: 'section-0', page: undefined },
          { title: 'Analysis', level: 2, anchor: 'section-1', page: undefined }
        ],
        generatedAt: new Date('2024-01-15T10:00:00Z')
      };

      // @ts-ignore
      const html = generator['generateHTML'](report);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="ja">');
      expect(html).toContain('<title>Test Project - analysis</title>');
      expect(html).toContain('<h1>Test Project</h1>');
      expect(html).toContain('<strong>顧客:</strong> Test Customer');
      expect(html).toContain('<strong>日付:</strong> 2024/1/15');
      expect(html).toContain('目次');
      expect(html).toContain('Introduction');
      expect(html).toContain('Analysis');
      expect(html).toContain('This is the introduction');
      expect(html).toContain('Analysis content here');
      expect(html).toContain('IT Supervisor');
    });

    it('should include custom CSS when provided', () => {
      const report = {
        type: ReportType.Analysis,
        config: {
          projectName: 'Test',
          customerName: 'Customer',
          date: new Date(),
          customCSS: 'body { background: red; }',
          data: {}
        },
        sections: [],
        toc: [],
        generatedAt: new Date()
      };

      // @ts-ignore
      const html = generator['generateHTML'](report);

      expect(html).toContain('body { background: red; }');
    });

    it('should include author when provided', () => {
      const report = {
        type: ReportType.Analysis,
        config: {
          projectName: 'Test',
          customerName: 'Customer',
          date: new Date(),
          author: 'John Doe',
          data: {}
        },
        sections: [],
        toc: [],
        generatedAt: new Date()
      };

      // @ts-ignore
      const html = generator['generateHTML'](report);

      expect(html).toContain('<strong>作成者:</strong> John Doe');
    });

    it('should render markdown content properly', () => {
      const report = {
        type: ReportType.Analysis,
        config: {
          projectName: 'Test',
          customerName: 'Customer',
          date: new Date(),
          data: {}
        },
        sections: [
          {
            title: 'Code Example',
            level: 1,
            content: '```javascript\nconst x = 1;\n```',
            subsections: []
          }
        ],
        toc: [],
        generatedAt: new Date()
      };

      // @ts-ignore
      const html = generator['generateHTML'](report);

      expect(html).toContain('<code');
      expect(html).toContain('const x = 1;');
    });
  });

  describe('generateMarkdown', () => {
    it('should generate complete Markdown output', () => {
      const report = {
        type: ReportType.Analysis,
        config: {
          projectName: 'Test Project',
          customerName: 'Test Customer',
          date: new Date('2024-01-15'),
          data: {}
        },
        sections: [
          { title: 'Introduction', level: 1, content: 'Intro content', subsections: [] },
          { title: 'Details', level: 2, content: 'Detail content', subsections: [] }
        ],
        toc: [
          { title: 'Introduction', level: 1, anchor: 'section-0', page: undefined },
          { title: 'Details', level: 2, anchor: 'section-1', page: undefined }
        ],
        generatedAt: new Date('2024-01-15T10:00:00Z')
      };

      // @ts-ignore
      const markdown = generator['generateMarkdown'](report);

      expect(markdown).toContain('# Test Project');
      expect(markdown).toContain('**顧客:** Test Customer');
      expect(markdown).toContain('**日付:** 2024/1/15');
      expect(markdown).toContain('## 目次');
      expect(markdown).toContain('- [Introduction](#section-0)');
      expect(markdown).toContain('  - [Details](#section-1)');
      expect(markdown).toContain('# Introduction');
      expect(markdown).toContain('Intro content');
      expect(markdown).toContain('## Details');
      expect(markdown).toContain('Detail content');
      expect(markdown).toContain('生成日時:');
    });

    it('should handle empty sections', () => {
      const report = {
        type: ReportType.Analysis,
        config: {
          projectName: 'Empty Report',
          customerName: 'Customer',
          date: new Date('2024-01-15'),
          data: {}
        },
        sections: [],
        toc: [],
        generatedAt: new Date('2024-01-15T10:00:00Z')
      };

      // @ts-ignore
      const markdown = generator['generateMarkdown'](report);

      expect(markdown).toContain('# Empty Report');
      expect(markdown).toContain('## 目次');
    });

    it('should indent TOC entries based on level', () => {
      const report = {
        type: ReportType.Analysis,
        config: {
          projectName: 'Test',
          customerName: 'Customer',
          date: new Date(),
          data: {}
        },
        sections: [],
        toc: [
          { title: 'Level 1', level: 1, anchor: 'section-0', page: undefined },
          { title: 'Level 2', level: 2, anchor: 'section-1', page: undefined },
          { title: 'Level 3', level: 3, anchor: 'section-2', page: undefined }
        ],
        generatedAt: new Date()
      };

      // @ts-ignore
      const markdown = generator['generateMarkdown'](report);

      expect(markdown).toContain('- [Level 1](#section-0)');
      expect(markdown).toContain('  - [Level 2](#section-1)');
      expect(markdown).toContain('    - [Level 3](#section-2)');
    });
  });

  describe('exportToHTML', () => {
    it('should write HTML to file', async () => {
      const report = {
        type: ReportType.Analysis,
        config: {
          projectName: 'Test',
          customerName: 'Customer',
          date: new Date(),
          data: {}
        },
        sections: [
          { title: 'Test Section', level: 1, content: 'Content', subsections: [] }
        ],
        toc: [],
        generatedAt: new Date()
      };

      await generator.exportToHTML(report, '/output/report.html');

      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/output/report.html',
        expect.stringContaining('<!DOCTYPE html>'),
        'utf-8'
      );
    });

    it('should generate valid HTML content', async () => {
      const report = {
        type: ReportType.Diagnosis,
        config: {
          projectName: 'Diagnosis Test',
          customerName: 'Test Customer',
          date: new Date('2024-02-01'),
          data: {}
        },
        sections: [],
        toc: [],
        generatedAt: new Date()
      };

      await generator.exportToHTML(report, '/output/diagnosis.html');

      const htmlContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(htmlContent).toContain('<html lang="ja">');
      expect(htmlContent).toContain('Diagnosis Test');
    });
  });

  describe('exportToMarkdown', () => {
    it('should write Markdown to file', async () => {
      const report = {
        type: ReportType.Analysis,
        config: {
          projectName: 'Test',
          customerName: 'Customer',
          date: new Date(),
          data: {}
        },
        sections: [
          { title: 'Test Section', level: 1, content: 'Content', subsections: [] }
        ],
        toc: [
          { title: 'Test Section', level: 1, anchor: 'section-0', page: undefined }
        ],
        generatedAt: new Date()
      };

      await generator.exportToMarkdown(report, '/output/report.md');

      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/output/report.md',
        expect.stringContaining('# Test'),
        'utf-8'
      );
    });

    it('should generate valid Markdown content', async () => {
      const report = {
        type: ReportType.Analysis,
        config: {
          projectName: 'Markdown Test',
          customerName: 'Test Customer',
          date: new Date('2024-02-01'),
          data: {}
        },
        sections: [
          { title: 'Section 1', level: 1, content: 'Content 1', subsections: [] }
        ],
        toc: [
          { title: 'Section 1', level: 1, anchor: 'section-0', page: undefined }
        ],
        generatedAt: new Date()
      };

      await generator.exportToMarkdown(report, '/output/test.md');

      const markdownContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(markdownContent).toContain('# Markdown Test');
      expect(markdownContent).toContain('# Section 1');
      expect(markdownContent).toContain('Content 1');
    });
  });

  describe('exportToPDF', () => {
    it('should fallback to HTML when puppeteer is not available', async () => {
      // In test environment, puppeteer will likely fail to launch
      // This tests the fallback behavior
      const report = {
        type: ReportType.Analysis,
        config: {
          projectName: 'Fallback Test',
          customerName: 'Customer',
          date: new Date(),
          data: {}
        },
        sections: [
          { title: 'Test', level: 1, content: 'Content', subsections: [] }
        ],
        toc: [],
        generatedAt: new Date()
      };

      // exportToPDF will fallback to HTML when puppeteer fails
      await generator.exportToPDF(report, '/output/report.pdf');

      // Should write HTML as fallback (the path will be report.html instead of report.pdf)
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/output/report.html',
        expect.stringContaining('<!DOCTYPE html>'),
        'utf-8'
      );
    }, 20000); // Increase timeout to 20 seconds

    it('should handle errors gracefully', async () => {
      const report = {
        type: ReportType.Analysis,
        config: {
          projectName: 'Error Test',
          customerName: 'Customer',
          date: new Date(),
          data: {}
        },
        sections: [],
        toc: [],
        generatedAt: new Date()
      };

      // Should not throw even if puppeteer fails
      await expect(generator.exportToPDF(report, '/output/error.pdf')).resolves.not.toThrow();
    }, 20000); // Increase timeout to 20 seconds
  });

  describe('markdownToPDF', () => {
    it('should read markdown file and attempt to generate PDF', async () => {
      const markdownContent = `# Test Report

This is a test.`;

      vi.mocked(fs.readFile).mockResolvedValue(markdownContent);

      await generator.markdownToPDF('/input/test.md', '/output/test.pdf');

      expect(fs.readFile).toHaveBeenCalledWith('/input/test.md', 'utf-8');
      // Will fallback to HTML when puppeteer is not available
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should use custom config when provided', async () => {
      const markdownContent = `# Custom Report`;

      vi.mocked(fs.readFile).mockResolvedValue(markdownContent);

      const customConfig = {
        projectName: 'Custom Project',
        customerName: 'Custom Customer'
      };

      await generator.markdownToPDF('/input/test.md', '/output/test.pdf', customConfig);

      expect(fs.readFile).toHaveBeenCalledWith('/input/test.md', 'utf-8');
    });

    it('should fallback to HTML when PDF generation fails', async () => {
      const markdownContent = `# Fallback Test`;

      vi.mocked(fs.readFile).mockResolvedValue(markdownContent);

      await generator.markdownToPDF('/input/test.md', '/output/test.pdf');

      // When puppeteer fails, it should write HTML as fallback
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/output/test.html',
        expect.stringContaining('<!DOCTYPE html>'),
        'utf-8'
      );
    });
  });

  describe('Error handling', () => {
    it('should handle missing template gracefully in generate()', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file'));

      const config: ReportConfig = {
        projectName: 'Test',
        customerName: 'Customer',
        date: new Date(),
        data: {}
      };

      const report = await generator.generate(ReportType.Analysis, config);

      // Should use default template
      expect(report.sections.length).toBeGreaterThan(0);
      // The first section after template expansion should contain the expanded project name
      expect(report.sections[0].title).toContain('Test');
    });

    it('should handle file write errors in exportToHTML', async () => {
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Write permission denied'));

      const report = {
        type: ReportType.Analysis,
        config: {
          projectName: 'Test',
          customerName: 'Customer',
          date: new Date(),
          data: {}
        },
        sections: [],
        toc: [],
        generatedAt: new Date()
      };

      await expect(generator.exportToHTML(report, '/output/report.html')).rejects.toThrow('Write permission denied');
    });

    it('should handle file write errors in exportToMarkdown', async () => {
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Disk full'));

      const report = {
        type: ReportType.Analysis,
        config: {
          projectName: 'Test',
          customerName: 'Customer',
          date: new Date(),
          data: {}
        },
        sections: [],
        toc: [],
        generatedAt: new Date()
      };

      await expect(generator.exportToMarkdown(report, '/output/report.md')).rejects.toThrow('Disk full');
    });
  });
});
