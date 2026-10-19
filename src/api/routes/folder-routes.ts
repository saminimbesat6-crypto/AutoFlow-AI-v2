import { Router, Request, Response } from 'express';
import { FolderRepository } from '../../database/repositories/folder-repository';

export function createFolderRouter(folderRepo: FolderRepository): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    try {
      const folders = folderRepo.list();
      res.json({ success: true, data: folders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/', (req: Request, res: Response) => {
    try {
      const { name, parentId } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Folder name is required' });
      }
      const created = folderRepo.create({ name: name.trim(), parentId });
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      const folder = folderRepo.getById(String(req.params.id));
      if (!folder) {
        return res.status(404).json({ success: false, error: 'Folder not found' });
      }
      res.json({ success: true, data: folder });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/:id', (req: Request, res: Response) => {
    try {
      const updated = folderRepo.update(String(req.params.id), req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Folder not found' });
      }
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/:id', (req: Request, res: Response) => {
    try {
      folderRepo.delete(String(req.params.id));
      res.json({ success: true, message: 'Folder deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
