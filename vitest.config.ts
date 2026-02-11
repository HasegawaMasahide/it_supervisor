import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts'],
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
      '@it-supervisor/logger': '/workspace/packages/logger/src/index.ts',
      '@it-supervisor/metrics-model': '/workspace/packages/metrics-model/src/index.ts',
      '@it-supervisor/repo-analyzer': '/workspace/packages/repo-analyzer/src/index.ts',
      '@it-supervisor/static-analyzer': '/workspace/packages/static-analyzer/src/index.ts',
      '@it-supervisor/issue-manager': '/workspace/packages/issue-manager/src/index.ts',
      '@it-supervisor/report-generator': '/workspace/packages/report-generator/src/index.ts',
      '@it-supervisor/sandbox-builder': '/workspace/packages/sandbox-builder/src/index.ts',
    },
  },
});
