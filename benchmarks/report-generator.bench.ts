import { ReportGenerator, ReportType } from '../packages/report-generator/src/generator.js';
import { performance } from 'perf_hooks';
import { promises as fs } from 'fs';
import * as path from 'path';

interface BenchmarkResult {
  name: string;
  duration: number;
  iterations: number;
  avgDuration: number;
}

function generateLargeReportData(size: 'small' | 'medium' | 'large') {
  const issueCounts = {
    small: 10,
    medium: 100,
    large: 1000,
  };

  const issueCount = issueCounts[size];
  const issues = [];

  for (let i = 0; i < issueCount; i++) {
    issues.push({
      id: `issue-${i}`,
      title: `Test Issue ${i}`,
      severity: ['Low', 'Medium', 'High', 'Critical'][i % 4],
      category: ['Security', 'Performance', 'Bug', 'Code Quality'][i % 4],
      description: `This is a test issue description for issue ${i}. `.repeat(10),
      file: `src/file${i}.ts`,
      line: i * 10,
    });
  }

  return {
    projectName: 'Benchmark Project',
    timestamp: new Date().toISOString(),
    summary: {
      totalIssues: issueCount,
      critical: Math.floor(issueCount * 0.1),
      high: Math.floor(issueCount * 0.2),
      medium: Math.floor(issueCount * 0.3),
      low: Math.floor(issueCount * 0.4),
    },
    issues,
  };
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
  console.log('=== Report Generator Benchmarks ===\n');

  const generator = new ReportGenerator();
  const tmpDir = path.join(__dirname, '../.tmp/benchmark-reports');
  await fs.mkdir(tmpDir, { recursive: true });

  const results: BenchmarkResult[] = [];

  // Benchmark 1: Small HTML report
  const smallData = generateLargeReportData('small');
  const smallHtmlResult = await benchmark(
    'Generate small HTML report (10 issues)',
    async () => {
      await generator.generate(smallData, {
        type: ReportType.HTML,
        outputPath: path.join(tmpDir, 'small.html'),
      });
    },
    5
  );
  results.push(smallHtmlResult);

  // Benchmark 2: Medium HTML report
  const mediumData = generateLargeReportData('medium');
  const mediumHtmlResult = await benchmark(
    'Generate medium HTML report (100 issues)',
    async () => {
      await generator.generate(mediumData, {
        type: ReportType.HTML,
        outputPath: path.join(tmpDir, 'medium.html'),
      });
    },
    5
  );
  results.push(mediumHtmlResult);

  // Benchmark 3: Large HTML report
  const largeData = generateLargeReportData('large');
  const largeHtmlResult = await benchmark(
    'Generate large HTML report (1000 issues)',
    async () => {
      await generator.generate(largeData, {
        type: ReportType.HTML,
        outputPath: path.join(tmpDir, 'large.html'),
      });
    },
    3
  );
  results.push(largeHtmlResult);

  // Benchmark 4: Markdown report
  const markdownResult = await benchmark(
    'Generate markdown report (100 issues)',
    async () => {
      await generator.generate(mediumData, {
        type: ReportType.Markdown,
        outputPath: path.join(tmpDir, 'report.md'),
      });
    },
    5
  );
  results.push(markdownResult);

  // Display results
  console.log('Results:\n');
  results.forEach((result) => {
    console.log(`${result.name}`);
    console.log(`  Iterations: ${result.iterations}`);
    console.log(`  Total: ${result.duration.toFixed(2)}ms`);
    console.log(`  Average: ${result.avgDuration.toFixed(2)}ms\n`);
  });

  // Cleanup
  await fs.rm(path.join(__dirname, '../.tmp'), { recursive: true, force: true });
}

runBenchmarks().catch(console.error);
