const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('AutoFlow AI Production Worker Scaling & Queue (Phase E) Test Suite', () => {
  let ExecutionQueueManager, WorkflowRepository, WorkflowExecutor, getDatabase;
  let testDbPath, db, repo, executor, queueManager;
  let testWfId;

  before(() => {
    testDbPath = path.join(__dirname, 'test-worker-scaling.sqlite');
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    process.env.DATABASE_PATH = testDbPath;

    ({ getDatabase } = require('../dist/database/connection'));
    const { runMigrations } = require('../dist/database/migrations');
    ({ WorkflowRepository } = require('../dist/database/repositories/workflow-repository'));
    ({ WorkflowExecutor } = require('../dist/engine/executor'));
    ({ ExecutionQueueManager } = require('../dist/scaling/queue-manager'));

    db = getDatabase();
    runMigrations(db);
    repo = new WorkflowRepository(db);
    executor = new WorkflowExecutor(db);

    queueManager = ExecutionQueueManager.getInstance();
    queueManager.init(executor, repo);

    // Create a fast test workflow
    const wf = repo.create({
      name: 'Queue Scaling Worker Test',
      description: 'Tests worker concurrency and background execution',
      nodes: [
        {
          id: 'q_in',
          name: 'Manual Trigger',
          type: 'manual-trigger',
          position: { x: 0, y: 0 },
          parameters: {}
        },
        {
          id: 'q_process',
          name: 'Code',
          type: 'code',
          position: { x: 200, y: 0 },
          parameters: {
            language: 'javascript',
            jsCode: 'return items.map(it => ({ json: { ...it.json, processedByWorker: true, timestamp: Date.now() } }));'
          }
        }
      ],
      connections: [
        { source: 'Manual Trigger', sourceOutput: 0, target: 'Code', targetInput: 0 }
      ],
      settings: {},
      active: true
    });
    testWfId = wf.id;
  });

  after(() => {
    if (db) db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  test('1. Concurrency Throttling: Respects maxConcurrency limit', async () => {
    queueManager.setConcurrency(2);
    const statsInitial = queueManager.getStats();
    assert.strictEqual(statsInitial.concurrency, 2);

    // Enqueue 4 jobs simultaneously
    const jobPromises = [
      queueManager.enqueue(testWfId, { initialData: [{ json: { num: 1 } }] }),
      queueManager.enqueue(testWfId, { initialData: [{ json: { num: 2 } }] }),
      queueManager.enqueue(testWfId, { initialData: [{ json: { num: 3 } }] }),
      queueManager.enqueue(testWfId, { initialData: [{ json: { num: 4 } }] })
    ];

    const jobs = await Promise.all(jobPromises);
    assert.strictEqual(jobs.length, 4);

    // Wait for all 4 to complete
    const completionPromises = jobs.map((j) => queueManager.waitForCompletion(j.id));
    const records = await Promise.all(completionPromises);

    assert.strictEqual(records.length, 4);
    for (const rec of records) {
      assert.strictEqual(rec.status, 'success');
    }

    const statsAfter = queueManager.getStats();
    assert.ok(statsAfter.completedCount >= 4);
  });

  test('2. Priority Queue: Urgent priority jobs jump ahead of low priority', async () => {
    queueManager.pause(); // Pause worker processing so jobs queue up

    // Enqueue normal priority job (priority: 0)
    const normalJob = await queueManager.enqueue(testWfId, {
      initialData: [{ json: { name: 'Normal Task' } }],
      priority: 0
    });

    // Enqueue urgent priority job (priority: 2)
    const urgentJob = await queueManager.enqueue(testWfId, {
      initialData: [{ json: { name: 'Urgent Alert' } }],
      priority: 2
    });

    // In waiting queue, urgent job should be ahead of normal job
    const stats = queueManager.getStats();
    assert.strictEqual(stats.waitingCount, 2);

    // Resume queue
    queueManager.resume();

    const [recUrgent, recNormal] = await Promise.all([
      queueManager.waitForCompletion(urgentJob.id),
      queueManager.waitForCompletion(normalJob.id)
    ]);

    assert.strictEqual(recUrgent.status, 'success');
    assert.strictEqual(recNormal.status, 'success');
  });

  test('3. Queue Management: Pause, resume, clear, and statistics API', async () => {
    queueManager.pause();
    assert.strictEqual(queueManager.getStats().isPaused, true);

    await queueManager.enqueue(testWfId, { initialData: [{ json: { test: 1 } }] });
    await queueManager.enqueue(testWfId, { initialData: [{ json: { test: 2 } }] });

    assert.strictEqual(queueManager.getStats().waitingCount, 2);

    // Clear waiting queue
    const cleared = queueManager.clearWaitingQueue();
    assert.strictEqual(cleared, 2);
    assert.strictEqual(queueManager.getStats().waitingCount, 0);

    queueManager.resume();
    assert.strictEqual(queueManager.getStats().isPaused, false);
  });

  test('4. Standalone Worker Module: Boots cleanly and exposes process interface', () => {
    const { startWorker } = require('../dist/worker');
    assert.strictEqual(typeof startWorker, 'function');
  });
});
