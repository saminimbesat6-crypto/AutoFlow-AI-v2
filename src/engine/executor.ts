import { DatabaseSync } from 'node:sqlite';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import {
  DataItem,
  ExecutionMode,
  ExecutionRecord,
  NodeExecutionRecord,
  NodeOutput,
  Workflow,
  WorkflowNode
} from '../types/workflow';
import { ExecutionContext } from './context';
import { WorkflowGraph } from './graph';
import { NodeRegistry } from '../nodes/registry';
import { CredentialsManager } from '../credentials/manager';

export interface ExecuteOptions {
  mode?: ExecutionMode;
  startNodeId?: string;
  initialData?: DataItem[];
  saveExecution?: boolean;
  onNodeStart?: (node: WorkflowNode) => void | Promise<void>;
  onNodeFinish?: (nodeRecord: NodeExecutionRecord) => void | Promise<void>;
}

export class WorkflowExecutor {
  private db: DatabaseSync;
  private nodeRegistry: NodeRegistry;
  private credentialsManager: CredentialsManager;
  private cancelledExecutions: Set<string> = new Set();

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
    this.nodeRegistry = NodeRegistry.getInstance();
    this.credentialsManager = new CredentialsManager(this.db);
  }

  cancelExecution(executionId: string): boolean {
    this.cancelledExecutions.add(executionId);
    try {
      this.db.prepare("UPDATE executions SET status = 'cancelled', finished_at = ? WHERE id = ?").run(
        new Date().toISOString(),
        executionId
      );
      return true;
    } catch {
      return false;
    }
  }

  async execute(workflow: Workflow, options: ExecuteOptions = {}): Promise<ExecutionRecord> {
    const executionId = uuidv4();
    const mode = options.mode || 'manual';
    const startedAt = new Date().toISOString();
    const startTimeMs = Date.now();
    const saveExecution = options.saveExecution !== false;

    // Build and validate graph
    const graph = new WorkflowGraph(workflow);
    const validation = graph.validate();

    if (!validation.valid) {
      const errorMsg = `Workflow validation failed: ${validation.errors.join('; ')}`;
      const failedRecord: ExecutionRecord = {
        id: executionId,
        workflowId: workflow.id,
        workflowName: workflow.name,
        mode,
        status: 'error',
        startedAt,
        finishedAt: new Date().toISOString(),
        duration: Date.now() - startTimeMs,
        errorMessage: errorMsg,
        data: { validationErrors: validation.errors }
      };

      if (saveExecution) {
        this.saveExecutionRecord(failedRecord, []);
      }
      return failedRecord;
    }

    const context = new ExecutionContext(this.credentialsManager);
    context.workflowId = workflow.id;
    context.workflowName = workflow.name;
    context.executionId = executionId;
    context.executionMode = mode;

    const nodeRecords: NodeExecutionRecord[] = [];
    const executedNodeIds = new Set<string>();
    const nodeInputsMap = new Map<string, DataItem[]>();

    // Determine initial trigger / root nodes
    const rootNodes = graph.findTriggerNodes();
    let startNodes: WorkflowNode[] = [];

    if (options.startNodeId) {
      const specific = graph.getNode(options.startNodeId);
      if (specific) startNodes = [specific];
    }

    if (startNodes.length === 0) {
      startNodes = rootNodes.length > 0 ? rootNodes : [workflow.nodes[0]];
    }

    // Seed initial data for start nodes
    for (const startNode of startNodes) {
      if (options.initialData && options.initialData.length > 0) {
        nodeInputsMap.set(startNode.id, options.initialData);
      } else {
        nodeInputsMap.set(startNode.id, []);
      }
    }

    let overallStatus: 'success' | 'error' | 'waiting' | 'cancelled' = 'success';
    let fatalError: string | undefined = undefined;

    // Execution queue supporting dynamic topological flow & loop iterations
    const executionQueue: string[] = [...validation.executionOrder];
    const nodeRunCounts = new Map<string, number>();

    while (executionQueue.length > 0) {
      if (this.cancelledExecutions.has(executionId)) {
        overallStatus = 'cancelled';
        fatalError = 'Execution was cancelled by user request.';
        break;
      }

      const nodeId = executionQueue.shift()!;
      const node = graph.getNode(nodeId);
      if (!node || node.disabled) continue;

      // Check max run count to prevent runaway infinite cycles
      const runCount = (nodeRunCounts.get(node.id) || 0) + 1;
      nodeRunCounts.set(node.id, runCount);
      if (runCount > 500) {
        overallStatus = 'error';
        fatalError = `Execution limit exceeded: Node "${node.name}" reached 500 loop iterations.`;
        break;
      }

      // Check if this node has input data ready (or pinned data)
      const inputItems = nodeInputsMap.get(node.id);
      const isStartNode = startNodes.some((s) => s.id === node.id);

      if (!isStartNode && inputItems === undefined && (!node.pinnedData || node.pinnedData.length === 0)) {
        continue; // Branch was not taken
      }

      // Priority: Pinned Data > Incoming Data > Empty array
      const currentInput = (node.pinnedData && node.pinnedData.length > 0)
        ? node.pinnedData
        : (inputItems || []);

      const nodeRecordId = uuidv4();
      const nodeStartedAt = new Date().toISOString();
      const nodeStartMs = Date.now();

      if (options.onNodeStart) {
        try {
          await options.onNodeStart(node);
        } catch (e) {}
      }

      const nodeDef = this.nodeRegistry.get(node.type);
      if (!nodeDef) {
        const errMsg = `Unknown node type: "${node.type}". It is not registered in AutoFlow.`;
        const nodeRecord: NodeExecutionRecord = {
          id: nodeRecordId,
          executionId,
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type,
          status: 'error',
          inputData: currentInput,
          error: errMsg,
          startedAt: nodeStartedAt,
          finishedAt: new Date().toISOString(),
          duration: Date.now() - nodeStartMs
        };
        nodeRecords.push(nodeRecord);

        if (options.onNodeFinish) {
          try { await options.onNodeFinish(nodeRecord); } catch (e) {}
        }

        if (node.onError !== 'continueRegularOutput' && !node.continueOnFail) {
          overallStatus = 'error';
          fatalError = errMsg;
          break;
        }
        continue;
      }

      // Execute node with retry logic if configured
      let output: NodeOutput | null = null;
      let nodeError: string | null = null;
      const maxTries = node.retryOnFail ? (node.maxTries || 3) : 1;
      const waitMs = (node.waitBetweenTries || 1) * 1000;

      for (let attempt = 1; attempt <= maxTries; attempt++) {
        try {
          const nodeContext = context.createNodeContext(node, currentInput, 0);
          output = await nodeDef.execute(nodeContext);
          nodeError = null;
          break;
        } catch (err: any) {
          nodeError = err.message || String(err);
          if (attempt < maxTries) {
            await new Promise((r) => setTimeout(r, waitMs));
          }
        }
      }

      const nodeDuration = Date.now() - nodeStartMs;
      const nodeFinishedAt = new Date().toISOString();

      if (nodeError) {
        // Evaluate onError policy
        const onErrorPolicy = node.onError || (node.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow');

        if (onErrorPolicy === 'continueErrorOutput') {
          // Route error item exclusively through Port 1 (Error Handle)
          const errorItem: DataItem = {
            json: {
              error: nodeError,
              message: nodeError,
              nodeName: node.name,
              nodeId: node.id,
              timestamp: nodeFinishedAt
            }
          };

          output = [[], [errorItem]];
          context.setNodeOutput(node.name, output);
          context.setNodeOutput(node.id, output);

          const nodeRecord: NodeExecutionRecord = {
            id: nodeRecordId,
            executionId,
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.type,
            status: 'error',
            inputData: currentInput,
            outputData: output,
            error: nodeError,
            startedAt: nodeStartedAt,
            finishedAt: nodeFinishedAt,
            duration: nodeDuration
          };
          nodeRecords.push(nodeRecord);

          if (options.onNodeFinish) {
            try { await options.onNodeFinish(nodeRecord); } catch (e) {}
          }
          executedNodeIds.add(node.id);

          // Forward error item to connections from Port 1
          const edges = graph.getSuccessors(node.id);
          for (const edge of edges) {
            if (edge.sourceOutput === 1) {
              const existing = nodeInputsMap.get(edge.target) || [];
              nodeInputsMap.set(edge.target, [...existing, errorItem]);
              if (!executionQueue.includes(edge.target)) {
                executionQueue.push(edge.target);
              }
            }
          }
          continue;
        } else if (onErrorPolicy === 'continueRegularOutput') {
          const fallbackItem: DataItem = {
            json: {
              error: nodeError,
              status: 'FAILED_CONTINUED',
              node: node.name
            }
          };
          output = [[fallbackItem]];
          context.setNodeOutput(node.name, output);
          context.setNodeOutput(node.id, output);

          const nodeRecord: NodeExecutionRecord = {
            id: nodeRecordId,
            executionId,
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.type,
            status: 'error',
            inputData: currentInput,
            outputData: output,
            error: nodeError,
            startedAt: nodeStartedAt,
            finishedAt: nodeFinishedAt,
            duration: nodeDuration
          };
          nodeRecords.push(nodeRecord);

          if (options.onNodeFinish) {
            try { await options.onNodeFinish(nodeRecord); } catch (e) {}
          }
          executedNodeIds.add(node.id);

          const edges = graph.getSuccessors(node.id);
          for (const edge of edges) {
            if (edge.sourceOutput === 0) {
              const existing = nodeInputsMap.get(edge.target) || [];
              nodeInputsMap.set(edge.target, [...existing, fallbackItem]);
              if (!executionQueue.includes(edge.target)) {
                executionQueue.push(edge.target);
              }
            }
          }
          continue;
        } else {
          // stopWorkflow
          const nodeRecord: NodeExecutionRecord = {
            id: nodeRecordId,
            executionId,
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.type,
            status: 'error',
            inputData: currentInput,
            error: nodeError,
            startedAt: nodeStartedAt,
            finishedAt: nodeFinishedAt,
            duration: nodeDuration
          };
          nodeRecords.push(nodeRecord);

          if (options.onNodeFinish) {
            try { await options.onNodeFinish(nodeRecord); } catch (e) {}
          }

          overallStatus = 'error';
          fatalError = `Node "${node.name}" failed: ${nodeError}`;
          break;
        }
      } else if (output) {
        context.setNodeOutput(node.name, output);
        context.setNodeOutput(node.id, output);

        const nodeRecord: NodeExecutionRecord = {
          id: nodeRecordId,
          executionId,
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type,
          status: 'success',
          inputData: currentInput,
          outputData: output,
          startedAt: nodeStartedAt,
          finishedAt: nodeFinishedAt,
          duration: nodeDuration
        };
        nodeRecords.push(nodeRecord);

        if (options.onNodeFinish) {
          try { await options.onNodeFinish(nodeRecord); } catch (e) {}
        }
        executedNodeIds.add(node.id);

        // Forward outputs to downstream connected nodes
        const edges = graph.getSuccessors(node.id);
        for (const edge of edges) {
          const outIndex = edge.sourceOutput;
          const outputDataForPort = output[outIndex] || [];

          if (outputDataForPort.length > 0) {
            const existing = nodeInputsMap.get(edge.target) || [];
            nodeInputsMap.set(edge.target, [...existing, ...outputDataForPort]);

            // If target node is not already in queue, queue it for execution
            if (!executionQueue.includes(edge.target)) {
              executionQueue.push(edge.target);
            }
          }
        }
      }
    }

    const duration = Date.now() - startTimeMs;
    const finishedAt = new Date().toISOString();

    const record: ExecutionRecord = {
      id: executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      mode,
      status: overallStatus,
      startedAt,
      finishedAt,
      duration,
      errorMessage: fatalError,
      data: {
        nodeCount: workflow.nodes.length,
        executedNodes: Array.from(executedNodeIds),
        nodeResults: nodeRecords.map((nr) => ({
          nodeId: nr.nodeId,
          nodeName: nr.nodeName,
          status: nr.status,
          duration: nr.duration,
          error: nr.error
        }))
      }
    };

    if (saveExecution) {
      this.saveExecutionRecord(record, nodeRecords);
    }

    // Trigger Global Error Workflow if configured and execution crashed
    if (overallStatus === 'error' && workflow.settings?.errorWorkflow) {
      this.triggerErrorWorkflow(workflow.settings.errorWorkflow, {
        execution: { id: executionId, mode, duration },
        workflow: { id: workflow.id, name: workflow.name },
        error: { message: fatalError }
      }).catch(() => {});
    }

    return record;
  }

  private async triggerErrorWorkflow(errorWorkflowId: string, errorPayload: any): Promise<void> {
    const row = this.db.prepare('SELECT * FROM workflows WHERE id = ?').get(errorWorkflowId) as any;
    if (!row) return;

    try {
      const errWf: Workflow = {
        id: row.id,
        name: row.name,
        description: row.description,
        nodes: JSON.parse(row.nodes || '[]'),
        connections: JSON.parse(row.connections || '[]'),
        settings: JSON.parse(row.settings || '{}'),
        active: Boolean(row.active),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      await this.execute(errWf, {
        mode: 'error',
        initialData: [{ json: errorPayload }],
        saveExecution: true
      });
    } catch {}
  }

  private saveExecutionRecord(exec: ExecutionRecord, nodes: NodeExecutionRecord[]): void {
    // Ensure workflow row exists to satisfy foreign key constraint
    const checkWf = this.db.prepare('SELECT id FROM workflows WHERE id = ?').get(exec.workflowId);
    if (!checkWf) {
      const now = new Date().toISOString();
      const insertWf = this.db.prepare(`
        INSERT OR IGNORE INTO workflows (id, name, description, nodes, connections, settings, active, created_at, updated_at)
        VALUES (?, ?, '', '[]', '[]', '{}', 0, ?, ?)
      `);
      insertWf.run(exec.workflowId, exec.workflowName, now, now);
    }

    const execStmt = this.db.prepare(`
      INSERT INTO executions (
        id, workflow_id, workflow_name, mode, status, started_at, finished_at, duration, error_message, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    execStmt.run(
      exec.id,
      exec.workflowId,
      exec.workflowName,
      exec.mode,
      exec.status,
      exec.startedAt,
      exec.finishedAt || null,
      exec.duration || null,
      exec.errorMessage || null,
      exec.data ? JSON.stringify(exec.data) : null
    );

    const nodeStmt = this.db.prepare(`
      INSERT INTO execution_nodes (
        id, execution_id, node_id, node_name, node_type, status, input_data, output_data, error, started_at, finished_at, duration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const node of nodes) {
      nodeStmt.run(
        node.id,
        node.executionId,
        node.nodeId,
        node.nodeName,
        node.nodeType,
        node.status,
        node.inputData ? JSON.stringify(node.inputData) : null,
        node.outputData ? JSON.stringify(node.outputData) : null,
        node.error || null,
        node.startedAt || null,
        node.finishedAt || null,
        node.duration || null
      );
    }
  }

  getExecution(executionId: string): { execution: ExecutionRecord; nodes: NodeExecutionRecord[] } | null {
    const execStmt = this.db.prepare('SELECT * FROM executions WHERE id = ?');
    const row = execStmt.get(executionId) as any;
    if (!row) return null;

    const nodesStmt = this.db.prepare('SELECT * FROM execution_nodes WHERE execution_id = ? ORDER BY started_at ASC');
    const nodeRows = nodesStmt.all(executionId) as any[];

    const execution: ExecutionRecord = {
      id: row.id,
      workflowId: row.workflow_id,
      workflowName: row.workflow_name,
      mode: row.mode,
      status: row.status,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      duration: row.duration,
      errorMessage: row.error_message,
      data: row.data ? JSON.parse(row.data) : undefined
    };

    const nodes: NodeExecutionRecord[] = nodeRows.map((nr) => ({
      id: nr.id,
      executionId: nr.execution_id,
      nodeId: nr.node_id,
      nodeName: nr.node_name,
      nodeType: nr.node_type,
      status: nr.status,
      inputData: nr.input_data ? JSON.parse(nr.input_data) : undefined,
      outputData: nr.output_data ? JSON.parse(nr.output_data) : undefined,
      error: nr.error,
      startedAt: nr.started_at,
      finishedAt: nr.finished_at,
      duration: nr.duration
    }));

    return { execution, nodes };
  }
}
