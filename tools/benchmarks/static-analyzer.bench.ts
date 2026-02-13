import { createLogger, LogLevel } from '@it-supervisor/logger';
const logger = createLogger({ name: 'benchmark', level: LogLevel.INFO });

import { StaticAnalyzer } from '../packages/static-analyzer/src/analyzer.js';

// Import AnalyzerTool enum directly
enum AnalyzerTool {
  ESLint = 'eslint',
  PHPStan = 'phpstan',
  Snyk = 'snyk',
  Gitleaks = 'gitleaks',
  PHPCS = 'phpcs'
}
import { performance } from 'perf_hooks';
import { promises as fs } from 'fs';
import * as path from 'path';

interface BenchmarkResult {
  name: string;
  duration: number;
  iterations: number;
  avgDuration: number;
}

async function createTestProject(complexity: 'simple' | 'complex'): Promise<string> {
  const tmpDir = path.join(__dirname, '../.tmp/benchmark-project');
  await fs.mkdir(tmpDir, { recursive: true });

  const fileCount = complexity === 'simple' ? 5 : 50;

  // Create package.json
  await fs.writeFile(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({
      name: 'benchmark-project',
      version: '1.0.0',
      dependencies: {},
    }, null, 2)
  );

  // Create .eslintrc.json
  await fs.writeFile(
    path.join(tmpDir, '.eslintrc.json'),
    JSON.stringify({
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      env: {
        node: true,
        es6: true,
      },
    }, null, 2)
  );

  // Create test files with intentional ESLint issues
  for (let i = 0; i < fileCount; i++) {
    const content = `
// Intentional ESLint issues for benchmarking
var unused = ${i}; // no-unused-vars
const x = ${i}
const y = x * 2; // missing semicolon
if (x == y) { // eqeqeq
  logger.info('test')
}
`;
    await fs.writeFile(path.join(tmpDir, `file${i}.js`), content);
  }

  return tmpDir;
}

async function benchmark(
  name: string,
  fn: () => Promise<void>,
  iterations: number = 3
): Promise<BenchmarkResult> {
  const durations: number[] = [];

  // Warm-up
  await fn();

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    durations.push(end - start);
  }

  const totalDuration = durations.reduce((a, b) => a + b, 0);
  const avgDuration = totalDuration / iterations;

  return {
    name,
    duration: totalDuration,
    iterations,
    avgDuration,
  };
}

async function runBenchmarks() {
  logger.info('=== Static Analyzer Benchmarks ===\n');

  const analyzer = new StaticAnalyzer();
  const results: BenchmarkResult[] = [];

  // Benchmark 1: Simple project with ESLint
  const simpleProject = await createTestProject('simple');
  const simpleResult = await benchmark(
    'Analyze simple project (5 files, ESLint only)',
    async () => {
      await analyzer.analyze(simpleProject, {
        tools: [AnalyzerTool.ESLint],
        excludePatterns: ['**/node_modules/**'],
      });
    },
    3
  );
  results.push(simpleResult);

  // Benchmark 2: Complex project with ESLint
  const complexProject = await createTestProject('complex');
  const complexResult = await benchmark(
    'Analyze complex project (50 files, ESLint only)',
    async () => {
      await analyzer.analyze(complexProject, {
        tools: [AnalyzerTool.ESLint],
        excludePatterns: ['**/node_modules/**'],
      });
    },
    2
  );
  results.push(complexResult);

  // Display results
  logger.info('Results:\n');
  results.forEach((result) => {
    logger.info(`${result.name}`);
    logger.info(`  Iterations: ${result.iterations}`);
    logger.info(`  Total: ${result.duration.toFixed(2)}ms`);
    logger.info(`  Average: ${result.avgDuration.toFixed(2)}ms\n`);
  });

  // Save JSON results for CI comparison
  const outputDir = path.join(__dirname, '../.tmp/benchmarks');
  await fs.mkdir(outputDir, { recursive: true });

  const jsonOutput = {
    package: 'static-analyzer',
    timestamp: new Date().toISOString(),
    results: results.map(r => ({
      name: r.name,
      iterations: r.iterations,
      totalMs: parseFloat(r.duration.toFixed(2)),
      avgMs: parseFloat(r.avgDuration.toFixed(2))
    }))
  };

  await fs.writeFile(
    path.join(outputDir, 'static-analyzer.json'),
    JSON.stringify(jsonOutput, null, 2)
  );

  logger.info(`\nJSON results saved to: ${path.join(outputDir, 'static-analyzer.json')}`);

  // Cleanup test files (but keep .tmp/benchmarks/ for CI)
  await fs.rm(path.join(__dirname, '../.tmp/benchmark-project'), { recursive: true, force: true });
}

runBenchmarks().catch((err) => logger.error(err));
