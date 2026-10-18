import dotenv from 'dotenv';
dotenv.config();

import { getDatabase, closeDatabase } from './database/connection';
import { runMigrations } from './database/migrations';
import { WorkflowRepository } from './database/repositories/workflow-repository';
import { WorkflowExecutor } from './engine/executor';
import { ExecutionQueueManager } from './scaling/queue-manager';

export function startWorker(concurrency?: number): ExecutionQueueManager {
  console.log(`\n========================================================`);
  console.log(`⚡ Starting AutoFlow AI Dedicated Worker Process`);
  console.log(`========================================================`);

  const db = getDatabase();
  runMigrations(db);

  const workflowRepo = new WorkflowRepository(db);
  const executor = new WorkflowExecutor(db);
  const queueManager = ExecutionQueueManager.getInstance();

  queueManager.init(executor, workflowRepo);

  // Parse concurrency from CLI argument (e.g. --concurrency=10) or param
  let workerConcurrency = concurrency || parseInt(process.env.WORKER_CONCURRENCY || '10', 10);
  const cliConcurrencyArg = process.argv.find((a) => a.startsWith('--concurrency='));
  if (cliConcurrencyArg) {
    const val = parseInt(cliConcurrencyArg.split('=')[1], 10);
    if (!isNaN(val) && val > 0) {
      workerConcurrency = val;
    }
  }

  queueManager.setConcurrency(workerConcurrency);

  console.log(`👷 Worker active with concurrency limit: ${workerConcurrency}`);
  console.log(`🔄 Mode: ${queueManager.getStats().mode}`);
  console.log(`📡 Ready to process background jobs. Press Ctrl+C to terminate.\n`);

  return queueManager;
}

if (require.main === module) {
  const queueManager = startWorker();

  const shutdown = () => {
    console.log('\n[Worker] Received shutdown signal. Draining and terminating gracefully...');
    queueManager.pause();
    closeDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
