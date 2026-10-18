const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('AutoFlow AI Data Merge & Sub-Workflow (Phase C) Test Suite', () => {
  let MergeNode, ExecuteWorkflowNode, ExecutionContext, WorkflowExecutor, getDatabase;
  let testDbPath, db;

  before(() => {
    testDbPath = path.join(__dirname, 'test-merge-subworkflow.sqlite');
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    process.env.DATABASE_PATH = testDbPath;

    ({ getDatabase } = require('../dist/database/connection'));
    const { runMigrations } = require('../dist/database/migrations');
    ({ MergeNode } = require('../dist/nodes/core/merge'));
    ({ ExecuteWorkflowNode } = require('../dist/nodes/core/execute-workflow'));
    ({ ExecutionContext } = require('../dist/engine/context'));
    ({ WorkflowExecutor } = require('../dist/engine/executor'));

    db = getDatabase();
    runMigrations(db);
  });

  after(() => {
    if (db) db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  function makeContext(node, inputsByPort) {
    const ec = new ExecutionContext();
    const flattened = inputsByPort.flat();
    return ec.createNodeContext(node, flattened, 0, inputsByPort);
  }

  test('1. Merge Node: Append mode concatenates multiple port inputs', async () => {
    const node = new MergeNode();
    const fakeNode = {
      id: 'merge_1',
      name: 'Merge',
      type: 'merge',
      parameters: { mode: 'append' },
      position: [0, 0]
    };

    const input1 = [{ json: { id: 1, source: 'CRM' } }];
    const input2 = [{ json: { id: 2, source: 'ERP' } }, { json: { id: 3, source: 'Shop' } }];

    const ctx = makeContext(fakeNode, [input1, input2]);
    const out = await node.execute(ctx);

    assert.strictEqual(out[0].length, 3);
    assert.strictEqual(out[0][0].json.source, 'CRM');
    assert.strictEqual(out[0][1].json.source, 'ERP');
    assert.strictEqual(out[0][2].json.source, 'Shop');
  });

  test('2. Merge Node: Combine by Key (Inner Join vs Left Join vs Full Outer Join)', async () => {
    const node = new MergeNode();

    const input1 = [
      { json: { userId: '101', name: 'Alice' } },
      { json: { userId: '102', name: 'Bob' } },
      { json: { userId: '103', name: 'Charlie' } }
    ];

    const input2 = [
      { json: { uid: '101', role: 'Admin', plan: 'Enterprise' } },
      { json: { uid: '102', role: 'Editor', plan: 'Pro' } },
      { json: { uid: '104', role: 'Viewer', plan: 'Free' } }
    ];

    // Left Join (enrichInput1): Keeps Alice, Bob, Charlie (Charlie has no role)
    const leftNode = {
      id: 'merge_left',
      name: 'Merge',
      type: 'merge',
      parameters: {
        mode: 'combineByKey',
        joinType: 'enrichInput1',
        joinKey1: 'userId',
        joinKey2: 'uid'
      },
      position: [0, 0]
    };
    const leftOut = await node.execute(makeContext(leftNode, [input1, input2]));
    assert.strictEqual(leftOut[0].length, 3);
    assert.strictEqual(leftOut[0][0].json.name, 'Alice');
    assert.strictEqual(leftOut[0][0].json.role, 'Admin');
    assert.strictEqual(leftOut[0][2].json.name, 'Charlie');
    assert.strictEqual(leftOut[0][2].json.role, undefined);

    // Inner Join (keepMatches): Keeps only 101 and 102
    const innerNode = {
      id: 'merge_inner',
      name: 'Merge',
      type: 'merge',
      parameters: {
        mode: 'combineByKey',
        joinType: 'keepMatches',
        joinKey1: 'userId',
        joinKey2: 'uid'
      },
      position: [0, 0]
    };
    const innerOut = await node.execute(makeContext(innerNode, [input1, input2]));
    assert.strictEqual(innerOut[0].length, 2);
    assert.strictEqual(innerOut[0][0].json.name, 'Alice');
    assert.strictEqual(innerOut[0][1].json.name, 'Bob');

    // Full Outer Join (keepEverything): Keeps Alice, Bob, Charlie + unmatched 104 from Input 2
    const outerNode = {
      id: 'merge_outer',
      name: 'Merge',
      type: 'merge',
      parameters: {
        mode: 'combineByKey',
        joinType: 'keepEverything',
        joinKey1: 'userId',
        joinKey2: 'uid'
      },
      position: [0, 0]
    };
    const outerOut = await node.execute(makeContext(outerNode, [input1, input2]));
    assert.strictEqual(outerOut[0].length, 4);
    assert.strictEqual(outerOut[0][3].json.uid, '104');
    assert.strictEqual(outerOut[0][3].json.role, 'Viewer');
  });

  test('3. Merge Node: Combine by Position and Cross Join (Cartesian Product)', async () => {
    const node = new MergeNode();

    const input1 = [{ json: { color: 'Red' } }, { json: { color: 'Blue' } }];
    const input2 = [{ json: { size: 'S' } }, { json: { size: 'M' } }];

    // By Position: (Red, S) and (Blue, M)
    const posNode = {
      id: 'merge_pos',
      name: 'Merge',
      type: 'merge',
      parameters: { mode: 'mergeByIndex' },
      position: [0, 0]
    };
    const posOut = await node.execute(makeContext(posNode, [input1, input2]));
    assert.strictEqual(posOut[0].length, 2);
    assert.strictEqual(posOut[0][0].json.color, 'Red');
    assert.strictEqual(posOut[0][0].json.size, 'S');
    assert.strictEqual(posOut[0][1].json.color, 'Blue');
    assert.strictEqual(posOut[0][1].json.size, 'M');

    // Cross Join: 2 colors * 2 sizes = 4 combinations
    const crossNode = {
      id: 'merge_cross',
      name: 'Merge',
      type: 'merge',
      parameters: { mode: 'crossJoin' },
      position: [0, 0]
    };
    const crossOut = await node.execute(makeContext(crossNode, [input1, input2]));
    assert.strictEqual(crossOut[0].length, 4);
    assert.strictEqual(crossOut[0][0].json.color, 'Red');
    assert.strictEqual(crossOut[0][0].json.size, 'S');
    assert.strictEqual(crossOut[0][1].json.color, 'Red');
    assert.strictEqual(crossOut[0][1].json.size, 'M');
  });

  test('4. Execute Sub-Workflow Node: Invokes child workflow and returns terminal output', async () => {
    // Insert a child sub-workflow into SQLite
    const subWorkflowId = 'subflow_order_calc';
    const subflow = {
      id: subWorkflowId,
      name: 'Order Calculation Subflow',
      description: 'Calculates subtotal with tax',
      nodes: [
        {
          id: 'sub_in',
          name: 'Manual Trigger',
          type: 'manual-trigger',
          position: [0, 0],
          parameters: {}
        },
        {
          id: 'sub_calc',
          name: 'Code',
          type: 'code',
          position: [200, 0],
          parameters: {
            language: 'javascript',
            jsCode: 'return items.map(it => ({ json: { ...it.json, totalWithTax: Math.round((it.json.subtotal || 0) * 1.1) } }));'
          }
        }
      ],
      connections: [
        { source: 'sub_in', sourceOutput: 0, target: 'sub_calc', targetInput: 0 }
      ],
      settings: {},
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.prepare(`
      INSERT OR REPLACE INTO workflows (id, name, description, nodes, connections, settings, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      subflow.id,
      subflow.name,
      subflow.description,
      JSON.stringify(subflow.nodes),
      JSON.stringify(subflow.connections),
      JSON.stringify(subflow.settings),
      1,
      subflow.created_at,
      subflow.updated_at
    );

    // Call subflow using ExecuteWorkflowNode
    const node = new ExecuteWorkflowNode();
    const callerNode = {
      id: 'exec_wf_1',
      name: 'Execute Sub-Workflow',
      type: 'execute-workflow',
      parameters: { workflowId: 'Order Calculation Subflow' }, // Call by name!
      position: [0, 0]
    };

    const ctx = makeContext(callerNode, [[{ json: { orderId: 'ORD-999', subtotal: 100 } }]]);
    const out = await node.execute(ctx);

    assert.ok(Array.isArray(out) && out[0].length === 1);
    assert.strictEqual(out[0][0].json.orderId, 'ORD-999');
    assert.strictEqual(out[0][0].json.totalWithTax, 110);
  });

  test('5. End-to-End Workflow Execution: Two parallel branches joining in Merge Node', async () => {
    const executor = new WorkflowExecutor(db);

    const parallelMergeWorkflow = {
      id: 'wf_parallel_merge',
      name: 'Parallel Merge Workflow',
      description: 'Branches into two paths and recombines into Merge node',
      nodes: [
        {
          id: 'start_node',
          name: 'Start',
          type: 'manual-trigger',
          position: [0, 100],
          parameters: {}
        },
        {
          id: 'branch_a',
          name: 'Branch A',
          type: 'set-data',
          position: [200, 0],
          parameters: {
            mode: 'rawJson',
            jsonData: JSON.stringify({ branchA_data: 'Alpha', matchKey: '1' })
          }
        },
        {
          id: 'branch_b',
          name: 'Branch B',
          type: 'set-data',
          position: [200, 200],
          parameters: {
            mode: 'rawJson',
            jsonData: JSON.stringify({ branchB_data: 'Beta', matchKey: '1' })
          }
        },
        {
          id: 'merge_node',
          name: 'Merge',
          type: 'merge',
          position: [400, 100],
          parameters: {
            mode: 'combineByKey',
            joinType: 'enrichInput1',
            joinKey1: 'matchKey',
            joinKey2: 'matchKey'
          }
        }
      ],
      connections: [
        { source: 'start_node', sourceOutput: 0, target: 'branch_a', targetInput: 0 },
        { source: 'start_node', sourceOutput: 0, target: 'branch_b', targetInput: 0 },
        { source: 'branch_a', sourceOutput: 0, target: 'merge_node', targetInput: 0 },
        { source: 'branch_b', sourceOutput: 0, target: 'merge_node', targetInput: 1 }
      ],
      settings: {},
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await executor.execute(parallelMergeWorkflow, {
      mode: 'manual',
      initialData: [{ json: { initial: true } }],
      saveExecution: true
    });

    assert.strictEqual(result.status, 'success');
    const outputs = executor.getExecution(result.id);
    assert.ok(outputs);

    // Verify Merge node output has both branchA_data and branchB_data combined!
    const mergeRecord = outputs.nodes.find((n) => n.nodeId === 'merge_node');
    assert.ok(mergeRecord, 'Merge node must have executed');
    assert.strictEqual(mergeRecord.status, 'success');
    const mergeOutput = mergeRecord.outputData[0][0].json;
    assert.strictEqual(mergeOutput.branchA_data, 'Alpha');
    assert.strictEqual(mergeOutput.branchB_data, 'Beta');
  });
});
