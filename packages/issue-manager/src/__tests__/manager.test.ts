import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IssueManager } from '../manager.js';
import {
  IssueSeverity,
  IssueStatus,
  IssueCategory,
  type CreateIssueParams,
  type UpdateIssueParams
} from '../types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('IssueManager', () => {
  let manager: IssueManager;
  let testDbPath: string;

  beforeEach(() => {
    // テスト用の一時的なデータベースファイルを作成
    testDbPath = path.join(os.tmpdir(), `test-issues-${Date.now()}.db`);
    manager = new IssueManager(testDbPath);
  });

  afterEach(() => {
    // データベースを閉じて、ファイルを削除
    manager.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('createIssue', () => {
    it('should create a new issue with required fields', () => {
      const params: CreateIssueParams = {
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'This is a test issue',
        category: IssueCategory.Bug,
        severity: IssueSeverity.High,
        status: IssueStatus.Identified
      };

      const issue = manager.createIssue(params);

      expect(issue).toBeDefined();
      expect(issue.id).toBeTruthy();
      expect(issue.projectId).toBe(params.projectId);
      expect(issue.title).toBe(params.title);
      expect(issue.description).toBe(params.description);
      expect(issue.category).toBe(params.category);
      expect(issue.severity).toBe(params.severity);
      expect(issue.status).toBe(params.status);
      expect(issue.createdAt).toBeInstanceOf(Date);
      expect(issue.updatedAt).toBeInstanceOf(Date);
    });

    it('should create an issue with optional fields', () => {
      const params: CreateIssueParams = {
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'This is a test issue',
        category: IssueCategory.Security,
        severity: IssueSeverity.Critical,
        status: IssueStatus.Identified,
        location: { file: 'src/index.ts', line: 42 },
        evidence: ['evidence1', 'evidence2'],
        tags: ['security', 'urgent'],
        assignee: 'john@example.com',
        dueDate: new Date('2026-12-31'),
        createdBy: 'analyzer-bot',
        relatedIssues: ['issue-1', 'issue-2'],
        metadata: { source: 'static-analyzer' }
      };

      const issue = manager.createIssue(params);

      expect(issue.location).toEqual(params.location);
      expect(issue.evidence).toEqual(params.evidence);
      expect(issue.tags).toEqual(params.tags);
      expect(issue.assignee).toBe(params.assignee);
      expect(issue.dueDate).toEqual(params.dueDate);
      expect(issue.createdBy).toBe(params.createdBy);
      expect(issue.relatedIssues).toEqual(params.relatedIssues);
      expect(issue.metadata).toEqual(params.metadata);
    });

    it('should use default status if not provided', () => {
      const params: CreateIssueParams = {
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'This is a test issue',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium
      };

      const issue = manager.createIssue(params);

      expect(issue.status).toBe(IssueStatus.Identified);
    });
  });

  describe('getIssue', () => {
    it('should retrieve an existing issue by id', () => {
      const params: CreateIssueParams = {
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'This is a test issue',
        category: IssueCategory.Bug,
        severity: IssueSeverity.High,
        status: IssueStatus.Identified
      };

      const created = manager.createIssue(params);
      const retrieved = manager.getIssue(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe(params.title);
    });

    it('should return null for non-existent issue', () => {
      const result = manager.getIssue('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('updateIssue', () => {
    it('should update issue title', () => {
      const params: CreateIssueParams = {
        projectId: 'project-1',
        title: 'Original Title',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified
      };

      const issue = manager.createIssue(params);
      const updateParams: UpdateIssueParams = { title: 'Updated Title' };
      const updated = manager.updateIssue(issue.id, updateParams);

      expect(updated).toBeDefined();
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.description).toBe(params.description); // Unchanged
    });

    it('should update multiple fields', () => {
      const params: CreateIssueParams = {
        projectId: 'project-1',
        title: 'Original Title',
        description: 'Original Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified
      };

      const issue = manager.createIssue(params);
      const updateParams: UpdateIssueParams = {
        title: 'Updated Title',
        description: 'Updated Description',
        severity: IssueSeverity.High,
        status: IssueStatus.InProgress,
        assignee: 'jane@example.com'
      };

      const updated = manager.updateIssue(issue.id, updateParams);

      expect(updated).toBeDefined();
      expect(updated?.title).toBe(updateParams.title);
      expect(updated?.description).toBe(updateParams.description);
      expect(updated?.severity).toBe(updateParams.severity);
      expect(updated?.status).toBe(updateParams.status);
      expect(updated?.assignee).toBe(updateParams.assignee);
    });

    it('should update tags', () => {
      const params: CreateIssueParams = {
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified,
        tags: ['tag1']
      };

      const issue = manager.createIssue(params);
      const updated = manager.updateIssue(issue.id, { tags: ['tag1', 'tag2', 'tag3'] });

      expect(updated?.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should return null for non-existent issue', () => {
      const result = manager.updateIssue('non-existent-id', { title: 'New Title' });
      expect(result).toBeNull();
    });

    it('should update the updatedAt timestamp', async () => {
      const params: CreateIssueParams = {
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified
      };

      const issue = manager.createIssue(params);
      const originalUpdatedAt = issue.updatedAt.getTime();

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = manager.updateIssue(issue.id, { title: 'Updated' });
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
    });
  });

  describe('updateIssueStatus', () => {
    it('should update issue status', () => {
      const params: CreateIssueParams = {
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified
      };

      const issue = manager.createIssue(params);
      const updated = manager.updateIssueStatus(issue.id, IssueStatus.Resolved);

      expect(updated).toBeDefined();
      expect(updated?.status).toBe(IssueStatus.Resolved);
    });

    it('should return null for non-existent issue', () => {
      const result = manager.updateIssueStatus('non-existent-id', IssueStatus.Resolved);
      expect(result).toBeNull();
    });
  });

  describe('deleteIssue', () => {
    it('should delete an existing issue', () => {
      const params: CreateIssueParams = {
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified
      };

      const issue = manager.createIssue(params);
      const deleted = manager.deleteIssue(issue.id);

      expect(deleted).toBe(true);
      expect(manager.getIssue(issue.id)).toBeNull();
    });

    it('should return false for non-existent issue', () => {
      const result = manager.deleteIssue('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('searchIssues', () => {
    beforeEach(() => {
      // Create test issues
      manager.createIssue({
        projectId: 'project-1',
        title: 'Security Issue 1',
        description: 'SQL Injection vulnerability',
        category: IssueCategory.Security,
        severity: IssueSeverity.Critical,
        status: IssueStatus.Identified,
        tags: ['security', 'sql']
      });

      manager.createIssue({
        projectId: 'project-1',
        title: 'Performance Issue 1',
        description: 'Slow database query',
        category: IssueCategory.Performance,
        severity: IssueSeverity.High,
        status: IssueStatus.InProgress,
        assignee: 'john@example.com'
      });

      manager.createIssue({
        projectId: 'project-2',
        title: 'Bug in UI',
        description: 'Button not clickable',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Resolved
      });
    });

    it('should return all issues when no query provided', () => {
      const issues = manager.searchIssues();
      expect(issues).toHaveLength(3);
    });

    it('should filter by projectId', () => {
      const issues = manager.searchIssues({ projectId: 'project-1' });
      expect(issues).toHaveLength(2);
      expect(issues.every(i => i.projectId === 'project-1')).toBe(true);
    });

    it('should filter by category', () => {
      const issues = manager.searchIssues({ category: IssueCategory.Security });
      expect(issues).toHaveLength(1);
      expect(issues[0].category).toBe(IssueCategory.Security);
    });

    it('should filter by single severity', () => {
      const issues = manager.searchIssues({ severity: IssueSeverity.Critical });
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe(IssueSeverity.Critical);
    });

    it('should filter by multiple severities', () => {
      const issues = manager.searchIssues({
        severity: [IssueSeverity.Critical, IssueSeverity.High]
      });
      expect(issues).toHaveLength(2);
    });

    it('should filter by single status', () => {
      const issues = manager.searchIssues({ status: IssueStatus.InProgress });
      expect(issues).toHaveLength(1);
      expect(issues[0].status).toBe(IssueStatus.InProgress);
    });

    it('should filter by multiple statuses', () => {
      const issues = manager.searchIssues({
        status: [IssueStatus.Identified, IssueStatus.InProgress]
      });
      expect(issues).toHaveLength(2);
    });

    it('should filter by assignee', () => {
      const issues = manager.searchIssues({ assignee: 'john@example.com' });
      expect(issues).toHaveLength(1);
      expect(issues[0].assignee).toBe('john@example.com');
    });

    it('should filter by keyword in title', () => {
      const issues = manager.searchIssues({ keyword: 'Security' });
      expect(issues).toHaveLength(1);
      expect(issues[0].title).toContain('Security');
    });

    it('should filter by keyword in description', () => {
      const issues = manager.searchIssues({ keyword: 'database' });
      expect(issues).toHaveLength(1);
      expect(issues[0].description).toContain('database');
    });

    it('should apply limit', () => {
      const issues = manager.searchIssues({ limit: 2 });
      expect(issues).toHaveLength(2);
    });

    it('should apply offset with limit', () => {
      const allIssues = manager.searchIssues({ orderBy: 'createdAt', order: 'asc' });
      const offsetIssues = manager.searchIssues({ offset: 1, limit: 10, orderBy: 'createdAt', order: 'asc' });

      expect(offsetIssues).toHaveLength(2);
      expect(offsetIssues[0].id).toBe(allIssues[1].id);
    });

    it('should order by created_at desc by default', () => {
      const issues = manager.searchIssues();
      expect(issues[0].createdAt.getTime()).toBeGreaterThanOrEqual(issues[1].createdAt.getTime());
    });

    it('should order by created_at asc when specified', () => {
      const issues = manager.searchIssues({ orderBy: 'createdAt', order: 'asc' });
      expect(issues[0].createdAt.getTime()).toBeLessThanOrEqual(issues[1].createdAt.getTime());
    });
  });

  describe('addComment', () => {
    it('should add a comment to an issue', () => {
      const issue = manager.createIssue({
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified
      });

      const comment = manager.addComment(issue.id, {
        author: 'john@example.com',
        content: 'This is a test comment'
      });

      expect(comment).toBeDefined();
      expect(comment.id).toBeTruthy();
      expect(comment.issueId).toBe(issue.id);
      expect(comment.author).toBe('john@example.com');
      expect(comment.content).toBe('This is a test comment');
      expect(comment.createdAt).toBeInstanceOf(Date);
    });

    it('should add a comment with attachments', () => {
      const issue = manager.createIssue({
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified
      });

      const comment = manager.addComment(issue.id, {
        author: 'john@example.com',
        content: 'Comment with attachments',
        attachments: ['file1.png', 'file2.pdf']
      });

      expect(comment.attachments).toEqual(['file1.png', 'file2.pdf']);
    });
  });

  describe('getComments', () => {
    it('should retrieve all comments for an issue', () => {
      const issue = manager.createIssue({
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified
      });

      manager.addComment(issue.id, {
        author: 'john@example.com',
        content: 'First comment'
      });

      manager.addComment(issue.id, {
        author: 'jane@example.com',
        content: 'Second comment'
      });

      const comments = manager.getComments(issue.id);

      expect(comments).toHaveLength(2);
      expect(comments[0].content).toBe('First comment');
      expect(comments[1].content).toBe('Second comment');
    });

    it('should return empty array for issue with no comments', () => {
      const issue = manager.createIssue({
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified
      });

      const comments = manager.getComments(issue.id);
      expect(comments).toEqual([]);
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      // Create test issues
      manager.createIssue({
        projectId: 'project-1',
        title: 'Critical Security Issue',
        description: 'SQL Injection',
        category: IssueCategory.Security,
        severity: IssueSeverity.Critical,
        status: IssueStatus.Identified
      });

      manager.createIssue({
        projectId: 'project-1',
        title: 'High Performance Issue',
        description: 'Slow query',
        category: IssueCategory.Performance,
        severity: IssueSeverity.High,
        status: IssueStatus.InProgress
      });

      manager.createIssue({
        projectId: 'project-1',
        title: 'Medium Bug',
        description: 'UI bug',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Resolved
      });

      manager.createIssue({
        projectId: 'project-2',
        title: 'Low Issue',
        description: 'Minor issue',
        category: IssueCategory.CodeQuality,
        severity: IssueSeverity.Low,
        status: IssueStatus.Identified
      });
    });

    it('should get statistics for all issues', () => {
      const stats = manager.getStatistics();

      expect(stats.total).toBe(4);
      expect(stats.bySeverity[IssueSeverity.Critical]).toBe(1);
      expect(stats.bySeverity[IssueSeverity.High]).toBe(1);
      expect(stats.bySeverity[IssueSeverity.Medium]).toBe(1);
      expect(stats.bySeverity[IssueSeverity.Low]).toBe(1);
      expect(stats.byStatus[IssueStatus.Identified]).toBe(2);
      expect(stats.byStatus[IssueStatus.InProgress]).toBe(1);
      expect(stats.byStatus[IssueStatus.Resolved]).toBe(1);
      expect(stats.byCategory[IssueCategory.Security]).toBe(1);
      expect(stats.byCategory[IssueCategory.Performance]).toBe(1);
      expect(stats.byCategory[IssueCategory.Bug]).toBe(1);
      expect(stats.byCategory[IssueCategory.CodeQuality]).toBe(1);
    });

    it('should get statistics for specific project', () => {
      const stats = manager.getStatistics('project-1');

      expect(stats.total).toBe(3);
      expect(stats.bySeverity[IssueSeverity.Critical]).toBe(1);
      expect(stats.bySeverity[IssueSeverity.Low]).toBe(0);
    });
  });

  describe('calculatePriority', () => {
    it('should calculate priority for critical security issue', () => {
      const issue = manager.createIssue({
        projectId: 'project-1',
        title: 'SQL Injection',
        description: 'Critical security vulnerability',
        category: IssueCategory.Security,
        severity: IssueSeverity.Critical,
        status: IssueStatus.Identified
      });

      const priority = manager.calculatePriority(issue);

      // Critical (100) + Security (+50) = 150
      expect(priority).toBe(150);
    });

    it('should add priority for overdue issue', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const issue = manager.createIssue({
        projectId: 'project-1',
        title: 'Overdue Issue',
        description: 'This is overdue',
        category: IssueCategory.Bug,
        severity: IssueSeverity.High,
        status: IssueStatus.Identified,
        dueDate: yesterday
      });

      const priority = manager.calculatePriority(issue);

      // High (75) + Overdue (+100) = 175
      expect(priority).toBe(175);
    });

    it('should add priority for issue due within 3 days', () => {
      const threeDaysLater = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const issue = manager.createIssue({
        projectId: 'project-1',
        title: 'Due Soon',
        description: 'Due in 2 days',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified,
        dueDate: threeDaysLater
      });

      const priority = manager.calculatePriority(issue);

      // Medium (50) + Due within 3 days (+50) = 100
      expect(priority).toBe(100);
    });
  });

  describe('getIssuesWithPriority', () => {
    it('should return issues sorted by priority', () => {
      manager.createIssue({
        projectId: 'project-1',
        title: 'Low Priority',
        description: 'Low priority issue',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Low,
        status: IssueStatus.Identified
      });

      manager.createIssue({
        projectId: 'project-1',
        title: 'High Priority',
        description: 'High priority issue',
        category: IssueCategory.Security,
        severity: IssueSeverity.Critical,
        status: IssueStatus.Identified
      });

      manager.createIssue({
        projectId: 'project-1',
        title: 'Medium Priority',
        description: 'Medium priority issue',
        category: IssueCategory.Performance,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Diagnosed
      });

      const issues = manager.getIssuesWithPriority('project-1');

      expect(issues).toHaveLength(3);
      expect(issues[0].title).toBe('High Priority');
      expect(issues[0].priority).toBeGreaterThan(issues[1].priority);
      expect(issues[1].priority).toBeGreaterThan(issues[2].priority);
    });

    it('should respect limit parameter', () => {
      manager.createIssue({
        projectId: 'project-1',
        title: 'Issue 1',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Low,
        status: IssueStatus.Identified
      });

      manager.createIssue({
        projectId: 'project-1',
        title: 'Issue 2',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified
      });

      const issues = manager.getIssuesWithPriority('project-1', 1);
      expect(issues).toHaveLength(1);
    });

    it('should only return non-resolved issues', () => {
      manager.createIssue({
        projectId: 'project-1',
        title: 'Open Issue',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.High,
        status: IssueStatus.Identified
      });

      manager.createIssue({
        projectId: 'project-1',
        title: 'Resolved Issue',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Critical,
        status: IssueStatus.Resolved
      });

      const issues = manager.getIssuesWithPriority('project-1');
      expect(issues).toHaveLength(1);
      expect(issues[0].status).not.toBe(IssueStatus.Resolved);
    });
  });

  describe('findRelatedIssues', () => {
    it('should find issues with same category and severity', () => {
      const issue1 = manager.createIssue({
        projectId: 'project-1',
        title: 'Security Issue 1',
        description: 'SQL Injection',
        category: IssueCategory.Security,
        severity: IssueSeverity.Critical,
        status: IssueStatus.Identified,
        location: { file: 'src/database.ts' }
      });

      const issue2 = manager.createIssue({
        projectId: 'project-1',
        title: 'Security Issue 2',
        description: 'XSS vulnerability',
        category: IssueCategory.Security,
        severity: IssueSeverity.Critical,
        status: IssueStatus.Identified,
        location: { file: 'src/database.ts' }
      });

      manager.createIssue({
        projectId: 'project-1',
        title: 'Unrelated Issue',
        description: 'Performance problem',
        category: IssueCategory.Performance,
        severity: IssueSeverity.Low,
        status: IssueStatus.Identified,
        location: { file: 'src/utils.ts' }
      });

      const related = manager.findRelatedIssues(issue1.id, 0.5);

      expect(related).toHaveLength(1);
      expect(related[0].id).toBe(issue2.id);
    });

    it('should find issues with common tags', () => {
      const issue1 = manager.createIssue({
        projectId: 'project-1',
        title: 'Issue 1',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified,
        tags: ['frontend', 'react', 'ui']
      });

      const issue2 = manager.createIssue({
        projectId: 'project-1',
        title: 'Issue 2',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Low,
        status: IssueStatus.Identified,
        tags: ['frontend', 'react']
      });

      const related = manager.findRelatedIssues(issue1.id, 0.3);

      expect(related.length).toBeGreaterThan(0);
      expect(related[0].id).toBe(issue2.id);
    });

    it('should return empty array if no related issues found', () => {
      const issue = manager.createIssue({
        projectId: 'project-1',
        title: 'Unique Issue',
        description: 'Very unique',
        category: IssueCategory.Security,
        severity: IssueSeverity.Critical,
        status: IssueStatus.Identified
      });

      manager.createIssue({
        projectId: 'project-1',
        title: 'Different Issue',
        description: 'Completely different',
        category: IssueCategory.Performance,
        severity: IssueSeverity.Low,
        status: IssueStatus.Identified
      });

      const related = manager.findRelatedIssues(issue.id, 0.9);
      expect(related).toEqual([]);
    });

    it('should return empty array for non-existent issue', () => {
      const related = manager.findRelatedIssues('non-existent-id');
      expect(related).toEqual([]);
    });
  });

  describe('addLabel and removeLabel', () => {
    it('should add a label to an issue', () => {
      const issue = manager.createIssue({
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified,
        tags: ['existing-tag']
      });

      const updated = manager.addLabel(issue.id, 'new-tag');

      expect(updated).toBeDefined();
      expect(updated?.tags).toContain('existing-tag');
      expect(updated?.tags).toContain('new-tag');
    });

    it('should not add duplicate label', () => {
      const issue = manager.createIssue({
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified,
        tags: ['existing-tag']
      });

      const updated = manager.addLabel(issue.id, 'existing-tag');

      expect(updated?.tags).toHaveLength(1);
    });

    it('should remove a label from an issue', () => {
      const issue = manager.createIssue({
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified,
        tags: ['tag1', 'tag2', 'tag3']
      });

      const updated = manager.removeLabel(issue.id, 'tag2');

      expect(updated).toBeDefined();
      expect(updated?.tags).toEqual(['tag1', 'tag3']);
      expect(updated?.tags).not.toContain('tag2');
    });

    it('should return null for non-existent issue', () => {
      expect(manager.addLabel('non-existent', 'label')).toBeNull();
      expect(manager.removeLabel('non-existent', 'label')).toBeNull();
    });
  });

  describe('getAllLabels', () => {
    it('should return all labels with counts', () => {
      manager.createIssue({
        projectId: 'project-1',
        title: 'Issue 1',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified,
        tags: ['bug', 'frontend']
      });

      manager.createIssue({
        projectId: 'project-1',
        title: 'Issue 2',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified,
        tags: ['bug', 'backend']
      });

      manager.createIssue({
        projectId: 'project-1',
        title: 'Issue 3',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified,
        tags: ['frontend']
      });

      const labels = manager.getAllLabels('project-1');

      expect(labels).toHaveLength(3);
      const bugLabel = labels.find(l => l.label === 'bug');
      expect(bugLabel?.count).toBe(2);

      const frontendLabel = labels.find(l => l.label === 'frontend');
      expect(frontendLabel?.count).toBe(2);
    });

    it('should sort labels by count descending', () => {
      manager.createIssue({
        projectId: 'project-1',
        title: 'Issue 1',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified,
        tags: ['common']
      });

      manager.createIssue({
        projectId: 'project-1',
        title: 'Issue 2',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified,
        tags: ['common', 'rare']
      });

      const labels = manager.getAllLabels('project-1');

      expect(labels[0].label).toBe('common');
      expect(labels[0].count).toBe(2);
      expect(labels[1].label).toBe('rare');
      expect(labels[1].count).toBe(1);
    });
  });

  describe('exportToCSV', () => {
    it('should export issues to CSV format', () => {
      manager.createIssue({
        projectId: 'project-1',
        title: 'Test Issue',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.High,
        status: IssueStatus.Identified,
        assignee: 'john@example.com'
      });

      const csv = manager.exportToCSV('project-1');

      expect(csv).toContain('ID,Project ID,Title,Category,Severity,Status,Assignee,Created At,Updated At');
      expect(csv).toContain('project-1');
      expect(csv).toContain('"Test Issue"');
      expect(csv).toContain('bug');
      expect(csv).toContain('high');
      expect(csv).toContain('identified');
      expect(csv).toContain('john@example.com');
    });

    it('should handle titles with quotes', () => {
      manager.createIssue({
        projectId: 'project-1',
        title: 'Issue with "quotes"',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified
      });

      const csv = manager.exportToCSV('project-1');

      expect(csv).toContain('"Issue with ""quotes"""');
    });

    it('should export all issues when projectId not specified', () => {
      manager.createIssue({
        projectId: 'project-1',
        title: 'Issue 1',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified
      });

      manager.createIssue({
        projectId: 'project-2',
        title: 'Issue 2',
        description: 'Description',
        category: IssueCategory.Security,
        severity: IssueSeverity.High,
        status: IssueStatus.Identified
      });

      const csv = manager.exportToCSV();

      expect(csv.split('\n')).toHaveLength(4); // Header + 2 issues + empty line
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should update multiple issues at once', () => {
      const issue1 = manager.createIssue({
        projectId: 'project-1',
        title: 'Issue 1',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified
      });

      const issue2 = manager.createIssue({
        projectId: 'project-1',
        title: 'Issue 2',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified
      });

      const updated = manager.bulkUpdateStatus(
        [issue1.id, issue2.id],
        IssueStatus.Resolved
      );

      expect(updated).toBe(2);

      const retrieved1 = manager.getIssue(issue1.id);
      const retrieved2 = manager.getIssue(issue2.id);

      expect(retrieved1?.status).toBe(IssueStatus.Resolved);
      expect(retrieved2?.status).toBe(IssueStatus.Resolved);
    });

    it('should handle non-existent issues', () => {
      const issue = manager.createIssue({
        projectId: 'project-1',
        title: 'Issue',
        description: 'Description',
        category: IssueCategory.Bug,
        severity: IssueSeverity.Medium,
        status: IssueStatus.Identified
      });

      const updated = manager.bulkUpdateStatus(
        [issue.id, 'non-existent'],
        IssueStatus.Resolved
      );

      expect(updated).toBe(1);
    });

    it('should return 0 if no issues updated', () => {
      const updated = manager.bulkUpdateStatus(
        ['non-existent-1', 'non-existent-2'],
        IssueStatus.Resolved
      );

      expect(updated).toBe(0);
    });
  });
});
