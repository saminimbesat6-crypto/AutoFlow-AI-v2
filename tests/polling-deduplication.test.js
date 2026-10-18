const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const { runMigrations } = require('../dist/database/migrations');
const { StaticDataManager } = require('../dist/engine/static-data-manager');
const { PollingTriggerNode } = require('../dist/nodes/triggers/polling-trigger');
const { ExecutionContext } = require('../dist/engine/context');
const { WorkflowExecutor } = require('../dist/engine/executor');
const { SchedulerManager } = require('../dist/scheduler/manager');

describe('AutoFlow AI Polling Triggers & Deduplication State (Phase G) Test Suite', () => {
  const dbPath = path.join(__dirname, 'test-polling.sqlite');
  let db;
  let staticDataManager;
  let executor;

  before(() => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    db = new DatabaseSync(dbPath);
    runMigrations(db);

    staticDataManager = new StaticDataManager(db);
    executor = new WorkflowExecutor(db);
  });

  after(() => {
    if (db) db.close();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const wal = `${dbPath}-wal`;
    const shm = `${dbPath}-shm`;
    if (fs.existsSync(wal)) fs.unlinkSync(wal);
    if (fs.existsSync(shm)) fs.unlinkSync(shm);
  });

  test('1. StaticDataManager: Persists and retrieves node-scoped and workflow-scoped data in SQLite', () => {
    const wfId = 'wf-test-static-1';
    const nodeId = 'node-poll-1';

    // Initial state is empty object
    const initial = staticDataManager.getStaticData(wfId, nodeId);
    assert.deepStrictEqual(initial, {});

    // Save modified data
    initial.lastPoll = '2026-10-19T00:00:00.000Z';
    initial.seenCount = 42;
    staticDataManager.saveStaticData(wfId, nodeId, initial);

    // Verify row in SQLite
    const row = db.prepare('SELECT * FROM workflow_static_data WHERE workflow_id = ? AND node_id = ?').get(wfId, nodeId);
    assert.ok(row, 'Row must exist in workflow_static_data table');
    assert.strictEqual(JSON.parse(row.data).seenCount, 42);

    // Verify retrieval across fresh instances
    const freshManager = new StaticDataManager(db);
    const retrieved = freshManager.getStaticData(wfId, nodeId);
    assert.strictEqual(retrieved.seenCount, 42);
    assert.strictEqual(retrieved.lastPoll, '2026-10-19T00:00:00.000Z');
  });

  test('2. Polling Trigger (ID Deduplication): First run with only_new seeds state silently; subsequent run emits only novel items', async () => {
    const pollingNode = new PollingTriggerNode();
    const wfId = 'wf-poll-id-test';
    const nodeConfig = {
      id: 'poll-node-1',
      name: 'Poll Issues',
      type: 'polling-trigger',
      position: { x: 0, y: 0 },
      parameters: {
        mode: 'custom',
        deduplicationStrategy: 'id',
        idProperty: 'id',
        firstRunMode: 'only_new'
      }
    };

    const execContext = new ExecutionContext(undefined, process.env, staticDataManager);
    execContext.workflowId = wfId;

    // Run 1: Feed initial items [101, 102]
    const initialFeed = [
      { id: '101', title: 'First Issue' },
      { id: '102', title: 'Second Issue' }
    ];
    nodeConfig.parameters.customItems = initialFeed;

    const ctx1 = execContext.createNodeContext(nodeConfig, []);
    const output1 = await pollingNode.execute(ctx1);
    staticDataManager.saveStaticData(wfId, nodeConfig.id);

    // Assert: First run in only_new mode outputs empty list
    assert.strictEqual(output1[0].length, 0, 'First run in only_new mode must return 0 items');

    // Verify state in static data
    const state1 = staticDataManager.getStaticData(wfId, nodeConfig.id);
    assert.strictEqual(state1.initialized, true);
    assert.ok(state1.seenIds.includes('101'));
    assert.ok(state1.seenIds.includes('102'));

    // Run 2: Feed [101, 102, 103] -> 103 is new!
    const updatedFeed = [
      { id: '101', title: 'First Issue' },
      { id: '102', title: 'Second Issue' },
      { id: '103', title: 'Third Issue (NEW)' }
    ];
    nodeConfig.parameters.customItems = updatedFeed;

    const ctx2 = execContext.createNodeContext(nodeConfig, []);
    const output2 = await pollingNode.execute(ctx2);
    staticDataManager.saveStaticData(wfId, nodeConfig.id);

    // Assert: Exactly 1 item emitted (id 103)
    assert.strictEqual(output2[0].length, 1);
    assert.strictEqual(output2[0][0].json.id, '103');
    assert.strictEqual(output2[0][0].json.title, 'Third Issue (NEW)');

    // Run 3: Feed [101, 102, 103] again -> No new items
    const ctx3 = execContext.createNodeContext(nodeConfig, []);
    const output3 = await pollingNode.execute(ctx3);

    // Assert: 0 items emitted
    assert.strictEqual(output3[0].length, 0, 'Duplicate feed must produce 0 items');
  });

  test('3. Polling Trigger (Timestamp Deduplication): Emits records created after lastPollTime', async () => {
    const pollingNode = new PollingTriggerNode();
    const wfId = 'wf-poll-timestamp-test';
    const nodeConfig = {
      id: 'poll-node-ts',
      name: 'Poll Logs',
      type: 'polling-trigger',
      position: { x: 0, y: 0 },
      parameters: {
        mode: 'custom',
        deduplicationStrategy: 'timestamp',
        timestampProperty: 'createdAt',
        firstRunMode: 'emit_all' // Emit everything on first run
      }
    };

    const execContext = new ExecutionContext(undefined, process.env, staticDataManager);
    execContext.workflowId = wfId;

    const t1 = '2026-10-18T10:00:00.000Z';
    const t2 = '2026-10-18T11:00:00.000Z';
    const t3 = '2026-10-18T12:00:00.000Z';

    // Run 1: First run with emit_all
    nodeConfig.parameters.customItems = [
      { id: 'log-1', createdAt: t1, msg: 'Boot' },
      { id: 'log-2', createdAt: t2, msg: 'Init' }
    ];

    const ctx1 = execContext.createNodeContext(nodeConfig, []);
    const output1 = await pollingNode.execute(ctx1);
    staticDataManager.saveStaticData(wfId, nodeConfig.id);

    assert.strictEqual(output1[0].length, 2, 'emit_all on first run yields both logs');

    // Run 2: Feed older log + new log
    nodeConfig.parameters.customItems = [
      { id: 'log-2', createdAt: t2, msg: 'Init' },
      { id: 'log-3', createdAt: t3, msg: 'New event' }
    ];

    // Artificially simulate lastPollTime was t2 + 10ms
    const state = staticDataManager.getStaticData(wfId, nodeConfig.id);
    state.lastPollTime = '2026-10-18T11:30:00.000Z';
    staticDataManager.saveStaticData(wfId, nodeConfig.id, state);

    const ctx2 = execContext.createNodeContext(nodeConfig, []);
    const output2 = await pollingNode.execute(ctx2);

    assert.strictEqual(output2[0].length, 1);
    assert.strictEqual(output2[0][0].json.id, 'log-3');
  });

  test('4. Polling Trigger (Content Hash Deduplication): Deduplicates arbitrary payloads without explicit ID keys', async () => {
    const pollingNode = new PollingTriggerNode();
    const wfId = 'wf-poll-hash-test';
    const nodeConfig = {
      id: 'poll-node-hash',
      name: 'Poll Prices',
      type: 'polling-trigger',
      position: { x: 0, y: 0 },
      parameters: {
        mode: 'custom',
        deduplicationStrategy: 'hash',
        firstRunMode: 'only_new'
      }
    };

    const execContext = new ExecutionContext(undefined, process.env, staticDataManager);
    execContext.workflowId = wfId;

    // Run 1: Seed initial price quotes
    nodeConfig.parameters.customItems = [
      { symbol: 'BTC', price: 95000 },
      { symbol: 'ETH', price: 3500 }
    ];

    const ctx1 = execContext.createNodeContext(nodeConfig, []);
    await pollingNode.execute(ctx1);
    staticDataManager.saveStaticData(wfId, nodeConfig.id);

    // Run 2: Same BTC price, but ETH price changed
    nodeConfig.parameters.customItems = [
      { symbol: 'BTC', price: 95000 }, // same hash
      { symbol: 'ETH', price: 3600 }   // changed hash!
    ];

    const ctx2 = execContext.createNodeContext(nodeConfig, []);
    const output2 = await pollingNode.execute(ctx2);

    assert.strictEqual(output2[0].length, 1);
    assert.strictEqual(output2[0][0].json.symbol, 'ETH');
    assert.strictEqual(output2[0][0].json.price, 3600);
  });

  test('5. End-to-End Workflow Execution with Polling Trigger: Downstream only executes when new items are detected', async () => {
    const wfId = 'wf-e2e-poll-graph';

    const testWorkflow = {
      id: wfId,
      name: 'E2E Polling Workflow',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {},
      nodes: [
        {
          id: 'poll-trigger-1',
          name: 'Poll Feed',
          type: 'polling-trigger',
          position: { x: 100, y: 100 },
          parameters: {
            mode: 'custom',
            deduplicationStrategy: 'id',
            idProperty: 'uuid',
            firstRunMode: 'only_new',
            customItems: [{ uuid: 'item-10' }]
          }
        },
        {
          id: 'set-data-1',
          name: 'Tag Processed',
          type: 'set-data',
          position: { x: 300, y: 100 },
          parameters: {
            jsonData: { processed: true }
          }
        }
      ],
      connections: [
        { source: 'poll-trigger-1', sourceOutput: 0, target: 'set-data-1', targetInput: 0 }
      ]
    };

    // Execution 1: First run seeds state, produces 0 items. Downstream node should NOT run.
    const res1 = await executor.execute(testWorkflow, { mode: 'poll' });
    assert.strictEqual(res1.status, 'success');
    assert.strictEqual(res1.data.executedNodes.length, 1, 'Only trigger executed; downstream skipped because output was empty');

    // Execution 2: New item arrives. Downstream node SHOULD run!
    testWorkflow.nodes[0].parameters.customItems = [
      { uuid: 'item-10' },
      { uuid: 'item-20', title: 'Hot News' }
    ];

    const res2 = await executor.execute(testWorkflow, { mode: 'poll' });
    assert.strictEqual(res2.status, 'success');
    assert.strictEqual(res2.data.executedNodes.length, 2, 'Both trigger and downstream executed');

    const downstreamOutput = executor.getExecution(res2.id);
    const downstreamNode = downstreamOutput.nodes.find((n) => n.nodeId === 'set-data-1');
    assert.ok(downstreamNode);
    assert.strictEqual(downstreamNode.status, 'success');
    assert.strictEqual(downstreamNode.outputData[0][0].json.processed, true);
    assert.strictEqual(downstreamNode.outputData[0][0].json.uuid, 'item-20');
  });

  test('6. Scheduler Manager: Successfully parses and registers polling trigger intervals', () => {
    const scheduler = new SchedulerManager(db);

    const wf = {
      id: 'wf-scheduled-poll',
      name: 'Scheduled Polling',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {},
      nodes: [
        {
          id: 'poll-schedule-1',
          name: 'Poll Every 5 Mins',
          type: 'polling-trigger',
          position: { x: 0, y: 0 },
          parameters: {
            pollInterval: '5m'
          }
        }
      ],
      connections: []
    };

    // Register without throwing
    scheduler.registerWorkflowSchedules(wf);
    // Unregister cleanly
    scheduler.unregisterWorkflowSchedules(wf.id);
  });
});
