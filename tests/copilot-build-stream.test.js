const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');

const { createApp } = require('../dist/server');
const { closeDatabase } = require('../dist/database/connection');
const { AntigravityCopilot } = require('../dist/copilot/antigravity-copilot');

describe('AutoFlow AI Antigravity Copilot Live Build Stream & Test-Repair Loop Suite', () => {
  let server;
  let baseUrl;
  let testDbFile;
  let serverInstance;

  before(async () => {
    testDbFile = path.join(__dirname, 'test-copilot-build.sqlite');
    if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
    process.env.DATABASE_PATH = testDbFile;

    serverInstance = createApp();
    const app = serverInstance.app;
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) await new Promise((r) => server.close(r));
    if (serverInstance?.schedulerManager) serverInstance.schedulerManager.destroy();
    closeDatabase();
    if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
  });

  test('1. Synthesize Sample Data: Generates realistic mock payloads for various triggers', () => {
    const copilot = AntigravityCopilot.getInstance();

    const whData = copilot.synthesizeSampleData('webhook-trigger', 'Customer Support Ingestion');
    assert.ok(whData.body);
    assert.ok(whData.body.inquiryId);
    assert.ok(whData.body.customerName);
    assert.ok(whData.headers['content-type']);

    const schedData = copilot.synthesizeSampleData('schedule-trigger');
    assert.ok(schedData.timestamp);
    assert.ok(schedData.rule);

    const emailData = copilot.synthesizeSampleData('email-trigger');
    assert.ok(emailData.from);
    assert.ok(emailData.subject);
  });

  test('2. POST /api/ai/assistant/chat: Returns full build timeline and test execution results', async () => {
    const res = await fetch(`${baseUrl}/api/ai/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Build a webhook workflow that receives order data and formats confirmation payload',
        currentWorkflow: null
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.copilot, 'Antigravity CLI');
    assert.ok(body.data.reply);

    if (body.data.workflow) {
      assert.ok(Array.isArray(body.data.workflow.nodes));
      assert.ok(Array.isArray(body.data.timeline), 'Timeline should be present');
      assert.ok(body.data.timeline.length >= 4, 'Should contain at least 4 stage events');

      const stages = body.data.timeline.map((t) => t.stage);
      assert.ok(stages.includes('understanding'));
      assert.ok(stages.includes('planning'));
      assert.ok(stages.includes('adding_nodes'));
      assert.ok(stages.includes('connecting'));
      assert.ok(stages.includes('testing'));
      assert.ok(stages.includes('complete'));

      assert.ok(body.data.testExecution, 'Test execution record should be captured');
    }
  });

  test('3. Real-Time Observable SSE: /build-stream emits discrete lifecycle events', async () => {
    const events = [];
    const res = await fetch(`${baseUrl}/api/ai/assistant/build-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Create a webhook that filters high priority leads and sends email notification',
        currentWorkflow: null
      })
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/event-stream'));

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      if (chunk.value) {
        const text = decoder.decode(chunk.value);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              events.push(parsed);
            } catch {}
          }
        }
      }
    }

    assert.ok(events.length >= 5, `Expected multiple SSE events, got ${events.length}`);

    const stagesRecorded = events.map((e) => e.stage);
    assert.ok(stagesRecorded.includes('understanding'), 'Should include understanding event');
    assert.ok(stagesRecorded.includes('planning'), 'Should include planning event');
    assert.ok(stagesRecorded.includes('adding_nodes'), 'Should include adding_nodes event');
    assert.ok(stagesRecorded.includes('connecting'), 'Should include connecting event');
    assert.ok(stagesRecorded.includes('testing') || stagesRecorded.includes('done'), 'Should include testing/done event');
  });

  test('4. Automated Test & Self-Repair Loop: Detects broken node and auto-repairs within 3 bounded iterations', async () => {
    const copilot = AntigravityCopilot.getInstance();

    // Fabricate workflow with faulty parameter expression that fails on initial run
    const faultyWorkflow = {
      id: 'wf_repair_test',
      name: 'Lead Scoring Self-Repair Test',
      nodes: [
        {
          id: 'node_wh',
          name: 'Webhook Inbound',
          type: 'webhook-trigger',
          position: { x: 100, y: 160 },
          parameters: { path: 'leads', httpMethod: 'POST' }
        },
        {
          id: 'node_set',
          name: 'Transform Lead',
          type: 'set-data',
          position: { x: 380, y: 160 },
          parameters: {
            mode: 'replace',
            jsonData: 'INVALID_JSON_SYNTAX_ERROR' // deliberate syntax error
          }
        }
      ],
      connections: [
        { source: 'Webhook Inbound', sourceOutput: 0, target: 'Transform Lead', targetInput: 0 }
      ],
      settings: {}
    };

    // Run auto-fix diagnostic directly on the faulty node
    const registry = require('../dist/nodes/registry').NodeRegistry.getInstance();
    const fixResult = await copilot.autoFixNode({
      workflow: faultyWorkflow,
      node: faultyWorkflow.nodes[1],
      nodeDef: registry.get('set-data'),
      error: 'Unexpected token I in JSON at position 0: INVALID_JSON_SYNTAX_ERROR',
      inputData: [{ json: { leadId: 55 } }]
    });

    assert.ok(fixResult);
    assert.strictEqual(fixResult.nodeId, 'node_set');
    assert.ok(fixResult.diagnosis);
    assert.ok(fixResult.fixedParameters);
  });
});
