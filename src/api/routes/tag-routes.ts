import { Router, Request, Response } from 'express';
import { TagRepository } from '../../database/repositories/tag-repository';

export function createTagRouter(tagRepo: TagRepository): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    try {
      const tags = tagRepo.list();
      res.json({ success: true, data: tags });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/', (req: Request, res: Response) => {
    try {
      const { name, color } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Tag name is required' });
      }
      const existing = tagRepo.getByName(name.trim());
      if (existing) {
        return res.status(409).json({ success: false, error: `Tag "${name.trim()}" already exists` });
      }
      const created = tagRepo.create({ name: name.trim(), color });
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      const tag = tagRepo.getById(String(req.params.id));
      if (!tag) {
        return res.status(404).json({ success: false, error: 'Tag not found' });
      }
      res.json({ success: true, data: tag });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/:id', (req: Request, res: Response) => {
    try {
      const updated = tagRepo.update(String(req.params.id), req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Tag not found' });
      }
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/:id', (req: Request, res: Response) => {
    try {
      tagRepo.delete(String(req.params.id));
      res.json({ success: true, message: 'Tag deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
