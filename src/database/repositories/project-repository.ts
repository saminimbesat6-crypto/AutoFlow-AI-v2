import { DatabaseSync } from 'node:sqlite';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../connection';
import { Project, ProjectSummary, ProjectHealth } from '../../types/project';
import { Workflow } from '../../types/workflow';
import { WorkflowRepository } from './workflow-repository';

export class ProjectRepository {
  private db: DatabaseSync;
  private workflowRepo: WorkflowRepository;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
    this.workflowRepo = new WorkflowRepository(this.db);
  }

  create(data: {
    id?: string;
    name: string;
    description?: string;
    labels?: string[];
    settings?: Record<string, any>;
  }): Project {
    const id = data.id || uuidv4();
    const now = new Date().toISOString();
    const labels = JSON.stringify(data.labels || []);
    const settings = JSON.stringify(data.settings || {});

    const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, description, labels, settings, archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `);

    stmt.run(
      id,
      data.name.trim(),
      data.description ? data.description.trim() : null,
      labels,
      settings,
      now,
      now
    );

    return {
      id,
      name: data.name.trim(),
      description: data.description ? data.description.trim() : undefined,
      labels: data.labels || [],
      settings: data.settings || {},
      archived: false,
      createdAt: now,
      updatedAt: now
    };
  }

  getById(id: string): Project | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      labels: JSON.parse(row.labels || '[]'),
      settings: JSON.parse(row.settings || '{}'),
      archived: Boolean(row.archived),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  getSummary(id: string): ProjectSummary | null {
    const project = this.getById(id);
    if (!project) return null;
    return this.buildSummary(project);
  }

  list(filters?: {
    search?: string;
    archived?: boolean;
    sortBy?: 'created_at' | 'updated_at' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): ProjectSummary[] {
    let sql = 'SELECT * FROM projects WHERE 1=1';
    const params: any[] = [];

    if (filters?.archived !== undefined) {
      sql += ' AND archived = ?';
      params.push(filters.archived ? 1 : 0);
    } else {
      sql += ' AND archived = 0';
    }

    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      sql += ' AND (name LIKE ? OR description LIKE ? OR labels LIKE ?)';
      params.push(q, q, q);
    }

    const sortCol = ['created_at', 'updated_at', 'name'].includes(filters?.sortBy || '')
      ? filters!.sortBy
      : 'updated_at';
    const sortDir = (filters?.sortOrder || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${sortCol} ${sortDir}`;

    const stmt = this.db.prepare(sql);
    const rows = (params.length > 0 ? stmt.all(...params) : stmt.all()) as any[];

    return rows.map((row) => {
      const project: Project = {
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        labels: JSON.parse(row.labels || '[]'),
        settings: JSON.parse(row.settings || '{}'),
        archived: Boolean(row.archived),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      return this.buildSummary(project);
    });
  }

  private buildSummary(project: Project): ProjectSummary {
    // 1. Workflow counts
    const wfCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM workflows WHERE project_id = ?');
    const totalWfRow = wfCountStmt.get(project.id) as any;
    const workflowCount = Number(totalWfRow?.count || 0);

    const activeWfCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM workflows WHERE project_id = ? AND active = 1');
    const activeWfRow = activeWfCountStmt.get(project.id) as any;
    const activeWorkflowCount = Number(activeWfRow?.count || 0);

    // 2. Execution health
    const healthStmt = this.db.prepare(`
      SELECT status, started_at FROM executions
      WHERE project_id = ? OR workflow_id IN (SELECT id FROM workflows WHERE project_id = ?)
      ORDER BY started_at DESC LIMIT 50
    `);
    const execRows = healthStmt.all(project.id, project.id) as any[];

    let totalRuns = execRows.length;
    let successfulRuns = 0;
    let failedRuns = 0;
    let lastRunAt: string | undefined = undefined;

    if (totalRuns > 0) {
      lastRunAt = execRows[0].started_at;
      for (const r of execRows) {
        if (r.status === 'success') successfulRuns++;
        else if (r.status === 'error') failedRuns++;
      }
    }

    let status: ProjectHealth['status'] = 'idle';
    let successRate = 100;

    if (totalRuns > 0) {
      const completedRuns = successfulRuns + failedRuns;
      successRate = completedRuns > 0 ? Math.round((successfulRuns / completedRuns) * 100) : 100;
      if (failedRuns === 0) status = 'healthy';
      else if (successRate >= 80) status = 'healthy';
      else if (successRate >= 50) status = 'warning';
      else status = 'error';
    }

    const health: ProjectHealth = {
      status,
      successRate,
      totalRuns,
      successfulRuns,
      failedRuns,
      lastRunAt
    };

    // 3. Last modified
    const lastWfStmt = this.db.prepare('SELECT MAX(updated_at) as last_wf FROM workflows WHERE project_id = ?');
    const lastWfRow = lastWfStmt.get(project.id) as any;
    const lastWfTime = lastWfRow?.last_wf;

    let lastModified = project.updatedAt;
    if (lastWfTime && lastWfTime > lastModified) {
      lastModified = lastWfTime;
    }
    if (lastRunAt && lastRunAt > lastModified) {
      lastModified = lastRunAt;
    }

    return {
      ...project,
      workflowCount,
      activeWorkflowCount,
      health,
      lastModified
    };
  }

  update(
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      labels: string[];
      settings: Record<string, any>;
      archived: boolean;
    }>
  ): Project | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const name = updates.name !== undefined ? updates.name.trim() : existing.name;
    const description = updates.description !== undefined ? updates.description?.trim() || null : (existing.description || null);
    const labels = updates.labels !== undefined ? JSON.stringify(updates.labels) : JSON.stringify(existing.labels);
    const settings = updates.settings !== undefined ? JSON.stringify(updates.settings) : JSON.stringify(existing.settings);
    const archived = updates.archived !== undefined ? (updates.archived ? 1 : 0) : (existing.archived ? 1 : 0);

    const stmt = this.db.prepare(`
      UPDATE projects
      SET name = ?, description = ?, labels = ?, settings = ?, archived = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(name, description, labels, settings, archived, now, id);

    return this.getById(id);
  }

  delete(id: string, hardDelete = false): boolean {
    if (id === 'default') {
      throw new Error('The default project cannot be deleted');
    }

    if (!hardDelete) {
      // Soft-archive
      this.update(id, { archived: true });
      return true;
    }

    // Hard-delete project and cascade all its workflows and executions
    const workflows = this.workflowRepo.list({ projectId: id });
    for (const wf of workflows) {
      this.workflowRepo.delete(wf.id);
    }

    try {
      this.db.prepare('DELETE FROM executions WHERE project_id = ?').run(id);
    } catch {}

    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run(id);
    return true;
  }

  duplicate(id: string, newName?: string): { project: Project; workflows: Workflow[] } {
    const orig = this.getById(id);
    if (!orig) {
      throw new Error(`Project ${id} not found`);
    }

    const newProjectId = uuidv4();
    const copyName = newName || `Copy of ${orig.name}`;

    const newProject = this.create({
      id: newProjectId,
      name: copyName,
      description: orig.description,
      labels: [...orig.labels, 'duplicated'],
      settings: { ...orig.settings }
    });

    // Deep clone all workflows from original project
    const origWorkflows = this.workflowRepo.list({ projectId: id });
    const clonedWorkflows: Workflow[] = [];

    for (const wf of origWorkflows) {
      const cloned = this.workflowRepo.create({
        name: wf.name,
        description: wf.description,
        projectId: newProjectId,
        folderId: wf.folderId,
        tags: wf.tags,
        nodes: JSON.parse(JSON.stringify(wf.nodes || [])),
        connections: JSON.parse(JSON.stringify(wf.connections || [])),
        settings: JSON.parse(JSON.stringify(wf.settings || {})),
        active: false // Duplicated workflows default to inactive
      });
      clonedWorkflows.push(cloned);
    }

    return {
      project: newProject,
      workflows: clonedWorkflows
    };
  }

  getRecentProjects(limit = 5): ProjectSummary[] {
    return this.list({ archived: false, sortBy: 'updated_at', sortOrder: 'desc' }).slice(0, limit);
  }

  getRecentWorkflows(projectId?: string, limit = 5): Array<Workflow & { projectName: string }> {
    let sql = `
      SELECT w.*, p.name as project_name
      FROM workflows w
      LEFT JOIN projects p ON w.project_id = p.id
    `;
    const params: any[] = [];
    if (projectId) {
      sql += ' WHERE w.project_id = ?';
      params.push(projectId);
    }
    sql += ' ORDER BY w.updated_at DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      projectId: row.project_id || 'default',
      projectName: row.project_name || 'Default Project',
      folderId: row.folder_id || undefined,
      tags: [],
      nodes: JSON.parse(row.nodes || '[]'),
      connections: JSON.parse(row.connections || '[]'),
      settings: JSON.parse(row.settings || '{}'),
      active: Boolean(row.active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
}
