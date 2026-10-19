import { DatabaseSync } from 'node:sqlite';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../connection';
import { WorkflowFolder } from '../../types/workflow';

export class FolderRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  create(folder: { name: string; parentId?: string }): WorkflowFolder {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO workflow_folders (id, name, parent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, folder.name.trim(), folder.parentId || null, now, now);

    return {
      id,
      name: folder.name.trim(),
      parentId: folder.parentId,
      createdAt: now,
      updatedAt: now
    };
  }

  list(): WorkflowFolder[] {
    const stmt = this.db.prepare('SELECT * FROM workflow_folders ORDER BY name ASC');
    const rows = stmt.all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      parentId: r.parent_id || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  getById(id: string): WorkflowFolder | null {
    const stmt = this.db.prepare('SELECT * FROM workflow_folders WHERE id = ?');
    const r = stmt.get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      parentId: r.parent_id || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  update(id: string, updates: { name?: string; parentId?: string }): WorkflowFolder | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const name = updates.name !== undefined ? updates.name.trim() : existing.name;
    const parentId = updates.parentId !== undefined ? (updates.parentId || null) : (existing.parentId || null);

    const stmt = this.db.prepare(`
      UPDATE workflow_folders
      SET name = ?, parent_id = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(name, parentId, now, id);

    return this.getById(id);
  }

  delete(id: string): boolean {
    // Unassign workflows in this folder
    try {
      this.db.prepare('UPDATE workflows SET folder_id = NULL WHERE folder_id = ?').run(id);
    } catch {}
    const stmt = this.db.prepare('DELETE FROM workflow_folders WHERE id = ?');
    stmt.run(id);
    return true;
  }
}
