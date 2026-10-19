const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { DatabaseSync } = require('node:sqlite');
const { runMigrations } = require('../dist/database/migrations');
const { WorkflowRepository } = require('../dist/database/repositories/workflow-repository');
const { WorkflowVersionRepository } = require('../dist/database/repositories/workflow-version-repository');
const { TagRepository } = require('../dist/database/repositories/tag-repository');
const { FolderRepository } = require('../dist/database/repositories/folder-repository');
const { ExecutionRetentionManager } = require('../dist/engine/retention-manager');
const { ExpressionSandbox, createDateTimeHelper } = require('../dist/engine/sandbox');

describe('AutoFlow AI Full n8n Capability Parity Test Suite', () => {
  let db;
  let workflowRepo;
  let versionRepo;
  let tagRepo;
  let folderRepo;
  let retentionManager;

  before(() => {
    db = new DatabaseSync(':memory:');
    runMigrations(db);
    workflowRepo = new WorkflowRepository(db);
    versionRepo = new WorkflowVersionRepository(db);
    tagRepo = new TagRepository(db);
    folderRepo = new FolderRepository(db);
    retentionManager = new ExecutionRetentionManager(db);
  });

  after(() => {
    try {
      db.close();
    } catch {}
  });

  test('1. Workflow Version History & Rollback (Capability 6)', () => {
    // 1. Create a workflow -> auto-creates Version 1 snapshot
    const wf = workflowRepo.create({
      name: 'Order Processing Pipeline',
      description: 'Production e-commerce order routing',
      nodes: [
        {
          id: 'node_1',
          name: 'Webhook Trigger',
          type: 'webhook',
          position: { x: 100, y: 100 },
          parameters: { path: 'order-event' }
        }
      ],
      connections: [],
      settings: {}
    });

    const v1List = versionRepo.list(wf.id);
    assert.strictEqual(v1List.length, 1);
    assert.strictEqual(v1List[0].versionNum, 1);
    assert.strictEqual(v1List[0].nodeCount, 1);

    // 2. Update workflow with additional node and connection -> auto-creates Version 2 snapshot
    const updated = workflowRepo.update(wf.id, {
      nodes: [
        {
          id: 'node_1',
          name: 'Webhook Trigger',
          type: 'webhook',
          position: { x: 100, y: 100 },
          parameters: { path: 'order-event' }
        },
        {
          id: 'node_2',
          name: 'Slack Notification',
          type: 'slack',
          position: { x: 400, y: 100 },
          parameters: { channel: '#orders', text: 'New order arrived!' }
        }
      ],
      connections: [
        { source: 'Webhook Trigger', sourceOutput: 0, target: 'Slack Notification', targetInput: 0 }
      ]
    });

    const v2List = versionRepo.list(wf.id);
    assert.strictEqual(v2List.length, 2);
    assert.strictEqual(v2List[0].versionNum, 2);
    assert.strictEqual(v2List[0].nodeCount, 2);
    assert.strictEqual(v2List[0].connectionCount, 1);

    // 3. Diff Version 1 against Version 2
    const v1Obj = versionRepo.getById(v2List[1].id);
    const v2Obj = versionRepo.getById(v2List[0].id);
    const diff = versionRepo.diff(v1Obj, v2Obj);

    assert.strictEqual(diff.addedNodes.length, 1);
    assert.strictEqual(diff.addedNodes[0].id, 'node_2');
    assert.strictEqual(diff.addedConnections.length, 1);
    assert.strictEqual(diff.removedNodes.length, 0);

    // 4. Rollback: Restore workflow to Version 1
    const restored = workflowRepo.update(wf.id, {
      name: v1Obj.name,
      nodes: v1Obj.nodes,
      connections: v1Obj.connections,
      settings: v1Obj.settings,
      changeDescription: `Rollback to Version ${v1Obj.versionNum}`
    });

    assert.strictEqual(restored.nodes.length, 1);
    assert.strictEqual(restored.nodes[0].id, 'node_1');
    assert.strictEqual(restored.connections.length, 0);

    // Rollback itself recorded as Version 3
    const v3List = versionRepo.list(wf.id);
    assert.strictEqual(v3List.length, 3);
    assert.strictEqual(v3List[0].versionNum, 3);
  });

  test('2. Workflow Folders & Tagging System (Capability 7)', () => {
    // 1. Tags Management
    const tag1 = tagRepo.create({ name: 'Finance', color: '#10b981' });
    const tag2 = tagRepo.create({ name: 'Critical', color: '#ef4444' });
    assert.strictEqual(tag1.name, 'Finance');
    assert.strictEqual(tag2.name, 'Critical');

    const allTags = tagRepo.list();
    assert.ok(allTags.some((t) => t.id === tag1.id));
    assert.ok(allTags.some((t) => t.id === tag2.id));

    // 2. Folders Management
    const parentFolder = folderRepo.create({ name: 'Accounting Department' });
    const subFolder = folderRepo.create({ name: 'Invoicing Automation', parentId: parentFolder.id });
    assert.strictEqual(subFolder.parentId, parentFolder.id);

    // 3. Workflow Association
    const wf = workflowRepo.create({
      name: 'Invoice Generator',
      nodes: [],
      connections: [],
      settings: {},
      folderId: subFolder.id,
      tags: [tag1.id, tag2.id]
    });

    // Verify workflow fetched with folderId and tags
    const fetched = workflowRepo.getById(wf.id);
    assert.strictEqual(fetched.folderId, subFolder.id);
    assert.strictEqual(fetched.tags.length, 2);
    assert.ok(fetched.tags.includes(tag1.id));
    assert.ok(fetched.tags.includes(tag2.id));

    // 4. Filter workflows by folderId and tagId
    const folderFiltered = workflowRepo.list({ folderId: subFolder.id });
    assert.strictEqual(folderFiltered.length, 1);
    assert.strictEqual(folderFiltered[0].id, wf.id);

    const tagFiltered = workflowRepo.list({ tagId: tag1.id });
    assert.strictEqual(tagFiltered.length, 1);
    assert.strictEqual(tagFiltered[0].id, wf.id);

    const otherTagFiltered = workflowRepo.list({ tagId: 'non-existent' });
    assert.strictEqual(otherTagFiltered.length, 0);
  });

  test('3. Built-in JMESPath in Expression Sandbox (Capability 8)', () => {
    const contextOptions = {
      itemData: {
        json: {
          store: {
            book: [
              { category: 'reference', author: 'Nigel Rees', title: 'Sayings of the Century', price: 8.95 },
              { category: 'fiction', author: 'Evelyn Waugh', title: 'Sword of Honour', price: 12.99 },
              { category: 'fiction', author: 'Herman Melville', title: 'Moby Dick', isbn: '0-553-21311-3', price: 8.99 }
            ]
          }
        }
      }
    };

    // Evaluate $jmespath expression
    const titles = ExpressionSandbox.evaluate(
      `$jmespath($json, "store.book[?price < \`10\`].title")`,
      contextOptions
    );
    assert.deepStrictEqual(titles, ['Sayings of the Century', 'Moby Dick']);

    // Single item interpolation
    const interpolated = ExpressionSandbox.interpolate(
      '{{ $jmespath($json, "store.book[0].author") }}',
      contextOptions
    );
    assert.strictEqual(interpolated, 'Nigel Rees');
  });

  test('4. Advanced DateTime Math & Expression Helpers (Capability 8)', () => {
    // $now date arithmetic
    const resPlus = ExpressionSandbox.evaluate(
      `$now.plus({ days: 5 }).format('YYYY-MM-DD')`
    );
    const expectedPlus = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    assert.strictEqual(resPlus, expectedPlus);

    // $now minus and unix integer
    const unixNow = Math.floor(Date.now() / 1000);
    const evalUnix = ExpressionSandbox.evaluate(`$now.toUnixInteger()`);
    assert.ok(Math.abs(evalUnix - unixNow) <= 2);

    // $slug and $hash
    const slug = ExpressionSandbox.evaluate(`$slug("Hello World! 2026 Release Ready")`);
    assert.strictEqual(slug, 'hello-world-2026-release-ready');

    const hash = ExpressionSandbox.evaluate(`$hash("secret-token", "sha256")`);
    assert.strictEqual(typeof hash, 'string');
    assert.strictEqual(hash.length, 64);

    // Base64
    const b64 = ExpressionSandbox.evaluate(`$base64Encode("Antigravity AI")`);
    assert.strictEqual(b64, Buffer.from("Antigravity AI").toString("base64"));
    const decoded = ExpressionSandbox.evaluate(`$base64Decode("${b64}")`);
    assert.strictEqual(decoded, "Antigravity AI");
  });

  test('5. Execution Log Pruning & Retention Policies (Capability 9)', () => {
    // Create parent workflow for foreign key constraint
    const retWf = workflowRepo.create({
      id: 'wf_retention',
      name: 'Retention Test WF',
      nodes: [],
      connections: [],
      settings: {}
    });

    const nowMs = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Seed test execution rows with different ages and statuses
    const oldSuccessDate = new Date(nowMs - 30 * dayMs).toISOString(); // 30 days old
    const oldErrorDate = new Date(nowMs - 25 * dayMs).toISOString();   // 25 days old
    const recentDate = new Date(nowMs - 2 * dayMs).toISOString();      // 2 days old

    const insertExec = db.prepare(`
      INSERT INTO executions (id, workflow_id, workflow_name, mode, status, started_at, finished_at, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertExec.run('exec_old_succ', retWf.id, 'Retention Test WF', 'manual', 'success', oldSuccessDate, oldSuccessDate, 120);
    insertExec.run('exec_old_err', retWf.id, 'Retention Test WF', 'manual', 'error', oldErrorDate, oldErrorDate, 90);
    insertExec.run('exec_recent', retWf.id, 'Retention Test WF', 'manual', 'success', recentDate, recentDate, 150);

    const insertNode = db.prepare(`
      INSERT INTO execution_nodes (id, execution_id, node_id, node_name, node_type, status, started_at, finished_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertNode.run('en_1', 'exec_old_succ', 'n_1', 'Start', 'start', 'success', oldSuccessDate, oldSuccessDate);
    insertNode.run('en_2', 'exec_old_err', 'n_1', 'Start', 'start', 'error', oldErrorDate, oldErrorDate);
    insertNode.run('en_3', 'exec_recent', 'n_1', 'Start', 'start', 'success', recentDate, recentDate);

    // 1. Retention settings
    const settings = retentionManager.getSettings();
    assert.strictEqual(typeof settings.maxAgeDays, 'number');

    retentionManager.updateSettings({
      enabled: true,
      maxAgeDays: 14,
      pruneSuccessfulOnly: true
    });
    const updatedSettings = retentionManager.getSettings();
    assert.strictEqual(updatedSettings.maxAgeDays, 14);
    assert.strictEqual(updatedSettings.pruneSuccessfulOnly, true);

    // 2. Prune with pruneSuccessfulOnly=true and maxAgeDays=14
    // Should prune 'exec_old_succ' (30 days old, success)
    // Should NOT prune 'exec_old_err' (because pruneSuccessfulOnly is true)
    // Should NOT prune 'exec_recent' (only 2 days old)
    const result1 = retentionManager.prune({ maxAgeDays: 14, pruneSuccessfulOnly: true });
    assert.strictEqual(result1.deletedCount, 1);

    const remainingRows = db.prepare('SELECT id FROM executions').all().map((r) => r.id);
    assert.ok(!remainingRows.includes('exec_old_succ'));
    assert.ok(remainingRows.includes('exec_old_err'));
    assert.ok(remainingRows.includes('exec_recent'));

    // 3. Prune with pruneSuccessfulOnly=false
    // Should prune 'exec_old_err' (25 days old)
    const result2 = retentionManager.prune({ maxAgeDays: 14, pruneSuccessfulOnly: false });
    assert.strictEqual(result2.deletedCount, 1);

    const finalRows = db.prepare('SELECT id FROM executions').all().map((r) => r.id);
    assert.strictEqual(finalRows.length, 1);
    assert.strictEqual(finalRows[0], 'exec_recent');
  });
});
