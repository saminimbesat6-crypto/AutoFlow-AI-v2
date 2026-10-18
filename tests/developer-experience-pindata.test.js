const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('AutoFlow AI Developer Experience & Pin Data (Phase D) Test Suite', () => {
  let WorkflowRepository, WorkflowExecutor, getDatabase;
  let testDbPath, db, repo, executor;

  before(() => {
    testDbPath = path.join(__dirname, 'test-pindata.sqlite');
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    process.env.DATABASE_PATH = testDbPath;

    ({ getDatabase } = require('../dist/database/connection'));
    const { runMigrations } = require('../dist/database/migrations');
    ({ WorkflowRepository } = require('../dist/database/repositories/workflow-repository'));
    ({ WorkflowExecutor } = require('../dist/engine/executor'));

    db = getDatabase();
    runMigrations(db);
    repo = new WorkflowRepository(db);
    executor = new WorkflowExecutor(db);
  });

  after(() => {
    if (db) db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  test('1. Pin Data Execution: Pinned data overrides incoming data in downstream node', async () => {
    const wf = repo.create({
      name: 'Pinned Data Test Workflow',
      description: 'Tests pinned data override',
      nodes: [
        {
          id: 'upstream_calc',
          name: 'Upstream Calc',
          type: 'code',
          position: { x: 0, y: 0 },
          parameters: {
            language: 'javascript',
            jsCode: 'return [{ json: { value: 10, source: "live_calculation" } }];'
          },
          // PINNED DATA FROZEN AT 999
          pinnedData: [{ json: { value: 999, source: "frozen_test_payload" } }]
        },
        {
          id: 'downstream_consumer',
          name: 'Downstream Consumer',
          type: 'code',
          position: { x: 250, y: 0 },
          parameters: {
            language: 'javascript',
            jsCode: 'return items.map(it => ({ json: { received: it.json.value, source: it.json.source } }));'
          }
        }
      ],
      connections: [
        { source: 'Upstream Calc', sourceOutput: 0, target: 'Downstream Consumer', targetInput: 0 }
      ],
      settings: {},
      active: false
    });

    // Execute workflow
    const result = await executor.execute(wf, { mode: 'manual', saveExecution: true });
    assert.strictEqual(result.status, 'success');

    const details = executor.getExecution(result.id);
    const downstreamRecord = details.nodes.find((n) => n.nodeId === 'downstream_consumer');
    assert.ok(downstreamRecord);

    // Downstream node must have received the PINNED data (999), not the unpinned calculation (10)!
    const downstreamOut = downstreamRecord.outputData[0][0].json;
    assert.strictEqual(downstreamOut.received, 999);
    assert.strictEqual(downstreamOut.source, 'frozen_test_payload');
  });

  test('2. Workflow Repository: Pins and unpins data on node', () => {
    const wf = repo.create({
      name: 'Repo Pinning Test',
      nodes: [
        { id: 'node_test_1', name: 'HTTP Fetch', type: 'http-request', position: { x: 0, y: 0 }, parameters: {} }
      ],
      connections: [],
      settings: {},
      active: false
    });

    // Pin data
    const frozenPayload = [{ json: { status: 'mock_200_ok', items: ['apple', 'banana'] } }];
    wf.nodes[0].pinnedData = frozenPayload;
    repo.update(wf.id, wf);

    const reloaded = repo.getById(wf.id);
    assert.ok(reloaded.nodes[0].pinnedData);
    assert.strictEqual(reloaded.nodes[0].pinnedData[0].json.status, 'mock_200_ok');

    // Unpin data
    delete reloaded.nodes[0].pinnedData;
    repo.update(wf.id, reloaded);

    const unpinned = repo.getById(wf.id);
    assert.strictEqual(unpinned.nodes[0].pinnedData, undefined);
  });

  test('3. Execute Step: Runs isolated single node without running full workflow', async () => {
    const { NodeRegistry } = require('../dist/nodes/registry');
    const { ExecutionContext } = require('../dist/engine/context');
    const registry = NodeRegistry.getInstance();

    const nodeDef = registry.get('crypto');
    assert.ok(nodeDef, 'Crypto node must exist');

    const singleNode = {
      id: 'step_crypto',
      name: 'Crypto Hash',
      type: 'crypto',
      position: { x: 0, y: 0 },
      parameters: {
        action: 'hash',
        algorithm: 'sha256',
        value: 'antigravity-secret-data'
      }
    };

    const ec = new ExecutionContext();
    const ctx = ec.createNodeContext(singleNode, [{ json: {} }]);
    const out = await nodeDef.execute(ctx);

    assert.ok(Array.isArray(out) && out[0].length === 1);
    assert.ok(out[0][0].json.cryptoResult);
    assert.strictEqual(typeof out[0][0].json.cryptoResult, 'string');
    assert.strictEqual(out[0][0].json.cryptoResult.length, 64); // SHA256 hex length
  });
});
