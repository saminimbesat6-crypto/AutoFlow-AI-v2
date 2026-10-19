import { DatabaseSync } from 'node:sqlite';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../connection';
import { WorkflowTag } from '../../types/workflow';

export class TagRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  create(tag: { name: string; color?: string }): WorkflowTag {
    const id = uuidv4();
    const now = new Date().toISOString();
    const color = tag.color || '#3b82f6';

    const stmt = this.db.prepare(`
      INSERT INTO workflow_tags (id, name, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, tag.name.trim(), color, now, now);

    return {
      id,
      name: tag.name.trim(),
      color,
      createdAt: now,
      updatedAt: now
    };
  }

  list(): WorkflowTag[] {
    const stmt = this.db.prepare('SELECT * FROM workflow_tags ORDER BY name ASC');
    const rows = stmt.all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  getById(id: string): WorkflowTag | null {
    const stmt = this.db.prepare('SELECT * FROM workflow_tags WHERE id = ?');
    const r = stmt.get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      color: r.color,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  getByName(name: string): WorkflowTag | null {
    const stmt = this.db.prepare('SELECT * FROM workflow_tags WHERE LOWER(name) = LOWER(?)');
    const r = stmt.get(name.trim()) as any;
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      color: r.color,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  update(id: string, updates: { name?: string; color?: string }): WorkflowTag | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const name = updates.name !== undefined ? updates.name.trim() : existing.name;
    const color = updates.color !== undefined ? updates.color : existing.color;

    const stmt = this.db.prepare(`
      UPDATE workflow_tags
      SET name = ?, color = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(name, color, now, id);

    return this.getById(id);
  }

  delete(id: string): boolean {
    this.db.prepare('DELETE FROM workflow_tag_mappings WHERE tag_id = ?').run(id);
    const stmt = this.db.prepare('DELETE FROM workflow_tags WHERE id = ?');
    stmt.run(id);
    return true;
  }

  getWorkflowTags(workflowId: string): WorkflowTag[] {
    const stmt = this.db.prepare(`
      SELECT t.id, t.name, t.color, t.created_at, t.updated_at
      FROM workflow_tags t
      JOIN workflow_tag_mappings m ON t.id = m.tag_id
      WHERE m.workflow_id = ?
      ORDER BY t.name ASC
    `);
    const rows = stmt.all(workflowId) as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  setWorkflowTags(workflowId: string, tagIds: string[]): void {
    const deleteStmt = this.db.prepare('DELETE FROM workflow_tag_mappings WHERE workflow_id = ?');
    deleteStmt.run(workflowId);

    const insertStmt = this.db.prepare('INSERT OR IGNORE INTO workflow_tag_mappings (workflow_id, tag_id) VALUES (?, ?)');
    for (const tagId of tagIds) {
      if (tagId) insertStmt.run(workflowId, tagId);
    }
  }
}
