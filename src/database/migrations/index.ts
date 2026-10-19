import { DatabaseSync } from 'node:sqlite';

export function runMigrations(db: DatabaseSync): void {
  // Create schema_migrations table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const stmt = db.prepare('SELECT version FROM schema_migrations WHERE version = ?');

  // Migration 1: Base Tables
  const check1 = stmt.get(1);
  if (!check1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        nodes TEXT NOT NULL,
        connections TEXT NOT NULL,
        settings TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS executions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        workflow_name TEXT NOT NULL,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        duration INTEGER,
        error_message TEXT,
        data TEXT,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS execution_nodes (
        id TEXT PRIMARY KEY,
        execution_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        node_name TEXT NOT NULL,
        node_type TEXT NOT NULL,
        status TEXT NOT NULL,
        input_data TEXT,
        output_data TEXT,
        error TEXT,
        started_at TEXT,
        finished_at TEXT,
        duration INTEGER,
        FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS webhook_registrations (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        method TEXT NOT NULL DEFAULT 'POST',
        created_at TEXT NOT NULL,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON executions(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
      CREATE INDEX IF NOT EXISTS idx_execution_nodes_execution_id ON execution_nodes(execution_id);
      CREATE INDEX IF NOT EXISTS idx_webhooks_path ON webhook_registrations(path);
    `);

    const insertStmt = db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)');
    insertStmt.run(1, new Date().toISOString());
  }

  // Migration 2: Webhook Resume Tokens for Wait Nodes
  const check2 = stmt.get(2);
  if (!check2) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS resume_tokens (
        token TEXT PRIMARY KEY,
        execution_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT,
        FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_resume_tokens_token ON resume_tokens(token);
    `);

    const insertStmt2 = db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)');
    insertStmt2.run(2, new Date().toISOString());
  }

  // Migration 3: OAuth2 States & Workflow Static Data
  const check3 = stmt.get(3);
  if (!check3) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS oauth2_states (
        state TEXT PRIMARY KEY,
        credential_id TEXT,
        config TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_oauth2_states_expires ON oauth2_states(expires_at);

      CREATE TABLE IF NOT EXISTS workflow_static_data (
        workflow_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (workflow_id, node_id)
      );
      CREATE INDEX IF NOT EXISTS idx_workflow_static_data_wf ON workflow_static_data(workflow_id);
    `);

    const insertStmt3 = db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)');
    insertStmt3.run(3, new Date().toISOString());
  }

  // Migration 4: Workflow Versions & Rollback History
  const check4 = stmt.get(4);
  if (!check4) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_versions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        version_num INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        nodes TEXT NOT NULL,
        connections TEXT NOT NULL,
        settings TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_workflow_versions_wf ON workflow_versions(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_versions_num ON workflow_versions(workflow_id, version_num);
    `);

    const insertStmt4 = db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)');
    insertStmt4.run(4, new Date().toISOString());
  }

  // Migration 5: Workflow Folders, Tags & Taxonomy
  const check5 = stmt.get(5);
  if (!check5) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#3b82f6',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workflow_tag_mappings (
        workflow_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (workflow_id, tag_id),
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES workflow_tags(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS workflow_folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tag_mappings_wf ON workflow_tag_mappings(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_tag_mappings_tag ON workflow_tag_mappings(tag_id);
    `);

    try {
      db.exec(`ALTER TABLE workflows ADD COLUMN folder_id TEXT;`);
    } catch {}

    const insertStmt5 = db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)');
    insertStmt5.run(5, new Date().toISOString());
  }

  // Migration 6: Execution Log Pruning & Retention Policies
  const check6 = stmt.get(6);
  if (!check6) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    const insertSetting = db.prepare(`INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)`);
    const nowIso = new Date().toISOString();
    insertSetting.run('execution_retention_enabled', 'true', nowIso);
    insertSetting.run('execution_retention_days', '14', nowIso);
    insertSetting.run('execution_retention_prune_success_only', 'false', nowIso);
    insertSetting.run('execution_retention_batch_size', '500', nowIso);

    const insertStmt6 = db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)');
    insertStmt6.run(6, nowIso);
  }

  // Migration 7: Multi-Project Workspace & Isolation
  const check7 = stmt.get(7);
  if (!check7) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        labels TEXT NOT NULL DEFAULT '[]',
        settings TEXT NOT NULL DEFAULT '{}',
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived);
      CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
    `);

    try {
      db.exec(`ALTER TABLE workflows ADD COLUMN project_id TEXT DEFAULT 'default';`);
    } catch {}

    try {
      db.exec(`ALTER TABLE executions ADD COLUMN project_id TEXT DEFAULT 'default';`);
    } catch {}

    try {
      db.exec(`ALTER TABLE credentials ADD COLUMN project_id TEXT DEFAULT 'default';`);
    } catch {}

    const nowIso = new Date().toISOString();
    const defaultProjectCheck = db.prepare('SELECT id FROM projects WHERE id = ?').get('default');
    if (!defaultProjectCheck) {
      db.prepare(`
        INSERT INTO projects (id, name, description, labels, settings, archived, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        'default',
        'Default Project',
        'Primary workspace for your automated workflows and integrations',
        JSON.stringify(['general', 'primary']),
        JSON.stringify({ color: '#6366f1', icon: 'folder' }),
        nowIso,
        nowIso
      );
    }

    try {
      db.exec(`UPDATE workflows SET project_id = 'default' WHERE project_id IS NULL OR project_id = '';`);
      db.exec(`UPDATE executions SET project_id = 'default' WHERE project_id IS NULL OR project_id = '';`);
      db.exec(`UPDATE credentials SET project_id = 'default' WHERE project_id IS NULL OR project_id = '';`);
    } catch {}

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_workflows_project_id ON workflows(project_id);
      CREATE INDEX IF NOT EXISTS idx_executions_project_id ON executions(project_id);
      CREATE INDEX IF NOT EXISTS idx_credentials_project_id ON credentials(project_id);
    `);

    const insertStmt7 = db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)');
    insertStmt7.run(7, nowIso);
  }
}

