import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { writeFileSync } from 'fs';
import { createLogger, LogLevel } from '@it-supervisor/logger';
import {
  MetricRecord,
  MetricQuery,
  MetricAggregation,
  MetricComparison,
  Project,
  MetricsExport,
  MetricCategory,
  MetricValue
} from './types.js';

const logger = createLogger('metrics-model', {
  level: process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO,
});

/**
 * メトリクスデータベースクラス
 */
export class MetricsDatabase {
  private db: Database.Database;
  private validateData: boolean;

  constructor(filepath: string, options: { validate?: boolean } = {}) {
    this.db = new Database(filepath);
    this.validateData = options.validate !== false;
    this.initialize();
  }

  /**
   * データベースの初期化
   */
  private initialize(): void {
    // プロジェクトテーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        metadata TEXT
      )
    `);

    // メトリクステーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metrics (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        value_type TEXT NOT NULL,
        unit TEXT,
        source TEXT NOT NULL,
        notes TEXT,
        tags TEXT,
        metadata TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);

    // インデックスの作成
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_metrics_project_id ON metrics(project_id);
      CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_metrics_category ON metrics(category);
      CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(name);
    `);
  }

  /**
   * プロジェクトを作成
   */
  createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    // バリデーション
    if (this.validateData) {
      this.validateProject(project);
    }

    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, description, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      project.name,
      project.description || null,
      now,
      now,
      project.metadata ? JSON.stringify(project.metadata) : null
    );

    return {
      id,
      name: project.name,
      description: project.description,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      metadata: project.metadata
    };
  }

  /**
   * プロジェクトを取得
   */
  getProject(projectId: string): Project | null {
    const stmt = this.db.prepare(`
      SELECT * FROM projects WHERE id = ?
    `);

    const row = stmt.get(projectId) as unknown;
    if (!row) return null;

    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name: r.name as string,
      description: r.description as string,
      createdAt: new Date(r.created_at as number),
      updatedAt: new Date(r.updated_at as number),
      metadata: r.metadata ? JSON.parse(r.metadata as string) : undefined
    };
  }

  /**
   * すべてのプロジェクトを取得
   */
  getAllProjects(): Project[] {
    const stmt = this.db.prepare(`
      SELECT * FROM projects ORDER BY created_at DESC
    `);

    const rows = stmt.all() as unknown[];
    return rows.map(row => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        name: r.name as string,
        description: r.description as string,
        createdAt: new Date(r.created_at as number),
        updatedAt: new Date(r.updated_at as number),
        metadata: r.metadata ? JSON.parse(r.metadata as string) : undefined
      };
    });
  }

  /**
   * メトリクスを記録
   */
  recordMetric(metric: Omit<MetricRecord, 'id'>): MetricRecord {
    // バリデーション
    if (this.validateData) {
      this.validateMetric(metric);
    }

    const id = randomUUID();
    const valueType = typeof metric.value;

    const stmt = this.db.prepare(`
      INSERT INTO metrics (
        id, project_id, timestamp, category, name,
        value, value_type, unit, source, notes, tags, metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      metric.projectId,
      metric.timestamp.getTime(),
      metric.category,
      metric.name,
      String(metric.value),
      valueType,
      metric.unit || null,
      metric.source,
      metric.notes || null,
      metric.tags ? JSON.stringify(metric.tags) : null,
      metric.metadata ? JSON.stringify(metric.metadata) : null
    );

    return { id, ...metric };
  }

  /**
   * メトリクスを検索
   */
  getMetrics(query: MetricQuery = {}): MetricRecord[] {
    let sql = 'SELECT * FROM metrics WHERE 1=1';
    const params: (string | number | null)[] = [];

    if (query.projectId) {
      sql += ' AND project_id = ?';
      params.push(query.projectId);
    }

    if (query.category) {
      sql += ' AND category = ?';
      params.push(query.category);
    }

    if (query.name) {
      sql += ' AND name = ?';
      params.push(query.name);
    }

    if (query.from) {
      sql += ' AND timestamp >= ?';
      params.push(query.from.getTime());
    }

    if (query.to) {
      sql += ' AND timestamp <= ?';
      params.push(query.to.getTime());
    }

    // 並び順
    const orderBy = query.orderBy || 'timestamp';
    const order = query.order || 'desc';
    sql += ` ORDER BY ${orderBy} ${order}`;

    // 制限
    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as unknown[];

    return rows.map(row => this.rowToMetricRecord(row));
  }

  /**
   * メトリクスを集計
   */
  aggregateMetrics(projectId: string, category?: MetricCategory): MetricAggregation[] {
    let sql = `
      SELECT
        category,
        name,
        COUNT(*) as count,
        MIN(CASE WHEN value_type = 'number' THEN CAST(value AS REAL) END) as min,
        MAX(CASE WHEN value_type = 'number' THEN CAST(value AS REAL) END) as max,
        AVG(CASE WHEN value_type = 'number' THEN CAST(value AS REAL) END) as avg,
        SUM(CASE WHEN value_type = 'number' THEN CAST(value AS REAL) END) as sum
      FROM metrics
      WHERE project_id = ?
    `;
    const params: (string | number | null)[] = [projectId];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' GROUP BY category, name';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as unknown[];

    return rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        category: r.category as MetricCategory,
        name: r.name as string,
        count: r.count as number,
        min: r.min != null ? (r.min as number) : undefined,
        max: r.max != null ? (r.max as number) : undefined,
        avg: r.avg != null ? (r.avg as number) : undefined,
        sum: r.sum != null ? (r.sum as number) : undefined,
      };
    });
  }

  /**
   * Before/After比較
   */
  compareMetrics(
    projectId: string,
    beforeDate: Date,
    afterDate: Date
  ): MetricComparison[] {
    const beforeMetrics = this.getMetrics({
      projectId,
      to: beforeDate,
      orderBy: 'timestamp',
      order: 'desc'
    });

    const afterMetrics = this.getMetrics({
      projectId,
      from: afterDate,
      orderBy: 'timestamp',
      order: 'asc'
    });

    // メトリクス名ごとにグループ化
    const beforeMap = new Map<string, MetricRecord>();
    const afterMap = new Map<string, MetricRecord>();

    beforeMetrics.forEach(m => {
      const key = `${m.category}:${m.name}`;
      if (!beforeMap.has(key)) {
        beforeMap.set(key, m);
      }
    });

    afterMetrics.forEach(m => {
      const key = `${m.category}:${m.name}`;
      if (!afterMap.has(key)) {
        afterMap.set(key, m);
      }
    });

    const comparisons: MetricComparison[] = [];

    // 両方に存在するメトリクスを比較
    beforeMap.forEach((beforeMetric, key) => {
      const afterMetric = afterMap.get(key);
      if (afterMetric) {
        const beforeValue = beforeMetric.value;
        const afterValue = afterMetric.value;

        let change: number | null = null;
        let changePercentage: number | null = null;

        if (typeof beforeValue === 'number' && typeof afterValue === 'number') {
          change = afterValue - beforeValue;
          changePercentage = beforeValue !== 0
            ? ((afterValue - beforeValue) / beforeValue) * 100
            : null;
        }

        comparisons.push({
          projectId,
          category: beforeMetric.category,
          name: beforeMetric.name,
          beforeValue,
          afterValue,
          beforeDate: beforeMetric.timestamp,
          afterDate: afterMetric.timestamp,
          change,
          changePercentage,
          unit: beforeMetric.unit
        });
      }
    });

    return comparisons;
  }

  /**
   * メトリクスをエクスポート
   */
  exportMetrics(projectIds?: string[]): MetricsExport {
    const projects = projectIds
      ? projectIds.map(id => this.getProject(id)).filter(p => p !== null) as Project[]
      : this.getAllProjects();

    const metrics: MetricRecord[] = [];
    projects.forEach(project => {
      const projectMetrics = this.getMetrics({ projectId: project.id });
      metrics.push(...projectMetrics);
    });

    return {
      version: '1.0',
      exportDate: new Date(),
      projects,
      metrics
    };
  }

  /**
   * メトリクスをインポート
   */
  importMetrics(data: MetricsExport): void {
    const insertProject = this.db.prepare(`
      INSERT OR REPLACE INTO projects (id, name, description, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMetric = this.db.prepare(`
      INSERT OR REPLACE INTO metrics (
        id, project_id, timestamp, category, name,
        value, value_type, unit, source, notes, tags, metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      // プロジェクトをインポート
      data.projects.forEach(project => {
        insertProject.run(
          project.id,
          project.name,
          project.description || null,
          project.createdAt.getTime(),
          project.updatedAt.getTime(),
          project.metadata ? JSON.stringify(project.metadata) : null
        );
      });

      // メトリクスをインポート
      data.metrics.forEach(metric => {
        const valueType = typeof metric.value;
        insertMetric.run(
          metric.id || randomUUID(),
          metric.projectId,
          metric.timestamp.getTime(),
          metric.category,
          metric.name,
          String(metric.value),
          valueType,
          metric.unit || null,
          metric.source,
          metric.notes || null,
          metric.tags ? JSON.stringify(metric.tags) : null,
          metric.metadata ? JSON.stringify(metric.metadata) : null
        );
      });
    });

    transaction();
  }

  /**
   * データベースを閉じる
   */
  close(): void {
    this.db.close();
  }

  /**
   * トランザクションを実行
   */
  transaction<T>(fn: () => T): T {
    const transactionFn = this.db.transaction(fn);
    return transactionFn();
  }

  /**
   * CSV形式でエクスポート
   */
  exportToCSV(projectIds?: string[]): string {
    const data = this.exportMetrics(projectIds);

    // CSVヘッダー
    let csv = 'Project ID,Project Name,Timestamp,Category,Name,Value,Unit,Source,Notes\n';

    // データ行
    data.metrics.forEach(metric => {
      const project = data.projects.find(p => p.id === metric.projectId);
      const row = [
        metric.projectId,
        project?.name || '',
        metric.timestamp.toISOString(),
        metric.category,
        metric.name,
        String(metric.value),
        metric.unit || '',
        metric.source,
        (metric.notes || '').replace(/,/g, ';').replace(/\n/g, ' ')
      ];
      csv += row.map(field => `"${field}"`).join(',') + '\n';
    });

    return csv;
  }

  /**
   * JSONファイルとしてエクスポート（拡張版）
   */
  exportToJSONFile(filepath: string, projectIds?: string[]): void {
    const data = this.exportMetrics(projectIds);
    writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * バックアップを作成
   */
  backup(backupPath: string): void {
    this.db.backup(backupPath).then(() => {
      logger.info(`Backup created at ${backupPath}`);
    }).catch(error => {
      throw new Error(`Backup failed: ${error.message}`);
    });
  }

  /**
   * プロジェクトを更新
   */
  updateProject(projectId: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | null {
    const current = this.getProject(projectId);
    if (!current) return null;

    const updateFields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }

    if (updates.metadata !== undefined) {
      updateFields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    updateFields.push('updated_at = ?');
    values.push(Date.now());
    values.push(projectId);

    const stmt = this.db.prepare(`
      UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return this.getProject(projectId);
  }

  /**
   * プロジェクトを削除
   */
  deleteProject(projectId: string): boolean {
    const transaction = this.db.transaction(() => {
      // 関連メトリクスも削除
      this.db.prepare('DELETE FROM metrics WHERE project_id = ?').run(projectId);
      const result = this.db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
      return result.changes > 0;
    });

    return transaction();
  }

  /**
   * メトリクスを削除
   */
  deleteMetric(metricId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM metrics WHERE id = ?');
    const result = stmt.run(metricId);
    return result.changes > 0;
  }

  /**
   * メトリクスを一括記録（トランザクション使用）
   */
  recordMetricsBatch(metrics: Array<Omit<MetricRecord, 'id'>>): MetricRecord[] {
    const insertedMetrics: MetricRecord[] = [];

    const transaction = this.db.transaction(() => {
      for (const metric of metrics) {
        const inserted = this.recordMetric(metric);
        insertedMetrics.push(inserted);
      }
    });

    transaction();
    return insertedMetrics;
  }

  /**
   * プロジェクトをバリデーション
   */
  private validateProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): void {
    if (!project.name || project.name.trim() === '') {
      throw new Error('Project name is required');
    }

    if (project.name.length > 255) {
      throw new Error('Project name must be less than 255 characters');
    }
  }

  /**
   * メトリクスをバリデーション
   */
  private validateMetric(metric: Omit<MetricRecord, 'id'>): void {
    if (!metric.projectId) {
      throw new Error('Project ID is required');
    }

    if (!metric.name || metric.name.trim() === '') {
      throw new Error('Metric name is required');
    }

    if (metric.value === null || metric.value === undefined) {
      throw new Error('Metric value is required');
    }

    if (!metric.source || metric.source.trim() === '') {
      throw new Error('Metric source is required');
    }

    // プロジェクトの存在確認
    const project = this.getProject(metric.projectId);
    if (!project) {
      throw new Error(`Project with ID ${metric.projectId} does not exist`);
    }
  }

  /**
   * 行をMetricRecordに変換
   */
  private rowToMetricRecord(row: unknown): MetricRecord {
    const r = row as Record<string, unknown>;
    let value: MetricValue;
    switch (r.value_type) {
      case 'number':
        value = Number(r.value);
        break;
      case 'boolean':
        value = r.value === 'true';
        break;
      default:
        value = r.value as string;
    }

    return {
      id: r.id as string,
      projectId: r.project_id as string,
      timestamp: new Date(r.timestamp as number),
      category: r.category as MetricCategory,
      name: r.name as string,
      value,
      unit: r.unit as string | undefined,
      source: r.source as string,
      notes: r.notes as string | undefined,
      tags: r.tags ? JSON.parse(r.tags as string) : undefined,
      metadata: r.metadata ? JSON.parse(r.metadata as string) : undefined
    };
  }
}
