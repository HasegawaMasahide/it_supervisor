import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { StaticAnalyzer } from '../analyzer.js';
import {
  AnalyzerTool,
  Severity,
  IssueCategory,
  AnalysisIssue,
  ToolResult
} from '../types.js';

// fs.access と fs.readdir をモック
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    promises: {
      ...((actual as any).promises || {}),
      access: vi.fn(),
      readdir: vi.fn()
    }
  };
});

describe('StaticAnalyzer', () => {
  let analyzer: StaticAnalyzer;

  beforeEach(() => {
    analyzer = new StaticAnalyzer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('selectTools', () => {
    it('should select Gitleaks by default', async () => {
      // すべてのファイルが存在しないようにモック
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const tools = await (analyzer as any).selectTools('/test/repo');

      expect(tools).toContain(AnalyzerTool.Gitleaks);
    });

    it('should select ESLint and Snyk when package.json exists', async () => {
      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const tools = await (analyzer as any).selectTools('/test/repo');

      expect(tools).toContain(AnalyzerTool.ESLint);
      expect(tools).toContain(AnalyzerTool.Snyk);
      expect(tools).toContain(AnalyzerTool.Gitleaks);
    });

    it('should select TypeScript compiler when tsconfig.json exists', async () => {
      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json') || pathStr.includes('tsconfig.json')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const tools = await (analyzer as any).selectTools('/test/repo');

      expect(tools).toContain(AnalyzerTool.TypeScriptCompiler);
      expect(tools).toContain(AnalyzerTool.ESLint);
    });

    it('should select PHP tools when composer.json exists', async () => {
      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('composer.json')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const tools = await (analyzer as any).selectTools('/test/repo');

      expect(tools).toContain(AnalyzerTool.PHPCodeSniffer);
      expect(tools).toContain(AnalyzerTool.PHPStan);
      expect(tools).toContain(AnalyzerTool.Snyk);
      expect(tools).toContain(AnalyzerTool.Gitleaks);
    });

    it('should select Roslyn analyzer when .csproj file exists', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));
      vi.mocked(fs.readdir).mockResolvedValue(['MyProject.csproj', 'Program.cs'] as any);

      const tools = await (analyzer as any).selectTools('/test/repo');

      expect(tools).toContain(AnalyzerTool.RoslynAnalyzer);
    });

    it('should handle readdir errors gracefully', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Permission denied'));

      const tools = await (analyzer as any).selectTools('/test/repo');

      // エラーでも最低限Gitleaksは選択される
      expect(tools).toContain(AnalyzerTool.Gitleaks);
    });
  });

  describe('removeDuplicateIssues', () => {
    it('should remove duplicate issues based on file, line, and rule', () => {
      const issues: AnalysisIssue[] = [
        {
          id: '1',
          tool: AnalyzerTool.ESLint,
          severity: Severity.High,
          category: IssueCategory.CodeQuality,
          rule: 'no-unused-vars',
          message: 'Variable "x" is not used',
          file: 'test.js',
          line: 10
        },
        {
          id: '2',
          tool: AnalyzerTool.ESLint,
          severity: Severity.High,
          category: IssueCategory.CodeQuality,
          rule: 'no-unused-vars',
          message: 'Variable "x" is not used (duplicate)',
          file: 'test.js',
          line: 10
        },
        {
          id: '3',
          tool: AnalyzerTool.ESLint,
          severity: Severity.Medium,
          category: IssueCategory.CodeQuality,
          rule: 'no-console',
          message: 'Unexpected console statement',
          file: 'test.js',
          line: 20
        }
      ];

      const result = (analyzer as any).removeDuplicateIssues(issues);

      expect(result.unique).toHaveLength(2);
      expect(result.removed).toBe(1);
      expect(result.unique[0].id).toBe('1');
      expect(result.unique[1].id).toBe('3');
    });

    it('should return all issues when there are no duplicates', () => {
      const issues: AnalysisIssue[] = [
        {
          id: '1',
          tool: AnalyzerTool.ESLint,
          severity: Severity.High,
          category: IssueCategory.CodeQuality,
          rule: 'no-unused-vars',
          message: 'Variable "x" is not used',
          file: 'test.js',
          line: 10
        },
        {
          id: '2',
          tool: AnalyzerTool.ESLint,
          severity: Severity.Medium,
          category: IssueCategory.CodeQuality,
          rule: 'no-console',
          message: 'Unexpected console statement',
          file: 'test.js',
          line: 20
        }
      ];

      const result = (analyzer as any).removeDuplicateIssues(issues);

      expect(result.unique).toHaveLength(2);
      expect(result.removed).toBe(0);
    });

    it('should handle empty array', () => {
      const result = (analyzer as any).removeDuplicateIssues([]);

      expect(result.unique).toHaveLength(0);
      expect(result.removed).toBe(0);
    });

    it('should treat different files as non-duplicates', () => {
      const issues: AnalysisIssue[] = [
        {
          id: '1',
          tool: AnalyzerTool.ESLint,
          severity: Severity.High,
          category: IssueCategory.CodeQuality,
          rule: 'no-unused-vars',
          message: 'Variable "x" is not used',
          file: 'test1.js',
          line: 10
        },
        {
          id: '2',
          tool: AnalyzerTool.ESLint,
          severity: Severity.High,
          category: IssueCategory.CodeQuality,
          rule: 'no-unused-vars',
          message: 'Variable "x" is not used',
          file: 'test2.js',
          line: 10
        }
      ];

      const result = (analyzer as any).removeDuplicateIssues(issues);

      expect(result.unique).toHaveLength(2);
      expect(result.removed).toBe(0);
    });
  });

  describe('createSummary', () => {
    it('should aggregate issues by severity correctly', () => {
      const toolResults: ToolResult[] = [
        {
          tool: AnalyzerTool.ESLint,
          success: true,
          executionTime: 1000,
          issues: []
        }
      ];

      const issues: AnalysisIssue[] = [
        {
          id: '1',
          tool: AnalyzerTool.ESLint,
          severity: Severity.Critical,
          category: IssueCategory.Security,
          rule: 'no-eval',
          message: 'eval is evil',
          file: 'test.js',
          line: 10
        },
        {
          id: '2',
          tool: AnalyzerTool.ESLint,
          severity: Severity.High,
          category: IssueCategory.CodeQuality,
          rule: 'no-unused-vars',
          message: 'Variable not used',
          file: 'test.js',
          line: 20
        },
        {
          id: '3',
          tool: AnalyzerTool.ESLint,
          severity: Severity.High,
          category: IssueCategory.CodeQuality,
          rule: 'eqeqeq',
          message: 'Use ===',
          file: 'test.js',
          line: 30
        }
      ];

      const summary = (analyzer as any).createSummary(toolResults, issues, 2000);

      expect(summary.totalIssues).toBe(3);
      expect(summary.bySeverity[Severity.Critical]).toBe(1);
      expect(summary.bySeverity[Severity.High]).toBe(2);
      expect(summary.bySeverity[Severity.Medium]).toBe(0);
      expect(summary.executionTime).toBe(2000);
    });

    it('should aggregate issues by category correctly', () => {
      const toolResults: ToolResult[] = [];
      const issues: AnalysisIssue[] = [
        {
          id: '1',
          tool: AnalyzerTool.Snyk,
          severity: Severity.Critical,
          category: IssueCategory.Security,
          rule: 'CVE-2021-1234',
          message: 'Security vulnerability',
          file: 'package.json'
        },
        {
          id: '2',
          tool: AnalyzerTool.ESLint,
          severity: Severity.High,
          category: IssueCategory.CodeQuality,
          rule: 'no-unused-vars',
          message: 'Variable not used',
          file: 'test.js'
        },
        {
          id: '3',
          tool: AnalyzerTool.ESLint,
          severity: Severity.Medium,
          category: IssueCategory.Performance,
          rule: 'slow-loop',
          message: 'Slow loop detected',
          file: 'test.js'
        }
      ];

      const summary = (analyzer as any).createSummary(toolResults, issues, 1500);

      expect(summary.byCategory[IssueCategory.Security]).toBe(1);
      expect(summary.byCategory[IssueCategory.CodeQuality]).toBe(1);
      expect(summary.byCategory[IssueCategory.Performance]).toBe(1);
    });

    it('should aggregate issues by tool correctly', () => {
      const toolResults: ToolResult[] = [];
      const issues: AnalysisIssue[] = [
        {
          id: '1',
          tool: AnalyzerTool.ESLint,
          severity: Severity.High,
          category: IssueCategory.CodeQuality,
          rule: 'no-unused-vars',
          message: 'Variable not used',
          file: 'test.js'
        },
        {
          id: '2',
          tool: AnalyzerTool.ESLint,
          severity: Severity.Medium,
          category: IssueCategory.CodeQuality,
          rule: 'no-console',
          message: 'Console detected',
          file: 'test.js'
        },
        {
          id: '3',
          tool: AnalyzerTool.Snyk,
          severity: Severity.Critical,
          category: IssueCategory.Security,
          rule: 'CVE-2021-1234',
          message: 'Security vulnerability',
          file: 'package.json'
        }
      ];

      const summary = (analyzer as any).createSummary(toolResults, issues, 1500);

      expect(summary.byTool[AnalyzerTool.ESLint]).toBe(2);
      expect(summary.byTool[AnalyzerTool.Snyk]).toBe(1);
    });

    it('should count unique files analyzed', () => {
      const toolResults: ToolResult[] = [];
      const issues: AnalysisIssue[] = [
        {
          id: '1',
          tool: AnalyzerTool.ESLint,
          severity: Severity.High,
          category: IssueCategory.CodeQuality,
          rule: 'no-unused-vars',
          message: 'Variable not used',
          file: 'test1.js',
          line: 10
        },
        {
          id: '2',
          tool: AnalyzerTool.ESLint,
          severity: Severity.Medium,
          category: IssueCategory.CodeQuality,
          rule: 'no-console',
          message: 'Console detected',
          file: 'test1.js',
          line: 20
        },
        {
          id: '3',
          tool: AnalyzerTool.ESLint,
          severity: Severity.High,
          category: IssueCategory.CodeQuality,
          rule: 'eqeqeq',
          message: 'Use ===',
          file: 'test2.js',
          line: 5
        }
      ];

      const summary = (analyzer as any).createSummary(toolResults, issues, 1500);

      expect(summary.filesAnalyzed).toBe(2);
    });

    it('should handle empty issues array', () => {
      const toolResults: ToolResult[] = [];
      const issues: AnalysisIssue[] = [];

      const summary = (analyzer as any).createSummary(toolResults, issues, 1000);

      expect(summary.totalIssues).toBe(0);
      expect(summary.filesAnalyzed).toBe(0);
      expect(summary.executionTime).toBe(1000);
    });
  });

  describe('generateFixSuggestion', () => {
    it('should return fix description when available', () => {
      const issue: AnalysisIssue = {
        id: '1',
        tool: AnalyzerTool.ESLint,
        severity: Severity.High,
        category: IssueCategory.CodeQuality,
        rule: 'no-unused-vars',
        message: 'Variable "x" is not used',
        file: 'test.js',
        line: 10,
        fix: {
          available: true,
          description: 'Remove unused variable "x"'
        }
      };

      const suggestion = analyzer.generateFixSuggestion(issue);

      expect(suggestion).toBe('Remove unused variable "x"');
    });

    it('should return null when fix is available but no description', () => {
      const issue: AnalysisIssue = {
        id: '1',
        tool: AnalyzerTool.ESLint,
        severity: Severity.High,
        category: IssueCategory.CodeQuality,
        rule: 'no-unused-vars',
        message: 'Variable "x" is not used',
        file: 'test.js',
        line: 10,
        fix: {
          available: true
        }
      };

      const suggestion = analyzer.generateFixSuggestion(issue);

      expect(suggestion).toBeNull();
    });

    it('should provide suggestion for no-unused-vars rule', () => {
      const issue: AnalysisIssue = {
        id: '1',
        tool: AnalyzerTool.ESLint,
        severity: Severity.High,
        category: IssueCategory.CodeQuality,
        rule: 'no-unused-vars',
        message: 'Variable "x" is not used',
        file: 'test.js',
        line: 10
      };

      const suggestion = analyzer.generateFixSuggestion(issue);

      expect(suggestion).toBe('Remove the unused variable or use it in your code');
    });

    it('should provide suggestion for no-console rule', () => {
      const issue: AnalysisIssue = {
        id: '1',
        tool: AnalyzerTool.ESLint,
        severity: Severity.Medium,
        category: IssueCategory.CodeQuality,
        rule: 'no-console',
        message: 'Unexpected console statement',
        file: 'test.js',
        line: 15
      };

      const suggestion = analyzer.generateFixSuggestion(issue);

      expect(suggestion).toBe('Replace console.log with a proper logging library');
    });

    it('should provide suggestion for eqeqeq rule', () => {
      const issue: AnalysisIssue = {
        id: '1',
        tool: AnalyzerTool.ESLint,
        severity: Severity.Medium,
        category: IssueCategory.CodeQuality,
        rule: 'eqeqeq',
        message: 'Expected === but found ==',
        file: 'test.js',
        line: 20
      };

      const suggestion = analyzer.generateFixSuggestion(issue);

      expect(suggestion).toBe('Use === instead of ==');
    });

    it('should return null for unknown rule', () => {
      const issue: AnalysisIssue = {
        id: '1',
        tool: AnalyzerTool.ESLint,
        severity: Severity.Low,
        category: IssueCategory.CodeQuality,
        rule: 'unknown-custom-rule',
        message: 'Some custom error',
        file: 'test.js',
        line: 25
      };

      const suggestion = analyzer.generateFixSuggestion(issue);

      expect(suggestion).toBeNull();
    });
  });
});
