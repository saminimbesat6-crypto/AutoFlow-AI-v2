const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { createApp } = require('../dist/server');

describe('AutoFlow AI Dual Webhook Mode (n8n Parity: Test vs Production) Suite', () => {
  let app;
  let server;
  let port;
  let baseUrl;
  let workflowRepo;
  let webhookManager;
  let serverInstance;

  before(async () => {
    serverInstance = createApp();
    app = serverInstance.app;
    workflowRepo = serverInstance.workflowRepo;
    webhookManager = serverInstance.webhookManager;

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(() => {
    if (server) server.close();
    if (serverInstance?.schedulerManager) serverInstance.schedulerManager.destroy();
  });

  test('1. Production Webhook: Inactive workflow rejects production URL (/webhook/:path)', async () => {
    const wf = workflowRepo.create({
      name: 'Order Webhook Intake',
      nodes: [
        {
          id: 'wh-1',
          name: 'Webhook',
          type: 'webhook-trigger',
          position: { x: 0, y: 0 },
          parameters: { path: 'orders-intake', httpMethod: 'POST' }
        }
      ],
      connections: [],
      settings: {},
      active: false
    });

    const res = await fetch(`${baseUrl}/webhook/orders-intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'ord-1001' })
    });

    assert.strictEqual(res.status, 404, 'Inactive workflow is not registered on production endpoint');
  });

  test('2. Dual Webhook: Test URL (/webhook-test/:path) captures event and pushes to waiting editor listener', async () => {
    const wf = workflowRepo.create({
      name: 'Customer Survey Test Flow',
      nodes: [
        {
          id: 'wh-survey',
          name: 'Survey Webhook',
          type: 'webhook-trigger',
          position: { x: 0, y: 0 },
          parameters: { path: 'customer-survey', httpMethod: 'POST' }
        }
      ],
      connections: [],
      settings: {},
      active: false
    });

    // Start listening in test mode (mimics editor clicking "Listen for Test Event")
    const listenPromise = webhookManager.registerTestListener(
      wf.id,
      'wh-survey',
      'customer-survey',
      'POST',
      5000
    );

    // External client sends payload to Test URL
    const sendRes = await fetch(`${baseUrl}/webhook-test/customer-survey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Test-Trace': 'trace-1234' },
      body: JSON.stringify({ rating: 5, comments: 'Phenomenal automation engine!' })
    });

    assert.strictEqual(sendRes.status, 200);
    const sendJson = await sendRes.json();
    assert.strictEqual(sendJson.success, true);
    assert.strictEqual(sendJson.data.message, 'Test event captured and dispatched to editor listener');

    // Verify listener received the event
    const eventResult = await listenPromise;
    assert.strictEqual(eventResult.success, true);
    assert.strictEqual(eventResult.event.body.rating, 5);
    assert.strictEqual(eventResult.event.headers['x-test-trace'], 'trace-1234');
    assert.ok(Array.isArray(eventResult.outputData), 'Must produce outputData for canvas preview');
  });

  test('3. Test Webhook: Automatically executes inactive workflow when no active listener is held', async () => {
    const wf = workflowRepo.create({
      name: 'Direct Test Execution Flow',
      nodes: [
        {
          id: 'wh-direct',
          name: 'Webhook',
          type: 'webhook-trigger',
          position: { x: 0, y: 0 },
          parameters: { path: 'direct-test-pipe', httpMethod: 'POST' }
        },
        {
          id: 'set-data-node',
          name: 'Transform Data',
          type: 'set-data',
          position: { x: 200, y: 0 },
          parameters: {
            jsonData: { transformed: true }
          }
        }
      ],
      connections: [
        { source: 'Webhook', sourceOutput: 0, target: 'Transform Data', targetInput: 0 }
      ],
      settings: {},
      active: false
    });

    // Send payload directly to test endpoint
    const res = await fetch(`${baseUrl}/webhook-test/direct-test-pipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer: 'Bob', action: 'checkout' })
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.executionId, 'Executes test run without requiring workflow activation');
  });

  test('4. Listener Timeout & Cancellation handling', async () => {
    const timeoutPromise = webhookManager.registerTestListener(
      'dummy-wf',
      'dummy-node',
      'timeout-endpoint',
      'POST',
      100 // 100ms timeout
    );

    const result = await timeoutPromise;
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('Timed out waiting for test webhook event'));
  });
});
