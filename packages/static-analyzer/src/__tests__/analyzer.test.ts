import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
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
      expect(fs.unlink).toHaveBeenCalledWith('/test/repo/gitleaks-report.json');
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
      expect(fs.unlink).toHaveBeenCalledWith('/test/repo/gitleaks-report.json');
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
      expect(fs.unlink).toHaveBeenCalledWith('/test/repo/gitleaks-report.json');
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
});
