import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { WorkflowExecutor } from '../../engine/executor';
import { Workflow } from '../../types/workflow';

export function createExecutionRouter(db: DatabaseSync, executor: WorkflowExecutor): Router {
  const router = Router();

  // List executions with optional filtering by workflowId or status
  router.get('/', (req: Request, res: Response) => {
    try {
      const workflowId = req.query.workflowId as string | undefined;
      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      let sql = 'SELECT * FROM executions';
      const conditions: string[] = [];
      const params: any[] = [];

      if (workflowId) {
        conditions.push('workflow_id = ?');
        params.push(workflowId);
      }
      if (status) {
        conditions.push('status = ?');
        params.push(status);
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      sql += ' ORDER BY started_at DESC LIMIT ?';
      params.push(limit);

      const stmt = db.prepare(sql);
      const rows = stmt.all(...params) as any[];

      const executions = rows.map((r) => ({
        id: r.id,
        workflowId: r.workflow_id,
        workflowName: r.workflow_name,
        mode: r.mode,
        status: r.status,
        startedAt: r.started_at,
        finishedAt: r.finished_at,
        duration: r.duration,
        errorMessage: r.error_message,
        data: r.data ? JSON.parse(r.data) : undefined
      }));

      res.json({ success: true, data: executions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get execution by ID with all node results
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const details = executor.getExecution(id);
      if (!details) {
        return res.status(404).json({ success: false, error: 'Execution not found' });
      }
      res.json({ success: true, data: details });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Retry execution
  router.post('/:id/retry', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const details = executor.getExecution(id);
      if (!details) {
        return res.status(404).json({ success: false, error: 'Execution not found' });
      }

      const wfRow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(details.execution.workflowId) as any;
      if (!wfRow) {
        return res.status(404).json({ success: false, error: 'Associated workflow not found' });
      }

      const workflow: Workflow = {
        id: wfRow.id,
        name: wfRow.name,
        description: wfRow.description,
        nodes: JSON.parse(wfRow.nodes || '[]'),
        connections: JSON.parse(wfRow.connections || '[]'),
        settings: JSON.parse(wfRow.settings || '{}'),
        active: Boolean(wfRow.active),
        createdAt: wfRow.created_at,
        updatedAt: wfRow.updated_at
      };

      // Extract initial input from first executed node if available
      const initialData = details.nodes[0]?.inputData || [];

      const retryResult = await executor.execute(workflow, {
        mode: 'manual',
        initialData,
        saveExecution: true
      });

      res.json({
        success: true,
        message: 'Workflow retry initiated successfully',
        data: retryResult
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Cancel execution
  router.post('/:id/cancel', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const cancelled = executor.cancelExecution(id);
      res.json({ success: true, cancelled });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete execution
  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      db.prepare('DELETE FROM execution_nodes WHERE execution_id = ?').run(id);
      const result = db.prepare('DELETE FROM executions WHERE id = ?').run(id);
      res.json({ success: true, deleted: (result as any)?.changes > 0 });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
