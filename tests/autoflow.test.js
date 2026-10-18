const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

// Load compiled modules from dist
const { getDatabase, closeDatabase } = require('../dist/database/connection');
const { runMigrations } = require('../dist/database/migrations');
const { CredentialsManager } = require('../dist/credentials/manager');
const { WorkflowGraph } = require('../dist/engine/graph');
const { ExecutionContext } = require('../dist/engine/context');
const { WorkflowExecutor } = require('../dist/engine/executor');
const { WorkflowAdapter } = require('../dist/engine/adapter');
const { WorkflowRepository } = require('../dist/database/repositories/workflow-repository');
const { NodeRegistry } = require('../dist/nodes/registry');
const { ExpressionSandbox } = require('../dist/engine/sandbox');

describe('AutoFlow AI Core Test Suite', () => {
  let db;
  let testDbPath;

  before(() => {
    testDbPath = path.join(__dirname, 'test-autoflow.sqlite');
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    db = getDatabase(testDbPath);
    runMigrations(db);
  });

  after(() => {
    closeDatabase();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  test('1. Credentials Manager: Encrypts and Decrypts at rest', () => {
    const credMgr = new CredentialsManager(db);
    const created = credMgr.create('Test Gemini Key', 'gemini_api_key', {
      apiKey: 'AIzaSySecretTestKey123'
    });

    assert.ok(created.id, 'Credential ID should be generated');
    assert.strictEqual(created.name, 'Test Gemini Key');

    // Verify safe retrieval (secret is not exposed in list)
    const list = credMgr.list();
    const found = list.find((c) => c.id === created.id);
    assert.ok(found);
    assert.strictEqual(found.data, undefined, 'Secret should be hidden in list');

    // Verify decrypted retrieval
    const retrieved = credMgr.get(created.id, true);
    assert.ok(retrieved && retrieved.data);
    assert.strictEqual(retrieved.data.apiKey, 'AIzaSySecretTestKey123');
  });

  test('2. Workflow Graph: Validates DAG and detects cycles', () => {
    // Valid linear workflow
    const validWf = {
      id: 'wf-1',
      name: 'Linear Workflow',
      nodes: [
        { id: 'n1', name: 'Start', type: 'manual-trigger', position: { x: 0, y: 0 }, parameters: {} },
        { id: 'n2', name: 'HTTP', type: 'http-request', position: { x: 100, y: 0 }, parameters: {} },
        { id: 'n3', name: 'Condition', type: 'if-condition', position: { x: 200, y: 0 }, parameters: {} }
      ],
      connections: [
        { source: 'Start', sourceOutput: 0, target: 'HTTP', targetInput: 0 },
        { source: 'HTTP', sourceOutput: 0, target: 'Condition', targetInput: 0 }
      ],
      settings: {},
      active: false,
      createdAt: '',
      updatedAt: ''
    };

    const graph = new WorkflowGraph(validWf);
    const res = graph.validate();
    assert.strictEqual(res.valid, true);
    assert.deepStrictEqual(res.executionOrder, ['n1', 'n2', 'n3']);

    // Cyclic workflow
    const cyclicWf = {
      ...validWf,
      connections: [
        { source: 'Start', sourceOutput: 0, target: 'HTTP', targetInput: 0 },
        { source: 'HTTP', sourceOutput: 0, target: 'Condition', targetInput: 0 },
        { source: 'Condition', sourceOutput: 0, target: 'Start', targetInput: 0 } // cycle!
      ]
    };

    const cyclicGraph = new WorkflowGraph(cyclicWf);
    const cycleRes = cyclicGraph.validate();
    assert.strictEqual(cycleRes.valid, false);
    assert.ok(cycleRes.errors[0].includes('contains a cycle'));
  });

  test('3. Execution Context: Evaluates complex expressions', () => {
    const context = new ExecutionContext();
    const items = [
      { json: { user: 'Alice', score: 95, tags: ['ai', 'agent'] } }
    ];

    const expr1 = '{{ $json.user }}';
    assert.strictEqual(context.evaluateExpression(expr1, items, 0, context), 'Alice');

    const expr2 = '{{ $json.score > 90 ? "Pass" : "Fail" }}';
    assert.strictEqual(context.evaluateExpression(expr2, items, 0, context), 'Pass');

    const expr3 = 'User {{ $json.user }} has score {{ $json.score }}';
    assert.strictEqual(context.evaluateExpression(expr3, items, 0, context), 'User Alice has score 95');
  });

  test('4. Workflow Adapter: Bidirectional n8n compatibility', () => {
    const n8nWorkflow = {
      name: 'Sample n8n Export',
      nodes: [
        { id: 'n8n_1', name: 'Start', type: 'n8n-nodes-base.manualTrigger', position: [100, 200], parameters: {} },
        { id: 'n8n_2', name: 'Fetch', type: 'n8n-nodes-base.httpRequest', position: [300, 200], parameters: { url: 'https://example.com' } }
      ],
      connections: {
        Start: {
          main: [
            [{ node: 'Fetch', type: 'main', index: 0 }]
          ]
        }
      }
    };

    // Convert from n8n format
    const autoFlowWf = WorkflowAdapter.fromN8n(n8nWorkflow);
    assert.strictEqual(autoFlowWf.name, 'Sample n8n Export');
    assert.strictEqual(autoFlowWf.nodes.length, 2);
    assert.strictEqual(autoFlowWf.nodes[0].type, 'manual-trigger');
    assert.strictEqual(autoFlowWf.nodes[1].type, 'http-request');
    assert.strictEqual(autoFlowWf.connections.length, 1);
    assert.strictEqual(autoFlowWf.connections[0].source, 'Start');
    assert.strictEqual(autoFlowWf.connections[0].target, 'Fetch');

    // Convert back to n8n format
    const convertedBack = WorkflowAdapter.toN8n(autoFlowWf);
    assert.ok(convertedBack.connections.Start);
    assert.strictEqual(convertedBack.connections.Start.main[0][0].node, 'Fetch');
  });

  test('5. Execution Engine: Real execution with data passing and branching', async () => {
    const executor = new WorkflowExecutor(db);

    const workflow = {
      id: 'wf-exec-test',
      name: 'Data Passing and Branching Test',
      nodes: [
        {
          id: 'n_start',
          name: 'Start',
          type: 'manual-trigger',
          position: { x: 0, y: 0 },
          parameters: {}
        },
        {
          id: 'n_set',
          name: 'Set Test Data',
          type: 'set-data',
          position: { x: 200, y: 0 },
          parameters: {
            mode: 'replace',
            jsonData: '{\n  "value": 42,\n  "status": "APPROVED"\n}'
          }
        },
        {
          id: 'n_if',
          name: 'Condition Check',
          type: 'if-condition',
          position: { x: 400, y: 0 },
          parameters: {
            value1: '{{ $json.status }}',
            operation: 'equals',
            value2: 'APPROVED'
          }
        },
        {
          id: 'n_code_true',
          name: 'Approved Handler',
          type: 'code',
          position: { x: 600, y: -50 },
          parameters: {
            mode: 'runOnceForAllItems',
            jsCode: 'return [{ json: { outcome: "SUCCESS_APPROVED", original: $input.first().json } }];'
          }
        },
        {
          id: 'n_code_false',
          name: 'Rejected Handler',
          type: 'code',
          position: { x: 600, y: 100 },
          parameters: {
            mode: 'runOnceForAllItems',
            jsCode: 'return [{ json: { outcome: "REJECTED" } }];'
          }
        }
      ],
      connections: [
        { source: 'Start', sourceOutput: 0, target: 'Set Test Data', targetInput: 0 },
        { source: 'Set Test Data', sourceOutput: 0, target: 'Condition Check', targetInput: 0 },
        { source: 'Condition Check', sourceOutput: 0, target: 'Approved Handler', targetInput: 0 }, // True branch
        { source: 'Condition Check', sourceOutput: 1, target: 'Rejected Handler', targetInput: 0 }  // False branch
      ],
      settings: {},
      active: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const execution = await executor.execute(workflow, { mode: 'manual' });
    assert.strictEqual(execution.status, 'success', `Execution should succeed: ${execution.errorMessage}`);
    assert.ok(execution.duration >= 0);

    // Retrieve saved execution from database
    const details = executor.getExecution(execution.id);
    assert.ok(details);
    assert.strictEqual(details.nodes.length, 4, 'Should execute 4 nodes (Start, Set, IF, Approved Handler). Rejected Handler should be skipped.');

    const approvedNode = details.nodes.find((n) => n.nodeName === 'Approved Handler');
    assert.ok(approvedNode);
    assert.strictEqual(approvedNode.status, 'success');
    assert.strictEqual(approvedNode.outputData[0][0].json.outcome, 'SUCCESS_APPROVED');
    assert.strictEqual(approvedNode.outputData[0][0].json.original.value, 42);

    const rejectedNode = details.nodes.find((n) => n.nodeName === 'Rejected Handler');
    assert.strictEqual(rejectedNode, undefined, 'Rejected branch should not have executed');
  });

  test('6. Real Acceptance Test: Manual Trigger -> HTTP Request -> Condition -> Output', async () => {
    const executor = new WorkflowExecutor(db);

    const acceptanceWorkflow = {
      id: 'wf-acceptance',
      name: 'Acceptance Pipeline (HTTP Request -> Condition)',
      nodes: [
        {
          id: 'start_node',
          name: 'Manual Trigger',
          type: 'manual-trigger',
          position: { x: 50, y: 100 },
          parameters: {}
        },
        {
          id: 'http_node',
          name: 'Fetch Post',
          type: 'http-request',
          position: { x: 250, y: 100 },
          parameters: {
            url: 'https://jsonplaceholder.typicode.com/posts/1',
            method: 'GET'
          }
        },
        {
          id: 'condition_node',
          name: 'Check Response Status',
          type: 'if-condition',
          position: { x: 500, y: 100 },
          parameters: {
            value1: '{{ $json.statusCode }}',
            operation: 'equals',
            value2: '200'
          }
        },
        {
          id: 'output_node',
          name: 'Format Result',
          type: 'set-data',
          position: { x: 750, y: 100 },
          parameters: {
            mode: 'replace',
            jsonData: '{\n  "status": "PASSED",\n  "postTitle": "{{ $node[\"Fetch Post\"].json.data.title }}"\n}'
          }
        }
      ],
      connections: [
        { source: 'Manual Trigger', sourceOutput: 0, target: 'Fetch Post', targetInput: 0 },
        { source: 'Fetch Post', sourceOutput: 0, target: 'Check Response Status', targetInput: 0 },
        { source: 'Check Response Status', sourceOutput: 0, target: 'Format Result', targetInput: 0 }
      ],
      settings: {},
      active: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await executor.execute(acceptanceWorkflow, { mode: 'manual' });
    assert.strictEqual(result.status, 'success', `Execution should succeed: ${result.errorMessage}`);

    const details = executor.getExecution(result.id);
    assert.ok(details);

    const httpNode = details.nodes.find((n) => n.nodeName === 'Fetch Post');
    assert.ok(httpNode && httpNode.status === 'success');
    assert.strictEqual(httpNode.outputData[0][0].json.statusCode, 200);
    assert.ok(httpNode.outputData[0][0].json.data.title, 'Should have received real post title from external API');

    const formatNode = details.nodes.find((n) => n.nodeName === 'Format Result');
    assert.ok(formatNode && formatNode.status === 'success');
    assert.strictEqual(formatNode.outputData[0][0].json.status, 'PASSED');
    assert.ok(formatNode.outputData[0][0].json.postTitle.length > 0);
  });

  test('7. Gemini Node: Displays meaningful error when key is missing or invalid', async () => {
    const executor = new WorkflowExecutor(db);

    const geminiWorkflow = {
      id: 'wf-gemini-error-test',
      name: 'Gemini Missing Key Test',
      nodes: [
        { id: 'g_start', name: 'Start', type: 'manual-trigger', position: { x: 0, y: 0 }, parameters: {} },
        {
          id: 'g_node',
          name: 'Gemini',
          type: 'gemini',
          position: { x: 200, y: 0 },
          parameters: { prompt: 'Hello world' }
        }
      ],
      connections: [
        { source: 'Start', sourceOutput: 0, target: 'Gemini', targetInput: 0 }
      ],
      settings: {},
      active: false,
      createdAt: '',
      updatedAt: ''
    };

    // Run without configured key
    const res = await executor.execute(geminiWorkflow, { mode: 'manual' });
    assert.strictEqual(res.status, 'error');
    assert.ok(
      res.errorMessage.includes('Gemini API key is not configured'),
      `Expected missing key error, got: ${res.errorMessage}`
    );
  });

  test('8. Filter & Crypto Nodes: Process, route and hash data', async () => {
    const executor = new WorkflowExecutor(db);

    const testWorkflow = {
      id: 'wf-crypto-filter-test',
      name: 'Crypto & Filter Pipeline',
      nodes: [
        { id: 'start_node', name: 'Start', type: 'manual-trigger', position: { x: 0, y: 0 }, parameters: {} },
        {
          id: 'crypto_node',
          name: 'Generate Hash',
          type: 'crypto',
          position: { x: 200, y: 0 },
          parameters: {
            action: 'hash',
            algorithm: 'sha256',
            value: 'AutoFlowTest123',
            destinationField: 'sha256Hash'
          }
        },
        {
          id: 'filter_node',
          name: 'Filter Items',
          type: 'filter',
          position: { x: 400, y: 0 },
          parameters: {
            value1: '{{ $json.sha256Hash }}',
            operation: 'isNotEmpty'
          }
        }
      ],
      connections: [
        { source: 'Start', sourceOutput: 0, target: 'Generate Hash', targetInput: 0 },
        { source: 'Generate Hash', sourceOutput: 0, target: 'Filter Items', targetInput: 0 }
      ],
      settings: {},
      active: false,
      createdAt: '',
      updatedAt: ''
    };

    const res = await executor.execute(testWorkflow, { mode: 'manual' });
    assert.strictEqual(res.status, 'success');

    const details = executor.getExecution(res.id);
    const hashNode = details.nodes.find((n) => n.nodeId === 'crypto_node');
    assert.ok(hashNode && hashNode.outputData[0][0].json.sha256Hash);
    assert.strictEqual(hashNode.outputData[0][0].json.sha256Hash.length, 64); // sha256 hex is 64 chars

    const filterNode = details.nodes.find((n) => n.nodeId === 'filter_node');
    assert.strictEqual(filterNode.outputData[0].length, 1, 'Item should be kept by filter');
  });

  test('9. App Nodes: Telegram, Discord, and Email dispatch correctly', async () => {
    const executor = new WorkflowExecutor(db);

    const appWorkflow = {
      id: 'wf-app-nodes-test',
      name: 'App Nodes Pipeline',
      nodes: [
        { id: 'start', name: 'Start', type: 'manual-trigger', position: { x: 0, y: 0 }, parameters: {} },
        {
          id: 'tg_node',
          name: 'Telegram Alert',
          type: 'telegram',
          position: { x: 200, y: 0 },
          parameters: {
            botToken: 'test-bot-token-999',
            chatId: '12345678',
            text: 'AutoFlow operational alert'
          }
        },
        {
          id: 'dc_node',
          name: 'Discord Notification',
          type: 'discord',
          position: { x: 400, y: 0 },
          parameters: {
            webhookUrl: 'https://discord.com/api/webhooks/mock/test',
            content: 'Pipeline finished',
            sendEmbed: true,
            embedTitle: 'Execution Succeeded',
            embedDescription: 'All test conditions met.'
          }
        },
        {
          id: 'email_node',
          name: 'Email Report',
          type: 'email',
          position: { x: 600, y: 0 },
          parameters: {
            to: 'ops-test@example.com',
            subject: 'Daily Digest',
            body: '<p>Report content</p>',
            sendMode: 'simulated'
          }
        }
      ],
      connections: [
        { source: 'Start', sourceOutput: 0, target: 'Telegram Alert', targetInput: 0 },
        { source: 'Telegram Alert', sourceOutput: 0, target: 'Discord Notification', targetInput: 0 },
        { source: 'Discord Notification', sourceOutput: 0, target: 'Email Report', targetInput: 0 }
      ],
      settings: {},
      active: false,
      createdAt: '',
      updatedAt: ''
    };

    const res = await executor.execute(appWorkflow, { mode: 'manual' });
    assert.strictEqual(res.status, 'success', `Execution should succeed: ${res.errorMessage}`);

    const details = executor.getExecution(res.id);
    const tgResult = details.nodes.find((n) => n.nodeId === 'tg_node');
    assert.ok(tgResult && tgResult.outputData[0][0].json.success);
    assert.strictEqual(tgResult.outputData[0][0].json.chatId, '12345678');

    const dcResult = details.nodes.find((n) => n.nodeId === 'dc_node');
    assert.ok(dcResult && dcResult.outputData[0][0].json.success);
    assert.strictEqual(dcResult.outputData[0][0].json.status, 204);

    const emailResult = details.nodes.find((n) => n.nodeId === 'email_node');
    assert.ok(emailResult && emailResult.outputData[0][0].json.success);
    assert.strictEqual(emailResult.outputData[0][0].json.to, 'ops-test@example.com');
  });

  test('10. Node Registry: Correctly exports all registered nodes including apps', () => {
    const registry = NodeRegistry.getInstance();
    const list = registry.list();
    const types = list.map((n) => n.type);

    assert.ok(types.includes('telegram'), 'Registry should include telegram');
    assert.ok(types.includes('discord'), 'Registry should include discord');
    assert.ok(types.includes('email'), 'Registry should include email');
    assert.ok(types.includes('whatsapp'), 'Registry should include whatsapp');
    assert.ok(types.includes('instagram'), 'Registry should include instagram');
    assert.ok(types.includes('slack'), 'Registry should include slack');
    assert.ok(types.includes('google-sheets'), 'Registry should include google-sheets');
    assert.ok(types.includes('airtable'), 'Registry should include airtable');
    assert.ok(types.includes('github'), 'Registry should include github');
    assert.ok(types.includes('stripe'), 'Registry should include stripe');
    assert.ok(types.includes('email-trigger'), 'Registry should include email-trigger');
    assert.ok(types.includes('gemini'), 'Registry should include gemini');
    assert.ok(types.includes('ai-agent'), 'Registry should include ai-agent');
  });

  test('11. Social & Workspace App Integrations: WhatsApp, Instagram, Slack, Sheets, Airtable, GitHub, Stripe', async () => {
    const executor = new WorkflowExecutor(db);

    const socialWorkflow = {
      id: 'wf-social-apps-test',
      name: 'Omnichannel Social & Workspace Suite',
      nodes: [
        { id: 'node_em_in', name: 'Email Inbound', type: 'email-trigger', position: { x: 0, y: 0 }, parameters: {} },
        {
          id: 'node_wa',
          name: 'WhatsApp Dispatch',
          type: 'whatsapp',
          position: { x: 200, y: 0 },
          parameters: {
            phoneNumberId: '100123456',
            accessToken: 'test-token',
            recipient: '+14155552671',
            message: 'Hello from AutoFlow!'
          }
        },
        {
          id: 'node_ig',
          name: 'Instagram Reply',
          type: 'instagram',
          position: { x: 400, y: 0 },
          parameters: {
            accessToken: 'test-token',
            instagramAccountId: '178414',
            recipientId: '179999',
            message: 'Thanks for reaching out!'
          }
        },
        {
          id: 'node_slack',
          name: 'Slack Notification',
          type: 'slack',
          position: { x: 600, y: 0 },
          parameters: {
            webhookUrl: 'https://hooks.slack.com/services/mock/T00/B00/X',
            text: 'Automated omnichannel alert'
          }
        },
        {
          id: 'node_sheets',
          name: 'Google Sheets Log',
          type: 'google-sheets',
          position: { x: 800, y: 0 },
          parameters: {
            spreadsheetId: 'sheet-123',
            accessToken: 'test-token',
            rowValues: ['AutoFlow', 'Success']
          }
        },
        {
          id: 'node_airtable',
          name: 'Airtable Record',
          type: 'airtable',
          position: { x: 1000, y: 0 },
          parameters: {
            baseId: 'app123',
            tableName: 'Customers',
            apiKey: 'test-pat',
            fieldsJson: '{"Name": "Test User"}'
          }
        },
        {
          id: 'node_github',
          name: 'GitHub Issue',
          type: 'github',
          position: { x: 1200, y: 0 },
          parameters: {
            token: 'test-token',
            owner: 'saminimbesat6-crypto',
            repo: 'AutoFlow-AI-v2',
            title: 'Automated Test Issue'
          }
        },
        {
          id: 'node_stripe',
          name: 'Stripe Customer',
          type: 'stripe',
          position: { x: 1400, y: 0 },
          parameters: {
            apiKey: 'test-key',
            customerEmail: 'test-customer@example.com'
          }
        }
      ],
      connections: [
        { source: 'Email Inbound', sourceOutput: 0, target: 'WhatsApp Dispatch', targetInput: 0 },
        { source: 'WhatsApp Dispatch', sourceOutput: 0, target: 'Instagram Reply', targetInput: 0 },
        { source: 'Instagram Reply', sourceOutput: 0, target: 'Slack Notification', targetInput: 0 },
        { source: 'Slack Notification', sourceOutput: 0, target: 'Google Sheets Log', targetInput: 0 },
        { source: 'Google Sheets Log', sourceOutput: 0, target: 'Airtable Record', targetInput: 0 },
        { source: 'Airtable Record', sourceOutput: 0, target: 'GitHub Issue', targetInput: 0 },
        { source: 'GitHub Issue', sourceOutput: 0, target: 'Stripe Customer', targetInput: 0 }
      ],
      settings: {},
      active: false,
      createdAt: '',
      updatedAt: ''
    };

    const res = await executor.execute(socialWorkflow, { mode: 'manual' });
    assert.strictEqual(res.status, 'success', `Execution should succeed: ${res.errorMessage}`);

    const details = executor.getExecution(res.id);
    assert.strictEqual(details.nodes.length, 8);

    const wa = details.nodes.find((n) => n.nodeId === 'node_wa');
    assert.ok(wa && wa.outputData[0][0].json.success);
    assert.strictEqual(wa.outputData[0][0].json.recipient, '14155552671');

    const ig = details.nodes.find((n) => n.nodeId === 'node_ig');
    assert.ok(ig && ig.outputData[0][0].json.success);

    const slack = details.nodes.find((n) => n.nodeId === 'node_slack');
    assert.ok(slack && slack.outputData[0][0].json.success);

    const sheets = details.nodes.find((n) => n.nodeId === 'node_sheets');
    assert.ok(sheets && sheets.outputData[0][0].json.success);

    const airtable = details.nodes.find((n) => n.nodeId === 'node_airtable');
    assert.ok(airtable && airtable.outputData[0][0].json.success);

    const github = details.nodes.find((n) => n.nodeId === 'node_github');
    assert.ok(github && github.outputData[0][0].json.success);

    const stripe = details.nodes.find((n) => n.nodeId === 'node_stripe');
    assert.ok(stripe && stripe.outputData[0][0].json.success);
    assert.strictEqual(stripe.outputData[0][0].json.email, 'test-customer@example.com');
  });

  test('12. Switch Node: Multi-rule branching and fallback routing', async () => {
    const executor = new WorkflowExecutor(db);

    const switchWf = {
      id: 'wf-switch-test',
      name: 'Switch Multi-Rule Routing',
      nodes: [
        { id: 'start', name: 'Start', type: 'manual-trigger', position: { x: 0, y: 0 }, parameters: {} },
        {
          id: 'sw_node',
          name: 'Route by Role',
          type: 'switch',
          position: { x: 200, y: 0 },
          parameters: {
            mode: 'rules',
            rules: [
              { field: '{{ $json.role }}', operation: 'equals', value: 'admin', outputIndex: 0 },
              { field: '{{ $json.role }}', operation: 'equals', value: 'manager', outputIndex: 1 }
            ],
            fallbackOutput: 3
          }
        }
      ],
      connections: [
        { source: 'Start', sourceOutput: 0, target: 'Route by Role', targetInput: 0 }
      ],
      settings: {},
      active: false,
      createdAt: '',
      updatedAt: ''
    };

    const initialData = [
      { json: { name: 'Alice', role: 'admin' } },
      { json: { name: 'Bob', role: 'manager' } },
      { json: { name: 'Charlie', role: 'guest' } }
    ];

    const res = await executor.execute(switchWf, { mode: 'manual', initialData });
    assert.strictEqual(res.status, 'success');

    const details = executor.getExecution(res.id);
    const swResult = details.nodes.find((n) => n.nodeId === 'sw_node');
    assert.ok(swResult);

    // Output 0 should have Alice (admin)
    assert.strictEqual(swResult.outputData[0].length, 1);
    assert.strictEqual(swResult.outputData[0][0].json.name, 'Alice');

    // Output 1 should have Bob (manager)
    assert.strictEqual(swResult.outputData[1].length, 1);
    assert.strictEqual(swResult.outputData[1][0].json.name, 'Bob');

    // Output 3 (fallback) should have Charlie (guest)
    assert.strictEqual(swResult.outputData[3].length, 1);
    assert.strictEqual(swResult.outputData[3][0].json.name, 'Charlie');
  });

  test('13. Loop Node: Micro-batch iteration across items', async () => {
    const executor = new WorkflowExecutor(db);

    const loopWf = {
      id: 'wf-loop-test',
      name: 'Loop Over Items Test',
      nodes: [
        { id: 'start', name: 'Start', type: 'manual-trigger', position: { x: 0, y: 0 }, parameters: {} },
        {
          id: 'loop_node',
          name: 'Batch Loop',
          type: 'loop',
          position: { x: 200, y: 0 },
          parameters: { batchSize: 2 }
        }
      ],
      connections: [
        { source: 'Start', sourceOutput: 0, target: 'Batch Loop', targetInput: 0 }
      ],
      settings: {},
      active: false,
      createdAt: '',
      updatedAt: ''
    };

    const items = [
      { json: { id: 1 } },
      { json: { id: 2 } },
      { json: { id: 3 } }
    ];

    const res = await executor.execute(loopWf, { mode: 'manual', initialData: items });
    assert.strictEqual(res.status, 'success');

    const details = executor.getExecution(res.id);
    const loopResult = details.nodes.find((n) => n.nodeId === 'loop_node');
    assert.ok(loopResult);

    // Initial batch of 2 items routed to loop output (port 0)
    assert.strictEqual(loopResult.outputData[0].length, 2);
    assert.strictEqual(loopResult.outputData[0][0].json.id, 1);
    assert.strictEqual(loopResult.outputData[0][1].json.id, 2);
  });

  test('14. Wait Node: Time delay and webhook resume state', async () => {
    const executor = new WorkflowExecutor(db);

    const waitWf = {
      id: 'wf-wait-test',
      name: 'Wait Operations Test',
      nodes: [
        { id: 'start', name: 'Start', type: 'manual-trigger', position: { x: 0, y: 0 }, parameters: {} },
        {
          id: 'wait_node',
          name: 'Wait Webhook',
          type: 'wait',
          position: { x: 200, y: 0 },
          parameters: { resumeMode: 'webhook' }
        }
      ],
      connections: [
        { source: 'Start', sourceOutput: 0, target: 'Wait Webhook', targetInput: 0 }
      ],
      settings: {},
      active: false,
      createdAt: '',
      updatedAt: ''
    };

    const res = await executor.execute(waitWf, { mode: 'manual', initialData: [{ json: { task: 'pause' } }] });
    assert.strictEqual(res.status, 'success');

    const details = executor.getExecution(res.id);
    const waitResult = details.nodes.find((n) => n.nodeId === 'wait_node');
    assert.ok(waitResult);
    assert.ok(waitResult.outputData[0][0].json.resumeToken.startsWith('res_'));
    assert.ok(waitResult.outputData[0][0].json.resumeUrl.includes('/webhook/resume/'));
  });

  test('15. Binary File Operations: Read, write, and parse CSV data', async () => {
    const executor = new WorkflowExecutor(db);
    const tmpFilePath = path.join(__dirname, 'test-sample.csv');
    fs.writeFileSync(tmpFilePath, 'id,name,role\n1,Alice,Admin\n2,Bob,Developer\n');

    try {
      const fileWf = {
        id: 'wf-file-test',
        name: 'File Operations Pipeline',
        nodes: [
          { id: 'start', name: 'Start', type: 'manual-trigger', position: { x: 0, y: 0 }, parameters: {} },
          {
            id: 'file_read',
            name: 'Read CSV File',
            type: 'read-write-file',
            position: { x: 200, y: 0 },
            parameters: { operation: 'read', filePath: tmpFilePath }
          },
          {
            id: 'file_extract',
            name: 'Extract Rows',
            type: 'extract-from-file',
            position: { x: 400, y: 0 },
            parameters: { fileFormat: 'csv', headerRow: true }
          }
        ],
        connections: [
          { source: 'Start', sourceOutput: 0, target: 'Read CSV File', targetInput: 0 },
          { source: 'Read CSV File', sourceOutput: 0, target: 'Extract Rows', targetInput: 0 }
        ],
        settings: {},
        active: false,
        createdAt: '',
        updatedAt: ''
      };

      const res = await executor.execute(fileWf, { mode: 'manual' });
      assert.strictEqual(res.status, 'success');

      const details = executor.getExecution(res.id);
      const extractResult = details.nodes.find((n) => n.nodeId === 'file_extract');
      assert.ok(extractResult);
      assert.strictEqual(extractResult.outputData[0].length, 2);
      assert.strictEqual(extractResult.outputData[0][0].json.name, 'Alice');
      assert.strictEqual(extractResult.outputData[0][1].json.name, 'Bob');
    } finally {
      if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
    }
  });

  test('16. Error Handling: onError continueErrorOutput routes failure to port 1 without halting workflow', async () => {
    const executor = new WorkflowExecutor(db);

    const errorRoutingWf = {
      id: 'wf-error-routing-test',
      name: 'Error Output Routing Test',
      nodes: [
        { id: 'start', name: 'Start', type: 'manual-trigger', position: { x: 0, y: 0 }, parameters: {} },
        {
          id: 'bad_node',
          name: 'Failing Node',
          type: 'http-request',
          position: { x: 200, y: 0 },
          parameters: { url: '' }, // Missing URL triggers intentional error
          onError: 'continueErrorOutput'
        },
        {
          id: 'error_handler',
          name: 'Handle Error Output',
          type: 'set-data',
          position: { x: 400, y: 0 },
          parameters: {
            mode: 'rawJson',
            jsonData: '{\n  "recovered": true,\n  "caughtError": "{{ $json.error }}"\n}'
          }
        }
      ],
      connections: [
        { source: 'Start', sourceOutput: 0, target: 'Failing Node', targetInput: 0 },
        { source: 'Failing Node', sourceOutput: 1, target: 'Handle Error Output', targetInput: 0 }
      ],
      settings: {},
      active: false,
      createdAt: '',
      updatedAt: ''
    };

    const res = await executor.execute(errorRoutingWf, { mode: 'manual' });
    // Workflow should SUCCEED overall because error was caught and routed down error port
    assert.strictEqual(res.status, 'success', `Expected success, got: ${res.errorMessage}`);

    const details = executor.getExecution(res.id);
    const handlerNode = details.nodes.find((n) => n.nodeId === 'error_handler');
    assert.ok(handlerNode && handlerNode.outputData[0][0].json.recovered);
    assert.ok(handlerNode.outputData[0][0].json.caughtError.includes('requires a URL'));
  });

  test('17. Expression Sandbox: Evaluates expressions safely and rejects access to process or fs', () => {
    // 1. Valid expressions
    const resultMath = ExpressionSandbox.evaluate('Math.max(10, 42)');
    assert.strictEqual(resultMath, 42);

    const resultInterpolate = ExpressionSandbox.interpolate('Hello {{ $json.user }}!', {
      itemData: { json: { user: 'World' } }
    });
    assert.strictEqual(resultInterpolate, 'Hello World!');

    // 2. Security: process and require are undefined
    assert.throws(() => {
      ExpressionSandbox.evaluate('process.exit(1)');
    });
    assert.throws(() => {
      ExpressionSandbox.evaluate('require("fs")');
    });
  });
});


