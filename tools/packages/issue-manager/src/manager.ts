import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import {
  Issue,
  IssueComment,
  IssueQuery,
  IssueStatistics,
  CreateIssueParams,
  UpdateIssueParams,
  IssueSeverity,
  IssueStatus,
  IssueCategory
} from './types.js';

/**
 * Issue管理クラス
 */
export class IssueManager {
  private db: Database.Database;

  constructor(filepath: string) {
    this.db = new Database(filepath);
    this.initialize();
  }

  /**
   * データベースの初期化
   */
  private initialize(): void {
    // Issueテーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS issues (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        location TEXT,
        evidence TEXT,
        tags TEXT,
        assignee TEXT,
        due_date INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        created_by TEXT,
        related_issues TEXT,
        metadata TEXT
      )
    `);

    // コメントテーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        attachments TEXT,
        FOREIGN KEY (issue_id) REFERENCES issues(id)
      )
    `);

    // インデックス
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(project_id);
      CREATE INDEX IF NOT EXISTS idx_issues_category ON issues(category);
      CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity);
      CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
      CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at);
      CREATE INDEX IF NOT EXISTS idx_comments_issue_id ON comments(issue_id);
    `);
  }

  /**
   * Issueを作成
   */
  createIssue(params: CreateIssueParams): Issue {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO issues (
        id, project_id, title, description, category, severity, status,
        location, evidence, tags, assignee, due_date, created_at, updated_at,
        created_by, related_issues, metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.projectId,
      params.title,
      params.description,
      params.category,
      params.severity,
      params.status || IssueStatus.Identified,
      params.location ? JSON.stringify(params.location) : null,
      params.evidence ? JSON.stringify(params.evidence) : null,
      params.tags ? JSON.stringify(params.tags) : null,
      params.assignee || null,
      params.dueDate ? params.dueDate.getTime() : null,
      now,
      now,
      params.createdBy || null,
      params.relatedIssues ? JSON.stringify(params.relatedIssues) : null,
      params.metadata ? JSON.stringify(params.metadata) : null
    );

    return this.getIssue(id)!;
  }

  /**
   * Issueを取得
   */
  getIssue(issueId: string): Issue | null {
    const stmt = this.db.prepare('SELECT * FROM issues WHERE id = ?');
    const row = stmt.get(issueId) as any;

    if (!row) return null;

    return this.rowToIssue(row);
  }

  /**
   * Issueを更新
   */
  updateIssue(issueId: string, params: UpdateIssueParams): Issue | null {
    const current = this.getIssue(issueId);
    if (!current) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (params.title !== undefined) {
      updates.push('title = ?');
      values.push(params.title);
    }

    if (params.description !== undefined) {
      updates.push('description = ?');
      values.push(params.description);
    }

    if (params.category !== undefined) {
      updates.push('category = ?');
      values.push(params.category);
    }

    if (params.severity !== undefined) {
      updates.push('severity = ?');
      values.push(params.severity);
    }

    if (params.status !== undefined) {
      updates.push('status = ?');
      values.push(params.status);
    }

    if (params.assignee !== undefined) {
      updates.push('assignee = ?');
      values.push(params.assignee);
    }

    if (params.dueDate !== undefined) {
      updates.push('due_date = ?');
      values.push(params.dueDate ? params.dueDate.getTime() : null);
    }

    if (params.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(params.tags));
    }

    updates.push('updated_at = ?');
    values.push(Date.now());

    values.push(issueId);

    const sql = `UPDATE issues SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    stmt.run(...values);

    return this.getIssue(issueId);
  }

  /**
   * Issueステータスを更新
   */
  updateIssueStatus(issueId: string, status: IssueStatus): Issue | null {
    return this.updateIssue(issueId, { status });
  }

  /**
   * Issueを削除
   */
  deleteIssue(issueId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM issues WHERE id = ?');
    const result = stmt.run(issueId);
    return result.changes > 0;
  }

  /**
   * Issueを検索
   */
  searchIssues(query: IssueQuery = {}): Issue[] {
    let sql = 'SELECT * FROM issues WHERE 1=1';
    const params: any[] = [];

    if (query.projectId) {
      sql += ' AND project_id = ?';
      params.push(query.projectId);
    }

    if (query.category) {
      sql += ' AND category = ?';
      params.push(query.category);
    }

    if (query.severity) {
      if (Array.isArray(query.severity)) {
        sql += ` AND severity IN (${query.severity.map(() => '?').join(', ')})`;
        params.push(...query.severity);
      } else {
        sql += ' AND severity = ?';
        params.push(query.severity);
      }
    }

    if (query.status) {
      if (Array.isArray(query.status)) {
        sql += ` AND status IN (${query.status.map(() => '?').join(', ')})`;
        params.push(...query.status);
      } else {
        sql += ' AND status = ?';
        params.push(query.status);
      }
    }

    if (query.assignee) {
      sql += ' AND assignee = ?';
      params.push(query.assignee);
    }

    if (query.keyword) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      const keyword = `%${query.keyword}%`;
      params.push(keyword, keyword);
    }

    if (query.createdAfter) {
      sql += ' AND created_at >= ?';
      params.push(query.createdAfter.getTime());
    }

    if (query.createdBefore) {
      sql += ' AND created_at <= ?';
      params.push(query.createdBefore.getTime());
    }

    // 並び順
    const orderBy = query.orderBy || 'created_at';
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
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.rowToIssue(row));
  }

  /**
   * コメントを追加
   */
  addComment(issueId: string, comment: Omit<IssueComment, 'id' | 'issueId' | 'createdAt'>): IssueComment {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO comments (id, issue_id, author, content, created_at, attachments)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      issueId,
      comment.author,
      comment.content,
      now,
      comment.attachments ? JSON.stringify(comment.attachments) : null
    );

    // Issueの更新日時を更新
    this.db.prepare('UPDATE issues SET updated_at = ? WHERE id = ?').run(now, issueId);

    return {
      id,
      issueId,
      author: comment.author,
      content: comment.content,
      createdAt: new Date(now),
      attachments: comment.attachments
    };
  }

  /**
   * コメントを取得
   */
  getComments(issueId: string): IssueComment[] {
    const stmt = this.db.prepare(`
      SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at ASC
    `);

    const rows = stmt.all(issueId) as any[];

    return rows.map(row => ({
      id: row.id,
      issueId: row.issue_id,
      author: row.author,
      content: row.content,
      createdAt: new Date(row.created_at),
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined
    }));
  }

  /**
   * 統計情報を取得
   */
  getStatistics(projectId?: string): IssueStatistics {
    let sql = 'SELECT * FROM issues';
    const params: any[] = [];

    if (projectId) {
      sql += ' WHERE project_id = ?';
      params.push(projectId);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    const bySeverity: Record<IssueSeverity, number> = {
      [IssueSeverity.Critical]: 0,
      [IssueSeverity.High]: 0,
      [IssueSeverity.Medium]: 0,
      [IssueSeverity.Low]: 0
    };

    const byStatus: Record<IssueStatus, number> = {
      [IssueStatus.Identified]: 0,
      [IssueStatus.Diagnosed]: 0,
      [IssueStatus.Approved]: 0,
      [IssueStatus.InProgress]: 0,
      [IssueStatus.Resolved]: 0,
      [IssueStatus.Closed]: 0
    };

    const byCategory: Record<IssueCategory, number> = {
      [IssueCategory.Security]: 0,
      [IssueCategory.Performance]: 0,
      [IssueCategory.CodeQuality]: 0,
      [IssueCategory.TechnicalDebt]: 0,
      [IssueCategory.Bug]: 0,
      [IssueCategory.Enhancement]: 0
    };

    rows.forEach(row => {
      bySeverity[row.severity as IssueSeverity]++;
      byStatus[row.status as IssueStatus]++;
      byCategory[row.category as IssueCategory]++;
    });

    return {
      total: rows.length,
      bySeverity,
      byStatus,
      byCategory
    };
  }

  /**
   * データベースを閉じる
   */
  close(): void {
    this.db.close();
  }

  /**
   * 行をIssueに変換
   */
  private rowToIssue(row: any): Issue {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      category: row.category as IssueCategory,
      severity: row.severity as IssueSeverity,
      status: row.status as IssueStatus,
      location: row.location ? JSON.parse(row.location) : undefined,
      evidence: row.evidence ? JSON.parse(row.evidence) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      assignee: row.assignee,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by,
      relatedIssues: row.related_issues ? JSON.parse(row.related_issues) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }
}
