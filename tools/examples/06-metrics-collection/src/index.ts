import { MetricsDatabase } from '@it-supervisor/metrics-model';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger({ name: 'example', level: LogLevel.INFO });

async function main() {
  logger.info('=== Metrics Collection Example ===\n');

  // 1. Initialize the metrics database
  const dbPath = path.join(__dirname, '../metrics.db');
  const db = new MetricsDatabase(dbPath);

  try {
    // 2. Create a project
    logger.info('Step 1: Creating project...\n');

    const project = db.createProject({
      name: 'example-web-app',
      description: 'Sample web application for metrics tracking',
      repository: 'https://github.com/example/web-app',
    });

    logger.info(`✓ Created project: ${project.name} (ID: ${project.id})`);

    // 3. Record initial metrics
    logger.info('\nStep 2: Recording initial metrics...\n');

    const beforeDate = new Date('2024-01-01');

    db.recordMetric({
      projectId: project.id!,
      category: 'code',
      name: 'total_lines',
      value: 15000,
      timestamp: beforeDate,
    });

    db.recordMetric({
      projectId: project.id!,
      category: 'code',
      name: 'test_coverage',
      value: 65.5,
      unit: '%',
      timestamp: beforeDate,
    });

    db.recordMetric({
      projectId: project.id!,
      category: 'quality',
      name: 'code_smells',
      value: 42,
      timestamp: beforeDate,
    });

    db.recordMetric({
      projectId: project.id!,
      category: 'security',
      name: 'vulnerabilities',
      value: 8,
      timestamp: beforeDate,
    });

    logger.info('✓ Recorded 4 initial metrics');

    // 4. Record improved metrics (after refactoring)
    logger.info('\nStep 3: Recording improved metrics (after refactoring)...\n');

    const afterDate = new Date('2024-02-01');

    db.recordMetric({
      projectId: project.id!,
      category: 'code',
      name: 'total_lines',
      value: 14200,
      timestamp: afterDate,
    });

    db.recordMetric({
      projectId: project.id!,
      category: 'code',
      name: 'test_coverage',
      value: 82.3,
      unit: '%',
      timestamp: afterDate,
    });

    db.recordMetric({
      projectId: project.id!,
      category: 'quality',
      name: 'code_smells',
      value: 18,
      timestamp: afterDate,
    });

    db.recordMetric({
      projectId: project.id!,
      category: 'security',
      name: 'vulnerabilities',
      value: 2,
      timestamp: afterDate,
    });

    logger.info('✓ Recorded 4 improved metrics');

    // 5. Batch recording for performance metrics
    logger.info('\nStep 4: Batch recording performance metrics...\n');

    db.batchRecordMetrics([
      {
        projectId: project.id!,
        category: 'performance',
        name: 'page_load_time',
        value: 1.8,
        unit: 's',
        timestamp: afterDate,
      },
      {
        projectId: project.id!,
        category: 'performance',
        name: 'api_response_time',
        value: 250,
        unit: 'ms',
        timestamp: afterDate,
      },
      {
        projectId: project.id!,
        category: 'performance',
        name: 'memory_usage',
        value: 156,
        unit: 'MB',
        timestamp: afterDate,
      },
    ]);

    logger.info('✓ Batch recorded 3 performance metrics');

    // 6. Query metrics
    logger.info('\nStep 5: Querying metrics...\n');

    const codeMetrics = db.getMetrics({
      projectId: project.id!,
      category: 'code',
      sortBy: 'name',
      order: 'ASC',
    });

    logger.info(`Code Metrics (${codeMetrics.length} records):`);
    codeMetrics.forEach(metric => {
      const date = new Date(metric.timestamp!).toISOString().split('T')[0];
      logger.info(`  ${metric.name}: ${metric.value}${metric.unit || ''} (${date})`);
    });

    // 7. Aggregate metrics
    logger.info('\nStep 6: Aggregating metrics...\n');

    const aggregated = db.aggregateMetrics({
      projectId: project.id!,
      category: 'code',
    });

    logger.info('Aggregated Code Metrics:');
    aggregated.forEach(agg => {
      logger.info(`  ${agg.name}:`);
      logger.info(`    Count: ${agg.count}`);
      logger.info(`    Min: ${agg.min}`);
      logger.info(`    Max: ${agg.max}`);
      logger.info(`    Avg: ${agg.avg.toFixed(2)}`);
      logger.info(`    Sum: ${agg.sum}`);
    });

    // 8. Compare metrics before and after
    logger.info('\nStep 7: Comparing metrics (before vs after)...\n');

    const comparison = db.compareMetrics({
      projectId: project.id!,
      beforeDate,
      afterDate,
    });

    logger.info('Improvements:');
    comparison.forEach(comp => {
      const change = comp.change || 0;
      const percentChange = comp.percentChange || 0;
      const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
      const sign = change > 0 ? '+' : '';

      // Determine if this is an improvement
      const isImprovement =
        (comp.name === 'test_coverage' && change > 0) ||
        (comp.name === 'code_smells' && change < 0) ||
        (comp.name === 'vulnerabilities' && change < 0) ||
        (comp.name === 'total_lines' && change < 0);

      const status = isImprovement ? '✓' : '⚠';

      logger.info(
        `  ${status} ${comp.name}: ${comp.before} → ${comp.after} ` +
        `(${arrow} ${sign}${change}, ${sign}${percentChange.toFixed(1)}%)`
      );
    });

    // 9. Export metrics
    logger.info('\nStep 8: Exporting metrics...\n');

    const exportData = db.exportMetrics({
      projectIds: [project.id!],
    });

    logger.info(`Exported ${exportData.metrics.length} metrics for ${exportData.projects.length} project(s)`);

    // 10. Export to CSV
    const csv = db.exportToCSV({
      projectId: project.id!,
    });

    logger.info('\nCSV Export (first 300 characters):');
    logger.info(csv.substring(0, 300) + '...\n');

    logger.info('✓ Metrics collection example completed successfully');
    logger.info(`\nDatabase stored at: ${dbPath}`);
    logger.info('Run "npm run clean" to remove the database file.');

  } catch (error) {
    logger.error('\n✗ Metrics collection failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the example
main().catch((err) => logger.error(err));
