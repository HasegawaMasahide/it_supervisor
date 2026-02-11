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
    const row = stmt.get(issueId) as unknown;

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
    const values: (string | number | null)[] = [];

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
    const params: (string | number | null)[] = [];

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
    const orderByMap: Record<string, string> = {
      severity: 'severity',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
    const orderBy = query.orderBy ? (orderByMap[query.orderBy] || 'created_at') : 'created_at';
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

    const rows = stmt.all(issueId) as unknown[];

    return rows.map(row => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        issueId: r.issue_id as string,
        author: r.author as string,
        content: r.content as string,
        createdAt: new Date(r.created_at as number),
        attachments: r.attachments ? JSON.parse(r.attachments as string) : undefined,
      };
    });
  }

  /**
   * 統計情報を取得
   */
  getStatistics(projectId?: string): IssueStatistics {
    let sql = 'SELECT * FROM issues';
    const params: (string | number | null)[] = [];

    if (projectId) {
      sql += ' WHERE project_id = ?';
      params.push(projectId);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as unknown[];

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
      const r = row as Record<string, unknown>;
      bySeverity[r.severity as IssueSeverity]++;
      byStatus[r.status as IssueStatus]++;
      byCategory[r.category as IssueCategory]++;
    });

    return {
      total: rows.length,
      bySeverity,
      byStatus,
      byCategory
    };
  }

  /**
   * 優先度を自動計算
   */
  calculatePriority(issue: Issue): number {
    let priority = 0;

    // 重要度による基本スコア
    const severityScores = {
      [IssueSeverity.Critical]: 100,
      [IssueSeverity.High]: 75,
      [IssueSeverity.Medium]: 50,
      [IssueSeverity.Low]: 25
    };
    priority += severityScores[issue.severity];

    // カテゴリによる追加スコア
    if (issue.category === IssueCategory.Security) {
      priority += 50; // セキュリティは高優先度
    }

    // 期限による加算
    if (issue.dueDate) {
      const daysUntilDue = Math.floor(
        (issue.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDue < 0) {
        priority += 100; // 期限切れ
      } else if (daysUntilDue < 3) {
        priority += 50; // 3日以内
      } else if (daysUntilDue < 7) {
        priority += 25; // 1週間以内
      }
    }

    return priority;
  }

  /**
   * 優先度付きIssueリストを取得
   */
  getIssuesWithPriority(projectId: string, limit?: number): Array<Issue & { priority: number }> {
    const issues = this.searchIssues({
      projectId,
      status: [IssueStatus.Identified, IssueStatus.Diagnosed, IssueStatus.Approved]
    });

    const issuesWithPriority = issues.map(issue => ({
      ...issue,
      priority: this.calculatePriority(issue)
    }));

    // 優先度順にソート
    issuesWithPriority.sort((a, b) => b.priority - a.priority);

    return limit ? issuesWithPriority.slice(0, limit) : issuesWithPriority;
  }

  /**
   * 関連Issueを検出
   */
  findRelatedIssues(issueId: string, threshold: number = 0.5): Issue[] {
    const issue = this.getIssue(issueId);
    if (!issue) return [];

    const allIssues = this.searchIssues({ projectId: issue.projectId });
    const related: Array<{ issue: Issue; similarity: number }> = [];

    for (const otherIssue of allIssues) {
      if (otherIssue.id === issueId) continue;

      const similarity = this.calculateSimilarity(issue, otherIssue);
      if (similarity >= threshold) {
        related.push({ issue: otherIssue, similarity });
      }
    }

    // 類似度順にソート
    related.sort((a, b) => b.similarity - a.similarity);

    return related.map(r => r.issue);
  }

  /**
   * Issue間の類似度を計算
   */
  private calculateSimilarity(issue1: Issue, issue2: Issue): number {
    let score = 0;
    let maxScore = 0;

    // カテゴリが同じ
    maxScore += 30;
    if (issue1.category === issue2.category) {
      score += 30;
    }

    // 重要度が同じ
    maxScore += 20;
    if (issue1.severity === issue2.severity) {
      score += 20;
    }

    // 同じファイル
    maxScore += 25;
    if (issue1.location?.file === issue2.location?.file) {
      score += 25;
    }

    // タグの重複
    maxScore += 25;
    const tags1 = new Set(issue1.tags || []);
    const tags2 = new Set(issue2.tags || []);
    const commonTags = [...tags1].filter(tag => tags2.has(tag));
    score += (commonTags.length / Math.max(tags1.size, tags2.size, 1)) * 25;

    return score / maxScore;
  }

  /**
   * Issueをラベルで分類
   */
  addLabel(issueId: string, label: string): Issue | null {
    const issue = this.getIssue(issueId);
    if (!issue) return null;

    const tags = issue.tags || [];
    if (!tags.includes(label)) {
      tags.push(label);
      return this.updateIssue(issueId, { tags });
    }

    return issue;
  }

  /**
   * ラベルを削除
   */
  removeLabel(issueId: string, label: string): Issue | null {
    const issue = this.getIssue(issueId);
    if (!issue) return null;

    const tags = (issue.tags || []).filter(tag => tag !== label);
    return this.updateIssue(issueId, { tags });
  }

  /**
   * ラベル一覧を取得
   */
  getAllLabels(projectId: string): Array<{ label: string; count: number }> {
    const issues = this.searchIssues({ projectId });
    const labelCounts = new Map<string, number>();

    for (const issue of issues) {
      for (const tag of issue.tags || []) {
        labelCounts.set(tag, (labelCounts.get(tag) || 0) + 1);
      }
    }

    return Array.from(labelCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Issueをエクスポート（CSV形式）
   */
  exportToCSV(projectId?: string): string {
    const issues = this.searchIssues({ projectId });

    let csv = 'ID,Project ID,Title,Category,Severity,Status,Assignee,Created At,Updated At\n';

    for (const issue of issues) {
      const row = [
        issue.id,
        issue.projectId,
        `"${issue.title.replace(/"/g, '""')}"`,
        issue.category,
        issue.severity,
        issue.status,
        issue.assignee || '',
        issue.createdAt.toISOString(),
        issue.updatedAt.toISOString()
      ];
      csv += row.join(',') + '\n';
    }

    return csv;
  }

  /**
   * バルクステータス更新
   */
  bulkUpdateStatus(issueIds: string[], status: IssueStatus): number {
    let updated = 0;

    const transaction = this.db.transaction(() => {
      for (const issueId of issueIds) {
        const result = this.updateIssueStatus(issueId, status);
        if (result) updated++;
      }
    });

    transaction();
    return updated;
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
  private rowToIssue(row: unknown): Issue {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      projectId: r.project_id as string,
      title: r.title as string,
      description: r.description as string,
      category: r.category as IssueCategory,
      severity: r.severity as IssueSeverity,
      status: r.status as IssueStatus,
      location: r.location ? JSON.parse(r.location as string) : undefined,
      evidence: r.evidence ? JSON.parse(r.evidence as string) : undefined,
      tags: r.tags ? JSON.parse(r.tags as string) : undefined,
      assignee: r.assignee as string | undefined,
      dueDate: r.due_date ? new Date(r.due_date as number) : undefined,
      createdAt: new Date(r.created_at as number),
      updatedAt: new Date(r.updated_at as number),
      createdBy: r.created_by as string,
      relatedIssues: r.related_issues ? JSON.parse(r.related_issues as string) : undefined,
      metadata: r.metadata ? JSON.parse(r.metadata as string) : undefined
    };
  }
}
