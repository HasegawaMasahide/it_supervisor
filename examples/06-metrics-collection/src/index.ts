import { MetricsDatabase } from '@it-supervisor/metrics-model';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('=== Metrics Collection Example ===\n');

  // 1. Initialize the metrics database
  const dbPath = path.join(__dirname, '../metrics.db');
  const db = new MetricsDatabase(dbPath);

  try {
    // 2. Create a project
    console.log('Step 1: Creating project...\n');

    const project = db.createProject({
      name: 'example-web-app',
      description: 'Sample web application for metrics tracking',
      repository: 'https://github.com/example/web-app',
    });

    console.log(`✓ Created project: ${project.name} (ID: ${project.id})`);

    // 3. Record initial metrics
    console.log('\nStep 2: Recording initial metrics...\n');

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

    console.log('✓ Recorded 4 initial metrics');

    // 4. Record improved metrics (after refactoring)
    console.log('\nStep 3: Recording improved metrics (after refactoring)...\n');

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

    console.log('✓ Recorded 4 improved metrics');

    // 5. Batch recording for performance metrics
    console.log('\nStep 4: Batch recording performance metrics...\n');

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

    console.log('✓ Batch recorded 3 performance metrics');

    // 6. Query metrics
    console.log('\nStep 5: Querying metrics...\n');

    const codeMetrics = db.getMetrics({
      projectId: project.id!,
      category: 'code',
      sortBy: 'name',
      order: 'ASC',
    });

    console.log(`Code Metrics (${codeMetrics.length} records):`);
    codeMetrics.forEach(metric => {
      const date = new Date(metric.timestamp!).toISOString().split('T')[0];
      console.log(`  ${metric.name}: ${metric.value}${metric.unit || ''} (${date})`);
    });

    // 7. Aggregate metrics
    console.log('\nStep 6: Aggregating metrics...\n');

    const aggregated = db.aggregateMetrics({
      projectId: project.id!,
      category: 'code',
    });

    console.log('Aggregated Code Metrics:');
    aggregated.forEach(agg => {
      console.log(`  ${agg.name}:`);
      console.log(`    Count: ${agg.count}`);
      console.log(`    Min: ${agg.min}`);
      console.log(`    Max: ${agg.max}`);
      console.log(`    Avg: ${agg.avg.toFixed(2)}`);
      console.log(`    Sum: ${agg.sum}`);
    });

    // 8. Compare metrics before and after
    console.log('\nStep 7: Comparing metrics (before vs after)...\n');

    const comparison = db.compareMetrics({
      projectId: project.id!,
      beforeDate,
      afterDate,
    });

    console.log('Improvements:');
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

      console.log(
        `  ${status} ${comp.name}: ${comp.before} → ${comp.after} ` +
        `(${arrow} ${sign}${change}, ${sign}${percentChange.toFixed(1)}%)`
      );
    });

    // 9. Export metrics
    console.log('\nStep 8: Exporting metrics...\n');

    const exportData = db.exportMetrics({
      projectIds: [project.id!],
    });

    console.log(`Exported ${exportData.metrics.length} metrics for ${exportData.projects.length} project(s)`);

    // 10. Export to CSV
    const csv = db.exportToCSV({
      projectId: project.id!,
    });

    console.log('\nCSV Export (first 300 characters):');
    console.log(csv.substring(0, 300) + '...\n');

    console.log('✓ Metrics collection example completed successfully');
    console.log(`\nDatabase stored at: ${dbPath}`);
    console.log('Run "npm run clean" to remove the database file.');

  } catch (error) {
    console.error('\n✗ Metrics collection failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
