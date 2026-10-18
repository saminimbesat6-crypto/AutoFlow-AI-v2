import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../database/connection';

export class StaticDataManager {
  private db: DatabaseSync;
  private cache: Map<string, Record<string, any>> = new Map();

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  private getCacheKey(workflowId: string, nodeId: string): string {
    return `${workflowId}:${nodeId}`;
  }

  getStaticData(workflowId: string, nodeId: string = '__global__'): Record<string, any> {
    const cacheKey = this.getCacheKey(workflowId, nodeId);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const stmt = this.db.prepare('SELECT data FROM workflow_static_data WHERE workflow_id = ? AND node_id = ?');
      const row = stmt.get(workflowId, nodeId) as { data: string } | undefined;
      let parsed: Record<string, any> = {};
      if (row && row.data) {
        parsed = JSON.parse(row.data);
      }
      this.cache.set(cacheKey, parsed);
      return parsed;
    } catch (err: any) {
      if (!err?.message?.includes('no such table')) {
        console.error(`[StaticDataManager] Error reading static data for ${workflowId}/${nodeId}:`, err);
      }
      const fallback: Record<string, any> = {};
      this.cache.set(cacheKey, fallback);
      return fallback;
    }
  }

  saveStaticData(workflowId: string, nodeId: string = '__global__', data?: Record<string, any>): void {
    const cacheKey = this.getCacheKey(workflowId, nodeId);
    const dataToSave = data !== undefined ? data : this.cache.get(cacheKey) || {};

    const now = new Date().toISOString();
    const serialized = JSON.stringify(dataToSave);

    try {
      const stmt = this.db.prepare(`
        INSERT INTO workflow_static_data (workflow_id, node_id, data, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(workflow_id, node_id) DO UPDATE SET
          data = excluded.data,
          updated_at = excluded.updated_at
      `);
      stmt.run(workflowId, nodeId, serialized, now);
      this.cache.set(cacheKey, dataToSave);
    } catch (err: any) {
      if (!err?.message?.includes('no such table')) {
        console.error(`[StaticDataManager] Error saving static data for ${workflowId}/${nodeId}:`, err);
      }
    }
  }

  clearStaticData(workflowId: string, nodeId?: string): void {
    try {
      if (nodeId) {
        const stmt = this.db.prepare('DELETE FROM workflow_static_data WHERE workflow_id = ? AND node_id = ?');
        stmt.run(workflowId, nodeId);
        this.cache.delete(this.getCacheKey(workflowId, nodeId));
      } else {
        const stmt = this.db.prepare('DELETE FROM workflow_static_data WHERE workflow_id = ?');
        stmt.run(workflowId);
        for (const key of Array.from(this.cache.keys())) {
          if (key.startsWith(`${workflowId}:`)) {
            this.cache.delete(key);
          }
        }
      }
    } catch (err) {
      console.error(`[StaticDataManager] Error clearing static data:`, err);
    }
  }
}
