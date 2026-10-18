import { Router, Request, Response } from 'express';
import { ExecutionQueueManager } from '../../scaling/queue-manager';

export function createQueueRouter(queueManager: ExecutionQueueManager): Router {
  const router = Router();

  // GET queue status & throughput metrics
  router.get('/status', (_req: Request, res: Response) => {
    try {
      const stats = queueManager.getStats();
      res.json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST enqueue workflow for asynchronous execution
  router.post('/enqueue', async (req: Request, res: Response) => {
    try {
      const { workflowId, initialData, priority, mode } = req.body;
      if (!workflowId) {
        return res.status(400).json({ success: false, error: 'workflowId is required.' });
      }

      const job = await queueManager.enqueue(workflowId, {
        initialData,
        priority: Number(priority || 0),
        mode: mode || 'manual'
      });

      res.status(202).json({
        success: true,
        message: 'Workflow execution successfully queued for worker processing',
        job
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST set concurrency limit
  router.post('/concurrency', (req: Request, res: Response) => {
    try {
      const concurrency = parseInt(req.body.concurrency, 10);
      if (isNaN(concurrency) || concurrency <= 0) {
        return res.status(400).json({ success: false, error: 'concurrency must be a positive integer.' });
      }

      queueManager.setConcurrency(concurrency);
      res.json({
        success: true,
        message: `Worker concurrency updated to ${concurrency}`,
        data: queueManager.getStats()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST pause or resume queue
  router.post('/pause', (req: Request, res: Response) => {
    try {
      const pause = req.body.paused !== false;
      if (pause) {
        queueManager.pause();
      } else {
        queueManager.resume();
      }
      res.json({
        success: true,
        message: `Execution queue is now ${pause ? 'PAUSED' : 'ACTIVE'}`,
        data: queueManager.getStats()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST clear waiting queue
  router.post('/clear', (_req: Request, res: Response) => {
    try {
      const cleared = queueManager.clearWaitingQueue();
      res.json({
        success: true,
        message: `Cleared ${cleared} waiting jobs from execution queue`,
        data: queueManager.getStats()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
