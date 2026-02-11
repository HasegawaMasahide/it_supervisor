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
});
