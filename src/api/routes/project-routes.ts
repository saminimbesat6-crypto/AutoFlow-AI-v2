import { Router, Request, Response } from 'express';
import { ProjectRepository } from '../../database/repositories/project-repository';
import { WorkflowRepository } from '../../database/repositories/workflow-repository';
import { NodeRegistry } from '../../nodes/registry';
import { getDatabase } from '../../database/connection';
import { createZipBuffer, parseZipBuffer, sanitizeZipPath } from '../../utils/zip';
import { ProjectBundle, ProjectBundleManifest, ImportValidationResult } from '../../types/project';
import { WorkflowAdapter } from '../../engine/adapter';

export function createProjectRouter(
  projectRepo: ProjectRepository,
  workflowRepo: WorkflowRepository
): Router {
  const router = Router();
  const db = getDatabase();

  // List all projects with summaries & health stats
  router.get('/', (req: Request, res: Response) => {
    try {
      const search = req.query.search ? String(req.query.search) : undefined;
      const archived = req.query.archived !== undefined ? req.query.archived === 'true' : false;
      const sortBy = (req.query.sortBy as any) || 'updated_at';
      const sortOrder = (req.query.sortOrder as any) || 'desc';

      const projects = projectRepo.list({ search, archived, sortBy, sortOrder });
      res.json({ success: true, data: projects });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get recent projects and recent workflows
  router.get('/recent', (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const recentProjects = projectRepo.getRecentProjects(limit);
      const recentWorkflows = projectRepo.getRecentWorkflows(undefined, limit);
      res.json({
        success: true,
        data: {
          projects: recentProjects,
          workflows: recentWorkflows
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get overview metrics across projects
  router.get('/metrics/overview', (_req: Request, res: Response) => {
    try {
      const metrics = projectRepo.getOverviewMetrics();
      res.json({ success: true, data: metrics });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create new project
  router.post('/', (req: Request, res: Response) => {
    try {
      const { name, description, labels, settings } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Project name is required' });
      }

      const created = projectRepo.create({
        name: name.trim(),
        description: description?.trim(),
        labels: Array.isArray(labels) ? labels : [],
        settings: typeof settings === 'object' ? settings : {}
      });

      const summary = projectRepo.getSummary(created.id);
      res.status(201).json({ success: true, data: summary || created });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get project by ID along with its workflows
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const project = projectRepo.getSummary(id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const workflows = workflowRepo.list({ projectId: id });
      res.json({
        success: true,
        data: {
          ...project,
          workflows
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update project
  router.put('/:id', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const updated = projectRepo.update(id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      const summary = projectRepo.getSummary(id);
      res.json({ success: true, data: summary || updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Duplicate project
  router.post('/:id/duplicate', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const { name } = req.body;
      const result = projectRepo.duplicate(id, name);
      const summary = projectRepo.getSummary(result.project.id);
      res.status(201).json({
        success: true,
        data: {
          project: summary || result.project,
          workflows: result.workflows
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete or archive project
  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      if (id === 'default') {
        return res.status(400).json({ success: false, error: 'The default project cannot be deleted' });
      }

      const hardDelete = req.query.hard === 'true';
      projectRepo.delete(id, hardDelete);
      res.json({
        success: true,
        message: hardDelete ? 'Project permanently deleted' : 'Project archived'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Export full project bundle (supports JSON and ZIP formats)
  router.get('/:id/export', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const project = projectRepo.getById(id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const workflows = workflowRepo.list({ projectId: id });
      const format = (req.query.format as string) || (req.headers.accept?.includes('zip') ? 'zip' : 'json');

      // Build manifest and gather node types and credential types (WITHOUT secrets)
      const nodeTypesSet = new Set<string>();
      const credentialMap = new Map<string, string>(); // type -> name

      const sanitizedWorkflows = workflows.map((wf) => {
        for (const n of wf.nodes || []) {
          nodeTypesSet.add(n.type);
          if (n.credentials) {
            for (const [cType, cId] of Object.entries(n.credentials)) {
              if (cId && !credentialMap.has(cType)) {
                // Look up credential display name
                try {
                  const credRow = db.prepare('SELECT name, type FROM credentials WHERE id = ?').get(cId) as any;
                  credentialMap.set(cType, credRow?.name || cType);
                } catch {
                  credentialMap.set(cType, cType);
                }
              }
            }
          }
        }

        return {
          id: wf.id,
          name: wf.name,
          description: wf.description,
          active: wf.active,
          nodes: wf.nodes,
          connections: wf.connections,
          settings: wf.settings,
          folderId: wf.folderId,
          tags: wf.tags
        };
      });

      const manifest: ProjectBundleManifest = {
        schemaVersion: '2.0',
        exportedAt: new Date().toISOString(),
        generator: 'AutoFlow AI v2.0',
        project: {
          name: project.name,
          description: project.description,
          labels: project.labels,
          settings: project.settings
        },
        totalWorkflows: sanitizedWorkflows.length,
        requiredCredentials: Array.from(credentialMap.entries()).map(([type, name]) => ({ type, name })),
        nodeTypesUsed: Array.from(nodeTypesSet)
      };

      const bundle: ProjectBundle = {
        manifest,
        project: {
          name: project.name,
          description: project.description,
          labels: project.labels,
          settings: project.settings
        },
        workflows: sanitizedWorkflows
      };

      const safeBaseName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

      if (format === 'zip') {
        // Build ZIP containing manifest.json, project.json, and workflows/*.json
        const zipFiles: Array<{ name: string; content: string | Buffer }> = [
          { name: 'manifest.json', content: JSON.stringify(manifest, null, 2) },
          { name: 'project.json', content: JSON.stringify(project, null, 2) },
          { name: 'bundle.json', content: JSON.stringify(bundle, null, 2) }
        ];

        for (const wf of sanitizedWorkflows) {
          const safeWfName = wf.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
          zipFiles.push({
            name: `workflows/${safeWfName}_${wf.id.slice(0, 8)}.json`,
            content: JSON.stringify(wf, null, 2)
          });
        }

        const zipBuffer = createZipBuffer(zipFiles);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${safeBaseName}_bundle.zip"`);
        return res.send(zipBuffer);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${safeBaseName}_bundle.json"`);
        return res.json(bundle);
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Helper to validate and extract workflows from a raw payload or zip buffer
  function parseAndValidateBundle(
    rawBody: any,
    isZip: boolean
  ): {
    projectMeta?: { name?: string; description?: string; labels?: string[]; settings?: any };
    workflows: any[];
    validation: ImportValidationResult;
  } {
    const registry = NodeRegistry.getInstance();
    let workflows: any[] = [];
    let projectMeta: any = null;

    if (isZip) {
      const buffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
      const entries = parseZipBuffer(buffer);

      const manifestEntry = entries.find((e) => e.name === 'manifest.json');
      const projectEntry = entries.find((e) => e.name === 'project.json');
      const bundleEntry = entries.find((e) => e.name === 'bundle.json');

      if (projectEntry) {
        try { projectMeta = projectEntry.json(); } catch {}
      }

      if (bundleEntry) {
        try {
          const b = bundleEntry.json<ProjectBundle>();
          if (b.workflows && Array.isArray(b.workflows)) {
            workflows = b.workflows;
          }
          if (!projectMeta && b.project) {
            projectMeta = b.project;
          }
        } catch {}
      }

      if (workflows.length === 0) {
        // Collect from workflows/ folder
        const wfEntries = entries.filter((e) => e.name.startsWith('workflows/') && e.name.endsWith('.json'));
        for (const wfe of wfEntries) {
          try {
            workflows.push(wfe.json());
          } catch {}
        }
      }
    } else {
      // JSON payload
      if (rawBody.manifest && rawBody.workflows) {
        // Full bundle
        workflows = rawBody.workflows;
        projectMeta = rawBody.project;
      } else if (Array.isArray(rawBody)) {
        // Array of workflows
        workflows = rawBody;
      } else if (rawBody.nodes && rawBody.connections) {
        // Single workflow
        workflows = [rawBody];
      } else if (rawBody.workflow) {
        workflows = [rawBody.workflow];
      }
    }

    // Validation
    const warnings: string[] = [];
    const unsupportedNodes = new Set<string>();
    const missingCredsMap = new Map<string, string>();

    // Query existing credential types in DB
    const existingCreds = (db.prepare('SELECT type, name FROM credentials').all() as any[]);
    const existingCredTypes = new Set(existingCreds.map((c) => c.type));

    for (const wf of workflows) {
      // Check n8n format adapter
      if (wf.nodes && wf.connections && typeof wf.connections === 'object' && !Array.isArray(wf.connections)) {
        const adapted = WorkflowAdapter.fromN8n(wf);
        wf.nodes = adapted.nodes;
        wf.connections = adapted.connections;
      }

      for (const node of wf.nodes || []) {
        if (!registry.has(node.type)) {
          unsupportedNodes.add(node.type);
        }
        if (node.credentials) {
          for (const [cType] of Object.entries(node.credentials)) {
            if (!existingCredTypes.has(cType)) {
              missingCredsMap.set(cType, cType);
            }
          }
        }
      }
    }

    if (unsupportedNodes.size > 0) {
      warnings.push(`The imported workflow contains unsupported node types: ${Array.from(unsupportedNodes).join(', ')}`);
    }

    if (missingCredsMap.size > 0) {
      warnings.push(
        `Credentials required for: ${Array.from(missingCredsMap.keys()).join(', ')}. Please configure them in the Credentials tab.`
      );
    }

    return {
      projectMeta,
      workflows,
      validation: {
        valid: workflows.length > 0,
        missingCredentials: Array.from(missingCredsMap.entries()).map(([type, name]) => ({ type, name })),
        unsupportedNodes: Array.from(unsupportedNodes),
        workflowCount: workflows.length,
        warnings
      }
    };
  }

  // Import workflows or bundle into an EXISTING project
  router.post('/:id/import', (req: Request, res: Response) => {
    try {
      const projectId = String(req.params.id);
      const project = projectRepo.getById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const isZip = req.headers['content-type']?.includes('zip') || Buffer.isBuffer(req.body);
      const { workflows, validation } = parseAndValidateBundle(req.body, isZip);

      if (!validation.valid || workflows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid workflows found in import payload',
          validation
        });
      }

      const importedWorkflows = [];
      for (const wf of workflows) {
        const created = workflowRepo.create({
          name: wf.name || 'Imported Workflow',
          description: wf.description,
          projectId,
          nodes: wf.nodes || [],
          connections: wf.connections || [],
          settings: wf.settings || {},
          tags: wf.tags || [],
          active: false
        });
        importedWorkflows.push(created);
      }

      res.status(201).json({
        success: true,
        data: {
          importedCount: importedWorkflows.length,
          workflows: importedWorkflows,
          validation
        }
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: `Import failed: ${err.message}` });
    }
  });

  // Import a full bundle as a NEW project
  router.post('/import-bundle', (req: Request, res: Response) => {
    try {
      const isZip = req.headers['content-type']?.includes('zip') || Buffer.isBuffer(req.body);
      const { projectMeta, workflows, validation } = parseAndValidateBundle(req.body, isZip);

      if (!validation.valid || workflows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid workflows found in bundle',
          validation
        });
      }

      // Create new project
      const projectName = projectMeta?.name ? `Imported: ${projectMeta.name}` : `Imported Project (${new Date().toLocaleDateString()})`;
      const createdProject = projectRepo.create({
        name: projectName,
        description: projectMeta?.description || 'Imported automation project bundle',
        labels: projectMeta?.labels || ['imported'],
        settings: projectMeta?.settings || {}
      });

      const importedWorkflows = [];
      for (const wf of workflows) {
        const created = workflowRepo.create({
          name: wf.name || 'Imported Workflow',
          description: wf.description,
          projectId: createdProject.id,
          nodes: wf.nodes || [],
          connections: wf.connections || [],
          settings: wf.settings || {},
          tags: wf.tags || [],
          active: false
        });
        importedWorkflows.push(created);
      }

      const summary = projectRepo.getSummary(createdProject.id);

      res.status(201).json({
        success: true,
        data: {
          project: summary || createdProject,
          importedCount: importedWorkflows.length,
          workflows: importedWorkflows,
          validation
        }
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: `Bundle import failed: ${err.message}` });
    }
  });

  return router;
}
