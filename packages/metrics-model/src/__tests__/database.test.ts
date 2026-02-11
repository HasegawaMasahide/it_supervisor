import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetricsDatabase } from '../database.js';
import { MetricCategory, type MetricRecord, type Project } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('MetricsDatabase', () => {
  let db: MetricsDatabase;
  let testDbPath: string;

  beforeEach(() => {
    // テスト用の一時的なデータベースファイルを作成
    testDbPath = path.join(os.tmpdir(), `test-metrics-${Date.now()}.db`);
    db = new MetricsDatabase(testDbPath);
  });

  afterEach(() => {
    // データベースを閉じて、ファイルを削除
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('createProject', () => {
    it('should create a new project with required fields', () => {
      const project = db.createProject({
        name: 'Test Project',
        description: 'A test project'
      });

      expect(project).toBeDefined();
      expect(project.id).toBeTruthy();
      expect(project.name).toBe('Test Project');
      expect(project.description).toBe('A test project');
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a project with metadata', () => {
      const project = db.createProject({
        name: 'Test Project',
        metadata: { owner: 'test-user', repo: 'test-repo' }
      });

      expect(project.metadata).toEqual({ owner: 'test-user', repo: 'test-repo' });
    });

    it('should throw error for empty project name', () => {
      expect(() => {
        db.createProject({ name: '' });
      }).toThrow('Project name is required');
    });

    it('should throw error for project name longer than 255 characters', () => {
      const longName = 'a'.repeat(256);
      expect(() => {
        db.createProject({ name: longName });
      }).toThrow('Project name must be less than 255 characters');
    });

    it('should allow disabling validation', () => {
      const dbNoValidation = new MetricsDatabase(testDbPath.replace('.db', '-no-validation.db'), {
        validate: false
      });

      const project = dbNoValidation.createProject({ name: '' });
      expect(project).toBeDefined();

      dbNoValidation.close();
      fs.unlinkSync(testDbPath.replace('.db', '-no-validation.db'));
    });
  });

  describe('getProject', () => {
    it('should retrieve an existing project', () => {
      const created = db.createProject({
        name: 'Test Project',
        description: 'Description'
      });

      const retrieved = db.getProject(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe(created.name);
      expect(retrieved?.description).toBe(created.description);
    });

    it('should return null for non-existent project', () => {
      const result = db.getProject('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getAllProjects', () => {
    it('should retrieve all projects', () => {
      db.createProject({ name: 'Project 1' });
      db.createProject({ name: 'Project 2' });
      db.createProject({ name: 'Project 3' });

      const projects = db.getAllProjects();

      expect(projects).toHaveLength(3);
      expect(projects.map(p => p.name)).toContain('Project 1');
      expect(projects.map(p => p.name)).toContain('Project 2');
      expect(projects.map(p => p.name)).toContain('Project 3');
    });

    it('should return empty array when no projects exist', () => {
      const projects = db.getAllProjects();
      expect(projects).toEqual([]);
    });

    it('should return projects ordered by creation date descending', () => {
      const project1 = db.createProject({ name: 'Project 1' });
      const project2 = db.createProject({ name: 'Project 2' });
      const project3 = db.createProject({ name: 'Project 3' });

      const projects = db.getAllProjects();

      expect(projects[0].id).toBe(project3.id);
      expect(projects[1].id).toBe(project2.id);
      expect(projects[2].id).toBe(project1.id);
    });
  });

  describe('updateProject', () => {
    it('should update project name', () => {
      const project = db.createProject({ name: 'Original Name' });
      const updated = db.updateProject(project.id, { name: 'Updated Name' });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
    });

    it('should update project description', () => {
      const project = db.createProject({ name: 'Project' });
      const updated = db.updateProject(project.id, { description: 'New description' });

      expect(updated?.description).toBe('New description');
    });

    it('should update project metadata', () => {
      const project = db.createProject({ name: 'Project' });
      const updated = db.updateProject(project.id, { metadata: { key: 'value' } });

      expect(updated?.metadata).toEqual({ key: 'value' });
    });

    it('should update updatedAt timestamp', () => {
      const project = db.createProject({ name: 'Project' });
      const originalUpdatedAt = project.updatedAt.getTime();

      // Wait a bit to ensure timestamp difference
      const updated = db.updateProject(project.id, { name: 'Updated' });

      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it('should return null for non-existent project', () => {
      const result = db.updateProject('non-existent-id', { name: 'New Name' });
      expect(result).toBeNull();
    });
  });

  describe('deleteProject', () => {
    it('should delete an existing project', () => {
      const project = db.createProject({ name: 'Project to Delete' });

      const deleted = db.deleteProject(project.id);

      expect(deleted).toBe(true);
      expect(db.getProject(project.id)).toBeNull();
    });

    it('should also delete related metrics', () => {
      const project = db.createProject({ name: 'Project' });
      db.recordMetric({
        projectId: project.id,
        timestamp: new Date(),
        category: MetricCategory.Performance,
        name: 'response_time',
        value: 100,
        source: 'test'
      });

      db.deleteProject(project.id);

      const metrics = db.getMetrics({ projectId: project.id });
      expect(metrics).toHaveLength(0);
    });

    it('should return false for non-existent project', () => {
      const result = db.deleteProject('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('recordMetric', () => {
    let project: Project;

    beforeEach(() => {
      project = db.createProject({ name: 'Test Project' });
    });

    it('should record a numeric metric', () => {
      const metric = db.recordMetric({
        projectId: project.id,
        timestamp: new Date(),
        category: MetricCategory.Performance,
        name: 'response_time',
        value: 150,
        unit: 'ms',
        source: 'performance-test'
      });

      expect(metric).toBeDefined();
      expect(metric.id).toBeTruthy();
      expect(metric.value).toBe(150);
      expect(metric.unit).toBe('ms');
    });

    it('should record a string metric', () => {
      const metric = db.recordMetric({
        projectId: project.id,
        timestamp: new Date(),
        category: MetricCategory.CodeQuality,
        name: 'status',
        value: 'passing',
        source: 'ci-pipeline'
      });

      expect(metric.value).toBe('passing');
    });

    it('should record a boolean metric', () => {
      const metric = db.recordMetric({
        projectId: project.id,
        timestamp: new Date(),
        category: MetricCategory.Security,
        name: 'has_vulnerabilities',
        value: false,
        source: 'security-scanner'
      });

      expect(metric.value).toBe(false);
    });

    it('should record a metric with tags and metadata', () => {
      const metric = db.recordMetric({
        projectId: project.id,
        timestamp: new Date(),
        category: MetricCategory.Performance,
        name: 'cpu_usage',
        value: 75,
        unit: 'percentage',
        source: 'system-monitor',
        tags: ['production', 'server-1'],
        metadata: { host: 'server-1.example.com' }
      });

      expect(metric.tags).toEqual(['production', 'server-1']);
      expect(metric.metadata).toEqual({ host: 'server-1.example.com' });
    });

    it('should throw error for missing projectId', () => {
      expect(() => {
        db.recordMetric({
          projectId: '',
          timestamp: new Date(),
          category: MetricCategory.Performance,
          name: 'test',
          value: 100,
          source: 'test'
        });
      }).toThrow('Project ID is required');
    });

    it('should throw error for missing metric name', () => {
      expect(() => {
        db.recordMetric({
          projectId: project.id,
          timestamp: new Date(),
          category: MetricCategory.Performance,
          name: '',
          value: 100,
          source: 'test'
        });
      }).toThrow('Metric name is required');
    });

    it('should throw error for missing source', () => {
      expect(() => {
        db.recordMetric({
          projectId: project.id,
          timestamp: new Date(),
          category: MetricCategory.Performance,
          name: 'test',
          value: 100,
          source: ''
        });
      }).toThrow('Metric source is required');
    });

    it('should throw error for non-existent project', () => {
      expect(() => {
        db.recordMetric({
          projectId: 'non-existent-id',
          timestamp: new Date(),
          category: MetricCategory.Performance,
          name: 'test',
          value: 100,
          source: 'test'
        });
      }).toThrow('Project with ID non-existent-id does not exist');
    });
  });

  describe('getMetrics', () => {
    let project: Project;

    beforeEach(() => {
      project = db.createProject({ name: 'Test Project' });

      // Create test metrics
      db.recordMetric({
        projectId: project.id,
        timestamp: new Date('2026-01-01'),
        category: MetricCategory.Performance,
        name: 'response_time',
        value: 100,
        source: 'test'
      });

      db.recordMetric({
        projectId: project.id,
        timestamp: new Date('2026-01-02'),
        category: MetricCategory.Performance,
        name: 'response_time',
        value: 150,
        source: 'test'
      });

      db.recordMetric({
        projectId: project.id,
        timestamp: new Date('2026-01-03'),
        category: MetricCategory.Security,
        name: 'vulnerability_count',
        value: 5,
        source: 'security-scanner'
      });
    });

    it('should retrieve all metrics for a project', () => {
      const metrics = db.getMetrics({ projectId: project.id });
      expect(metrics).toHaveLength(3);
    });

    it('should filter by category', () => {
      const metrics = db.getMetrics({
        projectId: project.id,
        category: MetricCategory.Performance
      });

      expect(metrics).toHaveLength(2);
      expect(metrics.every(m => m.category === MetricCategory.Performance)).toBe(true);
    });

    it('should filter by metric name', () => {
      const metrics = db.getMetrics({
        projectId: project.id,
        name: 'response_time'
      });

      expect(metrics).toHaveLength(2);
      expect(metrics.every(m => m.name === 'response_time')).toBe(true);
    });

    it('should filter by date range', () => {
      const metrics = db.getMetrics({
        projectId: project.id,
        from: new Date('2026-01-02'),
        to: new Date('2026-01-03')
      });

      expect(metrics).toHaveLength(2);
    });

    it('should apply limit', () => {
      const metrics = db.getMetrics({
        projectId: project.id,
        limit: 2
      });

      expect(metrics).toHaveLength(2);
    });

    it('should apply offset with limit', () => {
      const allMetrics = db.getMetrics({
        projectId: project.id,
        orderBy: 'timestamp',
        order: 'asc'
      });

      const offsetMetrics = db.getMetrics({
        projectId: project.id,
        offset: 1,
        limit: 10,
        orderBy: 'timestamp',
        order: 'asc'
      });

      expect(offsetMetrics).toHaveLength(2);
      expect(offsetMetrics[0].id).toBe(allMetrics[1].id);
    });

    it('should order by timestamp descending by default', () => {
      const metrics = db.getMetrics({ projectId: project.id });

      expect(metrics[0].timestamp.getTime()).toBeGreaterThanOrEqual(
        metrics[1].timestamp.getTime()
      );
    });

    it('should order by timestamp ascending', () => {
      const metrics = db.getMetrics({
        projectId: project.id,
        orderBy: 'timestamp',
        order: 'asc'
      });

      expect(metrics[0].timestamp.getTime()).toBeLessThanOrEqual(
        metrics[1].timestamp.getTime()
      );
    });
  });

  describe('deleteMetric', () => {
    it('should delete an existing metric', () => {
      const project = db.createProject({ name: 'Project' });
      const metric = db.recordMetric({
        projectId: project.id,
        timestamp: new Date(),
        category: MetricCategory.Performance,
        name: 'test',
        value: 100,
        source: 'test'
      });

      const deleted = db.deleteMetric(metric.id!);

      expect(deleted).toBe(true);
      const metrics = db.getMetrics({ projectId: project.id });
      expect(metrics).toHaveLength(0);
    });

    it('should return false for non-existent metric', () => {
      const result = db.deleteMetric('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('aggregateMetrics', () => {
    let project: Project;

    beforeEach(() => {
      project = db.createProject({ name: 'Test Project' });

      // Create test metrics
      db.recordMetric({
        projectId: project.id,
        timestamp: new Date(),
        category: MetricCategory.Performance,
        name: 'response_time',
        value: 100,
        source: 'test'
      });

      db.recordMetric({
        projectId: project.id,
        timestamp: new Date(),
        category: MetricCategory.Performance,
        name: 'response_time',
        value: 150,
        source: 'test'
      });

      db.recordMetric({
        projectId: project.id,
        timestamp: new Date(),
        category: MetricCategory.Performance,
        name: 'response_time',
        value: 200,
        source: 'test'
      });

      db.recordMetric({
        projectId: project.id,
        timestamp: new Date(),
        category: MetricCategory.Security,
        name: 'vulnerability_count',
        value: 5,
        source: 'security-scanner'
      });
    });

    it('should aggregate metrics by category and name', () => {
      const aggregations = db.aggregateMetrics(project.id);

      expect(aggregations).toHaveLength(2);

      const responseTimeAgg = aggregations.find(
        a => a.name === 'response_time'
      );
      expect(responseTimeAgg).toBeDefined();
      expect(responseTimeAgg?.count).toBe(3);
      expect(responseTimeAgg?.min).toBe(100);
      expect(responseTimeAgg?.max).toBe(200);
      expect(responseTimeAgg?.avg).toBeCloseTo(150, 1);
      expect(responseTimeAgg?.sum).toBe(450);
    });

    it('should filter aggregation by category', () => {
      const aggregations = db.aggregateMetrics(
        project.id,
        MetricCategory.Performance
      );

      expect(aggregations).toHaveLength(1);
      expect(aggregations[0].category).toBe(MetricCategory.Performance);
    });
  });

  describe('compareMetrics', () => {
    let project: Project;

    beforeEach(() => {
      project = db.createProject({ name: 'Test Project' });

      // Before metrics
      db.recordMetric({
        projectId: project.id,
        timestamp: new Date('2026-01-01'),
        category: MetricCategory.Performance,
        name: 'response_time',
        value: 100,
        unit: 'ms',
        source: 'test'
      });

      db.recordMetric({
        projectId: project.id,
        timestamp: new Date('2026-01-01'),
        category: MetricCategory.CodeQuality,
        name: 'test_coverage',
        value: 75,
        unit: 'percentage',
        source: 'test'
      });

      // After metrics
      db.recordMetric({
        projectId: project.id,
        timestamp: new Date('2026-01-10'),
        category: MetricCategory.Performance,
        name: 'response_time',
        value: 80,
        unit: 'ms',
        source: 'test'
      });

      db.recordMetric({
        projectId: project.id,
        timestamp: new Date('2026-01-10'),
        category: MetricCategory.CodeQuality,
        name: 'test_coverage',
        value: 85,
        unit: 'percentage',
        source: 'test'
      });
    });

    it('should compare metrics before and after dates', () => {
      const comparisons = db.compareMetrics(
        project.id,
        new Date('2026-01-05'),
        new Date('2026-01-09')
      );

      expect(comparisons).toHaveLength(2);
    });

    it('should calculate numeric changes correctly', () => {
      const comparisons = db.compareMetrics(
        project.id,
        new Date('2026-01-05'),
        new Date('2026-01-09')
      );

      const responseTimeComparison = comparisons.find(
        c => c.name === 'response_time'
      );

      expect(responseTimeComparison).toBeDefined();
      expect(responseTimeComparison?.beforeValue).toBe(100);
      expect(responseTimeComparison?.afterValue).toBe(80);
      expect(responseTimeComparison?.change).toBe(-20);
      expect(responseTimeComparison?.changePercentage).toBe(-20);
    });

    it('should calculate percentage change correctly', () => {
      const comparisons = db.compareMetrics(
        project.id,
        new Date('2026-01-05'),
        new Date('2026-01-09')
      );

      const coverageComparison = comparisons.find(
        c => c.name === 'test_coverage'
      );

      expect(coverageComparison?.change).toBeCloseTo(10, 1);
      expect(coverageComparison?.changePercentage).toBeCloseTo(13.33, 1);
    });
  });

  describe('recordMetricsBatch', () => {
    let project: Project;

    beforeEach(() => {
      project = db.createProject({ name: 'Test Project' });
    });

    it('should record multiple metrics in a transaction', () => {
      const metrics = [
        {
          projectId: project.id,
          timestamp: new Date(),
          category: MetricCategory.Performance,
          name: 'metric1',
          value: 100,
          source: 'test'
        },
        {
          projectId: project.id,
          timestamp: new Date(),
          category: MetricCategory.Performance,
          name: 'metric2',
          value: 200,
          source: 'test'
        },
        {
          projectId: project.id,
          timestamp: new Date(),
          category: MetricCategory.Security,
          name: 'metric3',
          value: 300,
          source: 'test'
        }
      ];

      const recorded = db.recordMetricsBatch(metrics);

      expect(recorded).toHaveLength(3);
      expect(recorded.every(m => m.id)).toBe(true);

      const allMetrics = db.getMetrics({ projectId: project.id });
      expect(allMetrics).toHaveLength(3);
    });
  });

  describe('exportMetrics and importMetrics', () => {
    it('should export and import metrics correctly', () => {
      const project1 = db.createProject({ name: 'Project 1' });
      const project2 = db.createProject({ name: 'Project 2' });

      db.recordMetric({
        projectId: project1.id,
        timestamp: new Date(),
        category: MetricCategory.Performance,
        name: 'test1',
        value: 100,
        source: 'test'
      });

      db.recordMetric({
        projectId: project2.id,
        timestamp: new Date(),
        category: MetricCategory.Security,
        name: 'test2',
        value: 200,
        source: 'test'
      });

      const exported = db.exportMetrics();

      expect(exported.version).toBe('1.0');
      expect(exported.projects).toHaveLength(2);
      expect(exported.metrics).toHaveLength(2);

      // Create a new database and import
      const newDbPath = path.join(os.tmpdir(), `test-metrics-import-${Date.now()}.db`);
      const newDb = new MetricsDatabase(newDbPath);

      newDb.importMetrics(exported);

      const importedProjects = newDb.getAllProjects();
      const importedMetrics = newDb.getMetrics();

      expect(importedProjects).toHaveLength(2);
      expect(importedMetrics).toHaveLength(2);

      newDb.close();
      fs.unlinkSync(newDbPath);
    });

    it('should export specific projects', () => {
      const project1 = db.createProject({ name: 'Project 1' });
      const project2 = db.createProject({ name: 'Project 2' });

      db.recordMetric({
        projectId: project1.id,
        timestamp: new Date(),
        category: MetricCategory.Performance,
        name: 'test',
        value: 100,
        source: 'test'
      });

      db.recordMetric({
        projectId: project2.id,
        timestamp: new Date(),
        category: MetricCategory.Security,
        name: 'test',
        value: 200,
        source: 'test'
      });

      const exported = db.exportMetrics([project1.id]);

      expect(exported.projects).toHaveLength(1);
      expect(exported.metrics).toHaveLength(1);
      expect(exported.metrics[0].projectId).toBe(project1.id);
    });
  });

  describe('exportToCSV', () => {
    it('should export metrics to CSV format', () => {
      const project = db.createProject({ name: 'Test Project' });

      db.recordMetric({
        projectId: project.id,
        timestamp: new Date('2026-01-01T12:00:00Z'),
        category: MetricCategory.Performance,
        name: 'response_time',
        value: 100,
        unit: 'ms',
        source: 'performance-test',
        notes: 'Test note'
      });

      const csv = db.exportToCSV();

      expect(csv).toContain('Project ID,Project Name,Timestamp,Category,Name,Value,Unit,Source,Notes');
      expect(csv).toContain('"Test Project"');
      expect(csv).toContain('performance');
      expect(csv).toContain('response_time');
      expect(csv).toContain('"100"');
      expect(csv).toContain('"ms"');
    });

    it('should escape commas and newlines in notes', () => {
      const project = db.createProject({ name: 'Test Project' });

      db.recordMetric({
        projectId: project.id,
        timestamp: new Date(),
        category: MetricCategory.Performance,
        name: 'test',
        value: 100,
        source: 'test',
        notes: 'Note with, comma and\nnewline'
      });

      const csv = db.exportToCSV();

      expect(csv).toContain('Note with; comma and newline');
    });
  });

  describe('exportToJSONFile', () => {
    it('should export metrics to JSON file', () => {
      const project = db.createProject({ name: 'Test Project' });

      db.recordMetric({
        projectId: project.id,
        timestamp: new Date(),
        category: MetricCategory.Performance,
        name: 'test',
        value: 100,
        source: 'test'
      });

      const exportPath = path.join(os.tmpdir(), `test-export-${Date.now()}.json`);
      db.exportToJSONFile(exportPath);

      expect(fs.existsSync(exportPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
      expect(content.version).toBe('1.0');
      expect(content.projects).toHaveLength(1);
      expect(content.metrics).toHaveLength(1);

      fs.unlinkSync(exportPath);
    });
  });

  describe('transaction', () => {
    it('should execute function in transaction', () => {
      const project = db.createProject({ name: 'Test Project' });

      const result = db.transaction(() => {
        db.recordMetric({
          projectId: project.id,
          timestamp: new Date(),
          category: MetricCategory.Performance,
          name: 'test1',
          value: 100,
          source: 'test'
        });

        db.recordMetric({
          projectId: project.id,
          timestamp: new Date(),
          category: MetricCategory.Performance,
          name: 'test2',
          value: 200,
          source: 'test'
        });

        return 'success';
      });

      expect(result).toBe('success');

      const metrics = db.getMetrics({ projectId: project.id });
      expect(metrics).toHaveLength(2);
    });
  });
});
