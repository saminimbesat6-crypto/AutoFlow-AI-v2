import * as path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import { getDatabase, closeDatabase } from './database/connection';
import { runMigrations } from './database/migrations';
import { WorkflowRepository } from './database/repositories/workflow-repository';
import { WorkflowExecutor } from './engine/executor';
import { WebhookManager } from './webhooks/manager';
import { SchedulerManager } from './scheduler/manager';
import { CredentialsManager } from './credentials/manager';

import { createWorkflowRouter } from './api/routes/workflow-routes';
import { createExecutionRouter } from './api/routes/execution-routes';
import { createCredentialRouter } from './api/routes/credential-routes';
import { createNodeTypeRouter } from './api/routes/node-type-routes';
import { createAiAssistantRouter } from './api/routes/ai-assistant-routes';
import { createTemplateRoutes } from './api/routes/template-routes';
import { ExecutionQueueManager } from './scaling/queue-manager';
import { createQueueRouter } from './api/routes/queue-routes';
import { TagRepository } from './database/repositories/tag-repository';
import { FolderRepository } from './database/repositories/folder-repository';
import { ProjectRepository } from './database/repositories/project-repository';
import { createTagRouter } from './api/routes/tag-routes';
import { createFolderRouter } from './api/routes/folder-routes';
import { createProjectRouter } from './api/routes/project-routes';

export function createApp() {
  const app = express();

  // Security: Origin and Host Validation
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((o) => o.trim())
    : ['http://localhost:3456', 'http://127.0.0.1:3456'];

  const isLocalOrPrivate = (hostname: string) => {
    if (!hostname) return true;
    const clean = hostname.split(':')[0].toLowerCase();
    if (clean === 'localhost' || clean === '127.0.0.1' || clean === '0.0.0.0' || clean === '::1') return true;
    if (clean.endsWith('.local') || clean.endsWith('.localhost')) return true;
    // Private IPv4 ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x, 100.x.x.x CGNAT/Tailscale/Mobile)
    if (/^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|100\.\d+\.\d+\.\d+)$/.test(clean)) return true;
    return false;
  };

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server) or in allowed list
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      try {
        const parsed = new URL(origin);
        if (isLocalOrPrivate(parsed.hostname)) {
          return callback(null, true);
        }
      } catch {}
      return callback(null, false);
    },
    credentials: true
  }));

  // Host header validation to mitigate DNS rebinding while allowing private LAN/local access
  app.use((req: Request, res: Response, next: NextFunction) => {
    const host = (req.headers.host || '').split(':')[0].toLowerCase();
    const allowedHostsEnv = process.env.ALLOWED_HOSTS;
    if (allowedHostsEnv) {
      const allowedHosts = allowedHostsEnv.split(',').map((h) => h.trim().toLowerCase());
      if (allowedHosts.includes('*') || allowedHosts.includes(host)) {
        return next();
      }
    }
    if (isLocalOrPrivate(host)) {
      return next();
    }
    return res.status(403).json({ success: false, error: 'Forbidden: Invalid Host header' });
  });

  // Optional API Key / Auth Token guard
  const apiSecret = process.env.AUTOFLOW_API_KEY || process.env.AUTH_TOKEN;
  if (apiSecret) {
    app.use('/api', (req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/health') return next();
      const authHeader = req.headers.authorization;
      const keyHeader = req.headers['x-api-key'];
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : keyHeader;
      if (token !== apiSecret) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Valid API key required.' });
      }
      next();
    });
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.raw({ type: ['application/zip', 'application/octet-stream'], limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize DB & Services
  const db = getDatabase();
  runMigrations(db);

  const workflowRepo = new WorkflowRepository(db);
  const projectRepo = new ProjectRepository(db);
  const tagRepo = new TagRepository(db);
  const folderRepo = new FolderRepository(db);
  const executor = new WorkflowExecutor(db);
  const webhookManager = new WebhookManager(db);
  const schedulerManager = new SchedulerManager(db);
  const credentialsManager = new CredentialsManager(db);
  const queueManager = ExecutionQueueManager.getInstance();
  queueManager.init(executor, workflowRepo);

  // Sync active webhooks & schedules
  webhookManager.syncAllActive();
  schedulerManager.syncAllActive();

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'AutoFlow AI',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API Routers
  app.use('/api/projects', createProjectRouter(projectRepo, workflowRepo));
  app.use('/api/workflows', createWorkflowRouter(workflowRepo, executor, webhookManager, schedulerManager));
  app.use('/api/executions', createExecutionRouter(db, executor));
  app.use('/api/credentials', createCredentialRouter(credentialsManager));
  app.use('/api/tags', createTagRouter(tagRepo));
  app.use('/api/folders', createFolderRouter(folderRepo));
  app.use('/api/node-types', createNodeTypeRouter());
  app.use('/api/ai/assistant', createAiAssistantRouter(credentialsManager, executor));
  app.use('/api/templates', createTemplateRoutes(workflowRepo));
  app.use('/api/queue', createQueueRouter(queueManager));

  // Webhook Receiver Endpoint (supports all HTTP methods)
  app.all('/webhook/:path(*)', async (req: Request, res: Response) => {
    const webhookPath = String(req.params.path || '');
    const result = await webhookManager.handleWebhook(webhookPath, req.method, {
      body: req.body,
      headers: req.headers,
      query: req.query,
      params: req.params
    });

    res.status(result.statusCode).json(result);
  });

  // Test Webhook Receiver Endpoint (n8n parity /webhook-test/:path)
  app.all('/webhook-test/:path(*)', async (req: Request, res: Response) => {
    const webhookPath = String(req.params.path || '');
    const result = await webhookManager.handleTestWebhook(webhookPath, req.method, {
      body: req.body,
      headers: req.headers,
      query: req.query,
      params: req.params
    });

    res.status(result.statusCode).json(result);
  });

  // Serve static UI assets
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  // SPA fallback
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/webhook')) {
      return next();
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Server Error]', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal Server Error'
    });
  });

  return { app, db, workflowRepo, executor, webhookManager, schedulerManager, credentialsManager };
}

// Start server if run directly
if (require.main === module) {
  const port = Number(process.env.PORT) || 3456;
  const host = process.env.HOST || '0.0.0.0';
  const { app } = createApp();

  const server = app.listen(port, host, () => {
    console.log(`\n========================================================`);
    console.log(`🚀 AutoFlow AI Server running at:`);
    console.log(`   ➜ Local:   http://localhost:${port}`);
    console.log(`   ➜ Network: http://10.37.78.126:${port}`);
    console.log(`   ➜ Loopback: http://127.0.0.1:${port}`);
    console.log(`📡 Webhook ingress listening at http://localhost:${port}/webhook/:path`);
    console.log(`🪐 Antigravity CLI Copilot ready`);
    console.log(`========================================================\n`);
  });

  const cleanup = () => {
    console.log('Shutting down AutoFlow AI server...');
    server.close(() => {
      closeDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}
