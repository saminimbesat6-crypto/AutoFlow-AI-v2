import { DatabaseSync } from 'node:sqlite';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../connection';
import { WorkflowVersion, WorkflowNode, Connection, WorkflowSettings } from '../../types/workflow';

export interface VersionSummary {
  id: string;
  workflowId: string;
  versionNum: number;
  name: string;
  description?: string;
  nodeCount: number;
  connectionCount: number;
  createdAt: string;
}

export interface VersionDiff {
  versionAId: string;
  versionBId: string;
  addedNodes: WorkflowNode[];
  removedNodes: WorkflowNode[];
  modifiedNodes: Array<{ id: string; name: string; changes: string[] }>;
  addedConnections: Connection[];
  removedConnections: Connection[];
}

export class WorkflowVersionRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  create(params: {
    workflowId: string;
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    connections: Connection[];
    settings?: WorkflowSettings;
  }): WorkflowVersion {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Determine next version number for this workflow
    const maxStmt = this.db.prepare('SELECT MAX(version_num) as max_num FROM workflow_versions WHERE workflow_id = ?');
    const row = maxStmt.get(params.workflowId) as any;
    const versionNum = (row?.max_num || 0) + 1;

    const stmt = this.db.prepare(`
      INSERT INTO workflow_versions (id, workflow_id, version_num, name, description, nodes, connections, settings, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.workflowId,
      versionNum,
      params.name,
      params.description || null,
      JSON.stringify(params.nodes || []),
      JSON.stringify(params.connections || []),
      JSON.stringify(params.settings || {}),
      now
    );

    // Prune history beyond 50 versions per workflow
    try {
      this.db.prepare(`
        DELETE FROM workflow_versions
        WHERE workflow_id = ? AND id NOT IN (
          SELECT id FROM workflow_versions
          WHERE workflow_id = ?
          ORDER BY version_num DESC
          LIMIT 50
        )
      `).run(params.workflowId, params.workflowId);
    } catch {}

    return {
      id,
      workflowId: params.workflowId,
      versionNum,
      name: params.name,
      description: params.description,
      nodes: params.nodes,
      connections: params.connections,
      settings: params.settings || {},
      createdAt: now
    };
  }

  list(workflowId: string): VersionSummary[] {
    const stmt = this.db.prepare(`
      SELECT id, workflow_id, version_num, name, description, nodes, connections, created_at
      FROM workflow_versions
      WHERE workflow_id = ?
      ORDER BY version_num DESC
    `);
    const rows = stmt.all(workflowId) as any[];

    return rows.map((r) => {
      let nodeCount = 0;
      let connectionCount = 0;
      try {
        nodeCount = JSON.parse(r.nodes).length;
      } catch {}
      try {
        connectionCount = JSON.parse(r.connections).length;
      } catch {}

      return {
        id: r.id,
        workflowId: r.workflow_id,
        versionNum: r.version_num,
        name: r.name,
        description: r.description || undefined,
        nodeCount,
        connectionCount,
        createdAt: r.created_at
      };
    });
  }

  getById(id: string): WorkflowVersion | null {
    const stmt = this.db.prepare('SELECT * FROM workflow_versions WHERE id = ?');
    const r = stmt.get(id) as any;
    if (!r) return null;

    return {
      id: r.id,
      workflowId: r.workflow_id,
      versionNum: r.version_num,
      name: r.name,
      description: r.description || undefined,
      nodes: JSON.parse(r.nodes || '[]'),
      connections: JSON.parse(r.connections || '[]'),
      settings: JSON.parse(r.settings || '{}'),
      createdAt: r.created_at
    };
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM workflow_versions WHERE id = ?');
    stmt.run(id);
    return true;
  }

  diff(versionA: WorkflowVersion, versionB: WorkflowVersion): VersionDiff {
    const nodesA = new Map<string, WorkflowNode>();
    for (const n of versionA.nodes) nodesA.set(n.id, n);

    const nodesB = new Map<string, WorkflowNode>();
    for (const n of versionB.nodes) nodesB.set(n.id, n);

    const addedNodes: WorkflowNode[] = [];
    const removedNodes: WorkflowNode[] = [];
    const modifiedNodes: Array<{ id: string; name: string; changes: string[] }> = [];

    // Check for added or modified in B
    for (const [id, nodeB] of nodesB.entries()) {
      if (!nodesA.has(id)) {
        addedNodes.push(nodeB);
      } else {
        const nodeA = nodesA.get(id)!;
        const changes: string[] = [];
        if (nodeA.name !== nodeB.name) changes.push(`Name changed from "${nodeA.name}" to "${nodeB.name}"`);
        if (nodeA.type !== nodeB.type) changes.push(`Type changed from "${nodeA.type}" to "${nodeB.type}"`);
        if (JSON.stringify(nodeA.parameters) !== JSON.stringify(nodeB.parameters)) changes.push('Parameters changed');
        if (nodeA.disabled !== nodeB.disabled) changes.push(`Disabled state changed to ${nodeB.disabled}`);
        if (changes.length > 0) {
          modifiedNodes.push({ id, name: nodeB.name, changes });
        }
      }
    }

    // Check for removed from A
    for (const [id, nodeA] of nodesA.entries()) {
      if (!nodesB.has(id)) {
        removedNodes.push(nodeA);
      }
    }

    const connKey = (c: Connection) => `${c.source}:${c.sourceOutput || 0}->${c.target}:${c.targetInput || 0}`;
    const connsA = new Set(versionA.connections.map(connKey));
    const connsB = new Set(versionB.connections.map(connKey));

    const addedConnections = versionB.connections.filter((c) => !connsA.has(connKey(c)));
    const removedConnections = versionA.connections.filter((c) => !connsB.has(connKey(c)));

    return {
      versionAId: versionA.id,
      versionBId: versionB.id,
      addedNodes,
      removedNodes,
      modifiedNodes,
      addedConnections,
      removedConnections
    };
  }
}
