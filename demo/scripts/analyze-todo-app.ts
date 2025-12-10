/**
 * Laravel TODO App 解析スクリプト（デモ版）
 *
 * このスクリプトは、tools/配下の実装が完成するまでのデモ用モックです。
 * 実際のツールの動作を模倣し、解析結果を表示します。
 */

import * as fs from 'fs';
import * as path from 'path';

// ========================================
// 型定義（ツール実装の型を模倣）
// ========================================

interface Project {
  id: string;
  name: string;
  description: string;
}

interface FileStats {
  totalFiles: number;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
}

interface Language {
  name: string;
  files: number;
  lines: number;
  percentage: number;
}

interface Framework {
  name: string;
  version?: string;
}

interface TechStack {
  languages: Language[];
  frameworks: Framework[];
}

interface RepositoryAnalysisResult {
  fileStats: FileStats;
  techStack: TechStack;
}

interface IssueSummary {
  totalIssues: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byCategory: Record<string, number>;
  byTool: Record<string, number>;
}

interface Issue {
  file: string;
  line: number;
  column?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  tool: string;
  rule: string;
  message: string;
  details?: string;
}

interface StaticAnalysisResult {
  summary: IssueSummary;
  allIssues: Issue[];
}

// ========================================
// モックデータ生成
// ========================================

function generateProjectId(): string {
  return `proj-${Date.now().toString(36)}`;
}

function createMockProject(): Project {
  return {
    id: generateProjectId(),
    name: 'Laravel TODO App (Demo)',
    description: 'IT資産監査デモ用TODOアプリケーション'
  };
}

function analyzeRepository(projectPath: string): RepositoryAnalysisResult {
  console.log('  📂 ディレクトリをスキャン中...');

  // 実際のファイルをカウント（簡易版）
  const phpFiles = findFiles(projectPath, '.php');
  const jsFiles = findFiles(projectPath, '.js');
  const htmlFiles = findFiles(projectPath, '.blade.php');

  const totalFiles = phpFiles.length + jsFiles.length + htmlFiles.length;
  const totalLines = phpFiles.length * 150 + jsFiles.length * 100 + htmlFiles.length * 80;

  return {
    fileStats: {
      totalFiles,
      totalLines,
      codeLines: Math.floor(totalLines * 0.7),
      commentLines: Math.floor(totalLines * 0.15),
      blankLines: Math.floor(totalLines * 0.15)
    },
    techStack: {
      languages: [
        { name: 'PHP', files: phpFiles.length, lines: phpFiles.length * 150, percentage: 85.5 },
        { name: 'JavaScript', files: jsFiles.length, lines: jsFiles.length * 100, percentage: 9.2 },
        { name: 'HTML/Blade', files: htmlFiles.length, lines: htmlFiles.length * 80, percentage: 5.3 }
      ],
      frameworks: [
        { name: 'Laravel', version: '8.75' }
      ]
    }
  };
}

function performStaticAnalysis(projectPath: string): StaticAnalysisResult {
  console.log('  🔍 静的解析を実行中...');
  console.log('    - SQLインジェクション検出');
  console.log('    - XSS脆弱性検出');
  console.log('    - セキュリティ問題検出');
  console.log('    - コード品質チェック');

  // ISSUES.mdに記載された問題を模倣
  const issues: Issue[] = [
    // Critical - SQLインジェクション
    {
      file: 'app/Http/Controllers/AuthController.php',
      line: 25,
      severity: 'critical',
      category: 'security',
      tool: 'PHP_CodeSniffer',
      rule: 'Security.BadFunctions.SQLInjection',
      message: 'SQL injection vulnerability detected',
      details: 'User input is directly embedded in SQL query without sanitization'
    },
    {
      file: 'app/Http/Controllers/AuthController.php',
      line: 42,
      severity: 'critical',
      category: 'security',
      tool: 'PHP_CodeSniffer',
      rule: 'Security.BadFunctions.SQLInjection',
      message: 'SQL injection in login function',
      details: 'Email and password parameters are not escaped'
    },
    {
      file: 'app/Http/Controllers/TodoController.php',
      line: 85,
      severity: 'critical',
      category: 'security',
      tool: 'PHP_CodeSniffer',
      rule: 'Security.BadFunctions.SQLInjection',
      message: 'SQL injection in todo creation',
      details: 'Title and description are not sanitized'
    },

    // Critical - 機密情報
    {
      file: 'config/database.php',
      line: 64,
      severity: 'critical',
      category: 'security',
      tool: 'Gitleaks',
      rule: 'hardcoded-password',
      message: 'Hardcoded database password detected',
      details: 'Production database credentials are hardcoded in source code'
    },
    {
      file: '.env.example',
      line: 44,
      severity: 'critical',
      category: 'security',
      tool: 'Gitleaks',
      rule: 'api-key',
      message: 'API key exposed in environment file',
      details: 'EXTERNAL_API_KEY is hardcoded'
    },

    // High - XSS
    {
      file: 'routes/web.php',
      line: 18,
      severity: 'high',
      category: 'security',
      tool: 'PHP_CodeSniffer',
      rule: 'Security.XSS.OutputEscaping',
      message: 'XSS vulnerability - unescaped output',
      details: 'User input $name is output without escaping'
    },
    {
      file: 'resources/views/welcome.blade.php',
      line: 173,
      severity: 'high',
      category: 'security',
      tool: 'PHP_CodeSniffer',
      rule: 'Security.BadFunctions.Eval',
      message: 'Use of eval() function',
      details: 'eval() allows arbitrary code execution'
    },

    // High - 認証不備
    {
      file: 'app/Http/Controllers/TodoController.php',
      line: 117,
      severity: 'high',
      category: 'security',
      tool: 'PHP_CodeSniffer',
      rule: 'Security.Authorization.Missing',
      message: 'Missing authorization check',
      details: 'Todo can be viewed by any user without ownership verification'
    },
    {
      file: 'routes/api.php',
      line: 20,
      severity: 'high',
      category: 'security',
      tool: 'PHP_CodeSniffer',
      rule: 'Security.Authentication.Missing',
      message: 'Missing authentication middleware',
      details: 'Protected routes are accessible without authentication'
    },

    // High - パフォーマンス
    {
      file: 'app/Http/Controllers/TodoController.php',
      line: 63,
      severity: 'high',
      category: 'performance',
      tool: 'PHP_CodeSniffer',
      rule: 'Performance.NPlusOne',
      message: 'N+1 query problem detected',
      details: 'User data is fetched individually for each todo in a loop'
    },

    // Medium - コード品質
    {
      file: 'app/Http/Controllers/TodoController.php',
      line: 29,
      severity: 'medium',
      category: 'code-quality',
      tool: 'PHP_CodeSniffer',
      rule: 'Generic.Metrics.CyclomaticComplexity',
      message: 'High cyclomatic complexity',
      details: 'Function index() has complexity of 15 (threshold: 10)'
    },
    {
      file: 'app/Http/Controllers/TodoController.php',
      line: 135,
      severity: 'medium',
      category: 'code-quality',
      tool: 'PHP_CodeSniffer',
      rule: 'Generic.Files.LineLength',
      message: 'Function too long',
      details: 'Function update() has 100+ lines'
    },
    {
      file: 'app/Http/Controllers/AuthController.php',
      line: 23,
      severity: 'medium',
      category: 'security',
      tool: 'PHP_CodeSniffer',
      rule: 'Security.Hash.WeakAlgorithm',
      message: 'Weak password hashing algorithm',
      details: 'MD5 is cryptographically broken, use bcrypt or Argon2'
    },

    // Medium - パフォーマンス
    {
      file: 'app/Http/Controllers/TodoController.php',
      line: 264,
      severity: 'medium',
      category: 'performance',
      tool: 'PHP_CodeSniffer',
      rule: 'Performance.MultipleQueries',
      message: 'Multiple queries can be combined',
      details: 'Statistics are fetched with 5 separate queries'
    },

    // Medium - 依存関係
    {
      file: 'composer.json',
      line: 11,
      severity: 'medium',
      category: 'dependencies',
      tool: 'Snyk',
      rule: 'outdated-framework',
      message: 'Laravel 8.x is end-of-life',
      details: 'Upgrade to Laravel 10.x or higher'
    },

    // Low - コード品質
    {
      file: 'app/Http/Controllers/TodoController.php',
      line: 175,
      severity: 'low',
      category: 'code-quality',
      tool: 'PHP_CodeSniffer',
      rule: 'Generic.CodeAnalysis.DuplicatedCode',
      message: 'Duplicated code detected',
      details: 'Priority label logic is duplicated'
    },
    {
      file: 'app/Http/Controllers/TodoController.php',
      line: 146,
      severity: 'low',
      category: 'code-quality',
      tool: 'PHP_CodeSniffer',
      rule: 'Generic.CodeAnalysis.MagicNumber',
      message: 'Magic number detected',
      details: 'Numbers 86400, 259200 should be defined as constants'
    }
  ];

  const summary: IssueSummary = {
    totalIssues: issues.length,
    bySeverity: {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    },
    byCategory: {
      security: issues.filter(i => i.category === 'security').length,
      performance: issues.filter(i => i.category === 'performance').length,
      'code-quality': issues.filter(i => i.category === 'code-quality').length,
      dependencies: issues.filter(i => i.category === 'dependencies').length
    },
    byTool: {
      'PHP_CodeSniffer': issues.filter(i => i.tool === 'PHP_CodeSniffer').length,
      'Snyk': issues.filter(i => i.tool === 'Snyk').length,
      'Gitleaks': issues.filter(i => i.tool === 'Gitleaks').length
    }
  };

  return { summary, allIssues: issues };
}

// ========================================
// ユーティリティ関数
// ========================================

function findFiles(dir: string, extension: string): string[] {
  const files: string[] = [];

  function walk(currentPath: string) {
    if (!fs.existsSync(currentPath)) return;

    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // vendor, node_modulesは除外
        if (entry.name !== 'vendor' && entry.name !== 'node_modules') {
          walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function saveReportMarkdown(reportPath: string, data: {
  project: Project;
  repoResult: RepositoryAnalysisResult;
  staticResult: StaticAnalysisResult;
}) {
  const { project, repoResult, staticResult } = data;

  const markdown = `# IT資産監査レポート

**プロジェクト名**: ${project.name}
**プロジェクトID**: ${project.id}
**実施日**: ${new Date().toLocaleDateString('ja-JP')}

## エグゼクティブサマリー

### 総合評価

| 項目 | 評価 |
|------|------|
| **セキュリティ** | 🔴 要対応 |
| **コード品質** | 🟡 改善推奨 |
| **パフォーマンス** | 🟡 改善推奨 |
| **総合スコア** | **C評価（60/100）** |

### 重要な発見事項

- **Critical問題**: ${staticResult.summary.bySeverity.critical}件 - 即時対応が必要
- **High問題**: ${staticResult.summary.bySeverity.high}件 - 1週間以内に対応推奨
- **総問題数**: ${staticResult.summary.totalIssues}件

## リポジトリ概要

| 項目 | 値 |
|------|-----|
| 総ファイル数 | ${repoResult.fileStats.totalFiles} |
| 総行数 | ${repoResult.fileStats.totalLines} |
| コード行数 | ${repoResult.fileStats.codeLines} |
| コメント行数 | ${repoResult.fileStats.commentLines} |

### プログラミング言語

${repoResult.techStack.languages.map(lang =>
  `- **${lang.name}**: ${lang.files} files, ${lang.lines} lines (${lang.percentage.toFixed(1)}%)`
).join('\n')}

### フレームワーク

${repoResult.techStack.frameworks.map(fw =>
  `- **${fw.name}** ${fw.version || ''}`
).join('\n')}

## セキュリティ診断結果

### 問題の概要

| 重要度 | 件数 |
|--------|------|
| Critical | ${staticResult.summary.bySeverity.critical} |
| High | ${staticResult.summary.bySeverity.high} |
| Medium | ${staticResult.summary.bySeverity.medium} |
| Low | ${staticResult.summary.bySeverity.low} |

### Critical問題の詳細

${staticResult.allIssues
  .filter(i => i.severity === 'critical')
  .map((issue, index) => `
#### ${index + 1}. ${issue.message}

- **ファイル**: \`${issue.file}:${issue.line}\`
- **ツール**: ${issue.tool}
- **ルール**: ${issue.rule}
- **詳細**: ${issue.details || 'N/A'}
`).join('\n')}

## 推奨事項

### 即時対応が必要な項目（Critical）

1. **SQLインジェクション脆弱性の修正** (3件)
   - 推定工数: 8時間
   - 優先度: 最高

2. **機密情報のハードコーディング除去** (2件)
   - 推定工数: 4時間
   - 優先度: 最高

### 1週間以内に対応すべき項目（High）

3. **XSS脆弱性の修正** (2件)
   - 推定工数: 6時間
   - 優先度: 高

4. **認証・認可の実装** (2件)
   - 推定工数: 8時間
   - 優先度: 高

5. **N+1クエリ問題の解消** (1件)
   - 推定工数: 4時間
   - 優先度: 高

## 見積もり

### 工数と費用

| フェーズ | 工数 | 費用 |
|----------|------|------|
| フェーズ1（緊急） | 22h | 30万円 |
| フェーズ2（重要） | 30h | 40万円 |
| フェーズ3（中長期） | 56h | 70万円 |
| **合計** | **108h** | **140万円** |

### ROI試算

- **投資額**: 140万円
- **削減効果**: 年間310万円
- **投資回収期間**: 約5ヶ月
- **3年間ROI**: 563%

---

*このレポートは IT Supervisor ツール群により自動生成されました*
`;

  fs.writeFileSync(reportPath, markdown, 'utf-8');
}

// ========================================
// メイン処理
// ========================================

async function analyzeTodoApp() {
  console.log('========================================');
  console.log('  Laravel TODO App 監査デモ');
  console.log('========================================\n');

  const projectPath = path.resolve(__dirname, '../laravel-todo-app');
  const dataPath = path.resolve(__dirname, '../data');
  const reportsPath = path.resolve(__dirname, '../reports');

  // ディレクトリ作成
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  if (!fs.existsSync(reportsPath)) {
    fs.mkdirSync(reportsPath, { recursive: true });
  }

  // フェーズ1: プロジェクト登録とリポジトリ解析
  console.log('[フェーズ1] プロジェクト登録とリポジトリ解析');
  console.log('----------------------------------------\n');

  const project = createMockProject();
  console.log(`✓ プロジェクトID: ${project.id}`);
  console.log(`✓ プロジェクト名: ${project.name}\n`);

  const repoResult = analyzeRepository(projectPath);

  console.log('\n📊 リポジトリ解析結果:');
  console.log(`  総ファイル数: ${repoResult.fileStats.totalFiles}`);
  console.log(`  総行数: ${repoResult.fileStats.totalLines}`);
  console.log(`  コード行数: ${repoResult.fileStats.codeLines}`);
  console.log(`  コメント行数: ${repoResult.fileStats.commentLines}`);

  console.log('\n  検出された言語:');
  repoResult.techStack.languages.forEach(lang => {
    console.log(`    - ${lang.name}: ${lang.files} files, ${lang.lines} lines (${lang.percentage.toFixed(1)}%)`);
  });

  console.log('\n  フレームワーク:');
  repoResult.techStack.frameworks.forEach(fw => {
    console.log(`    - ${fw.name} ${fw.version || ''}`);
  });

  // フェーズ2: 静的解析
  console.log('\n[フェーズ2] 静的解析');
  console.log('----------------------------------------\n');

  const staticResult = performStaticAnalysis(projectPath);

  console.log('📊 静的解析結果:');
  console.log(`  総問題数: ${staticResult.summary.totalIssues}`);
  console.log('\n  重要度別:');
  console.log(`    Critical: ${staticResult.summary.bySeverity.critical} 件`);
  console.log(`    High:     ${staticResult.summary.bySeverity.high} 件`);
  console.log(`    Medium:   ${staticResult.summary.bySeverity.medium} 件`);
  console.log(`    Low:      ${staticResult.summary.bySeverity.low} 件`);

  console.log('\n  カテゴリ別:');
  Object.entries(staticResult.summary.byCategory).forEach(([category, count]) => {
    console.log(`    ${category}: ${count} 件`);
  });

  console.log('\n  ツール別:');
  Object.entries(staticResult.summary.byTool).forEach(([tool, count]) => {
    console.log(`    ${tool}: ${count} 件`);
  });

  // フェーズ3: Issue管理システムへの登録
  console.log('\n[フェーズ3] Issue管理システムへの登録');
  console.log('----------------------------------------\n');

  const importantIssues = staticResult.allIssues.filter(
    issue => issue.severity === 'critical' || issue.severity === 'high'
  );

  console.log(`登録対象: ${importantIssues.length} 件（Critical + High）\n`);

  importantIssues.slice(0, 5).forEach((issue, index) => {
    console.log(`  ✓ Issue #${index + 1}: ${issue.severity.toUpperCase()} - ${issue.message}`);
  });

  if (importantIssues.length > 5) {
    console.log(`  ... 他 ${importantIssues.length - 5} 件`);
  }

  console.log(`\n✓ 合計 ${importantIssues.length} 件のIssueを登録しました`);

  // フェーズ4: レポート生成
  console.log('\n[フェーズ4] レポート生成');
  console.log('----------------------------------------\n');

  const markdownPath = path.join(reportsPath, 'analysis-report.md');
  saveReportMarkdown(markdownPath, { project, repoResult, staticResult });

  console.log('✓ レポートを生成しました:');
  console.log(`  Markdown: ${markdownPath}`);

  // フェーズ5: 統計サマリー
  console.log('\n[フェーズ5] 統計サマリー');
  console.log('----------------------------------------\n');

  console.log('📈 Issue統計:');
  console.log(`  総数: ${importantIssues.length}`);
  console.log('\n  重要度別:');
  console.log(`    Critical: ${staticResult.summary.bySeverity.critical}`);
  console.log(`    High:     ${staticResult.summary.bySeverity.high}`);

  console.log('\n========================================');
  console.log('  解析完了！');
  console.log('========================================\n');

  console.log('📄 次のステップ:');
  console.log(`  1. レポートを確認: ${markdownPath}`);
  console.log('  2. Critical問題の修正を開始');
  console.log('  3. 詳細な見積もりと提案書の作成\n');

  return {
    project,
    repoResult,
    staticResult,
    reportPath: markdownPath
  };
}

// 実行
if (require.main === module) {
  analyzeTodoApp()
    .then(result => {
      console.log('✅ 全ての処理が完了しました\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ エラーが発生しました:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

export { analyzeTodoApp };
