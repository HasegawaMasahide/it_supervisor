#!/usr/bin/env tsx

/**
 * Quality Dashboard Generator
 *
 * Aggregates quality metrics from various sources and generates
 * a consolidated dashboard in JSON, Markdown, and HTML formats.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface QualityMetrics {
  timestamp: string;
  project: ProjectInfo;
  testing: TestMetrics;
  coverage: CoverageMetrics;
  complexity: ComplexityMetrics;
  dependencies: DependencyMetrics;
  codebase: CodebaseMetrics;
  healthScore: number;
  recommendations: string[];
}

interface ProjectInfo {
  name: string;
  version: string;
  packages: number;
}

interface TestMetrics {
  total: number;
  passed: number;
  skipped: number;
  failed: number;
  passRate: number;
}

interface CoverageMetrics {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  threshold: number;
  passing: boolean;
}

interface ComplexityMetrics {
  averageComplexity: number;
  highComplexityFunctions: number;
  maxComplexity: number;
  filesAnalyzed: number;
}

interface DependencyMetrics {
  total: number;
  outdated: number;
  vulnerabilities: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
}

interface CodebaseMetrics {
  totalFiles: number;
  totalLines: number;
  packages: PackageMetric[];
}

interface PackageMetric {
  name: string;
  files: number;
  lines: number;
  coverage: number;
}

/**
 * Strip ANSI color codes from terminal output
 */
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Extract test metrics from npm test output
 */
function getTestMetrics(): TestMetrics {
  try {
    const output = execSync('npm test 2>&1', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });

    // Strip ANSI color codes before parsing
    const cleanOutput = stripAnsi(output);

    // Parse "Tests  391 passed | 33 skipped (424)"
    // Use more flexible regex to handle whitespace variations
    const testsMatch = cleanOutput.match(/Tests\s+(\d+)\s+passed\s*\|\s*(\d+)\s+skipped\s*\((\d+)\)/);

    if (testsMatch) {
      const passed = parseInt(testsMatch[1], 10);
      const skipped = parseInt(testsMatch[2], 10);
      const total = parseInt(testsMatch[3], 10);
      const failed = total - passed - skipped;
      const passRate = total > 0 ? (passed / total) * 100 : 0;

      return {
        total,
        passed,
        skipped,
        failed,
        passRate,
      };
    }
  } catch (error) {
    // Silently fail and use defaults
  }

  return {
    total: 0,
    passed: 0,
    skipped: 0,
    failed: 0,
    passRate: 0,
  };
}

/**
 * Extract coverage metrics from npm run test:coverage output
 */
function getCoverageMetrics(): CoverageMetrics {
  try {
    const output = execSync('npm run test:coverage 2>&1', { encoding: 'utf-8' });

    // Parse "All files          |   83.99 |    75.67 |   85.14 |   84.19 |"
    const match = output.match(/All files[^\d]*\|[^\d]*([\d.]+)[^\d]*\|[^\d]*([\d.]+)[^\d]*\|[^\d]*([\d.]+)[^\d]*\|[^\d]*([\d.]+)/);

    if (match) {
      const statements = parseFloat(match[1]);
      const branches = parseFloat(match[2]);
      const functions = parseFloat(match[3]);
      const lines = parseFloat(match[4]);
      const threshold = 80;
      const passing = statements >= threshold && lines >= threshold;

      return {
        statements,
        branches,
        functions,
        lines,
        threshold,
        passing,
      };
    }
  } catch {
    // Fallback to default values
  }

  return {
    statements: 0,
    branches: 0,
    functions: 0,
    lines: 0,
    threshold: 80,
    passing: false,
  };
}

/**
 * Extract complexity metrics from complexity report
 */
function getComplexityMetrics(): ComplexityMetrics {
  try {
    const complexityPath = path.join(process.cwd(), '.tmp/complexity-report.json');

    if (!fs.existsSync(complexityPath)) {
      // Generate complexity report
      execSync('npm run complexity:json 2>&1', { encoding: 'utf-8' });
    }

    if (fs.existsSync(complexityPath)) {
      const data = JSON.parse(fs.readFileSync(complexityPath, 'utf-8'));

      let totalComplexity = 0;
      let functionCount = 0;
      let highComplexity = 0;
      let maxComplexity = 0;

      // ESLintCC outputs {"files": [...]} structure
      const files = data.files || data;
      const filesAnalyzed = Array.isArray(files) ? files.length : 0;

      for (const file of files) {
        for (const message of file.messages || []) {
          // Each message has rules.complexity.value
          const complexity = message.rules?.complexity?.value || 0;
          if (complexity > 0) {
            totalComplexity += complexity;
            functionCount++;

            if (complexity > 15) {
              highComplexity++;
            }

            if (complexity > maxComplexity) {
              maxComplexity = complexity;
            }
          }
        }
      }

      return {
        averageComplexity: functionCount > 0 ? parseFloat((totalComplexity / functionCount).toFixed(2)) : 0,
        highComplexityFunctions: highComplexity,
        maxComplexity,
        filesAnalyzed,
      };
    }
  } catch {
    // Fallback to default values
  }

  return {
    averageComplexity: 0,
    highComplexityFunctions: 0,
    maxComplexity: 0,
    filesAnalyzed: 0,
  };
}

/**
 * Extract dependency metrics from npm audit and npm outdated
 */
function getDependencyMetrics(): DependencyMetrics {
  let vulnerabilities = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
  };

  let outdated = 0;

  try {
    // Get vulnerability count
    const auditOutput = execSync('npm audit --json 2>&1', { encoding: 'utf-8' });
    const auditData = JSON.parse(auditOutput);

    if (auditData.metadata && auditData.metadata.vulnerabilities) {
      vulnerabilities = {
        critical: auditData.metadata.vulnerabilities.critical || 0,
        high: auditData.metadata.vulnerabilities.high || 0,
        moderate: auditData.metadata.vulnerabilities.moderate || 0,
        low: auditData.metadata.vulnerabilities.low || 0,
      };
    }
  } catch {
    // npm audit may fail, use defaults
  }

  try {
    // Get outdated packages
    const outdatedOutput = execSync('npm outdated --json 2>&1', { encoding: 'utf-8' });
    const outdatedData = JSON.parse(outdatedOutput);
    outdated = Object.keys(outdatedData).length;
  } catch {
    // npm outdated may fail if all packages are up to date
    outdated = 0;
  }

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const total = Object.keys({
    ...packageJson.dependencies || {},
    ...packageJson.devDependencies || {},
  }).length;

  return {
    total,
    outdated,
    vulnerabilities,
  };
}

/**
 * Extract codebase metrics (files, lines, package breakdown)
 */
function getCodebaseMetrics(): CodebaseMetrics {
  const packages: PackageMetric[] = [];
  let totalFiles = 0;
  let totalLines = 0;

  const packagesDir = path.join(process.cwd(), 'packages');
  const packageDirs = fs.readdirSync(packagesDir).filter((name) => {
    return fs.statSync(path.join(packagesDir, name)).isDirectory();
  });

  for (const packageName of packageDirs) {
    const packagePath = path.join(packagesDir, packageName, 'src');

    if (!fs.existsSync(packagePath)) {
      continue;
    }

    let files = 0;
    let lines = 0;

    const tsFiles = execSync(`find "${packagePath}" -name "*.ts" -not -path "*/node_modules/*" -not -path "*/__tests__/*"`, {
      encoding: 'utf-8',
    }).trim().split('\n').filter(Boolean);

    files = tsFiles.length;

    for (const file of tsFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      lines += content.split('\n').length;
    }

    totalFiles += files;
    totalLines += lines;

    // Get package coverage from coverage report (approximation)
    const coverage = 0; // Placeholder - would need to parse detailed coverage

    packages.push({
      name: `@it-supervisor/${packageName}`,
      files,
      lines,
      coverage,
    });
  }

  return {
    totalFiles,
    totalLines,
    packages,
  };
}

/**
 * Calculate overall health score (0-100)
 */
function calculateHealthScore(metrics: Omit<QualityMetrics, 'healthScore' | 'recommendations'>): number {
  let score = 100;

  // Test pass rate (20 points)
  score -= (100 - metrics.testing.passRate) * 0.2;

  // Coverage (20 points)
  const avgCoverage = (metrics.coverage.statements + metrics.coverage.lines) / 2;
  if (avgCoverage < 80) {
    score -= (80 - avgCoverage) * 0.25;
  }

  // Complexity (20 points)
  if (metrics.complexity.highComplexityFunctions > 0) {
    score -= metrics.complexity.highComplexityFunctions * 2;
  }

  // Dependencies (20 points)
  score -= metrics.dependencies.vulnerabilities.critical * 10;
  score -= metrics.dependencies.vulnerabilities.high * 5;
  score -= metrics.dependencies.vulnerabilities.moderate * 2;
  score -= metrics.dependencies.vulnerabilities.low * 0.5;

  if (metrics.dependencies.outdated > 0) {
    score -= metrics.dependencies.outdated * 0.5;
  }

  // Failed tests (20 points)
  if (metrics.testing.failed > 0) {
    score -= metrics.testing.failed * 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(metrics: Omit<QualityMetrics, 'healthScore' | 'recommendations'>): string[] {
  const recommendations: string[] = [];

  // Test recommendations
  if (metrics.testing.passRate < 100) {
    recommendations.push(`Fix ${metrics.testing.failed} failing tests to achieve 100% pass rate`);
  }

  if (metrics.testing.skipped > 10) {
    recommendations.push(`Review ${metrics.testing.skipped} skipped tests - implement or remove them`);
  }

  // Coverage recommendations
  if (metrics.coverage.statements < 80) {
    recommendations.push(`Increase test coverage from ${metrics.coverage.statements.toFixed(1)}% to 80%+ (target: statements)`);
  }

  if (metrics.coverage.branches < 70) {
    recommendations.push(`Increase branch coverage from ${metrics.coverage.branches.toFixed(1)}% to 70%+ (target: branches)`);
  }

  // Complexity recommendations
  if (metrics.complexity.highComplexityFunctions > 0) {
    recommendations.push(`Refactor ${metrics.complexity.highComplexityFunctions} high-complexity functions (complexity >15)`);
  }

  // Dependency recommendations
  const totalVulns = metrics.dependencies.vulnerabilities.critical +
    metrics.dependencies.vulnerabilities.high +
    metrics.dependencies.vulnerabilities.moderate +
    metrics.dependencies.vulnerabilities.low;

  if (totalVulns > 0) {
    recommendations.push(`Fix ${totalVulns} security vulnerabilities (${metrics.dependencies.vulnerabilities.critical} critical, ${metrics.dependencies.vulnerabilities.high} high)`);
  }

  if (metrics.dependencies.outdated > 5) {
    recommendations.push(`Update ${metrics.dependencies.outdated} outdated dependencies`);
  }

  if (recommendations.length === 0) {
    recommendations.push('✓ All quality metrics are healthy! Keep up the good work.');
  }

  return recommendations;
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport(metrics: QualityMetrics): string {
  const { healthScore, timestamp, project, testing, coverage, complexity, dependencies, codebase, recommendations } = metrics;

  let md = `# Quality Dashboard\n\n`;
  md += `**Generated:** ${timestamp}  \n`;
  md += `**Project:** ${project.name} v${project.version}  \n`;
  md += `**Packages:** ${project.packages}  \n`;
  md += `**Health Score:** ${healthScore.toFixed(1)}/100 ${getHealthEmoji(healthScore)}\n\n`;

  md += `---\n\n`;

  // Testing
  md += `## Testing\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Tests | ${testing.total} |\n`;
  md += `| Passed | ${testing.passed} (${testing.passRate.toFixed(1)}%) |\n`;
  md += `| Skipped | ${testing.skipped} |\n`;
  md += `| Failed | ${testing.failed} |\n\n`;

  // Coverage
  md += `## Test Coverage\n\n`;
  md += `| Metric | Value | Status |\n`;
  md += `|--------|-------|--------|\n`;
  md += `| Statements | ${coverage.statements.toFixed(2)}% | ${coverage.statements >= coverage.threshold ? '✅' : '⚠️'} |\n`;
  md += `| Branches | ${coverage.branches.toFixed(2)}% | ${coverage.branches >= 70 ? '✅' : '⚠️'} |\n`;
  md += `| Functions | ${coverage.functions.toFixed(2)}% | ${coverage.functions >= coverage.threshold ? '✅' : '⚠️'} |\n`;
  md += `| Lines | ${coverage.lines.toFixed(2)}% | ${coverage.lines >= coverage.threshold ? '✅' : '⚠️'} |\n`;
  md += `| **Threshold** | **${coverage.threshold}%** | ${coverage.passing ? '✅ Passing' : '❌ Failing'} |\n\n`;

  // Complexity
  md += `## Code Complexity\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Average Complexity | ${complexity.averageComplexity.toFixed(2)} |\n`;
  md += `| High Complexity Functions (>15) | ${complexity.highComplexityFunctions} |\n`;
  md += `| Max Complexity | ${complexity.maxComplexity} |\n`;
  md += `| Files Analyzed | ${complexity.filesAnalyzed} |\n\n`;

  // Dependencies
  md += `## Dependencies\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Dependencies | ${dependencies.total} |\n`;
  md += `| Outdated | ${dependencies.outdated} |\n`;
  md += `| **Vulnerabilities** | **${dependencies.vulnerabilities.critical + dependencies.vulnerabilities.high + dependencies.vulnerabilities.moderate + dependencies.vulnerabilities.low}** |\n`;
  md += `| Critical | ${dependencies.vulnerabilities.critical} |\n`;
  md += `| High | ${dependencies.vulnerabilities.high} |\n`;
  md += `| Moderate | ${dependencies.vulnerabilities.moderate} |\n`;
  md += `| Low | ${dependencies.vulnerabilities.low} |\n\n`;

  // Codebase
  md += `## Codebase\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Files | ${codebase.totalFiles} |\n`;
  md += `| Total Lines | ${codebase.totalLines.toLocaleString()} |\n`;
  md += `| Avg Lines/File | ${(codebase.totalLines / codebase.totalFiles).toFixed(0)} |\n\n`;

  md += `### Package Breakdown\n\n`;
  md += `| Package | Files | Lines |\n`;
  md += `|---------|-------|-------|\n`;
  for (const pkg of codebase.packages) {
    md += `| ${pkg.name} | ${pkg.files} | ${pkg.lines.toLocaleString()} |\n`;
  }
  md += `\n`;

  // Recommendations
  md += `## Recommendations\n\n`;
  for (const rec of recommendations) {
    md += `- ${rec}\n`;
  }
  md += `\n`;

  return md;
}

/**
 * Get health emoji based on score
 */
function getHealthEmoji(score: number): string {
  if (score >= 90) return '🟢';
  if (score >= 70) return '🟡';
  return '🔴';
}

/**
 * Main function
 */
async function main() {
  console.log('Generating quality dashboard...\n');

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

  const projectInfo: ProjectInfo = {
    name: packageJson.name || '@it-supervisor/tools',
    version: packageJson.version || '0.1.0',
    packages: fs.readdirSync('packages').filter((name) => {
      return fs.statSync(path.join('packages', name)).isDirectory();
    }).length,
  };

  console.log('Collecting metrics...');
  console.log('  - Test metrics...');
  const testing = getTestMetrics();

  console.log('  - Coverage metrics...');
  const coverage = getCoverageMetrics();

  console.log('  - Complexity metrics...');
  const complexity = getComplexityMetrics();

  console.log('  - Dependency metrics...');
  const dependencies = getDependencyMetrics();

  console.log('  - Codebase metrics...');
  const codebase = getCodebaseMetrics();

  const partialMetrics = {
    timestamp: new Date().toISOString(),
    project: projectInfo,
    testing,
    coverage,
    complexity,
    dependencies,
    codebase,
  };

  console.log('  - Calculating health score...');
  const healthScore = calculateHealthScore(partialMetrics);

  console.log('  - Generating recommendations...');
  const recommendations = generateRecommendations(partialMetrics);

  const metrics: QualityMetrics = {
    ...partialMetrics,
    healthScore,
    recommendations,
  };

  // Create output directory
  const outputDir = path.join(process.cwd(), '.tmp');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write JSON
  const jsonPath = path.join(outputDir, 'quality-dashboard.json');
  fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2), 'utf-8');
  console.log(`\n✓ JSON report saved to: ${jsonPath}`);

  // Write Markdown
  const mdReport = generateMarkdownReport(metrics);
  const mdPath = path.join(outputDir, 'quality-dashboard.md');
  fs.writeFileSync(mdPath, mdReport, 'utf-8');
  console.log(`✓ Markdown report saved to: ${mdPath}`);

  // Display summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Quality Dashboard Summary`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`Health Score: ${healthScore.toFixed(1)}/100 ${getHealthEmoji(healthScore)}\n`);
  console.log(`Top Recommendations:`);
  recommendations.slice(0, 5).forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec}`);
  });
  console.log('');
}

main().catch((error) => {
  console.error('Failed to generate quality dashboard:', error);
  process.exit(1);
});
