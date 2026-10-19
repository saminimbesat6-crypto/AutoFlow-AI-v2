import { DatabaseSync } from 'node:sqlite';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../connection';
import { Workflow } from '../../types/workflow';
import { WorkflowVersionRepository } from './workflow-version-repository';
import { TagRepository } from './tag-repository';

export class WorkflowRepository {
  private db: DatabaseSync;
  private versionRepo: WorkflowVersionRepository;
  private tagRepo: TagRepository;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
    this.versionRepo = new WorkflowVersionRepository(this.db);
    this.tagRepo = new TagRepository(this.db);
  }

  create(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; tags?: string[] }): Workflow {
    const id = workflow.id || uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO workflows (id, name, description, nodes, connections, settings, active, folder_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      workflow.name,
      workflow.description || null,
      JSON.stringify(workflow.nodes || []),
      JSON.stringify(workflow.connections || []),
      JSON.stringify(workflow.settings || {}),
      workflow.active ? 1 : 0,
      workflow.folderId || null,
      now,
      now
    );

    // Set tags if provided
    if (workflow.tags && Array.isArray(workflow.tags)) {
      this.tagRepo.setWorkflowTags(id, workflow.tags);
    }

    // Create Initial Version Snapshot (Version 1)
    this.versionRepo.create({
      workflowId: id,
      name: workflow.name,
      description: 'Initial version',
      nodes: workflow.nodes || [],
      connections: workflow.connections || [],
      settings: workflow.settings || {}
    });

    return {
      id,
      name: workflow.name,
      description: workflow.description,
      folderId: workflow.folderId,
      tags: workflow.tags || [],
      nodes: workflow.nodes || [],
      connections: workflow.connections || [],
      settings: workflow.settings || {},
      active: !!workflow.active,
      createdAt: now,
      updatedAt: now
    };
  }

  update(id: string, updates: Partial<Workflow> & { changeDescription?: string }): Workflow | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const name = updates.name !== undefined ? updates.name : existing.name;
    const description = updates.description !== undefined ? updates.description : existing.description;
    const nodes = updates.nodes !== undefined ? JSON.stringify(updates.nodes) : JSON.stringify(existing.nodes);
    const connections = updates.connections !== undefined ? JSON.stringify(updates.connections) : JSON.stringify(existing.connections);
    const settings = updates.settings !== undefined ? JSON.stringify(updates.settings) : JSON.stringify(existing.settings);
    const active = updates.active !== undefined ? (updates.active ? 1 : 0) : (existing.active ? 1 : 0);
    const folderId = updates.folderId !== undefined ? (updates.folderId || null) : (existing.folderId || null);

    const stmt = this.db.prepare(`
      UPDATE workflows
      SET name = ?, description = ?, nodes = ?, connections = ?, settings = ?, active = ?, folder_id = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(name, description || null, nodes, connections, settings, active, folderId, now, id);

    // Update tags if specified
    if (updates.tags && Array.isArray(updates.tags)) {
      this.tagRepo.setWorkflowTags(id, updates.tags);
    }

    // Check if graph or name changed to save a version snapshot
    const nodesChanged = updates.nodes !== undefined && JSON.stringify(updates.nodes) !== JSON.stringify(existing.nodes);
    const connsChanged = updates.connections !== undefined && JSON.stringify(updates.connections) !== JSON.stringify(existing.connections);

    if (nodesChanged || connsChanged || updates.changeDescription) {
      this.versionRepo.create({
        workflowId: id,
        name,
        description: updates.changeDescription || (nodesChanged ? 'Workflow graph updated' : 'Workflow settings updated'),
        nodes: updates.nodes !== undefined ? updates.nodes : existing.nodes,
        connections: updates.connections !== undefined ? updates.connections : existing.connections,
        settings: updates.settings !== undefined ? updates.settings : existing.settings
      });
    }

    return this.getById(id);
  }

  getById(id: string): Workflow | null {
    const stmt = this.db.prepare('SELECT * FROM workflows WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;

    const tags = this.tagRepo.getWorkflowTags(id).map((t) => t.id);

    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      folderId: row.folder_id || undefined,
      tags,
      nodes: JSON.parse(row.nodes),
      connections: JSON.parse(row.connections),
      settings: JSON.parse(row.settings),
      active: Boolean(row.active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  list(filters?: { folderId?: string; tagId?: string }): Workflow[] {
    let sql = 'SELECT * FROM workflows';
    const params: any[] = [];

    if (filters?.tagId) {
      sql = `
        SELECT w.* FROM workflows w
        JOIN workflow_tag_mappings m ON w.id = m.workflow_id
        WHERE m.tag_id = ?
      `;
      params.push(filters.tagId);
      if (filters?.folderId) {
        sql += ' AND w.folder_id = ?';
        params.push(filters.folderId);
      }
    } else if (filters?.folderId) {
      sql += ' WHERE folder_id = ?';
      params.push(filters.folderId);
    }

    sql += ' ORDER BY updated_at DESC';

    const stmt = this.db.prepare(sql);
    const rows = (params.length > 0 ? stmt.all(...params) : stmt.all()) as any[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      folderId: row.folder_id || undefined,
      tags: this.tagRepo.getWorkflowTags(row.id).map((t) => t.id),
      nodes: JSON.parse(row.nodes),
      connections: JSON.parse(row.connections),
      settings: JSON.parse(row.settings),
      active: Boolean(row.active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  delete(id: string): boolean {
    try {
      this.db.prepare('DELETE FROM workflow_static_data WHERE workflow_id = ?').run(id);
    } catch {}
    try {
      this.db.prepare('DELETE FROM workflow_tag_mappings WHERE workflow_id = ?').run(id);
    } catch {}
    try {
      this.db.prepare('DELETE FROM workflow_versions WHERE workflow_id = ?').run(id);
    } catch {}
    const stmt = this.db.prepare('DELETE FROM workflows WHERE id = ?');
    stmt.run(id);
    return true;
  }

  getActiveWorkflows(): Workflow[] {
    const stmt = this.db.prepare('SELECT * FROM workflows WHERE active = 1');
    const rows = stmt.all() as any[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      folderId: row.folder_id || undefined,
      tags: this.tagRepo.getWorkflowTags(row.id).map((t) => t.id),
      nodes: JSON.parse(row.nodes),
      connections: JSON.parse(row.connections),
      settings: JSON.parse(row.settings),
      active: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
}
