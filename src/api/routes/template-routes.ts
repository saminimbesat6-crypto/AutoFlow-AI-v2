import { Router, Request, Response } from 'express';
import { WORKFLOW_TEMPLATES } from '../../templates/catalog';
import { WorkflowRepository } from '../../database/repositories/workflow-repository';

export function createTemplateRoutes(workflowRepo: WorkflowRepository): Router {
  const router = Router();

  // List all templates
  router.get('/', (req: Request, res: Response) => {
    try {
      const category = req.query.category as string;
      let templates = WORKFLOW_TEMPLATES;

      if (category && category !== 'all') {
        templates = templates.filter((t) => t.category === category);
      }

      res.json({
        success: true,
        data: templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          icon: t.icon,
          nodeCount: t.workflow.nodes.length,
          connectionCount: t.workflow.connections.length,
          nodes: t.workflow.nodes.map((n) => ({ name: n.name, type: n.type }))
        }))
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get specific template details
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const template = WORKFLOW_TEMPLATES.find((t) => t.id === req.params.id);
      if (!template) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      res.json({ success: true, data: template });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Instantiate template into a new saved workflow
  router.post('/:id/clone', (req: Request, res: Response) => {
    try {
      const template = WORKFLOW_TEMPLATES.find((t) => t.id === req.params.id);
      if (!template) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      const created = workflowRepo.create({
        name: template.workflow.name,
        description: template.workflow.description,
        nodes: template.workflow.nodes,
        connections: template.workflow.connections,
        settings: template.workflow.settings || {},
        active: false
      });

      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
