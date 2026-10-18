import { Router, Request, Response } from 'express';
import { NodeRegistry } from '../../nodes/registry';
import { CustomNodeLoader } from '../../nodes/custom-loader';

export function createNodeTypeRouter(): Router {
  const router = Router();
  const registry = NodeRegistry.getInstance();
  const customLoader = CustomNodeLoader.getInstance();

  // GET all registered node definitions (builtin + custom)
  router.get('/', (_req: Request, res: Response) => {
    try {
      const nodeTypes = registry.list();
      res.json({ success: true, count: nodeTypes.length, data: nodeTypes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET custom nodes info
  router.get('/custom', (_req: Request, res: Response) => {
    try {
      const customNodes = customLoader.listCustomNodes();
      res.json({
        success: true,
        directory: customLoader.getCustomNodesDirectory(),
        count: customNodes.length,
        data: customNodes
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST reload custom nodes dynamically
  router.post('/custom/reload', async (_req: Request, res: Response) => {
    try {
      const result = await customLoader.loadAll();
      res.json({
        success: true,
        message: `Reloaded custom nodes. Loaded: ${result.loaded}, Failed: ${result.failed}`,
        data: result
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST install / upload custom node code
  router.post('/custom/install', async (req: Request, res: Response) => {
    try {
      const { fileName, codeContent } = req.body;
      if (!fileName || !codeContent) {
        return res.status(400).json({ success: false, error: 'fileName and codeContent are required.' });
      }

      const installed = await customLoader.installNode(fileName, codeContent);
      res.json({
        success: true,
        message: `Custom node "${installed.name}" (${installed.type}) successfully installed and registered.`,
        data: installed
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
