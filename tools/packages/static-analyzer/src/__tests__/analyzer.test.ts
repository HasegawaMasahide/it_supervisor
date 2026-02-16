import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import * as path from 'path';
import { StaticAnalyzer } from '../analyzer.js';
import {
  AnalyzerTool,
  Severity,
  IssueCategory,
  AnalysisIssue,
  ToolResult
} from '../types.js';

// child_process をモック
vi.mock('child_process', () => ({
  execFile: vi.fn()
}));

// fs.access と fs.readdir をモック
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    promises: {
      ...((actual as any).promises || {}),
      access: vi.fn(),
      readdir: vi.fn(),
      readFile: vi.fn(),
      unlink: vi.fn()
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

  describe('Error handling', () => {
    it('should handle timeout in tool execution', async () => {
      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('Timeout') as any;
        error.code = 'ETIMEDOUT';
        error.killed = true;
        callback(error, '', '');
        return {} as any;
      });

      const result = await (analyzer as any).runESLint('/test/repo', { timeout: 1000 });

      expect(result).toEqual([]);
    });

    it('should handle invalid JSON output from tools', async () => {
      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        callback(null, 'invalid json output', '');
        return {} as any;
      });

      const result = await (analyzer as any).runESLint('/test/repo', {});

      expect(result).toEqual([]);
    });

    it('should cleanup temp files even on error in Gitleaks', async () => {
      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        callback(null, '', '');
        return {} as any;
      });
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File read error'));
      vi.mocked(fs.unlink).mockResolvedValue();

      const result = await (analyzer as any).runGitleaks('/test/repo', {});

      // エラーが発生しても空配列を返す
      expect(result).toEqual([]);
      // 一時ファイルの削除が試行される
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('gitleaks-report.json'));
    });

    it('should cleanup temp files on success in Gitleaks', async () => {
      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        callback(null, '', '');
        return {} as any;
      });
      vi.mocked(fs.readFile).mockResolvedValue('[{"RuleID":"test","File":"test.js"}]');
      vi.mocked(fs.unlink).mockResolvedValue();

      const result = await (analyzer as any).runGitleaks('/test/repo', {});

      expect(result).toBeDefined();
      // 一時ファイルの削除が試行される
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('gitleaks-report.json'));
    });

    it('should handle invalid JSON in Gitleaks report', async () => {
      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        callback(null, '', '');
        return {} as any;
      });
      vi.mocked(fs.readFile).mockResolvedValue('invalid json');
      vi.mocked(fs.unlink).mockResolvedValue();

      const result = await (analyzer as any).runGitleaks('/test/repo', {});

      expect(result).toEqual([]);
      // 一時ファイルの削除が試行される
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('gitleaks-report.json'));
    });

    it('should handle tool execution errors gracefully in PHPStan', async () => {
      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('Command failed') as any;
        error.stdout = '{"files":{}}';
        callback(error, '', '');
        return {} as any;
      });

      const result = await (analyzer as any).runPHPStan('/test/repo', {});

      // エラーでも stdout がある場合はパースを試みる
      expect(result).toEqual([]);
    });

    it('should handle tool execution errors gracefully in PHPCS', async () => {
      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(fs.readdir).mockResolvedValue(['test.php'] as any);
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('Command failed') as any;
        error.stdout = '{"files":{}}';
        callback(error, '', '');
        return {} as any;
      });

      const result = await (analyzer as any).runPHPCS('/test/repo', {});

      // エラーでも stdout がある場合はパースを試みる
      expect(result).toEqual([]);
    });

    it('should handle tool execution errors gracefully in Snyk', async () => {
      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('Command failed') as any;
        error.stdout = '{}';
        callback(error, '', '');
        return {} as any;
      });

      const result = await (analyzer as any).runSnyk('/test/repo', {});

      // エラーでも stdout がある場合はパースを試みる
      expect(result).toEqual([]);
    });

    it('should apply timeout option to tool execution', async () => {
      vi.mocked(fs.access).mockResolvedValue();
      const mockExecFile = vi.mocked(execFile);

      mockExecFile.mockImplementation((cmd, args, options: any, callback: any) => {
        // timeout オプションが渡されていることを確認
        expect(options.timeout).toBe(60000);
        callback(null, '[]', '');
        return {} as any;
      });

      await (analyzer as any).runESLint('/test/repo', { timeout: 60000 });

      expect(mockExecFile).toHaveBeenCalled();
    });

    it('should use default timeout when not specified', async () => {
      vi.mocked(fs.access).mockResolvedValue();
      const mockExecFile = vi.mocked(execFile);

      mockExecFile.mockImplementation((cmd, args, options: any, callback: any) => {
        // デフォルトタイムアウト（300000ms）が使われることを確認
        expect(options.timeout).toBe(300000);
        callback(null, '[]', '');
        return {} as any;
      });

      await (analyzer as any).runESLint('/test/repo', {});

      expect(mockExecFile).toHaveBeenCalled();
    });
  });

  describe('ESLint result parsing with fix suggestions', () => {
    it('should parse ESLint results with fix suggestions', async () => {
      const eslintResults = [
        {
          filePath: '/test/file.js',
          messages: [
            {
              ruleId: 'no-unused-vars',
              severity: 2,
              message: 'Unused variable',
              line: 10,
              column: 5,
              endLine: 10,
              endColumn: 15,
              fix: {
                range: [100, 110],
                text: ''
              }
            }
          ]
        }
      ];

      const issues = (analyzer as any).parseESLintResults(eslintResults, '/test');

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        tool: AnalyzerTool.ESLint,
        severity: Severity.High,
        rule: 'no-unused-vars',
        message: 'Unused variable',
        file: '/test/file.js',
        line: 10,
        column: 5,
        endLine: 10,
        endColumn: 15
      });
      expect(issues[0].fix).toBeDefined();
      expect(issues[0].fix?.available).toBe(true);
      expect(issues[0].fix?.description).toBe('Auto-fixable');
      expect(issues[0].fix?.code).toBe('');
    });

    it('should parse ESLint results without fix suggestions', async () => {
      const eslintResults = [
        {
          filePath: '/test/file.js',
          messages: [
            {
              ruleId: 'complexity',
              severity: 1,
              message: 'Function is too complex',
              line: 20,
              column: 1
            }
          ]
        }
      ];

      const issues = (analyzer as any).parseESLintResults(eslintResults, '/test');

      expect(issues).toHaveLength(1);
      expect(issues[0].fix).toBeUndefined();
    });
  });

  describe('Category classification', () => {
    it('should categorize security-related rules', () => {
      expect((analyzer as any).categorizeESLintRule('security/detect-unsafe-regex')).toBe(IssueCategory.Security);
      expect((analyzer as any).categorizeESLintRule('no-eval')).toBe(IssueCategory.Security);
      expect((analyzer as any).categorizeESLintRule('no-unsafe-finally')).toBe(IssueCategory.Security);
    });

    it('should categorize complexity-related rules', () => {
      expect((analyzer as any).categorizeESLintRule('complexity')).toBe(IssueCategory.Complexity);
      expect((analyzer as any).categorizeESLintRule('max-depth')).toBe(IssueCategory.Complexity);
      expect((analyzer as any).categorizeESLintRule('max-lines')).toBe(IssueCategory.Complexity);
    });

    it('should categorize performance-related rules', () => {
      expect((analyzer as any).categorizeESLintRule('performance/no-unnecessary-bind')).toBe(IssueCategory.Performance);
    });

    it('should categorize as CodeQuality by default', () => {
      expect((analyzer as any).categorizeESLintRule('no-console')).toBe(IssueCategory.CodeQuality);
      expect((analyzer as any).categorizeESLintRule(null)).toBe(IssueCategory.CodeQuality);
    });

    it('should categorize PHPCS rules by source string', () => {
      expect((analyzer as any).categorizePHPCSRule('security-audit')).toBe(IssueCategory.Security);
      expect((analyzer as any).categorizePHPCSRule('performance-check')).toBe(IssueCategory.Performance);
      expect((analyzer as any).categorizePHPCSRule('complexity-analysis')).toBe(IssueCategory.Complexity);
      expect((analyzer as any).categorizePHPCSRule('documentation-needed')).toBe(IssueCategory.Documentation);
      expect((analyzer as any).categorizePHPCSRule('code-comment-required')).toBe(IssueCategory.Documentation);
      expect((analyzer as any).categorizePHPCSRule(null)).toBe(IssueCategory.CodeQuality);
    });
  });

  describe('analyzeWithProgress', () => {
    it('should call progress callback during analysis', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));
      vi.mocked(fs.readdir).mockResolvedValue([]);
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        callback(null, '', '');
        return {} as any;
      });
      vi.mocked(fs.readFile).mockResolvedValue('[]');
      vi.mocked(fs.unlink).mockResolvedValue();

      const progressCalls: Array<{ current: number; total: number; tool: string }> = [];
      const onProgress = vi.fn((progress) => {
        progressCalls.push(progress);
      });

      await analyzer.analyzeWithProgress(
        '/test/repo',
        { tools: [AnalyzerTool.ESLint, AnalyzerTool.Gitleaks] },
        onProgress
      );

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(progressCalls[0]).toEqual({ current: 1, total: 2, tool: AnalyzerTool.ESLint });
      expect(progressCalls[1]).toEqual({ current: 2, total: 2, tool: AnalyzerTool.Gitleaks });
    });

    it('should work without progress callback', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));
      vi.mocked(fs.readdir).mockResolvedValue([]);
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        callback(null, '', '');
        return {} as any;
      });
      vi.mocked(fs.readFile).mockResolvedValue('[]');
      vi.mocked(fs.unlink).mockResolvedValue();

      const result = await analyzer.analyzeWithProgress(
        '/test/repo',
        { tools: [AnalyzerTool.Gitleaks] }
      );

      expect(result).toBeDefined();
      expect(result.toolResults).toHaveLength(1);
    });

    it('should auto-detect tools when not specified', async () => {
      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });
      vi.mocked(fs.readdir).mockResolvedValue([]);
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        callback(null, '[]', '');
        return {} as any;
      });
      vi.mocked(fs.readFile).mockResolvedValue('[]');
      vi.mocked(fs.unlink).mockResolvedValue();

      const progressCalls: string[] = [];
      await analyzer.analyzeWithProgress(
        '/test/repo',
        {},
        ({ tool }) => { progressCalls.push(tool); }
      );

      // package.json があるので ESLint, Snyk, Gitleaks が選択される
      expect(progressCalls).toContain(AnalyzerTool.ESLint);
      expect(progressCalls).toContain(AnalyzerTool.Snyk);
      expect(progressCalls).toContain(AnalyzerTool.Gitleaks);
    });
  });

  describe('Snyk with multiple package managers', () => {
    it('should run Snyk for composer.json projects', async () => {
      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('composer.json')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        callback(null, '{"vulnerabilities":[]}', '');
        return {} as any;
      });

      const result = await (analyzer as any).runSnyk('/test/repo', {});

      expect(result).toEqual([]);
      expect(execFile).toHaveBeenCalledWith(
        'snyk',
        ['test', '--json'],
        expect.objectContaining({
          cwd: '/test/repo',
          timeout: 300000
        }),
        expect.any(Function)
      );
    });

    it('should run Snyk for package.json projects', async () => {
      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        callback(null, '{"vulnerabilities":[]}', '');
        return {} as any;
      });

      const result = await (analyzer as any).runSnyk('/test/repo', {});

      expect(result).toEqual([]);
      expect(execFile).toHaveBeenCalledWith(
        'snyk',
        ['test', '--json'],
        expect.objectContaining({
          cwd: '/test/repo'
        }),
        expect.any(Function)
      );
    });

    it('should skip Snyk if no package manager files found', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

      const result = await (analyzer as any).runSnyk('/test/repo', {});

      expect(result).toEqual([]);
      expect(execFile).not.toHaveBeenCalled();
    });

    it('should parse Snyk vulnerabilities with severity mapping', async () => {
      const snykResult = {
        vulnerabilities: [
          {
            id: 'SNYK-JS-LODASH-1234',
            title: 'Prototype Pollution',
            packageName: 'lodash',
            version: '4.17.15',
            severity: 'critical',
            url: 'https://snyk.io/vuln/SNYK-JS-LODASH-1234',
            identifiers: {
              CVE: ['CVE-2020-1234']
            },
            fixedIn: ['4.17.21']
          },
          {
            id: 'SNYK-JS-AXIOS-5678',
            title: 'SSRF',
            packageName: 'axios',
            version: '0.19.0',
            severity: 'high',
            url: 'https://snyk.io/vuln/SNYK-JS-AXIOS-5678',
            fixedIn: []
          }
        ]
      };

      const issues = (analyzer as any).parseSnykResults(snykResult, '/test');

      expect(issues).toHaveLength(2);
      expect(issues[0]).toMatchObject({
        tool: AnalyzerTool.Snyk,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        rule: 'SNYK-JS-LODASH-1234',
        message: 'Prototype Pollution in lodash@4.17.15',
        file: 'package.json',
        cve: ['CVE-2020-1234']
      });
      expect(issues[0].fix).toBeDefined();
      expect(issues[0].fix?.description).toBe('Upgrade to lodash@4.17.21');
      expect(issues[0].references).toContain('https://snyk.io/vuln/SNYK-JS-LODASH-1234');

      expect(issues[1]).toMatchObject({
        severity: Severity.High,
        rule: 'SNYK-JS-AXIOS-5678'
      });
      expect(issues[1].fix).toBeUndefined();
    });

    it('should map all Snyk severity levels correctly', async () => {
      const snykResult = {
        vulnerabilities: [
          {
            id: 'SNYK-CRITICAL',
            title: 'Critical vulnerability',
            packageName: 'pkg1',
            version: '1.0.0',
            severity: 'critical',
            url: 'https://snyk.io/vuln/1'
          },
          {
            id: 'SNYK-HIGH',
            title: 'High vulnerability',
            packageName: 'pkg2',
            version: '2.0.0',
            severity: 'high',
            url: 'https://snyk.io/vuln/2'
          },
          {
            id: 'SNYK-MEDIUM',
            title: 'Medium vulnerability',
            packageName: 'pkg3',
            version: '3.0.0',
            severity: 'medium',
            url: 'https://snyk.io/vuln/3'
          },
          {
            id: 'SNYK-LOW',
            title: 'Low vulnerability',
            packageName: 'pkg4',
            version: '4.0.0',
            severity: 'low',
            url: 'https://snyk.io/vuln/4'
          },
          {
            id: 'SNYK-UNKNOWN',
            title: 'Unknown severity',
            packageName: 'pkg5',
            version: '5.0.0',
            severity: 'unknown',
            url: 'https://snyk.io/vuln/5'
          }
        ]
      };

      const issues = (analyzer as any).parseSnykResults(snykResult, '/test');

      expect(issues).toHaveLength(5);
      expect(issues[0].severity).toBe(Severity.Critical);
      expect(issues[1].severity).toBe(Severity.High);
      expect(issues[2].severity).toBe(Severity.Medium);
      expect(issues[3].severity).toBe(Severity.Low);
      expect(issues[4].severity).toBe(Severity.Info);
    });

    it('should handle invalid JSON in Snyk output', async () => {
      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('Command failed') as any;
        error.stdout = 'invalid json {{{';
        callback(error, '', '');
        return {} as any;
      });

      const result = await (analyzer as any).runSnyk('/test/repo', {});

      expect(result).toEqual([]);
    });
  });

  describe('Gitleaks with tags', () => {
    it('should parse Gitleaks findings with tags', async () => {
      const findings = [
        {
          RuleID: 'aws-access-key',
          Description: 'AWS Access Key',
          Match: 'AKIAIOSFODNN7EXAMPLE',
          File: 'config.js',
          StartLine: 10,
          Secret: 'AKIA...',
          Tags: ['aws', 'credentials']
        },
        {
          RuleID: 'generic-api-key',
          Description: 'Generic API Key',
          Match: 'sk_test_4eC39HqLyjWDarjtT1zdp7dc',
          File: 'api.js',
          StartLine: 20,
          Secret: 'sk_...',
          Tags: ['api-key', 'sensitive']
        },
        {
          RuleID: 'github-token',
          Description: 'GitHub Personal Access Token',
          Match: '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',
          File: 'token.js',
          StartLine: 30,
          Secret: 'ghp_...',
          Tags: null
        }
      ];

      const issues = (analyzer as any).parseGitleaksResults(findings, '/test');

      expect(issues).toHaveLength(3);

      // First finding with tags
      expect(issues[0]).toMatchObject({
        tool: AnalyzerTool.Gitleaks,
        severity: Severity.Critical,
        category: IssueCategory.Security,
        rule: 'aws-access-key',
        message: 'AWS Access Key: AKIAIOSFODNN7EXAMPLE',
        file: 'config.js',
        line: 10,
        snippet: 'AKIA...'
      });
      expect(issues[0].references).toEqual(['Tag: aws', 'Tag: credentials']);

      // Second finding with tags
      expect(issues[1].references).toEqual(['Tag: api-key', 'Tag: sensitive']);

      // Third finding without tags
      expect(issues[2].references).toBeUndefined();
    });

    it('should handle Gitleaks findings with missing optional fields', async () => {
      const findings = [
        {
          RuleID: 'test-rule',
          Description: 'Test finding',
          Match: 'matched-secret',
          File: null,
          StartLine: undefined,
          Secret: 'secret',
          Tags: null
        }
      ];

      const issues = (analyzer as any).parseGitleaksResults(findings, '/test');

      expect(issues).toHaveLength(1);
      expect(issues[0].file).toBe('unknown');
      expect(issues[0].line).toBeUndefined();
      expect(issues[0].references).toBeUndefined();
    });
  });

  describe('RoslynAnalyzer / C# Pattern Analysis', () => {
    describe('selectTools with .csproj', () => {
      it('should select RoslynAnalyzer when .csproj exists', async () => {
        vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));
        vi.mocked(fs.readdir).mockResolvedValue(['MyProject.csproj', 'Program.cs'] as any);

        const tools = await (analyzer as any).selectTools('/test/repo');

        expect(tools).toContain(AnalyzerTool.RoslynAnalyzer);
      });
    });

    describe('detectTargetFramework', () => {
      it('should detect netcoreapp2.1', () => {
        const csproj = '<Project><PropertyGroup><TargetFramework>netcoreapp2.1</TargetFramework></PropertyGroup></Project>';
        expect((analyzer as any).detectTargetFramework(csproj)).toBe('netcoreapp2.1');
      });

      it('should detect net8.0', () => {
        const csproj = '<Project><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>';
        expect((analyzer as any).detectTargetFramework(csproj)).toBe('net8.0');
      });

      it('should return unknown for missing TargetFramework', () => {
        const csproj = '<Project></Project>';
        expect((analyzer as any).detectTargetFramework(csproj)).toBe('unknown');
      });
    });

    describe('selectDotnetDockerImage', () => {
      it('should return null for netcoreapp2.1 (old framework)', () => {
        expect((analyzer as any).selectDotnetDockerImage('netcoreapp2.1')).toBeNull();
      });

      it('should return null for netcoreapp3.1 (old framework)', () => {
        expect((analyzer as any).selectDotnetDockerImage('netcoreapp3.1')).toBeNull();
      });

      it('should return sdk:6.0 for net6.0', () => {
        expect((analyzer as any).selectDotnetDockerImage('net6.0')).toBe('mcr.microsoft.com/dotnet/sdk:6.0-alpine');
      });

      it('should return sdk:8.0 for net8.0', () => {
        expect((analyzer as any).selectDotnetDockerImage('net8.0')).toBe('mcr.microsoft.com/dotnet/sdk:8.0-alpine');
      });

      it('should return sdk:9.0 for net9.0', () => {
        expect((analyzer as any).selectDotnetDockerImage('net9.0')).toBe('mcr.microsoft.com/dotnet/sdk:9.0-alpine');
      });

      it('should return null for unknown framework', () => {
        expect((analyzer as any).selectDotnetDockerImage('unknown')).toBeNull();
      });
    });

    describe('parseDotnetBuildWarnings', () => {
      it('should parse MSBuild warning output', () => {
        const output = [
          'Microsoft (R) Build Engine version 17.0',
          '/build/Controllers/HomeController.cs(10,5): warning CA2100: Review SQL queries for security vulnerabilities [/build/MyProject.csproj]',
          '/build/Program.cs(20,1): warning CS0168: The variable \'ex\' is declared but never used [/build/MyProject.csproj]',
          'Build succeeded.'
        ].join('\n');

        const issues = (analyzer as any).parseDotnetBuildWarnings(output, '/test');

        expect(issues).toHaveLength(2);
        expect(issues[0]).toMatchObject({
          tool: AnalyzerTool.RoslynAnalyzer,
          severity: Severity.Critical, // CA2100 is security
          category: IssueCategory.Security,
          rule: 'CA2100',
          message: 'Review SQL queries for security vulnerabilities',
          file: 'Controllers/HomeController.cs',
          line: 10,
          column: 5
        });
        expect(issues[1]).toMatchObject({
          tool: AnalyzerTool.RoslynAnalyzer,
          severity: Severity.Low, // CS-prefixed is Low
          rule: 'CS0168',
          file: 'Program.cs',
          line: 20,
          column: 1
        });
      });

      it('should parse MSBuild error output', () => {
        const output = '/build/Startup.cs(5,10): error CS1002: ; expected [/build/MyProject.csproj]\n';

        const issues = (analyzer as any).parseDotnetBuildWarnings(output, '/test');

        expect(issues).toHaveLength(1);
        expect(issues[0]).toMatchObject({
          severity: Severity.High, // errors are High
          rule: 'CS1002'
        });
      });

      it('should handle empty output', () => {
        const issues = (analyzer as any).parseDotnetBuildWarnings('', '/test');
        expect(issues).toHaveLength(0);
      });

      it('should strip /build/ prefix from file paths', () => {
        const output = '/build/src/Controllers/Test.cs(1,1): warning CA1234: Test [/build/MyProject.csproj]\n';

        const issues = (analyzer as any).parseDotnetBuildWarnings(output, '/test');

        expect(issues[0].file).toBe('src/Controllers/Test.cs');
      });
    });

    describe('mapDotnetDiagnosticSeverity', () => {
      it('should map CA2100 (SQL injection) to Critical', () => {
        expect((analyzer as any).mapDotnetDiagnosticSeverity('CA2100', 'warning')).toBe(Severity.Critical);
      });

      it('should map CA3001 (SQL injection data flow) to Critical', () => {
        expect((analyzer as any).mapDotnetDiagnosticSeverity('CA3001', 'warning')).toBe(Severity.Critical);
      });

      it('should map CA5350 (weak crypto) to Critical', () => {
        expect((analyzer as any).mapDotnetDiagnosticSeverity('CA5350', 'warning')).toBe(Severity.Critical);
      });

      it('should map CA3147 (CSRF) to High', () => {
        expect((analyzer as any).mapDotnetDiagnosticSeverity('CA3147', 'warning')).toBe(Severity.High);
      });

      it('should map error level to High', () => {
        expect((analyzer as any).mapDotnetDiagnosticSeverity('CS1002', 'error')).toBe(Severity.High);
      });

      it('should map generic CA to Medium', () => {
        expect((analyzer as any).mapDotnetDiagnosticSeverity('CA1000', 'warning')).toBe(Severity.Medium);
      });

      it('should map CS warnings to Low', () => {
        expect((analyzer as any).mapDotnetDiagnosticSeverity('CS0168', 'warning')).toBe(Severity.Low);
      });
    });

    describe('categorizeDotnetDiagnostic', () => {
      it('should categorize CA2xxx as Security', () => {
        expect((analyzer as any).categorizeDotnetDiagnostic('CA2100')).toBe(IssueCategory.Security);
      });

      it('should categorize CA3xxx as Security', () => {
        expect((analyzer as any).categorizeDotnetDiagnostic('CA3001')).toBe(IssueCategory.Security);
      });

      it('should categorize CA5xxx as Security', () => {
        expect((analyzer as any).categorizeDotnetDiagnostic('CA5350')).toBe(IssueCategory.Security);
      });

      it('should categorize CA18xx as Performance', () => {
        expect((analyzer as any).categorizeDotnetDiagnostic('CA1801')).toBe(IssueCategory.Performance);
      });

      it('should categorize CA15xx as Maintainability', () => {
        expect((analyzer as any).categorizeDotnetDiagnostic('CA1500')).toBe(IssueCategory.Maintainability);
      });

      it('should categorize other codes as CodeQuality', () => {
        expect((analyzer as any).categorizeDotnetDiagnostic('CA1000')).toBe(IssueCategory.CodeQuality);
        expect((analyzer as any).categorizeDotnetDiagnostic('CS0168')).toBe(IssueCategory.CodeQuality);
      });
    });

    describe('findFilesByExtension', () => {
      it('should find files with matching extension', async () => {
        vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
          const dirStr = String(dir);
          if (dirStr.endsWith('repo')) {
            return ['Program.cs', 'App.csproj', 'Controllers', 'README.md'] as any;
          }
          if (dirStr.endsWith('Controllers')) {
            return ['HomeController.cs', 'ApiController.cs'] as any;
          }
          throw new Error('Not a directory');
        });

        const files = await (analyzer as any).findFilesByExtension('/test/repo', '.cs');

        expect(files).toHaveLength(3);
        expect(files).toContain(path.join('/test/repo', 'Program.cs'));
        expect(files).toContain(path.join('/test/repo', 'Controllers', 'HomeController.cs'));
        expect(files).toContain(path.join('/test/repo', 'Controllers', 'ApiController.cs'));
      });

      it('should skip excluded directories', async () => {
        vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
          const dirStr = String(dir);
          if (dirStr.endsWith('repo')) {
            return ['Program.cs', '.git', 'bin', 'obj', 'node_modules', 'src'] as any;
          }
          if (dirStr.endsWith('src')) {
            return ['App.cs'] as any;
          }
          throw new Error('Not a directory');
        });

        const files = await (analyzer as any).findFilesByExtension('/test/repo', '.cs');

        expect(files).toHaveLength(2); // Program.cs + src/App.cs
      });

      it('should handle empty directories', async () => {
        vi.mocked(fs.readdir).mockResolvedValue([] as any);

        const files = await (analyzer as any).findFilesByExtension('/test/repo', '.cs');

        expect(files).toHaveLength(0);
      });

      it('should handle readdir errors gracefully', async () => {
        vi.mocked(fs.readdir).mockRejectedValue(new Error('Permission denied'));

        const files = await (analyzer as any).findFilesByExtension('/test/repo', '.cs');

        expect(files).toHaveLength(0);
      });
    });

    describe('C# pattern analysis rules', () => {
      // Helper to run pattern analysis on a single file
      const analyzeContent = async (content: string, fileName: string = 'TestController.cs') => {
        // Mock readdir to return one file
        vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
          const dirStr = String(dir);
          if (dirStr.endsWith('repo')) {
            return [fileName] as any;
          }
          throw new Error('Not a directory');
        });

        // Mock readFile to return the content
        vi.mocked(fs.readFile).mockResolvedValue(content);

        return (analyzer as any).runCSharpPatternAnalysis('/test/repo');
      };

      it('should detect SQL injection via string interpolation', async () => {
        const content = `
public IActionResult Search(string name)
{
    var sql = $"SELECT * FROM Users WHERE Name = '{name}'";
    return View();
}`;
        const issues = await analyzeContent(content);

        const sqlIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-001');
        expect(sqlIssues).toHaveLength(1);
        expect(sqlIssues[0].severity).toBe(Severity.Critical);
        expect(sqlIssues[0].category).toBe(IssueCategory.Security);
      });

      it('should detect hardcoded API keys', async () => {
        const content = `
var apiKey = "sk-1234567890abcdefghij";
`;
        const issues = await analyzeContent(content);

        const keyIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-002');
        expect(keyIssues).toHaveLength(1);
        expect(keyIssues[0].severity).toBe(Severity.Critical);
      });

      it('should detect hardcoded passwords', async () => {
        const content = `
var AdminPassword = "SuperSecret123";
`;
        const issues = await analyzeContent(content);

        const pwdIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-003');
        expect(pwdIssues).toHaveLength(1);
        expect(pwdIssues[0].severity).toBe(Severity.Critical);
      });

      it('should detect DeveloperExceptionPage usage', async () => {
        const content = `
public void Configure(IApplicationBuilder app)
{
    app.UseDeveloperExceptionPage();
}`;
        const issues = await analyzeContent(content, 'Startup.cs');

        const devExIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-004');
        expect(devExIssues).toHaveLength(1);
        expect(devExIssues[0].severity).toBe(Severity.Critical);
      });

      it('should detect plaintext password storage', async () => {
        const content = `
existing.Password = employee.Password;
`;
        const issues = await analyzeContent(content);

        const pwdIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-005');
        expect(pwdIssues).toHaveLength(1);
        expect(pwdIssues[0].severity).toBe(Severity.Critical);
      });

      it('should detect sensitive data in export', async () => {
        const content = `
csv.AppendLine($"{emp.Id},{emp.Name},{emp.Password},{emp.SSN}");
`;
        const issues = await analyzeContent(content);

        const exportIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-006');
        expect(exportIssues.length).toBeGreaterThanOrEqual(1);
        expect(exportIssues[0].severity).toBe(Severity.Critical);
      });

      it('should detect Html.Raw (XSS)', async () => {
        const content = `
@Html.Raw(Model.Description)
`;
        const issues = await analyzeContent(content, 'View.cshtml');

        const xssIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-007');
        expect(xssIssues).toHaveLength(1);
        expect(xssIssues[0].severity).toBe(Severity.High);
      });

      it('should detect AllowAnyOrigin (loose CORS)', async () => {
        const content = `
builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
`;
        const issues = await analyzeContent(content, 'Startup.cs');

        const corsIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-008');
        expect(corsIssues).toHaveLength(1);
        expect(corsIssues[0].severity).toBe(Severity.High);
      });

      it('should detect commented out HTTPS redirection', async () => {
        const content = `
// app.UseHttpsRedirection();
`;
        const issues = await analyzeContent(content, 'Startup.cs');

        const httpsIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-010');
        expect(httpsIssues).toHaveLength(1);
        expect(httpsIssues[0].severity).toBe(Severity.High);
      });

      it('should detect HttpOnly = false', async () => {
        const content = `
options.Cookie.HttpOnly = false;
`;
        const issues = await analyzeContent(content, 'Startup.cs');

        const cookieIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-011');
        expect(cookieIssues).toHaveLength(1);
        expect(cookieIssues[0].severity).toBe(Severity.High);
      });

      it('should detect CookieSecurePolicy.None', async () => {
        const content = `
options.Cookie.SecurePolicy = CookieSecurePolicy.None;
`;
        const issues = await analyzeContent(content, 'Startup.cs');

        const secureIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-012');
        expect(secureIssues).toHaveLength(1);
        expect(secureIssues[0].severity).toBe(Severity.High);
      });

      it('should detect missing [Authorize] on POST endpoints', async () => {
        const content = `
public class EmployeeController : Controller
{
    [HttpPost]
    public IActionResult Create(Employee emp) { return View(); }

    [HttpPost]
    public IActionResult Update(Employee emp) { return View(); }
}`;
        const issues = await analyzeContent(content);

        const authIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-013');
        expect(authIssues).toHaveLength(2); // 2 [HttpPost] without [Authorize]
      });

      it('should NOT flag [HttpPost] when [Authorize] is present', async () => {
        const content = `
[Authorize]
public class EmployeeController : Controller
{
    [HttpPost]
    public IActionResult Create(Employee emp) { return View(); }
}`;
        const issues = await analyzeContent(content);

        const authIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-013');
        expect(authIssues).toHaveLength(0);
      });

      it('should detect AddSingleton<DbContext>', async () => {
        const content = `
services.AddSingleton<ApplicationDbContext>(provider => { });
`;
        const issues = await analyzeContent(content, 'Startup.cs');

        const dbIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-CQ-001');
        expect(dbIssues).toHaveLength(1);
        expect(dbIssues[0].severity).toBe(Severity.High);
      });

      it('should detect static mutable collections', async () => {
        const content = `
private static List<Employee> cachedEmployees = new List<Employee>();
`;
        const issues = await analyzeContent(content);

        const staticIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-CQ-002');
        expect(staticIssues).toHaveLength(1);
        expect(staticIssues[0].severity).toBe(Severity.Medium);
      });

      it('should detect catch-all exception handling', async () => {
        const content = `
try { DoSomething(); } catch (Exception ex) { Log(ex); }
`;
        const issues = await analyzeContent(content);

        const catchIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-CQ-003');
        expect(catchIssues).toHaveLength(1);
        expect(catchIssues[0].severity).toBe(Severity.Medium);
      });

      it('should detect int.Parse usage', async () => {
        const content = `
var id = int.Parse(input);
`;
        const issues = await analyzeContent(content);

        const parseIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-CQ-004');
        expect(parseIssues).toHaveLength(1);
        expect(parseIssues[0].severity).toBe(Severity.Medium);
      });

      it('should detect global static DI-managed objects', async () => {
        const content = `
public static IConfiguration GlobalConfig;
`;
        const issues = await analyzeContent(content, 'Startup.cs');

        const globalIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-CQ-005');
        expect(globalIssues).toHaveLength(1);
      });

      it('should detect synchronous DB operations in controllers', async () => {
        const content = `
public IActionResult Index()
{
    var employees = _context.Employees.ToList();
    return View(employees);
}`;
        const issues = await analyzeContent(content);

        const syncIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-PERF-001');
        expect(syncIssues).toHaveLength(1);
        expect(syncIssues[0].severity).toBe(Severity.High);
        expect(syncIssues[0].category).toBe(IssueCategory.Performance);
      });

      it('should skip commented-out code (except comment detection rules)', async () => {
        const content = `
// var sql = $"SELECT * FROM Users WHERE Name = '{name}'";
// AllowAnyOrigin()
`;
        const issues = await analyzeContent(content, 'Test.cs');

        // SQL injection and CORS rules should NOT fire on commented lines
        const sqlIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-001');
        const corsIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-008');
        expect(sqlIssues).toHaveLength(0);
        expect(corsIssues).toHaveLength(0);
      });

      it('should detect exception details exposed to users', async () => {
        const content = `
return Content($"Error: {ex.Message}");
`;
        const issues = await analyzeContent(content);

        const exIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-015');
        expect(exIssues).toHaveLength(1);
        expect(exIssues[0].severity).toBe(Severity.Medium);
      });

      it('should return empty array for no .cs files', async () => {
        vi.mocked(fs.readdir).mockResolvedValue(['index.html', 'style.css'] as any);

        const issues = await (analyzer as any).runCSharpPatternAnalysis('/test/repo');

        expect(issues).toHaveLength(0);
      });
    });

    describe('runRoslynAnalyzer integration', () => {
      it('should fall back to pattern analysis for old frameworks', async () => {
        // Mock: .csproj exists with netcoreapp2.1
        vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
          const dirStr = String(dir);
          if (dirStr.endsWith('repo')) {
            return ['LegacySystem.csproj', 'Program.cs'] as any;
          }
          throw new Error('Not a directory');
        });

        vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
          const pathStr = String(filePath);
          if (pathStr.endsWith('.csproj')) {
            return '<Project><PropertyGroup><TargetFramework>netcoreapp2.1</TargetFramework></PropertyGroup></Project>';
          }
          if (pathStr.endsWith('.cs')) {
            return 'app.UseDeveloperExceptionPage();';
          }
          return '';
        });

        const issues = await (analyzer as any).runRoslynAnalyzer('/test/repo', {});

        // Should have pattern analysis results (not Docker)
        expect(issues.length).toBeGreaterThanOrEqual(1);
        expect(issues.some((i: AnalysisIssue) => i.rule === 'CS-SEC-004')).toBe(true);
      });

      it('should return empty when no .csproj files exist', async () => {
        vi.mocked(fs.readdir).mockResolvedValue(['index.html'] as any);

        const issues = await (analyzer as any).runRoslynAnalyzer('/test/repo', {});

        expect(issues).toHaveLength(0);
      });

      it('should skip Docker when useDocker is false', async () => {
        vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
          const dirStr = String(dir);
          if (dirStr.endsWith('repo')) {
            return ['App.csproj', 'Program.cs'] as any;
          }
          throw new Error('Not a directory');
        });

        vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
          const pathStr = String(filePath);
          if (pathStr.endsWith('.csproj')) {
            return '<Project><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>';
          }
          if (pathStr.endsWith('.cs')) {
            return 'var x = int.Parse(input);';
          }
          return '';
        });

        // Docker should not be called
        const mockExecFile = vi.mocked(execFile);
        mockExecFile.mockClear();

        const issues = await (analyzer as any).runRoslynAnalyzer('/test/repo', { useDocker: false });

        // Should have pattern analysis results
        expect(issues.length).toBeGreaterThanOrEqual(1);
        // Docker should not have been invoked
        expect(mockExecFile).not.toHaveBeenCalled();
      });

      it('should handle Docker failure gracefully and fall back to pattern analysis', async () => {
        vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
          const dirStr = String(dir);
          if (dirStr.endsWith('repo')) {
            return ['App.csproj', 'Startup.cs'] as any;
          }
          throw new Error('Not a directory');
        });

        vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
          const pathStr = String(filePath);
          if (pathStr.endsWith('.csproj')) {
            return '<Project><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>';
          }
          if (pathStr.endsWith('.cs')) {
            return 'app.UseDeveloperExceptionPage();';
          }
          return '';
        });

        // Mock Docker execution to fail
        vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
          callback(new Error('Docker not found'), '', '');
          return {} as any;
        });

        const issues = await (analyzer as any).runRoslynAnalyzer('/test/repo', {});

        // Should fall back to pattern analysis
        expect(issues.length).toBeGreaterThanOrEqual(1);
        expect(issues.some((i: AnalysisIssue) => i.rule === 'CS-SEC-004')).toBe(true);
      });
    });

    describe('sensitive data in ViewBag', () => {
      it('should detect sensitive data passed via ViewBag', async () => {
        vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
          const dirStr = String(dir);
          if (dirStr.endsWith('repo')) {
            return ['EmployeeController.cs'] as any;
          }
          throw new Error('Not a directory');
        });

        vi.mocked(fs.readFile).mockResolvedValue(`
ViewBag.PasswordHash = employee.Password;
ViewBag.SSN = employee.SocialSecurityNumber;
ViewBag.Salary = employee.Salary;
`);

        const issues = await (analyzer as any).runCSharpPatternAnalysis('/test/repo');

        const sensitiveIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-014');
        expect(sensitiveIssues.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('C# additional pattern rules', () => {
      const analyzeContent = async (content: string, fileName: string = 'TestController.cs') => {
        vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
          const dirStr = String(dir);
          if (dirStr.endsWith('repo')) {
            return [fileName] as any;
          }
          throw new Error('Not a directory');
        });
        vi.mocked(fs.readFile).mockResolvedValue(content);
        return (analyzer as any).runCSharpPatternAnalysis('/test/repo');
      };

      it('should detect UseUrls with HTTP', async () => {
        const content = `.UseUrls("http://*:5000", "https://*:5001")`;
        const issues = await analyzeContent(content, 'Program.cs');
        const httpIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-022');
        expect(httpIssues).toHaveLength(1);
        expect(httpIssues[0].severity).toBe(Severity.High);
      });

      it('should detect commented out UseHsts', async () => {
        const content = `// app.UseHsts();`;
        const issues = await analyzeContent(content, 'Startup.cs');
        const hstsIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-SEC-023');
        expect(hstsIssues).toHaveLength(1);
        expect(hstsIssues[0].severity).toBe(Severity.Medium);
      });

      it('should detect missing ModelState.IsValid check', async () => {
        const content = `
[HttpPost]
public IActionResult Create(Employee emp) { _context.Add(emp); return View(); }
`;
        const issues = await analyzeContent(content);
        const modelIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-CQ-007');
        expect(modelIssues).toHaveLength(1);
      });

      it('should NOT flag CS-CQ-007 when ModelState.IsValid is present', async () => {
        const content = `
[HttpPost]
public IActionResult Create(Employee emp) {
    if (!ModelState.IsValid) return View(emp);
    _context.Add(emp);
    return View();
}`;
        const issues = await analyzeContent(content);
        const modelIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-CQ-007');
        expect(modelIssues).toHaveLength(0);
      });

      it('should detect deprecated AddMvc()', async () => {
        const content = `services.AddMvc();`;
        const issues = await analyzeContent(content, 'Startup.cs');
        const mvcIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CS-CQ-008');
        expect(mvcIssues).toHaveLength(1);
      });
    });

    describe('Common pattern analysis - Config security rules', () => {
      const analyzeCommon = async (content: string, fileName: string) => {
        vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
          const dirStr = String(dir);
          if (dirStr.endsWith('repo')) {
            return [fileName] as any;
          }
          throw new Error('Not a directory');
        });
        vi.mocked(fs.readFile).mockResolvedValue(content);
        return (analyzer as any).runCommonPatternAnalysis('/test/repo');
      };

      it('should detect connection string secrets in appsettings.json', async () => {
        const content = `"DefaultConnection": "Server=db;Database=App;Password=Secret123;"`;
        const issues = await analyzeCommon(content, 'appsettings.json');
        const configIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CONFIG-SEC-001');
        expect(configIssues).toHaveLength(1);
        expect(configIssues[0].severity).toBe(Severity.Critical);
      });

      it('should detect API keys in config files', async () => {
        const content = `"ApiKey": "pk_live_abc123xyz789defghijklmno"`;
        const issues = await analyzeCommon(content, 'appsettings.json');
        const keyIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CONFIG-SEC-002');
        expect(keyIssues).toHaveLength(1);
        expect(keyIssues[0].severity).toBe(Severity.Critical);
      });

      it('should detect SECRET_KEY in settings.py', async () => {
        const content = `SECRET_KEY = 'django-insecure-abc123def456ghi789'`;
        const issues = await analyzeCommon(content, 'settings.py');
        const secretIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CONFIG-SEC-003');
        expect(secretIssues).toHaveLength(1);
        expect(secretIssues[0].severity).toBe(Severity.Critical);
      });

      it('should detect Debug log level in appsettings.json', async () => {
        const content = `"Default": "Debug"`;
        const issues = await analyzeCommon(content, 'appsettings.json');
        const debugIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CONFIG-SEC-004');
        expect(debugIssues).toHaveLength(1);
      });

      it('should detect DEBUG=True in settings.py', async () => {
        const content = `DEBUG = True`;
        const issues = await analyzeCommon(content, 'settings.py');
        const debugIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CONFIG-SEC-005');
        expect(debugIssues).toHaveLength(1);
      });

      it('should detect verify=False in Python files', async () => {
        const content = `response = requests.post(url, data=data, verify=False)`;
        const issues = await analyzeCommon(content, 'views.py');
        const sslIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CONFIG-SEC-006');
        expect(sslIssues).toHaveLength(1);
      });

      it('should detect hardcoded passwords in JSON config files', async () => {
        const content = `"Password": "admin123"`;
        const issues = await analyzeCommon(content, 'appsettings.json');
        const pwdIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CONFIG-SEC-007');
        expect(pwdIssues).toHaveLength(1);
        expect(pwdIssues[0].severity).toBe(Severity.Critical);
      });

      it('should not duplicate CONFIG-SEC-007 with connection string passwords', async () => {
        const content = `"DefaultConnection": "Server=db;Database=App;Password=Secret123;"`;
        const issues = await analyzeCommon(content, 'appsettings.json');
        const pwdIssues = issues.filter((i: AnalysisIssue) => i.rule === 'CONFIG-SEC-007');
        expect(pwdIssues).toHaveLength(0);
      });
    });

    describe('Common pattern analysis - Dependency rules', () => {
      const analyzeCommon = async (content: string, fileName: string) => {
        vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
          const dirStr = String(dir);
          if (dirStr.endsWith('repo')) {
            return [fileName] as any;
          }
          throw new Error('Not a directory');
        });
        vi.mocked(fs.readFile).mockResolvedValue(content);
        return (analyzer as any).runCommonPatternAnalysis('/test/repo');
      };

      it('should detect EOL .NET framework in .csproj', async () => {
        const content = `<TargetFramework>netcoreapp2.1</TargetFramework>`;
        const issues = await analyzeCommon(content, 'App.csproj');
        const depIssues = issues.filter((i: AnalysisIssue) => i.rule === 'DEP-001');
        expect(depIssues).toHaveLength(1);
        expect(depIssues[0].severity).toBe(Severity.High);
      });

      it('should detect vulnerable Newtonsoft.Json', async () => {
        const content = `<PackageReference Include="Newtonsoft.Json" Version="11.0.2" />`;
        const issues = await analyzeCommon(content, 'App.csproj');
        const depIssues = issues.filter((i: AnalysisIssue) => i.rule === 'DEP-002');
        expect(depIssues).toHaveLength(1);
      });

      it('should detect vulnerable System.Data.SqlClient', async () => {
        const content = `<PackageReference Include="System.Data.SqlClient" Version="4.5.0" />`;
        const issues = await analyzeCommon(content, 'App.csproj');
        const depIssues = issues.filter((i: AnalysisIssue) => i.rule === 'DEP-003');
        expect(depIssues).toHaveLength(1);
      });

      it('should detect EOL Django in requirements.txt', async () => {
        const content = `Django==2.0.1`;
        const issues = await analyzeCommon(content, 'requirements.txt');
        const depIssues = issues.filter((i: AnalysisIssue) => i.rule === 'DEP-004');
        expect(depIssues).toHaveLength(1);
      });

      it('should detect EOL Laravel in composer.json', async () => {
        const content = `"laravel/framework": "^7.0"`;
        const issues = await analyzeCommon(content, 'composer.json');
        const depIssues = issues.filter((i: AnalysisIssue) => i.rule === 'DEP-005');
        expect(depIssues).toHaveLength(1);
      });
    });

    describe('Common pattern analysis - PHP rules', () => {
      const analyzeCommon = async (content: string, fileName: string) => {
        vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
          const dirStr = String(dir);
          if (dirStr.endsWith('repo')) {
            return [fileName] as any;
          }
          throw new Error('Not a directory');
        });
        vi.mocked(fs.readFile).mockResolvedValue(content);
        return (analyzer as any).runCommonPatternAnalysis('/test/repo');
      };

      it('should detect SQL injection in PHP (DB::raw)', async () => {
        const content = `$users = DB::select("SELECT * FROM users WHERE id = " . $id);`;
        const issues = await analyzeCommon(content, 'UserController.php');
        const sqlIssues = issues.filter((i: AnalysisIssue) => i.rule === 'PHP-SEC-001');
        expect(sqlIssues).toHaveLength(1);
        expect(sqlIssues[0].severity).toBe(Severity.Critical);
      });

      it('should detect MD5 password hashing in PHP', async () => {
        const content = `$hashed = md5($password);`;
        const issues = await analyzeCommon(content, 'AuthController.php');
        const md5Issues = issues.filter((i: AnalysisIssue) => i.rule === 'PHP-SEC-002');
        expect(md5Issues).toHaveLength(1);
      });

      it('should detect Blade unescaped output', async () => {
        const content = `{!! $user->name !!}`;
        const issues = await analyzeCommon(content, 'show.blade.php');
        const xssIssues = issues.filter((i: AnalysisIssue) => i.rule === 'PHP-SEC-003');
        expect(xssIssues).toHaveLength(1);
      });
    });

    describe('Common pattern analysis - JavaScript/TypeScript rules', () => {
      const analyzeCommon = async (content: string, fileName: string) => {
        vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
          const dirStr = String(dir);
          if (dirStr.endsWith('repo')) {
            return [fileName] as any;
          }
          throw new Error('Not a directory');
        });
        vi.mocked(fs.readFile).mockResolvedValue(content);
        return (analyzer as any).runCommonPatternAnalysis('/test/repo');
      };

      it('should detect dangerouslySetInnerHTML', async () => {
        const content = `<div dangerouslySetInnerHTML={{__html: userInput}} />`;
        const issues = await analyzeCommon(content, 'Component.tsx');
        const xssIssues = issues.filter((i: AnalysisIssue) => i.rule === 'JS-SEC-001');
        expect(xssIssues).toHaveLength(1);
        expect(xssIssues[0].severity).toBe(Severity.Critical);
      });

      it('should detect eval()', async () => {
        const content = `const result = eval(userInput);`;
        const issues = await analyzeCommon(content, 'helpers.ts');
        const evalIssues = issues.filter((i: AnalysisIssue) => i.rule === 'JS-SEC-002');
        expect(evalIssues).toHaveLength(1);
      });

      it('should detect innerHTML assignment', async () => {
        const content = `element.innerHTML = userContent;`;
        const issues = await analyzeCommon(content, 'editor.js');
        const htmlIssues = issues.filter((i: AnalysisIssue) => i.rule === 'JS-SEC-003');
        expect(htmlIssues).toHaveLength(1);
      });

      it('should detect sensitive data in localStorage', async () => {
        const content = `localStorage.setItem('token', authToken);`;
        const issues = await analyzeCommon(content, 'auth.ts');
        const storageIssues = issues.filter((i: AnalysisIssue) => i.rule === 'JS-SEC-004');
        expect(storageIssues).toHaveLength(1);
      });

      it('should detect sensitive data in console.log', async () => {
        const content = `console.log('Login:', { password: user.password });`;
        const issues = await analyzeCommon(content, 'api.ts');
        const logIssues = issues.filter((i: AnalysisIssue) => i.rule === 'JS-SEC-005');
        expect(logIssues).toHaveLength(1);
      });
    });

    describe('Common pattern analysis - Python rules', () => {
      const analyzeCommon = async (content: string, fileName: string) => {
        vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
          const dirStr = String(dir);
          if (dirStr.endsWith('repo')) {
            return [fileName] as any;
          }
          throw new Error('Not a directory');
        });
        vi.mocked(fs.readFile).mockResolvedValue(content);
        return (analyzer as any).runCommonPatternAnalysis('/test/repo');
      };

      it('should detect SQL injection via f-string', async () => {
        const content = `cursor.execute(f"SELECT * FROM users WHERE name = '{name}'")`;
        const issues = await analyzeCommon(content, 'views.py');
        const sqlIssues = issues.filter((i: AnalysisIssue) => i.rule === 'PY-SEC-001');
        expect(sqlIssues).toHaveLength(1);
        expect(sqlIssues[0].severity).toBe(Severity.Critical);
      });

      it('should detect MD5 usage in Python', async () => {
        const content = `password_hash = hashlib.md5(password.encode()).hexdigest()`;
        const issues = await analyzeCommon(content, 'auth.py');
        const md5Issues = issues.filter((i: AnalysisIssue) => i.rule === 'PY-SEC-002');
        expect(md5Issues).toHaveLength(1);
      });

      it('should detect CORS_ALLOW_ALL_ORIGINS', async () => {
        const content = `CORS_ALLOW_ALL_ORIGINS = True`;
        const issues = await analyzeCommon(content, 'settings.py');
        const corsIssues = issues.filter((i: AnalysisIssue) => i.rule === 'PY-SEC-003');
        expect(corsIssues).toHaveLength(1);
      });

      it('should detect mark_safe()', async () => {
        const content = `return mark_safe(user_input)`;
        const issues = await analyzeCommon(content, 'utils.py');
        const xssIssues = issues.filter((i: AnalysisIssue) => i.rule === 'PY-SEC-005');
        expect(xssIssues).toHaveLength(1);
      });
    });

    describe('Common pattern analysis - Java rules', () => {
      const analyzeCommon = async (content: string, fileName: string) => {
        vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
          const dirStr = String(dir);
          if (dirStr.endsWith('repo')) {
            return [fileName] as any;
          }
          throw new Error('Not a directory');
        });
        vi.mocked(fs.readFile).mockResolvedValue(content);
        return (analyzer as any).runCommonPatternAnalysis('/test/repo');
      };

      it('should detect nativeQuery with string concatenation', async () => {
        const content = `@Query(value = "SELECT * FROM users WHERE name = '" + name + "'", nativeQuery = true)`;
        const issues = await analyzeCommon(content, 'UserRepository.java');
        const sqlIssues = issues.filter((i: AnalysisIssue) => i.rule === 'JAVA-SEC-001');
        expect(sqlIssues).toHaveLength(1);
        expect(sqlIssues[0].severity).toBe(Severity.Critical);
      });

      it('should detect th:utext in Thymeleaf', async () => {
        const content = '<span th:utext="${user.description}"></span>';
        const issues = await analyzeCommon(content, 'detail.html');
        const xssIssues = issues.filter((i: AnalysisIssue) => i.rule === 'JAVA-SEC-002');
        expect(xssIssues).toHaveLength(1);
      });

      it('should detect csrf().disable()', async () => {
        const content = `http.csrf().disable()`;
        const issues = await analyzeCommon(content, 'SecurityConfig.java');
        const csrfIssues = issues.filter((i: AnalysisIssue) => i.rule === 'JAVA-SEC-003');
        expect(csrfIssues).toHaveLength(1);
      });

      it('should detect sensitive data in logger', async () => {
        const content = `logger.info("Login attempt: password=" + password);`;
        const issues = await analyzeCommon(content, 'AuthService.java');
        const logIssues = issues.filter((i: AnalysisIssue) => i.rule === 'JAVA-SEC-004');
        expect(logIssues).toHaveLength(1);
      });
    });

    describe('Common pattern analysis - comment skipping', () => {
      const analyzeCommon = async (content: string, fileName: string) => {
        vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
          const dirStr = String(dir);
          if (dirStr.endsWith('repo')) {
            return [fileName] as any;
          }
          throw new Error('Not a directory');
        });
        vi.mocked(fs.readFile).mockResolvedValue(content);
        return (analyzer as any).runCommonPatternAnalysis('/test/repo');
      };

      it('should skip commented lines in Python', async () => {
        const content = `# CORS_ALLOW_ALL_ORIGINS = True`;
        const issues = await analyzeCommon(content, 'settings.py');
        const corsIssues = issues.filter((i: AnalysisIssue) => i.rule === 'PY-SEC-003');
        expect(corsIssues).toHaveLength(0);
      });

      it('should skip commented lines in Java', async () => {
        const content = `// http.csrf().disable()`;
        const issues = await analyzeCommon(content, 'SecurityConfig.java');
        const csrfIssues = issues.filter((i: AnalysisIssue) => i.rule === 'JAVA-SEC-003');
        expect(csrfIssues).toHaveLength(0);
      });

      it('should skip HTML comments', async () => {
        const content = `<!-- <span th:utext="\${user.name}"></span> -->`;
        const issues = await analyzeCommon(content, 'template.html');
        const xssIssues = issues.filter((i: AnalysisIssue) => i.rule === 'JAVA-SEC-002');
        expect(xssIssues).toHaveLength(0);
      });
    });
  });
});
