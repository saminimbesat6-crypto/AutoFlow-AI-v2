import { Router, Request, Response } from 'express';
import { WorkflowRepository } from '../../database/repositories/workflow-repository';
import { WorkflowVersionRepository } from '../../database/repositories/workflow-version-repository';
import { TagRepository } from '../../database/repositories/tag-repository';
import { WorkflowExecutor } from '../../engine/executor';
import { WebhookManager } from '../../webhooks/manager';
import { SchedulerManager } from '../../scheduler/manager';
import { WorkflowAdapter } from '../../engine/adapter';

export function createWorkflowRouter(
  repo: WorkflowRepository,
  executor: WorkflowExecutor,
  webhookManager: WebhookManager,
  schedulerManager: SchedulerManager
): Router {
  const router = Router();
  const versionRepo = new WorkflowVersionRepository();
  const tagRepo = new TagRepository();

  // List all workflows (with optional tag and folder filters)
  router.get('/', (req: Request, res: Response) => {
    try {
      const folderId = req.query.folderId ? String(req.query.folderId) : undefined;
      const tagId = req.query.tag ? String(req.query.tag) : undefined;
      const workflows = repo.list({ folderId, tagId });
      res.json({ success: true, data: workflows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create new workflow
  router.post('/', (req: Request, res: Response) => {
    try {
      const { name, description, nodes, connections, settings, active } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: 'Workflow name is required' });
      }

      const created = repo.create({
        name,
        description,
        nodes: nodes || [],
        connections: connections || [],
        settings: settings || {},
        active: Boolean(active)
      });

      if (created.active) {
        webhookManager.registerWorkflowWebhooks(created);
        schedulerManager.registerWorkflowSchedules(created);
      }

      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get workflow by ID
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const workflow = repo.getById(id);
      if (!workflow) {
        return res.status(404).json({ success: false, error: 'Workflow not found' });
      }
      res.json({ success: true, data: workflow });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update workflow
  router.put('/:id', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const updated = repo.update(id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Workflow not found' });
      }

      webhookManager.registerWorkflowWebhooks(updated);
      schedulerManager.registerWorkflowSchedules(updated);

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete workflow
  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      webhookManager.unregisterWorkflowWebhooks(id);
      schedulerManager.unregisterWorkflowSchedules(id);
      repo.delete(id);
      res.json({ success: true, message: 'Workflow deleted' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Manually execute workflow
  router.post('/:id/execute', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const workflow = repo.getById(id);
      if (!workflow) {
        return res.status(404).json({ success: false, error: 'Workflow not found' });
      }

      const { startNodeId, initialData } = req.body;
      const execution = await executor.execute(workflow, {
        mode: 'manual',
        startNodeId,
        initialData
      });

      // Retrieve full execution record with per-node results
      const details = executor.getExecution(execution.id);
      res.json({ success: true, data: details });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Real-time streaming workflow execution (Server-Sent Events)
  router.get('/:id/execute-stream', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const workflow = repo.getById(id);
      if (!workflow) {
        return res.status(404).json({ success: false, error: 'Workflow not found' });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      res.write(`data: ${JSON.stringify({ type: 'start', workflowId: workflow.id, workflowName: workflow.name })}\n\n`);

      const execution = await executor.execute(workflow, {
        mode: 'manual',
        onNodeStart: async (node) => {
          res.write(`data: ${JSON.stringify({ type: 'node_start', nodeId: node.id, nodeName: node.name, nodeType: node.type })}\n\n`);
        },
        onNodeFinish: async (nodeRecord) => {
          res.write(`data: ${JSON.stringify({ type: 'node_finish', record: nodeRecord })}\n\n`);
        }
      });

      const details = executor.getExecution(execution.id);
      res.write(`data: ${JSON.stringify({ type: 'complete', execution: details })}\n\n`);
      res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  });

  // Toggle active state
  router.post('/:id/activate', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const workflow = repo.getById(id);
      if (!workflow) {
        return res.status(404).json({ success: false, error: 'Workflow not found' });
      }

      const updated = repo.update(id, { active: !workflow.active });
      if (updated) {
        if (updated.active) {
          webhookManager.registerWorkflowWebhooks(updated);
          schedulerManager.registerWorkflowSchedules(updated);
        } else {
          webhookManager.unregisterWorkflowWebhooks(updated.id);
          schedulerManager.unregisterWorkflowSchedules(updated.id);
        }
      }
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Import workflow (AutoFlow or n8n format)
  router.post('/import', (req: Request, res: Response) => {
    try {
      const payload = req.body;
      let workflowToCreate: any;

      if (payload.nodes && payload.connections && typeof payload.connections === 'object' && !Array.isArray(payload.connections)) {
        // n8n format
        workflowToCreate = WorkflowAdapter.fromN8n(payload);
      } else {
        // AutoFlow format
        workflowToCreate = payload;
      }

      const created = repo.create({
        name: workflowToCreate.name || 'Imported Workflow',
        description: workflowToCreate.description,
        nodes: workflowToCreate.nodes || [],
        connections: workflowToCreate.connections || [],
        settings: workflowToCreate.settings || {},
        active: false
      });

      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: `Import failed: ${err.message}` });
    }
  });

  // Export workflow
  router.get('/:id/export', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const workflow = repo.getById(id);
      if (!workflow) {
        return res.status(404).json({ success: false, error: 'Workflow not found' });
      }

      const format = req.query.format === 'n8n' ? 'n8n' : 'autoflow';
      if (format === 'n8n') {
        const n8nJson = WorkflowAdapter.toN8n(workflow);
        res.setHeader('Content-Disposition', `attachment; filename="${workflow.name}.n8n.json"`);
        res.json(n8nJson);
      } else {
        res.setHeader('Content-Disposition', `attachment; filename="${workflow.name}.autoflow.json"`);
        res.json(workflow);
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Pin data on a specific node for rapid canvas iteration
  router.post('/:id/nodes/:nodeId/pin', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const nodeId = String(req.params.nodeId);
      const { pinnedData } = req.body;
      const workflow = repo.getById(id);
      if (!workflow) {
        return res.status(404).json({ success: false, error: 'Workflow not found' });
      }
      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node) {
        return res.status(404).json({ success: false, error: 'Node not found in workflow' });
      }
      node.pinnedData = Array.isArray(pinnedData) ? pinnedData : [{ json: pinnedData || {} }];
      repo.update(id, workflow);
      res.json({
        success: true,
        message: `Data successfully pinned to node "${node.name}"`,
        pinnedData: node.pinnedData
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Unpin data from a specific node
  router.post('/:id/nodes/:nodeId/unpin', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const nodeId = String(req.params.nodeId);
      const workflow = repo.getById(id);
      if (!workflow) {
        return res.status(404).json({ success: false, error: 'Workflow not found' });
      }
      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node) {
        return res.status(404).json({ success: false, error: 'Node not found in workflow' });
      }
      delete node.pinnedData;
      repo.update(id, workflow);
      res.json({ success: true, message: `Data unpinned from node "${node.name}"` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Execute single step / node in isolation using inputData or pinnedData
  router.post('/:id/nodes/:nodeId/execute-step', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const nodeId = String(req.params.nodeId);
      const workflow = repo.getById(id);
      if (!workflow) {
        return res.status(404).json({ success: false, error: 'Workflow not found' });
      }
      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node) {
        return res.status(404).json({ success: false, error: 'Node not found in workflow' });
      }

      // Priority: request body inputData > node.pinnedData > [{ json: {} }]
      let inputData = req.body?.inputData;
      if (!inputData || inputData.length === 0) {
        inputData = node.pinnedData || [{ json: {} }];
      }

      const { NodeRegistry } = require('../../nodes/registry');
      const { ExecutionContext } = require('../../engine/context');
      const registry = NodeRegistry.getInstance();
      const nodeDef = registry.get(node.type);
      if (!nodeDef) {
        return res.status(400).json({ success: false, error: `Unknown node type: ${node.type}` });
      }

      const execContext = new ExecutionContext();
      const nodeContext = execContext.createNodeContext(node, inputData, 0);

      const start = Date.now();
      const output = await nodeDef.execute(nodeContext);
      const duration = Date.now() - start;

      res.json({
        success: true,
        nodeId: node.id,
        nodeName: node.name,
        inputData,
        outputData: output,
        duration
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reset static deduplication data for a node
  router.post('/:id/nodes/:nodeId/reset-static-data', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const nodeId = String(req.params.nodeId);
      const { StaticDataManager } = require('../../engine/static-data-manager');
      const staticDataManager = new StaticDataManager();
      staticDataManager.clearStaticData(id, nodeId);
      res.json({ success: true, message: `Static data reset for node ${nodeId}` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Listen for test webhook event (n8n parity)
  router.post('/:id/webhook-test/listen', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const { nodeId, path: webhookPath, method = 'POST', timeoutMs = 120000 } = req.body;
      const workflow = repo.getById(id);
      if (!workflow) {
        return res.status(404).json({ success: false, error: 'Workflow not found' });
      }

      const result = await webhookManager.registerTestListener(id, nodeId, webhookPath, method, timeoutMs);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Cancel test webhook listener
  router.post('/:id/webhook-test/cancel', (req: Request, res: Response) => {
    try {
      const { path: webhookPath, method = 'POST' } = req.body;
      webhookManager.cancelTestListener(webhookPath, method);
      res.json({ success: true, message: 'Test listener cancelled' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Workflow Version History & Rollback Routes ---

  // List all versions of a workflow
  router.get('/:id/versions', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const versions = versionRepo.list(id);
      res.json({ success: true, data: versions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get a specific version snapshot
  router.get('/:id/versions/:versionId', (req: Request, res: Response) => {
    try {
      const versionId = String(req.params.versionId);
      const version = versionRepo.getById(versionId);
      if (!version) {
        return res.status(404).json({ success: false, error: 'Version not found' });
      }
      res.json({ success: true, data: version });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Diff a version against current workflow (or another version)
  router.get('/:id/versions/:versionId/diff', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const versionId = String(req.params.versionId);
      const targetVersion = versionRepo.getById(versionId);
      if (!targetVersion) {
        return res.status(404).json({ success: false, error: 'Target version not found' });
      }

      const compareWithId = req.query.compareWith ? String(req.query.compareWith) : null;
      let baseVersion: any = null;

      if (compareWithId) {
        baseVersion = versionRepo.getById(compareWithId);
        if (!baseVersion) {
          return res.status(404).json({ success: false, error: 'Comparison base version not found' });
        }
      } else {
        const current = repo.getById(id);
        if (!current) {
          return res.status(404).json({ success: false, error: 'Current workflow not found' });
        }
        baseVersion = {
          id: 'current',
          workflowId: id,
          versionNum: 0,
          name: current.name,
          nodes: current.nodes,
          connections: current.connections,
          settings: current.settings,
          createdAt: current.updatedAt
        };
      }

      const diffResult = versionRepo.diff(targetVersion, baseVersion);
      res.json({ success: true, data: diffResult });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Rollback/Restore workflow to a specific version
  router.post('/:id/versions/:versionId/restore', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const versionId = String(req.params.versionId);
      const version = versionRepo.getById(versionId);
      if (!version) {
        return res.status(404).json({ success: false, error: 'Version not found' });
      }

      // Restore workflow graph from version
      const restored = repo.update(id, {
        name: version.name,
        nodes: version.nodes,
        connections: version.connections,
        settings: version.settings,
        changeDescription: `Restored to version ${version.versionNum} (${version.id})`
      });

      if (restored?.active) {
        webhookManager.registerWorkflowWebhooks(restored);
        schedulerManager.registerWorkflowSchedules(restored);
      }

      res.json({
        success: true,
        message: `Successfully rolled back workflow to version ${version.versionNum}`,
        data: restored
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Manually create a version snapshot
  router.post('/:id/versions', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const workflow = repo.getById(id);
      if (!workflow) {
        return res.status(404).json({ success: false, error: 'Workflow not found' });
      }

      const { description } = req.body;
      const created = versionRepo.create({
        workflowId: id,
        name: workflow.name,
        description: description || 'Manual snapshot',
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings
      });

      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Workflow Tags Mapping Routes ---

  // Get tags for a workflow
  router.get('/:id/tags', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const tags = tagRepo.getWorkflowTags(id);
      res.json({ success: true, data: tags });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Set tags for a workflow
  router.post('/:id/tags', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const { tagIds } = req.body;
      if (!Array.isArray(tagIds)) {
        return res.status(400).json({ success: false, error: 'tagIds must be an array' });
      }
      tagRepo.setWorkflowTags(id, tagIds);
      const tags = tagRepo.getWorkflowTags(id);
      res.json({ success: true, data: tags });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
