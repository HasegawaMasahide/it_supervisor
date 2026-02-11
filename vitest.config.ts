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
    },
  },
  resolve: {
    alias: {
      '@it-supervisor/metrics-model': '/workspace/packages/metrics-model/src/index.ts',
      '@it-supervisor/repo-analyzer': '/workspace/packages/repo-analyzer/src/index.ts',
      '@it-supervisor/static-analyzer': '/workspace/packages/static-analyzer/src/index.ts',
      '@it-supervisor/issue-manager': '/workspace/packages/issue-manager/src/index.ts',
      '@it-supervisor/report-generator': '/workspace/packages/report-generator/src/index.ts',
      '@it-supervisor/sandbox-builder': '/workspace/packages/sandbox-builder/src/index.ts',
    },
  },
});
