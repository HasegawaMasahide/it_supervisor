#!/usr/bin/env tsx

/**
 * Code Complexity Report Generator
 *
 * このスクリプトは、eslintccを使用してコードの複雑度を測定し、
 * 詳細なレポートを生成します。
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface ComplexityMessage {
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  type: string;
  name: string;
  rules: Record<string, { value: number; rank: number; label: string }>;
  maxRule: string;
}

interface ComplexityFile {
  file: string;
  messages: ComplexityMessage[];
  average: { rank: number; label: string };
}

interface ComplexityReport {
  files: ComplexityFile[];
  average: { rank: number; label: string };
  ranks: Record<string, number>;
  errors: {
    maxRank: number;
    maxAverageRank: boolean;
  };
}

const OUTPUT_DIR = '.tmp';
const JSON_OUTPUT = join(OUTPUT_DIR, 'complexity-report.json');
const HTML_OUTPUT = join(OUTPUT_DIR, 'complexity-report.html');
const MD_OUTPUT = join(OUTPUT_DIR, 'complexity-report.md');

// Output directory作成
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🔍 Analyzing code complexity...\n');

// ファイルリストを取得 (テストファイルを除外)
const filesCmd = 'find packages -name "*.ts" -not -path "**/__tests__/**" -type f';
const files = execSync(filesCmd, { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .join(' ');

// JSON形式で複雑度レポート生成
try {
  execSync(
    `npx eslintcc --format json ${files} > ${JSON_OUTPUT}`,
    { stdio: 'pipe', shell: '/bin/bash' }
  );
} catch {
  // エラーは無視(高複雑度があっても続行)
}

// HTML形式でレポート生成
try {
  execSync(
    `npx eslintcc --format html ${files} > ${HTML_OUTPUT}`,
    { stdio: 'pipe', shell: '/bin/bash' }
  );
  console.log(`✅ HTML report generated: ${HTML_OUTPUT}\n`);
} catch {
  console.warn('⚠️  Failed to generate HTML report\n');
}

// JSONレポートを読み込んで分析
if (existsSync(JSON_OUTPUT)) {
  const rawData = readFileSync(JSON_OUTPUT, 'utf-8');
  const data = JSON.parse(rawData) as ComplexityReport;

  // Markdown形式のレポートを生成
  generateMarkdownReport(data);

  // サマリーを表示
  displaySummary(data);
} else {
  console.error('❌ Failed to generate complexity report');
  process.exit(1);
}

function generateMarkdownReport(data: ComplexityReport): void {
  const lines: string[] = [
    '# Code Complexity Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- **Average Rank**: ${data.average.rank.toFixed(2)} (${data.average.label})`,
    `- **Files Analyzed**: ${data.files.length}`,
    '',
    '### Complexity Distribution',
    '',
    '| Grade | Count | Description |',
    '|-------|-------|-------------|',
    `| A | ${data.ranks.A ?? 0} | Excellent (0-2) |`,
    `| B | ${data.ranks.B ?? 0} | Good (2-4) |`,
    `| C | ${data.ranks.C ?? 0} | Fair (4-8) |`,
    `| D | ${data.ranks.D ?? 0} | Poor (8-16) |`,
    `| E | ${data.ranks.E ?? 0} | Very Poor (16-32) |`,
    `| F | ${data.ranks.F ?? 0} | Critical (32+) |`,
    '',
    '## Thresholds',
    '',
    '- ✅ **Good** (complexity 1-10): Simple and maintainable',
    '- ⚠️ **Warning** (complexity 11-15): Consider refactoring',
    '- ❌ **High** (complexity 16+): Should be refactored',
    '',
  ];

  // 高複雑度の関数を抽出
  const highComplexityFunctions: Array<{
    file: string;
    name: string;
    complexity: number;
    line: number;
  }> = [];

  const warningComplexityFunctions: Array<{
    file: string;
    name: string;
    complexity: number;
    line: number;
  }> = [];

  for (const file of data.files) {
    for (const msg of file.messages) {
      const complexityRule = msg.rules.complexity;
      if (complexityRule) {
        const complexity = complexityRule.value;
        const item = {
          file: file.file,
          name: msg.name,
          complexity,
          line: msg.loc.start.line,
        };

        if (complexity >= 16) {
          highComplexityFunctions.push(item);
        } else if (complexity >= 11) {
          warningComplexityFunctions.push(item);
        }
      }
    }
  }

  // 高複雑度の関数
  if (highComplexityFunctions.length === 0) {
    lines.push('## ✅ High Complexity Functions (16+)', '', 'No functions with high complexity detected. 🎉', '');
  } else {
    lines.push(
      '## ❌ High Complexity Functions (16+)',
      '',
      '| File | Function | Complexity | Line |',
      '|------|----------|------------|------|'
    );

    highComplexityFunctions
      .sort((a, b) => b.complexity - a.complexity)
      .forEach((item) => {
        lines.push(`| ${item.file.replace('/workspace/', '')} | ${item.name} | **${item.complexity}** | ${item.line} |`);
      });
    lines.push('');
  }

  // 警告レベルの関数
  if (warningComplexityFunctions.length > 0) {
    lines.push(
      '## ⚠️ Medium Complexity Functions (11-15)',
      '',
      '| File | Function | Complexity | Line |',
      '|------|----------|------------|------|'
    );

    warningComplexityFunctions
      .sort((a, b) => b.complexity - a.complexity)
      .forEach((item) => {
        lines.push(`| ${item.file.replace('/workspace/', '')} | ${item.name} | ${item.complexity} | ${item.line} |`);
      });
    lines.push('');
  }

  // Top 10最も複雑な関数
  const allFunctions = [...highComplexityFunctions, ...warningComplexityFunctions];
  const topComplexFunctions = allFunctions
    .sort((a, b) => b.complexity - a.complexity)
    .slice(0, 10);

  if (topComplexFunctions.length > 0) {
    lines.push(
      '## 🏆 Top 10 Most Complex Functions',
      '',
      '| Rank | File | Function | Complexity |',
      '|------|------|----------|------------|'
    );

    topComplexFunctions.forEach((item, index) => {
      const status = item.complexity >= 16 ? '❌' : '⚠️';
      lines.push(
        `| ${index + 1} | ${item.file.replace('/workspace/', '')} | ${item.name} | ${item.complexity} ${status} |`
      );
    });
    lines.push('');
  }

  // 推奨事項
  lines.push('## 💡 Recommendations', '');

  if (highComplexityFunctions.length > 0) {
    lines.push(
      '### High Priority',
      '',
      `- **${highComplexityFunctions.length} functions** with complexity ≥ 16 need refactoring`,
      '- Break down large functions into smaller, single-purpose functions',
      '- Extract complex conditional logic into separate helper functions',
      '- Consider using design patterns (Strategy, Factory, etc.) to reduce complexity',
      ''
    );
  }

  if (warningComplexityFunctions.length > 0) {
    lines.push(
      '### Medium Priority',
      '',
      `- **${warningComplexityFunctions.length} functions** with complexity 11-15 should be reviewed`,
      '- Add comprehensive unit tests before refactoring',
      '- Document complex logic with clear comments',
      '- Monitor these functions to prevent further complexity growth',
      ''
    );
  }

  if (highComplexityFunctions.length === 0 && warningComplexityFunctions.length === 0) {
    lines.push('### ✅ All functions have acceptable complexity!', '', 'Great job keeping code simple and maintainable! 🎉', '');
  }

  lines.push(
    '## 📚 Resources',
    '',
    '- [Cyclomatic Complexity (Wikipedia)](https://en.wikipedia.org/wiki/Cyclomatic_complexity)',
    '- [ESLint Complexity Rule](https://eslint.org/docs/rules/complexity)',
    '- [Refactoring Techniques](https://refactoring.guru/refactoring/techniques)',
    '- [Code Complete (Steve McConnell)](https://www.amazon.com/Code-Complete-Practical-Handbook-Construction/dp/0735619670)'
  );

  writeFileSync(MD_OUTPUT, lines.join('\n'));
  console.log(`✅ Markdown report generated: ${MD_OUTPUT}\n`);
}

function displaySummary(data: ComplexityReport): void {
  console.log('📊 Complexity Summary:');
  console.log('━'.repeat(60));
  console.log(`Files Analyzed:      ${data.files.length}`);
  console.log(`Average Rank:        ${data.average.rank.toFixed(2)} (Grade: ${data.average.label})`);
  console.log('');
  console.log('Complexity Distribution:');
  console.log(`  A (Excellent):     ${data.ranks.A ?? 0}`);
  console.log(`  B (Good):          ${data.ranks.B ?? 0}`);
  console.log(`  C (Fair):          ${data.ranks.C ?? 0}`);
  console.log(`  D (Poor):          ${data.ranks.D ?? 0}`);
  console.log(`  E (Very Poor):     ${data.ranks.E ?? 0}`);
  console.log(`  F (Critical):      ${data.ranks.F ?? 0}`);
  console.log('━'.repeat(60));

  // 高複雑度の関数をカウント
  let highComplexityCount = 0;
  let warningComplexityCount = 0;

  for (const file of data.files) {
    for (const msg of file.messages) {
      const complexityRule = msg.rules.complexity;
      if (complexityRule) {
        if (complexityRule.value >= 16) {
          highComplexityCount++;
        } else if (complexityRule.value >= 11) {
          warningComplexityCount++;
        }
      }
    }
  }

  if (highComplexityCount > 0) {
    console.log(`\n❌ ${highComplexityCount} function(s) with high complexity (≥16)`);
  }

  if (warningComplexityCount > 0) {
    console.log(`⚠️  ${warningComplexityCount} function(s) with medium complexity (11-15)`);
  }

  if (highComplexityCount === 0 && warningComplexityCount === 0) {
    console.log('\n✅ All functions have acceptable complexity! 🎉');
  }

  console.log('\n📄 Full reports available at:');
  console.log(`   - JSON:     ${JSON_OUTPUT}`);
  console.log(`   - HTML:     ${HTML_OUTPUT}`);
  console.log(`   - Markdown: ${MD_OUTPUT}`);
  console.log('');
}
