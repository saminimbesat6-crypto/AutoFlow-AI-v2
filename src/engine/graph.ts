import { Connection, Workflow, WorkflowNode } from '../types/workflow';

export interface GraphValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  executionOrder: string[]; // List of node IDs in topological execution order
}

export class WorkflowGraph {
  private workflow: Workflow;
  private nodeMap: Map<string, WorkflowNode> = new Map();
  private nameToId: Map<string, string> = new Map();
  private idToName: Map<string, string> = new Map();
  private adjacency: Map<string, Array<{ target: string; sourceOutput: number; targetInput: number }>> = new Map();
  private inDegree: Map<string, number> = new Map();
  private predecessors: Map<string, Set<string>> = new Map();

  constructor(workflow: Workflow) {
    this.workflow = workflow;
    this.buildGraph();
  }

  private buildGraph(): void {
    for (const node of this.workflow.nodes) {
      this.nodeMap.set(node.id, node);
      this.nameToId.set(node.name, node.id);
      this.idToName.set(node.id, node.name);
      this.adjacency.set(node.id, []);
      this.inDegree.set(node.id, 0);
      this.predecessors.set(node.id, new Set());
    }

    for (const conn of this.workflow.connections) {
      // Resolve source and target to node ID
      const sourceId = this.nameToId.get(conn.source) || (this.nodeMap.has(conn.source) ? conn.source : null);
      const targetId = this.nameToId.get(conn.target) || (this.nodeMap.has(conn.target) ? conn.target : null);

      if (sourceId && targetId && sourceId !== targetId) {
        this.adjacency.get(sourceId)?.push({
          target: targetId,
          sourceOutput: conn.sourceOutput ?? 0,
          targetInput: conn.targetInput ?? 0
        });

        const currentIn = this.inDegree.get(targetId) || 0;
        this.inDegree.set(targetId, currentIn + 1);
        this.predecessors.get(targetId)?.add(sourceId);
      }
    }
  }

  getNode(nameOrId: string): WorkflowNode | undefined {
    return this.nodeMap.get(nameOrId) || this.nodeMap.get(this.nameToId.get(nameOrId) || '');
  }

  getPredecessors(nodeId: string): string[] {
    const preds = this.predecessors.get(nodeId);
    return preds ? Array.from(preds) : [];
  }

  getSuccessors(nodeId: string): Array<{ target: string; sourceOutput: number; targetInput: number }> {
    return this.adjacency.get(nodeId) || [];
  }

  getOutgoingConnectionsForPort(nodeId: string, outputIndex: number): string[] {
    const edges = this.adjacency.get(nodeId) || [];
    return edges
      .filter((e) => e.sourceOutput === outputIndex)
      .map((e) => e.target);
  }

  findTriggerNodes(): WorkflowNode[] {
    return this.workflow.nodes.filter((node) => {
      if (node.type === 'sticky-note') return false;
      const isTriggerType = node.type.includes('trigger') ||
        node.type === 'manual-trigger' ||
        node.type === 'webhook-trigger' ||
        node.type === 'schedule-trigger' ||
        node.type === 'email-trigger' ||
        node.type === 'error-trigger';
      const hasZeroInDegree = (this.inDegree.get(node.id) || 0) === 0;
      return isTriggerType || hasZeroInDegree;
    });
  }

  validate(): GraphValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.workflow.nodes || this.workflow.nodes.length === 0) {
      errors.push('Workflow has no nodes.');
      return { valid: false, errors, warnings, executionOrder: [] };
    }

    // Check for duplicate node names
    const names = new Set<string>();
    for (const node of this.workflow.nodes) {
      if (names.has(node.name)) {
        errors.push(`Duplicate node name: "${node.name}". Node names must be unique.`);
      }
      names.add(node.name);
    }

    // Compute forward in-degree, excluding authorized feedback edges to Loop nodes
    const forwardInDegree = new Map<string, number>();
    for (const node of this.workflow.nodes) {
      forwardInDegree.set(node.id, 0);
    }

    for (const [sourceId, edges] of this.adjacency.entries()) {
      for (const edge of edges) {
        const targetNode = this.nodeMap.get(edge.target);
        const isLoopNode = targetNode && (targetNode.type === 'loop' || targetNode.type === 'split-in-batches');
        // Allow feedback edge from downstream loop body back into loop node
        if (isLoopNode && sourceId !== edge.target) {
          // Check if this source has the loop node in its ancestors
          const isFeedback = this.isAncestor(edge.target, sourceId);
          if (isFeedback) {
            continue; // Exclude loopback edge from forward DAG ordering
          }
        }
        forwardInDegree.set(edge.target, (forwardInDegree.get(edge.target) || 0) + 1);
      }
    }

    // Kahn's algorithm for forward topological sort
    const queue: string[] = [];
    for (const [nodeId, degree] of forwardInDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    const executionOrder: string[] = [];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      executionOrder.push(curr);

      const edges = this.adjacency.get(curr) || [];
      for (const edge of edges) {
        const targetNode = this.nodeMap.get(edge.target);
        const isLoopFeedback = targetNode && (targetNode.type === 'loop' || targetNode.type === 'split-in-batches') && this.isAncestor(edge.target, curr);
        if (isLoopFeedback) continue;

        const nextIn = (forwardInDegree.get(edge.target) || 0) - 1;
        forwardInDegree.set(edge.target, nextIn);
        if (nextIn === 0) {
          queue.push(edge.target);
        }
      }
    }

    if (executionOrder.length < this.workflow.nodes.length) {
      errors.push('Workflow graph contains a cycle (loop). Circular dependencies are not allowed without an explicit Loop node.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      executionOrder
    };
  }

  private isAncestor(ancestorId: string, currentId: string, visited: Set<string> = new Set()): boolean {
    if (ancestorId === currentId) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);

    const preds = this.predecessors.get(currentId);
    if (!preds) return false;

    for (const pred of preds) {
      if (pred === ancestorId || this.isAncestor(ancestorId, pred, visited)) {
        return true;
      }
    }
    return false;
  }
}
