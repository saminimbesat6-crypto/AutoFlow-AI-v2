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
import { createTagRouter } from './api/routes/tag-routes';
import { createFolderRouter } from './api/routes/folder-routes';

export function createApp() {
  const app = express();

  // Security: Origin and Host Validation
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((o) => o.trim())
    : ['http://localhost:3456', 'http://127.0.0.1:3456'];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server) or in allowed list
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Allow localhost with any port in development
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
  }));

  // Host header validation to mitigate DNS rebinding
  app.use((req: Request, res: Response, next: NextFunction) => {
    const host = (req.headers.host || '').split(':')[0].toLowerCase();
    const allowedHosts = (process.env.ALLOWED_HOSTS || 'localhost,127.0.0.1,0.0.0.0').split(',').map((h) => h.trim().toLowerCase());
    if (host && !allowedHosts.includes('*') && !allowedHosts.includes(host) && !host.endsWith('.local') && !host.endsWith('.localhost')) {
      return res.status(403).json({ success: false, error: 'Forbidden: Invalid Host header' });
    }
    next();
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

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Initialize DB & Services
  const db = getDatabase();
  runMigrations(db);

  const workflowRepo = new WorkflowRepository(db);
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
  app.use('/api/workflows', createWorkflowRouter(workflowRepo, executor, webhookManager, schedulerManager));
  app.use('/api/executions', createExecutionRouter(db, executor));
  app.use('/api/credentials', createCredentialRouter(credentialsManager));
  app.use('/api/tags', createTagRouter(tagRepo));
  app.use('/api/folders', createFolderRouter(folderRepo));
  app.use('/api/node-types', createNodeTypeRouter());
  app.use('/api/ai/assistant', createAiAssistantRouter(credentialsManager));
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
  const port = process.env.PORT || 3456;
  const { app } = createApp();

  const server = app.listen(port, () => {
    console.log(`\n========================================================`);
    console.log(`🚀 AutoFlow AI Server running at http://localhost:${port}`);
    console.log(`📡 Webhook ingress listening at http://localhost:${port}/webhook/:path`);
    console.log(`⚡ Gemini AI integration ready`);
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
