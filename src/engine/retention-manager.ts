import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../database/connection';

export interface RetentionSettings {
  enabled: boolean;
  maxAgeDays: number;
  pruneSuccessfulOnly: boolean;
  batchSize: number;
}

export interface PruneResult {
  deletedCount: number;
  cutoffDate: string;
}

export class ExecutionRetentionManager {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  getSettings(): RetentionSettings {
    const getSetting = (key: string, defaultValue: string) => {
      try {
        const row = this.db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key) as any;
        return row?.value || defaultValue;
      } catch {
        return defaultValue;
      }
    };

    return {
      enabled: getSetting('execution_retention_enabled', 'true') === 'true',
      maxAgeDays: parseInt(getSetting('execution_retention_days', '14'), 10) || 14,
      pruneSuccessfulOnly: getSetting('execution_retention_prune_success_only', 'false') === 'true',
      batchSize: parseInt(getSetting('execution_retention_batch_size', '500'), 10) || 500
    };
  }

  updateSettings(settings: Partial<RetentionSettings>): RetentionSettings {
    const nowIso = new Date().toISOString();
    const saveSetting = (key: string, value: string) => {
      this.db.prepare(`
        INSERT INTO system_settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).run(key, value, nowIso);
    };

    if (settings.enabled !== undefined) saveSetting('execution_retention_enabled', String(settings.enabled));
    if (settings.maxAgeDays !== undefined) saveSetting('execution_retention_days', String(settings.maxAgeDays));
    if (settings.pruneSuccessfulOnly !== undefined) saveSetting('execution_retention_prune_success_only', String(settings.pruneSuccessfulOnly));
    if (settings.batchSize !== undefined) saveSetting('execution_retention_batch_size', String(settings.batchSize));

    return this.getSettings();
  }

  prune(options: { maxAgeDays?: number; pruneSuccessfulOnly?: boolean; batchSize?: number } = {}): PruneResult {
    const settings = this.getSettings();
    const days = options.maxAgeDays !== undefined ? options.maxAgeDays : settings.maxAgeDays;
    const successOnly = options.pruneSuccessfulOnly !== undefined ? options.pruneSuccessfulOnly : settings.pruneSuccessfulOnly;
    const limit = options.batchSize !== undefined ? options.batchSize : settings.batchSize;

    const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
    const cutoffDate = new Date(cutoffMs).toISOString();

    let query = `
      SELECT id FROM executions
      WHERE started_at < ?
    `;
    const params: any[] = [cutoffDate];

    if (successOnly) {
      query += ` AND status = 'success'`;
    }

    query += ` ORDER BY started_at ASC LIMIT ?`;
    params.push(limit);

    const rows = this.db.prepare(query).all(...params) as any[];
    if (rows.length === 0) {
      return { deletedCount: 0, cutoffDate };
    }

    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');

    // Delete node records
    this.db.prepare(`DELETE FROM execution_nodes WHERE execution_id IN (${placeholders})`).run(...ids);

    // Delete executions
    const result = this.db.prepare(`DELETE FROM executions WHERE id IN (${placeholders})`).run(...ids) as any;

    return {
      deletedCount: result?.changes || ids.length,
      cutoffDate
    };
  }
}
