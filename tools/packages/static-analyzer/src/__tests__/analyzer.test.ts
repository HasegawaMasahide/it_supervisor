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

    it('should select ESLint when package.json exists', async () => {
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
          tool: AnalyzerTool.Gitleaks,
          severity: Severity.Critical,
          category: IssueCategory.Security,
          rule: 'generic-api-key',
          message: 'Security vulnerability',
          file: '.env'
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
          tool: AnalyzerTool.Bandit,
          severity: Severity.Critical,
          category: IssueCategory.Security,
          rule: 'B608',
          message: 'SQL injection',
          file: 'views.py'
        }
      ];

      const summary = (analyzer as any).createSummary(toolResults, issues, 1500);

      expect(summary.byTool[AnalyzerTool.ESLint]).toBe(2);
      expect(summary.byTool[AnalyzerTool.Bandit]).toBe(1);
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

    it('should handle tool execution errors gracefully in Bandit', async () => {
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('Command not found') as any;
        error.stdout = '';
        callback(error, '', '');
        return {} as any;
      });

      const result = await (analyzer as any).runBandit('/test/repo', {});

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

      // package.json があるので ESLint, Gitleaks が選択される
      expect(progressCalls).toContain(AnalyzerTool.ESLint);
      expect(progressCalls).toContain(AnalyzerTool.Gitleaks);
    });
  });

  describe('Python tool selection', () => {
    it('should select Python tools when requirements.txt exists', async () => {
      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('requirements.txt')) return Promise.resolve();
        return Promise.reject(new Error('File not found'));
      });
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const tools = await (analyzer as any).selectTools('/test/repo');

      expect(tools).toContain(AnalyzerTool.Bandit);
      expect(tools).toContain(AnalyzerTool.Pylint);
      expect(tools).toContain(AnalyzerTool.Radon);
      expect(tools).toContain(AnalyzerTool.Opengrep);
      expect(tools).toContain(AnalyzerTool.PipAudit);
      expect(tools).toContain(AnalyzerTool.Gitleaks);
      expect(tools).not.toContain(AnalyzerTool.DjangoCheckDeploy);
    });

    it('should select DjangoCheckDeploy when manage.py exists', async () => {
      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('requirements.txt') || pathStr.includes('manage.py')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const tools = await (analyzer as any).selectTools('/test/repo');

      expect(tools).toContain(AnalyzerTool.DjangoCheckDeploy);
      expect(tools).toContain(AnalyzerTool.Bandit);
    });

    it('should detect Python project via pyproject.toml without PipAudit', async () => {
      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('pyproject.toml')) return Promise.resolve();
        return Promise.reject(new Error('File not found'));
      });
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const tools = await (analyzer as any).selectTools('/test/repo');

      expect(tools).toContain(AnalyzerTool.Bandit);
      expect(tools).toContain(AnalyzerTool.Pylint);
      expect(tools).not.toContain(AnalyzerTool.PipAudit);
    });
  });

  describe('Bandit parsing', () => {
    it('should parse Bandit results with severity mapping', () => {
      const results = [
        {
          filename: '/test/repo/views.py',
          test_id: 'B608',
          test_name: 'hardcoded_sql_expressions',
          severity: 'HIGH',
          confidence: 'MEDIUM',
          line_number: 15,
          line_range: [15, 16],
          code: 'cursor.execute("SELECT * FROM users WHERE id = %s" % user_id)',
          issue_text: 'Possible SQL injection via string-based query construction.',
          issue_cwe: { id: 89, link: 'https://cwe.mitre.org/data/definitions/89.html' }
        },
        {
          filename: '/test/repo/auth.py',
          test_id: 'B303',
          test_name: 'blacklist',
          severity: 'MEDIUM',
          confidence: 'HIGH',
          line_number: 42,
          line_range: [42],
          code: 'hashlib.md5(password.encode())',
          issue_text: 'Use of insecure MD5 hash function.'
        }
      ];

      const issues = (analyzer as any).parseBanditResults(results, '/test/repo');

      expect(issues).toHaveLength(2);
      expect(issues[0]).toMatchObject({
        tool: AnalyzerTool.Bandit,
        severity: Severity.High,
        category: IssueCategory.Security,
        rule: 'B608',
        file: 'views.py',
        line: 15,
        cwe: ['CWE-89']
      });
      expect(issues[1]).toMatchObject({
        severity: Severity.Medium,
        rule: 'B303'
      });
    });

    it('should handle invalid Bandit JSON output', async () => {
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('Command failed') as any;
        error.stdout = 'invalid json';
        callback(error, '', '');
        return {} as any;
      });

      const result = await (analyzer as any).runBandit('/test/repo', {});
      expect(result).toEqual([]);
    });
  });

  describe('pip-audit parsing', () => {
    it('should parse pip-audit results with CVE and fix info', () => {
      const dependencies = [
        {
          name: 'Django',
          version: '2.2.28',
          vulns: [
            {
              id: 'CVE-2023-12345',
              fix_versions: ['4.2.7'],
              description: 'SQL injection vulnerability in Django'
            }
          ]
        },
        {
          name: 'requests',
          version: '2.25.1',
          vulns: [
            {
              id: 'PYSEC-2023-456',
              fix_versions: [],
              description: 'SSRF in requests'
            }
          ]
        },
        { name: 'safe-package', version: '1.0.0', vulns: [] }
      ];

      const issues = (analyzer as any).parsePipAuditResults(dependencies);

      expect(issues).toHaveLength(2);
      expect(issues[0]).toMatchObject({
        tool: AnalyzerTool.PipAudit,
        severity: Severity.High,
        category: IssueCategory.Security,
        rule: 'CVE-2023-12345',
        file: 'requirements.txt',
        cve: ['CVE-2023-12345']
      });
      expect(issues[0].fix?.available).toBe(true);
      expect(issues[0].fix?.description).toBe('Upgrade Django to 4.2.7');

      expect(issues[1].fix).toBeUndefined();
    });

    it('should skip pip-audit when requirements.txt does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

      const result = await (analyzer as any).runPipAudit('/test/repo', {});
      expect(result).toEqual([]);
    });
  });

  describe('Opengrep parsing', () => {
    it('should parse Opengrep results with severity and category mapping', () => {
      const results = [
        {
          path: '/test/repo/views.py',
          check_id: 'python.django.security.injection.sql',
          extra: {
            message: 'Detected SQL injection',
            severity: 'ERROR',
            metadata: { category: 'security', cwe: ['CWE-89'] },
            lines: 'cursor.execute(query)'
          },
          start: { line: 10, col: 5 },
          end: { line: 10, col: 30 }
        },
        {
          path: '/test/repo/utils.py',
          check_id: 'python.correctness.useless-comparison',
          extra: {
            message: 'Useless comparison',
            severity: 'WARNING',
            metadata: { category: 'correctness' },
            lines: 'if x == x:'
          },
          start: { line: 5, col: 1 },
          end: { line: 5, col: 15 }
        }
      ];

      const issues = (analyzer as any).parseOpengrepResults(results, '/test/repo');

      expect(issues).toHaveLength(2);
      expect(issues[0]).toMatchObject({
        tool: AnalyzerTool.Opengrep,
        severity: Severity.High,
        category: IssueCategory.Security,
        rule: 'python.django.security.injection.sql',
        cwe: ['CWE-89']
      });
      expect(issues[1]).toMatchObject({
        severity: Severity.Medium,
        category: IssueCategory.CodeQuality
      });
    });

    it('should handle Opengrep execution failure', async () => {
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('opengrep not found') as any;
        error.stdout = '';
        callback(error, '', '');
        return {} as any;
      });

      const result = await (analyzer as any).runOpengrep('/test/repo', {});
      expect(result).toEqual([]);
    });
  });

  describe('pylint parsing', () => {
    it('should parse pylint results with type-based severity', () => {
      const results = [
        { type: 'E', symbol: 'no-member', message: 'has no member', path: '/test/repo/app.py', line: 10, column: 5, 'message-id': 'E1101' },
        { type: 'W', symbol: 'unused-import', message: 'Unused import os', path: '/test/repo/app.py', line: 1, column: 0, 'message-id': 'W0611' },
        { type: 'C', symbol: 'missing-docstring', message: 'Missing docstring', path: '/test/repo/app.py', line: 5, column: 0, 'message-id': 'C0114' },
        { type: 'R', symbol: 'too-many-branches', message: 'Too many branches', path: '/test/repo/app.py', line: 20, column: 0, 'message-id': 'R0912' },
        { type: 'F', symbol: 'fatal-error', message: 'Fatal error', path: '/test/repo/broken.py', line: 1, column: 0, 'message-id': 'F0001' }
      ];

      const issues = (analyzer as any).parsePylintResults(results, '/test/repo');

      expect(issues).toHaveLength(5);
      expect(issues[0]).toMatchObject({ severity: Severity.High, category: IssueCategory.CodeQuality, rule: 'E1101' });
      expect(issues[1]).toMatchObject({ severity: Severity.Medium, category: IssueCategory.CodeQuality, rule: 'W0611' });
      expect(issues[2]).toMatchObject({ severity: Severity.Low, category: IssueCategory.BestPractice, rule: 'C0114' });
      expect(issues[3]).toMatchObject({ severity: Severity.Low, category: IssueCategory.Complexity, rule: 'R0912' });
      expect(issues[4]).toMatchObject({ severity: Severity.High, category: IssueCategory.CodeQuality, rule: 'F0001' });
    });

    it('should handle invalid pylint JSON output', async () => {
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('') as any;
        error.stdout = 'not json';
        callback(error, '', '');
        return {} as any;
      });

      const result = await (analyzer as any).runPylint('/test/repo', {});
      expect(result).toEqual([]);
    });
  });

  describe('radon parsing', () => {
    it('should parse radon complexity results', () => {
      const result = {
        '/test/repo/views.py': [
          { name: 'checkout', type: 'function', complexity: 25, rank: 'D', lineno: 52, endline: 86, col_offset: 0 },
          { name: 'process_payment', type: 'method', complexity: 45, rank: 'F', lineno: 89, endline: 107, col_offset: 4, classname: 'PaymentService' }
        ],
        '/test/repo/models.py': [
          { name: 'total_price', type: 'method', complexity: 12, rank: 'C', lineno: 39, endline: 43, col_offset: 4, classname: 'Cart' }
        ]
      };

      const issues = (analyzer as any).parseRadonResults(result, '/test/repo');

      expect(issues).toHaveLength(3);
      expect(issues[0]).toMatchObject({
        tool: AnalyzerTool.Radon,
        severity: Severity.Medium,
        category: IssueCategory.Complexity,
        rule: 'CC-D',
        line: 52
      });
      expect(issues[0].message).toContain('checkout');
      expect(issues[0].message).toContain('25');

      expect(issues[1]).toMatchObject({ severity: Severity.High, rule: 'CC-F' });
      expect(issues[1].message).toContain('PaymentService.process_payment');

      expect(issues[2]).toMatchObject({ severity: Severity.Low, rule: 'CC-C' });
    });

    it('should handle empty radon output', async () => {
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        callback(null, '{}', '');
        return {} as any;
      });

      const result = await (analyzer as any).runRadon('/test/repo', {});
      expect(result).toEqual([]);
    });
  });

  describe('Django check --deploy parsing', () => {
    it('should parse Django security check output', () => {
      const output = `System check identified some issues:

WARNINGS:
?: (security.W004) You have not set a value for the SECURE_HSTS_SECONDS setting.
?: (security.W008) Your SECURE_SSL_REDIRECT setting is not set to True.
?: (security.W018) You should not have DEBUG set to True in deployment.
?: (security.W019) You have ALLOWED_HOSTS set to ['*'].

System check identified 4 issues (0 silenced).`;

      const issues = (analyzer as any).parseDjangoCheckResults(output);

      expect(issues).toHaveLength(4);
      expect(issues[0]).toMatchObject({
        tool: AnalyzerTool.DjangoCheckDeploy,
        category: IssueCategory.Security,
        rule: 'security.W004',
        severity: Severity.High
      });
      expect(issues[2]).toMatchObject({ rule: 'security.W018', severity: Severity.High });
      expect(issues[3]).toMatchObject({ rule: 'security.W019', severity: Severity.High });
    });

    it('should skip when manage.py does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

      const result = await (analyzer as any).runDjangoCheckDeploy('/test/repo', {});
      expect(result).toEqual([]);
    });

    it('should handle empty Django check output', () => {
      const output = 'System check identified no issues.';
      const issues = (analyzer as any).parseDjangoCheckResults(output);
      expect(issues).toEqual([]);
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

  // ========================================
  // 追加ツールの結果パーステスト
  // ========================================

  describe('Psalm result parsing', () => {
    it('should parse taint analysis results', async () => {
      const psalmOutput = JSON.stringify([
        {
          severity: 'error',
          line_from: 24,
          line_to: 24,
          type: 'TaintedSql',
          message: 'Detected tainted SQL',
          file_name: 'AuthController.php',
          file_path: '/app/Http/Controllers/AuthController.php',
          snippet: '$db->query("SELECT * FROM users WHERE id = $id")',
          selected_text: '$id',
          from: 100,
          to: 103,
          snippet_from: 80,
          snippet_to: 130,
          column_from: 20,
          column_to: 23,
          taint_trace: [{ file_name: 'routes.php', file_path: '/routes/web.php', line_from: 10, line_to: 10, snippet: '$id = $_GET["id"]' }]
        }
      ]);

      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        // Psalm は issue 検出時に非ゼロ終了する。promisify のカスタムシンボルがモックでは無いため、
        // エラーオブジェクトの stdout にデータを載せて .catch ハンドラで処理させる
        const error = new Error('Exit code 2') as any;
        error.stdout = psalmOutput;
        error.stderr = '';
        callback(error);
        return {} as any;
      });

      const result = await (analyzer as any).runPsalm('/test/repo', {});

      expect(result.length).toBeGreaterThanOrEqual(1);
      if (result.length > 0) {
        expect(result[0].severity).toBe(Severity.Critical);
        expect(result[0].category).toBe(IssueCategory.Security);
        expect(result[0].rule).toBe('TaintedSql');
      }
    });

    it('should return empty array when command fails', async () => {
      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('Command not found') as any;
        error.stdout = '';
        error.stderr = 'psalm: command not found';
        callback(error);
        return {} as any;
      });

      const result = await (analyzer as any).runPsalm('/test/repo', {});

      expect(result).toHaveLength(0);
    });
  });

  describe('PHPMD result parsing', () => {
    it('should parse complexity violations', async () => {
      const phpmdOutput = JSON.stringify({
        version: '2.14.0',
        package: 'phpmd',
        timestamp: '2026-01-01T00:00:00',
        files: [{
          file: '/test/repo/app/Controllers/TodoController.php',
          violations: [{
            beginLine: 29,
            endLine: 68,
            package: 'App\\Controllers',
            method: 'index',
            description: 'The method index() has a Cyclomatic Complexity of 15.',
            rule: 'CyclomaticComplexity',
            ruleSet: 'Code Size Rules',
            externalInfoUrl: 'https://phpmd.org/rules/codesize.html',
            priority: 2
          }]
        }]
      });

      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('Exit code 2') as any;
        error.stdout = phpmdOutput;
        error.stderr = '';
        callback(error);
        return {} as any;
      });

      const result = await (analyzer as any).runPHPMD('/test/repo', {});

      expect(result.length).toBeGreaterThanOrEqual(1);
      if (result.length > 0) {
        expect(result[0].severity).toBe(Severity.High);
        expect(result[0].category).toBe(IssueCategory.Complexity);
        expect(result[0].rule).toBe('CyclomaticComplexity');
      }
    });

    it('should return empty on invalid JSON', async () => {
      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('Exit code 2') as any;
        error.stdout = 'not json';
        error.stderr = '';
        callback(error);
        return {} as any;
      });

      const result = await (analyzer as any).runPHPMD('/test/repo', {});

      expect(result).toHaveLength(0);
    });
  });

  describe('Composer audit result parsing', () => {
    it('should parse vulnerability advisories', async () => {
      const composerOutput = JSON.stringify({
        advisories: {
          'laravel/framework': [{
            advisoryId: 'GHSA-1234-5678',
            packageName: 'laravel/framework',
            affectedVersions: '>=8.0,<8.83.28',
            title: 'SQL Injection via query builder',
            cve: 'CVE-2024-1234',
            link: 'https://github.com/advisories/GHSA-1234',
            reportedAt: '2024-01-01'
          }]
        }
      });

      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('Exit code 1') as any;
        error.stdout = composerOutput;
        error.stderr = '';
        callback(error);
        return {} as any;
      });

      const result = await (analyzer as any).runComposerAudit('/test/repo', {});

      expect(result.length).toBeGreaterThanOrEqual(1);
      if (result.length > 0) {
        expect(result[0].category).toBe(IssueCategory.Security);
        expect(result[0].cve).toContain('CVE-2024-1234');
      }
    });
  });

  describe('Semgrep result parsing', () => {
    it('should parse security findings', async () => {
      const semgrepOutput = JSON.stringify({
        results: [{
          check_id: 'php.lang.security.eval-use',
          path: 'resources/views/welcome.blade.php',
          start: { line: 173, col: 1 },
          end: { line: 175, col: 10 },
          extra: {
            message: 'Detected use of eval(). This is dangerous and can lead to code injection.',
            severity: 'ERROR',
            metadata: {
              category: 'security',
              cwe: ['CWE-94'],
              references: ['https://owasp.org/Top10/A03_2021-Injection/']
            },
            lines: 'eval($userInput);'
          }
        }]
      });

      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('Exit code 1') as any;
        error.stdout = semgrepOutput;
        error.stderr = '';
        callback(error);
        return {} as any;
      });

      const result = await (analyzer as any).runSemgrep('/test/repo', {});

      expect(result.length).toBeGreaterThanOrEqual(1);
      if (result.length > 0) {
        expect(result[0].severity).toBe(Severity.Critical);
        expect(result[0].category).toBe(IssueCategory.Security);
        expect(result[0].cwe).toContain('CWE-94');
      }
    });

    it('should handle empty results', async () => {
      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('Exit code 0') as any;
        error.stdout = '{"results":[]}';
        error.stderr = '';
        callback(error);
        return {} as any;
      });

      const result = await (analyzer as any).runSemgrep('/test/repo', {});

      expect(result).toHaveLength(0);
    });
  });

  describe('Progpilot result parsing', () => {
    it('should parse vulnerability findings', async () => {
      const progpilotOutput = JSON.stringify([{
        source_name: '$_GET["id"]',
        source_file: '/test/repo/routes/web.php',
        source_line: 16,
        source_column: 5,
        source_type: 'GET',
        sink_name: 'echo',
        sink_file: '/test/repo/routes/web.php',
        sink_line: 18,
        sink_column: 1,
        vuln_name: 'xss',
        vuln_cwe: 'CWE-79',
        vuln_id: 'prog-001',
        vuln_type: 'taint'
      }]);

      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('Exit code 1') as any;
        error.stdout = progpilotOutput;
        error.stderr = '';
        callback(error);
        return {} as any;
      });

      const result = await (analyzer as any).runProgpilot('/test/repo', {});

      expect(result.length).toBeGreaterThanOrEqual(1);
      if (result.length > 0) {
        expect(result[0].category).toBe(IssueCategory.Security);
        expect(result[0].cwe).toContain('CWE-79');
      }
    });
  });

  describe('PHPCPD result parsing', () => {
    it('should parse duplicate code output', async () => {
      const phpcpdOutput = `phpcpd 6.0.3 by Sebastian Bergmann.

Found 1 clones with 25 duplicated lines in 2 files:

  - /test/repo/app/Controllers/TodoController.php:175-200 (25 lines)
  - /test/repo/app/Controllers/TodoController.php:202-227 (25 lines)

1.7% duplicated lines out of 1473 total lines of code.`;

      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        const error = new Error('Exit code 1') as any;
        error.stdout = phpcpdOutput;
        error.stderr = '';
        callback(error);
        return {} as any;
      });

      const result = await (analyzer as any).runPHPCPD('/test/repo', {});

      expect(result.length).toBeGreaterThanOrEqual(1);
      if (result.length > 0) {
        expect(result[0].category).toBe(IssueCategory.Maintainability);
        expect(result[0].rule).toBe('duplicate-code');
      }
    });
  });

  describe('SonarQube result parsing', () => {
    it('should skip when server is not reachable', async () => {
      vi.mocked(fs.access).mockResolvedValue();
      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        // curl health check fails
        const error = new Error('Connection refused') as any;
        error.stdout = '';
        error.stderr = 'Connection refused';
        callback(error);
        return {} as any;
      });

      const result = await (analyzer as any).runSonarQube('/test/repo', {});

      expect(result).toHaveLength(0);
    });
  });
});
