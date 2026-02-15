import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts', 'tests/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/types.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
      // Note: Current coverage baseline (as of 2026-02-11)
      // - Lines: 83.84% ✓
      // - Branches: 75.56% ✓
      // - Functions: 84.41% ✓
      // - Statements: 83.71% ✓
      // Goal: Maintain 80%+ coverage and incrementally improve to 90%+
    },
  },
  resolve: {
    alias: {
      '@it-supervisor/logger': new URL('./packages/logger/src/index.ts', import.meta.url).pathname,
      '@it-supervisor/metrics-model': new URL('./packages/metrics-model/src/index.ts', import.meta.url).pathname,
      '@it-supervisor/repo-analyzer': new URL('./packages/repo-analyzer/src/index.ts', import.meta.url).pathname,
      '@it-supervisor/static-analyzer': new URL('./packages/static-analyzer/src/index.ts', import.meta.url).pathname,
      '@it-supervisor/issue-manager': new URL('./packages/issue-manager/src/index.ts', import.meta.url).pathname,
      '@it-supervisor/report-generator': new URL('./packages/report-generator/src/index.ts', import.meta.url).pathname,
      '@it-supervisor/sandbox-builder': new URL('./packages/sandbox-builder/src/index.ts', import.meta.url).pathname,
    },
  },
});
