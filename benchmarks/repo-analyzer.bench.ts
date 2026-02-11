import { RepositoryAnalyzer } from '../packages/repo-analyzer/src/analyzer.js';
import { performance } from 'perf_hooks';
import { promises as fs } from 'fs';
import * as path from 'path';

interface BenchmarkResult {
  name: string;
  duration: number;
  iterations: number;
  avgDuration: number;
}

async function createTestRepo(size: 'small' | 'medium' | 'large'): Promise<string> {
  const tmpDir = path.join(__dirname, '../.tmp/benchmark-repo');
  await fs.mkdir(tmpDir, { recursive: true });

  const fileCounts = {
    small: 10,
    medium: 100,
    large: 1000,
  };

  const fileCount = fileCounts[size];

  for (let i = 0; i < fileCount; i++) {
    const content = `
// Test file ${i}
export function test${i}() {
  const x = ${i};
  const y = x * 2;
  return y;
}
`;
    await fs.writeFile(path.join(tmpDir, `file${i}.ts`), content);
  }

  return tmpDir;
}

async function benchmark(
  name: string,
  fn: () => Promise<void>,
  iterations: number = 5
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
  console.log('=== Repository Analyzer Benchmarks ===\n');

  const analyzer = new RepositoryAnalyzer();
  const results: BenchmarkResult[] = [];

  // Benchmark 1: Small repository analysis
  const smallRepo = await createTestRepo('small');
  const smallResult = await benchmark(
    'Analyze small repository (10 files)',
    async () => {
      await analyzer.analyzeLocal(smallRepo);
    },
    5
  );
  results.push(smallResult);

  // Benchmark 2: Medium repository analysis
  const mediumRepo = await createTestRepo('medium');
  const mediumResult = await benchmark(
    'Analyze medium repository (100 files)',
    async () => {
      await analyzer.analyzeLocal(mediumRepo);
    },
    3
  );
  results.push(mediumResult);

  // Benchmark 3: Large repository analysis
  const largeRepo = await createTestRepo('large');
  const largeResult = await benchmark(
    'Analyze large repository (1000 files)',
    async () => {
      await analyzer.analyzeLocal(largeRepo);
    },
    2
  );
  results.push(largeResult);

  // Display results
  console.log('Results:\n');
  results.forEach((result) => {
    console.log(`${result.name}`);
    console.log(`  Iterations: ${result.iterations}`);
    console.log(`  Total: ${result.duration.toFixed(2)}ms`);
    console.log(`  Average: ${result.avgDuration.toFixed(2)}ms`);
    console.log(`  Per file: ${(result.avgDuration / parseInt(result.name.match(/\d+/)?.[0] || '1')).toFixed(2)}ms\n`);
  });

  // Cleanup
  await fs.rm(path.join(__dirname, '../.tmp'), { recursive: true, force: true });
}

runBenchmarks().catch(console.error);
