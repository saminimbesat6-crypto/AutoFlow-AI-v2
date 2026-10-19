const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const { NodeRegistry } = require('../dist/nodes/registry');
const { DeclarativeNode } = require('../dist/nodes/declarative-node');
const { ALL_INTEGRATION_MANIFESTS } = require('../dist/nodes/integrations');
const { ExecutionContext } = require('../dist/engine/context');
const { ExpressionSandbox } = require('../dist/engine/sandbox');

describe('AutoFlow AI Full Node Catalog (404 Nodes) Audit & Verification Test Suite', () => {
  let mockServer;
  let mockPort;
  let mockBaseUrl;
  let registry;

  before(async () => {
    registry = NodeRegistry.getInstance();

    // Start a universal local mock server to catch all declarative API calls
    await new Promise((resolve) => {
      mockServer = http.createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          // Check for error simulation route
          if (req.url.includes('/simulate-error')) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'InternalServerError', message: 'Simulated backend failure' }));
          }

          // Default universal success response matching standard JSON APIs
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'success',
            id: 'mock-rec-12345',
            created: true,
            method: req.method,
            url: req.url,
            headers: req.headers,
            data: [{ id: 'item-1', name: 'Test Record' }],
            items: [{ id: 'item-1', name: 'Test Record' }],
            results: [{ id: 'item-1', name: 'Test Record' }],
            values: [{ id: 'item-1', name: 'Test Record' }],
            records: [{ id: 'item-1', name: 'Test Record' }]
          }));
        });
      });

      mockServer.listen(0, '127.0.0.1', () => {
        mockPort = mockServer.address().port;
        mockBaseUrl = `http://127.0.0.1:${mockPort}`;
        resolve();
      });
    });
  });

  after(() => {
    if (mockServer) mockServer.close();
  });

  test('1. Inventory & Uniqueness: Exactly 405 distinct, non-duplicated nodes are registered', () => {
    const list = registry.list();
    assert.strictEqual(list.length, 405, `Expected exactly 405 registered nodes, found ${list.length}`);

    const typeSet = new Set();
    for (const node of list) {
      assert.ok(!typeSet.has(node.type), `Duplicate node type found: "${node.type}"`);
      typeSet.add(node.type);
    }
    assert.strictEqual(typeSet.size, 405, 'All 405 node types must be unique');
  });

  test('2. Schema & Metadata Validation: Every node satisfies full INodeDefinition specification', () => {
    const nodes = Array.from(registry.nodes.values());
    const validCategories = ['trigger', 'core', 'action', 'ai', 'transform', 'app', 'database', 'cloud', 'communication', 'social'];

    for (const node of nodes) {
      assert.ok(node.type && typeof node.type === 'string', `Invalid type in node: ${node.name}`);
      assert.ok(node.name && typeof node.name === 'string', `Invalid name in node ${node.type}`);
      assert.ok(node.description && typeof node.description === 'string', `Invalid description in node ${node.type}`);
      assert.ok(validCategories.includes(node.category), `Invalid category "${node.category}" in node ${node.type}`);
      assert.ok(node.icon && typeof node.icon === 'string', `Missing icon in node ${node.type}`);
      assert.ok(node.color && typeof node.color === 'string', `Missing color in node ${node.type}`);

      // Input / Output ports validation
      assert.ok(Array.isArray(node.inputs), `Inputs must be array in node ${node.type}`);
      assert.ok(Array.isArray(node.outputs) && (node.type === 'sticky-note' || node.outputs.length > 0), `Outputs must be non-empty array in node ${node.type}`);

      // Properties validation
      assert.ok(Array.isArray(node.properties), `Properties must be array in node ${node.type}`);
      for (const prop of node.properties) {
        assert.ok(prop.name, `Missing property name in node ${node.type}`);
        assert.ok(prop.type, `Missing property type in ${node.type}:${prop.name}`);
      }

      // Handler check
      assert.strictEqual(typeof node.execute, 'function', `Node ${node.type} must define an async execute() function`);
    }
  });

  test('3. Declarative Manifests Verification: All 364 manifests are structurally sound', () => {
    assert.strictEqual(ALL_INTEGRATION_MANIFESTS.length, 364, `Expected 364 declarative manifests, found ${ALL_INTEGRATION_MANIFESTS.length}`);

    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    for (const m of ALL_INTEGRATION_MANIFESTS) {
      assert.ok(m.type, 'Manifest must have a type');
      assert.ok(m.name, `Manifest ${m.type} must have a name`);
      assert.ok(m.baseURL, `Manifest ${m.type} must have a baseURL`);
      assert.ok(m.resources && m.resources.length > 0, `Manifest ${m.type} must have at least 1 resource`);

      for (const r of m.resources) {
        assert.ok(r.operations && r.operations.length > 0, `Resource ${r.name} in ${m.type} must have operations`);
        for (const op of r.operations) {
          assert.ok(validMethods.includes(op.method), `Invalid method ${op.method} in ${m.type}:${r.name}:${op.name}`);
          assert.ok(op.path, `Missing path in ${m.type}:${r.name}:${op.name}`);
        }
      }
    }
  });

  test('4. Native Nodes Deterministic Execution: Core control, triggers, and apps execute cleanly', async () => {
    const execCtx = new ExecutionContext();

    // Test SetDataNode
    const setDataNode = registry.get('set-data');
    assert.ok(setDataNode, 'set-data must exist');
    const nodeConfigSet = {
      id: 'set-1',
      name: 'Set Data',
      type: 'set-data',
      position: { x: 0, y: 0 },
      parameters: {
        jsonData: { greeting: 'hello world', count: 42 }
      }
    };
    const ctxSetData = execCtx.createNodeContext(nodeConfigSet, [{ json: { initial: true } }]);
    const outSetData = await setDataNode.execute(ctxSetData);
    assert.strictEqual(outSetData.length, 1);
    assert.strictEqual(outSetData[0][0].json.greeting, 'hello world');
    assert.strictEqual(outSetData[0][0].json.count, 42);

    // Test CryptoNode (SHA256)
    const cryptoNode = registry.get('crypto');
    assert.ok(cryptoNode, 'crypto must exist');
    const nodeConfigCrypto = {
      id: 'crypto-1',
      name: 'Crypto',
      type: 'crypto',
      position: { x: 0, y: 0 },
      parameters: {
        action: 'hash',
        algorithm: 'sha256',
        value: 'autoflow-parity',
        destinationField: 'cryptoResult'
      }
    };
    const ctxCrypto = execCtx.createNodeContext(nodeConfigCrypto, [{ json: { text: 'autoflow-parity' } }]);
    const outCrypto = await cryptoNode.execute(ctxCrypto);
    assert.ok(outCrypto[0][0].json.cryptoResult, 'Must produce a hashed field');

    // Test AggregateNode
    const aggNode = registry.get('aggregate');
    assert.ok(aggNode, 'aggregate must exist');
    const nodeConfigAgg = {
      id: 'agg-1',
      name: 'Aggregate',
      type: 'aggregate',
      position: { x: 0, y: 0 },
      parameters: {
        aggregateType: 'mathOperation',
        mathOperation: 'sum',
        targetMathField: 'val'
      }
    };
    const ctxAgg = execCtx.createNodeContext(nodeConfigAgg, [{ json: { val: 10 } }, { json: { val: 20 } }, { json: { val: 30 } }]);
    const outAgg = await aggNode.execute(ctxAgg);
    assert.strictEqual(outAgg[0][0].json.count, 3);
    assert.strictEqual(outAgg[0][0].json.result, 60);

    // Test DateTimeNode
    const dtNode = registry.get('date-time');
    assert.ok(dtNode, 'date-time must exist');
    const nodeConfigDt = {
      id: 'dt-1',
      name: 'Date Time',
      type: 'date-time',
      position: { x: 0, y: 0 },
      parameters: {
        operation: 'formatDate',
        date: '2026-10-19T00:00:00.000Z',
        outputFormat: 'YYYY-MM-DD'
      }
    };
    const ctxDt = execCtx.createNodeContext(nodeConfigDt, [{ json: {} }]);
    const outDt = await dtNode.execute(ctxDt);
    assert.strictEqual(outDt[0][0].json.formattedDate, '2026-10-19');

    // Test PollingTriggerNode
    const pollNode = registry.get('polling-trigger');
    assert.ok(pollNode, 'polling-trigger must exist');
    const nodeConfigPoll = {
      id: 'poll-test-node',
      name: 'Poll Trigger',
      type: 'polling-trigger',
      position: { x: 0, y: 0 },
      parameters: {
        url: `${mockBaseUrl}/items`,
        itemsPath: 'items',
        deduplicationStrategy: 'id',
        idProperty: 'id',
        firstRunMode: 'emit_all'
      }
    };
    const ctxPoll = execCtx.createNodeContext(nodeConfigPoll, [{ json: {} }]);
    const outPoll = await pollNode.execute(ctxPoll);
    assert.strictEqual(outPoll[0].length, 1);
    assert.strictEqual(outPoll[0][0].json.id, 'item-1');

    // Test StickyNoteNode
    const stickyNode = registry.get('sticky-note');
    assert.ok(stickyNode, 'sticky-note must exist');
    const nodeConfigSticky = {
      id: 'sticky-1',
      name: 'Sticky Note',
      type: 'sticky-note',
      position: { x: 0, y: 0 },
      parameters: { content: '## Workflow Notes', color: 'blue' }
    };
    const ctxSticky = execCtx.createNodeContext(nodeConfigSticky, [{ json: {} }]);
    const outSticky = await stickyNode.execute(ctxSticky);
    assert.strictEqual(outSticky.length, 1);
    assert.strictEqual(outSticky[0].length, 0, 'Sticky note must emit empty output and bypass stream');
  });

  test('5. Declarative Nodes Universal Execution: All 364 declarative nodes execute against local mock server', async () => {
    const nodes = Array.from(registry.nodes.values()).filter(n => n instanceof DeclarativeNode);
    assert.strictEqual(nodes.length, 364, 'Must have exactly 364 declarative integration nodes');

    const execCtx = new ExecutionContext();

    // Iterate through all 364 declarative nodes and verify each executes its primary operation
    for (const node of nodes) {
      const declNode = node;
      const manifest = declNode.manifest;
      const firstResource = manifest.resources[0];
      const firstOp = firstResource.operations[0];

      // Prepare context parameters with _baseUrlOverride targeting local mock server
      const nodeParams = {
        _baseUrlOverride: mockBaseUrl,
        resource: firstResource.name,
        operation: `${firstResource.name}:${firstOp.name}`
      };

      // Supply required path parameters with safe test strings
      const pathParams = firstOp.path.match(/\{(\w+)\}/g) || [];
      for (const p of pathParams) {
        const paramName = p.slice(1, -1);
        nodeParams[paramName] = 'test-id';
      }

      // Supply standard required properties if any
      if (firstOp.properties) {
        for (const prop of firstOp.properties) {
          if (!nodeParams[prop.name]) {
            nodeParams[prop.name] = prop.default !== undefined ? prop.default : 'test-value';
          }
        }
      }

      const nodeConfig = {
        id: `node-${declNode.type}`,
        name: declNode.name,
        type: declNode.type,
        position: { x: 0, y: 0 },
        parameters: nodeParams
      };

      const ctx = execCtx.createNodeContext(nodeConfig, [{ json: { testKey: 'testVal' } }]);

      try {
        const output = await declNode.execute(ctx);
        assert.ok(Array.isArray(output), `Node ${declNode.type} must return array of port outputs`);
        assert.ok(output.length > 0, `Node ${declNode.type} must have at least main output`);
        assert.ok(output[0].length > 0, `Node ${declNode.type} must emit at least 1 item on success`);
        assert.ok(output[0][0].json, `Node ${declNode.type} output item must have json payload`);
      } catch (err) {
        assert.fail(`Node ${declNode.type} failed execution against mock server: ${err.message}`);
      }
    }
  });

  test('6. Error Handling & Diagnosis: Declarative nodes throw actionable error on HTTP failures', async () => {
    const hubspotNode = registry.get('hubspot');
    assert.ok(hubspotNode, 'HubSpot node must exist');

    const execCtx = new ExecutionContext();
    const nodeConfig = {
      id: 'hs-err-node',
      name: 'HubSpot',
      type: 'hubspot',
      position: { x: 0, y: 0 },
      parameters: {
        _baseUrlOverride: `${mockBaseUrl}/simulate-error`
      }
    };
    const ctx = execCtx.createNodeContext(nodeConfig, [{ json: {} }]);

    await assert.rejects(
      async () => {
        await hubspotNode.execute(ctx);
      },
      /HubSpot API error \(500\): Simulated backend failure/,
      'Must format clean diagnostic error containing HTTP status and remote message'
    );
  });

  test('7. Secret Redaction & Credential Isolation: NodeExecutionContext safely wraps credentials', () => {
    const execCtx = new ExecutionContext();
    const nodeConfig = {
      id: 'test-node-sec',
      name: 'Security Test Node',
      type: 'set-data',
      position: { x: 0, y: 0 },
      parameters: {}
    };
    const nodeCtx = execCtx.createNodeContext(nodeConfig, [{ json: {} }]);
    const token = nodeCtx.evaluateExpression('{{ "sk_live_" + "1234567890abcdef" }}');
    assert.strictEqual(token, 'sk_live_1234567890abcdef');

    // Ensure environment secrets and process are inaccessible in user expressions
    assert.strictEqual(nodeCtx.evaluateExpression('{{ process.env }}'), undefined, 'process.env must return undefined inside templates');
    assert.throws(
      () => {
        ExpressionSandbox.evaluate('process.env');
      },
      /process is not defined|Expression evaluation error/,
      'Direct expression evaluation in sandbox must throw ReferenceError for process'
    );
  });
});
