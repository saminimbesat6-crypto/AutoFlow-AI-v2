import { DatabaseSync } from 'node:sqlite';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { WorkflowExecutor } from '../engine/executor';
import { WorkflowRepository } from '../database/repositories/workflow-repository';
import { DataItem, Workflow } from '../types/workflow';

export interface WebhookRegistration {
  id: string;
  workflowId: string;
  nodeId: string;
  path: string;
  method: string;
}

export class WebhookManager {
  private db: DatabaseSync;
  private executor: WorkflowExecutor;
  private workflowRepo: WorkflowRepository;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
    this.executor = new WorkflowExecutor(this.db);
    this.workflowRepo = new WorkflowRepository(this.db);
  }

  registerWorkflowWebhooks(workflow: Workflow): void {
    // Remove existing registrations for this workflow
    this.unregisterWorkflowWebhooks(workflow.id);

    if (!workflow.active) return;

    for (const node of workflow.nodes) {
      if (node.type === 'webhook-trigger' && !node.disabled) {
        const path = node.parameters?.path || `webhook-${node.id.slice(0, 8)}`;
        const method = (node.parameters?.httpMethod || 'POST').toUpperCase();
        const id = uuidv4();

        try {
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO webhook_registrations (id, workflow_id, node_id, path, method, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          stmt.run(id, workflow.id, node.id, path, method, new Date().toISOString());
        } catch (err) {
          console.error(`Failed to register webhook for workflow ${workflow.id}:`, err);
        }
      }
    }
  }

  unregisterWorkflowWebhooks(workflowId: string): void {
    const stmt = this.db.prepare('DELETE FROM webhook_registrations WHERE workflow_id = ?');
    stmt.run(workflowId);
  }

  async handleWebhook(
    path: string,
    method: string,
    reqData: { body: any; headers: any; query: any; params: any }
  ): Promise<{ success: boolean; data?: any; error?: string; statusCode: number }> {
    const stmt = this.db.prepare('SELECT * FROM webhook_registrations WHERE path = ?');
    const row = stmt.get(path) as any;

    if (!row) {
      return { success: false, error: `No active webhook found at path "/webhook/${path}"`, statusCode: 404 };
    }

    if (row.method !== 'ANY' && row.method !== method.toUpperCase()) {
      return { success: false, error: `Method ${method} not allowed. Expected ${row.method}`, statusCode: 405 };
    }

    const workflow = this.workflowRepo.getById(row.workflow_id);
    if (!workflow || !workflow.active) {
      return { success: false, error: 'Workflow is not active', statusCode: 400 };
    }

    const triggerItem: DataItem = {
      json: {
        body: reqData.body,
        headers: reqData.headers,
        query: reqData.query,
        params: reqData.params,
        timestamp: new Date().toISOString()
      }
    };

    try {
      const execution = await this.executor.execute(workflow, {
        mode: 'webhook',
        startNodeId: row.node_id,
        initialData: [triggerItem]
      });

      let finalStatusCode = execution.status === 'success' ? 200 : 500;
      let responsePayload: any = execution;

      if (execution.status === 'success') {
        const details = this.executor.getExecution(execution.id);
        if (details && details.nodes) {
          // Find any executed node that generated _webhookResponse
          for (const n of details.nodes) {
            const outputs = n.outputData?.[0];
            if (Array.isArray(outputs)) {
              for (const item of outputs) {
                if (item?.json?._webhookResponse) {
                  finalStatusCode = item.json._webhookResponse.statusCode || 200;
                  responsePayload = item.json._webhookResponse.body;
                  break;
                }
              }
            }
          }
        }
      }

      return {
        success: execution.status === 'success',
        data: responsePayload,
        statusCode: finalStatusCode,
        error: execution.errorMessage
      };
    } catch (err: any) {
      return { success: false, error: err.message, statusCode: 500 };
    }
  }

  private testListeners: Map<string, any> = new Map();

  registerTestListener(
    workflowId: string,
    nodeId: string,
    path: string,
    method = 'POST',
    timeoutMs = 120000
  ): Promise<{ success: boolean; event?: any; outputData?: any; error?: string }> {
    const key = `${method.toUpperCase()}:${path}`;
    
    // Clear any previous listener for this route
    if (this.testListeners.has(key)) {
      const prev = this.testListeners.get(key);
      clearTimeout(prev.timer);
      prev.resolve({ success: false, error: 'Replaced by a newer listener' });
      this.testListeners.delete(key);
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.testListeners.delete(key);
        resolve({ success: false, error: 'Timed out waiting for test webhook event (120s)' });
      }, timeoutMs);

      this.testListeners.set(key, {
        id: uuidv4(),
        workflowId,
        nodeId,
        path,
        method: method.toUpperCase(),
        resolve,
        timer
      });
    });
  }

  cancelTestListener(path: string, method = 'POST'): void {
    const key = `${method.toUpperCase()}:${path}`;
    const listener = this.testListeners.get(key);
    if (listener) {
      clearTimeout(listener.timer);
      listener.resolve({ success: false, error: 'Cancelled by user' });
      this.testListeners.delete(key);
    }
  }

  async handleTestWebhook(
    path: string,
    method: string,
    reqData: { body: any; headers: any; query: any; params: any }
  ): Promise<{ success: boolean; data?: any; error?: string; statusCode: number }> {
    const normMethod = method.toUpperCase();
    const key = `${normMethod}:${path}`;
    const anyKey = `ANY:${path}`;
    const wildcardKey = `*:${path}`;

    const listener = this.testListeners.get(key) || this.testListeners.get(anyKey) || this.testListeners.get(wildcardKey);

    const event = {
      path,
      method: normMethod,
      body: reqData.body,
      headers: reqData.headers,
      query: reqData.query,
      params: reqData.params,
      timestamp: new Date().toISOString()
    };

    const triggerItem: DataItem = {
      json: {
        body: reqData.body,
        headers: reqData.headers,
        query: reqData.query,
        params: reqData.params,
        timestamp: event.timestamp
      }
    };

    if (listener) {
      clearTimeout(listener.timer);
      this.testListeners.delete(key);
      this.testListeners.delete(anyKey);
      this.testListeners.delete(wildcardKey);

      // Execute single node to produce output data
      const workflow = this.workflowRepo.getById(listener.workflowId);
      let outputData: any = [[triggerItem]];

      if (workflow) {
        const node = workflow.nodes.find((n) => n.id === listener.nodeId);
        if (node) {
          try {
            const { NodeRegistry } = require('../nodes/registry');
            const { ExecutionContext } = require('../engine/context');
            const nodeDef = NodeRegistry.getInstance().get(node.type);
            if (nodeDef) {
              const execCtx = new ExecutionContext();
              const nodeCtx = execCtx.createNodeContext(node, [triggerItem], 0);
              outputData = await nodeDef.execute(nodeCtx);
            }
          } catch (e: any) {
            console.warn('[WebhookManager] Error executing test node:', e.message);
          }
        }
      }

      listener.resolve({
        success: true,
        event,
        outputData
      });

      return {
        success: true,
        data: {
          message: 'Test event captured and dispatched to editor listener',
          event
        },
        statusCode: 200
      };
    }

    // Check if any workflow in the repository defines this webhook path
    const allWorkflows = this.workflowRepo.list();
    let matchingWf: Workflow | undefined;
    let matchingNode: any;

    for (const wf of allWorkflows) {
      for (const node of wf.nodes) {
        if (node.type === 'webhook-trigger') {
          const nodePath = node.parameters?.path || `webhook-${node.id.slice(0, 8)}`;
          const nodeMethod = (node.parameters?.httpMethod || 'POST').toUpperCase();
          if (nodePath === path && (nodeMethod === 'ANY' || nodeMethod === normMethod)) {
            matchingWf = wf;
            matchingNode = node;
            break;
          }
        }
      }
      if (matchingWf) break;
    }

    if (!matchingWf) {
      return {
        success: false,
        error: `No test listener or workflow found for test webhook path "/webhook-test/${path}"`,
        statusCode: 404
      };
    }

    try {
      const execution = await this.executor.execute(matchingWf, {
        mode: 'test',
        startNodeId: matchingNode.id,
        initialData: [triggerItem]
      });

      return {
        success: execution.status === 'success',
        data: {
          message: 'Executed workflow in test mode with incoming payload',
          executionId: execution.id,
          status: execution.status,
          event
        },
        statusCode: execution.status === 'success' ? 200 : 500,
        error: execution.errorMessage
      };
    } catch (err: any) {
      return { success: false, error: err.message, statusCode: 500 };
    }
  }

  syncAllActive(): void {
    const active = this.workflowRepo.getActiveWorkflows();
    for (const wf of active) {
      this.registerWorkflowWebhooks(wf);
    }
  }
}

