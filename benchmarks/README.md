# Performance Benchmarks

This directory contains performance benchmarks for critical operations in IT Supervisor Tools.

## Available Benchmarks

### 1. Repository Analyzer (`repo-analyzer.bench.ts`)

Measures file processing speed and repository analysis performance.

**Scenarios:**
- Small repository (10 files)
- Medium repository (100 files)
- Large repository (1000 files)

**Metrics:**
- Total duration
- Average duration per run
- Duration per file

### 2. Static Analyzer (`static-analyzer.bench.ts`)

Measures static analysis tool execution time.

**Scenarios:**
- Simple project (5 files, ESLint only)
- Complex project (50 files, ESLint only)

**Metrics:**
- Total duration
- Average duration per run
- Tool execution overhead

### 3. Report Generator (`report-generator.bench.ts`)

Measures report rendering performance.

**Scenarios:**
- Small HTML report (10 issues)
- Medium HTML report (100 issues)
- Large HTML report (1000 issues)
- Markdown report (100 issues)

**Metrics:**
- Total duration
- Average duration per run
- Rendering speed per issue

## Running Benchmarks

### Run all benchmarks:

```bash
npm run benchmark
```

### Run specific benchmark:

```bash
npm run benchmark:repo
npm run benchmark:analyzer
npm run benchmark:report
```

## Interpreting Results

### Good Performance Indicators

- **repo-analyzer**: < 10ms per file
- **static-analyzer**: < 5s for simple projects
- **report-generator**: < 100ms for medium reports

### Performance Regression Detection

If any benchmark shows >20% performance degradation compared to previous runs, investigate:

1. Check for algorithmic changes
2. Review added dependencies
3. Profile with Node.js built-in profiler
4. Look for memory leaks

## CI Integration

Benchmarks run automatically in CI to track performance trends over time.
Results are stored in `benchmark-results/` (gitignored).

## Adding New Benchmarks

1. Create `<package-name>.bench.ts` in this directory
2. Export a `runBenchmarks()` function
3. Add npm script in root `package.json`
4. Update this README with scenarios and metrics

## Best Practices

- Run benchmarks on consistent hardware
- Close resource-intensive applications
- Run multiple iterations (3-5 minimum)
- Include warm-up iteration to stabilize JIT
- Use `performance.now()` for high-precision timing
