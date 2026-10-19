const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');

const { createApp } = require('../dist/server');
const { closeDatabase } = require('../dist/database/connection');
const { AntigravityCopilot } = require('../dist/copilot/antigravity-copilot');

describe('Antigravity CLI Copilot & Google Sign-In Test Suite', () => {
  let server;
  let baseUrl;

  before(async () => {
    process.env.PORT = '3991';
    process.env.ALLOW_PRIVATE_NETWORK = 'true';
    const { app } = createApp();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(3991, resolve));
    baseUrl = 'http://127.0.0.1:3991';
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    closeDatabase();
  });

  test('1. AntigravityCopilot Service: Singleton and CLI detection', () => {
    const copilot = AntigravityCopilot.getInstance();
    assert.ok(copilot, 'AntigravityCopilot instance should exist');
    const cliPath = copilot.getCliPath();
    assert.ok(cliPath, 'CLI path should be resolved');
  });

  test('2. Google id_token JWT Decoding: Extracts email and user profile', () => {
    const copilot = AntigravityCopilot.getInstance();
    // Sample mock Google Account id_token
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: 'https://accounts.google.com',
      sub: 'google_user_123456789',
      email: 'alex.developer@gmail.com',
      email_verified: true,
      name: 'Alex Developer'
    })).toString('base64url');
    const mockToken = `${header}.${payload}.mockSignature`;

    const user = copilot.decodeIdToken(mockToken);
    assert.ok(user, 'User should be decoded');
    assert.strictEqual(user.email, 'alex.developer@gmail.com');
    assert.strictEqual(user.name, 'Alex Developer');
    assert.strictEqual(user.sub, 'google_user_123456789');
  });

  test('3. GET /api/ai/assistant/status: Reports Antigravity Copilot and Google Account', async () => {
    const res = await fetch(`${baseUrl}/api/ai/assistant/status`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.copilot, 'Antigravity CLI');
    assert.ok('connected' in body);
    assert.strictEqual(body.cliAvailable, true);
  });

  test('4. POST /api/ai/assistant/signout & /signin: Google Account authentication lifecycle', async () => {
    // Test sign-out
    const signoutRes = await fetch(`${baseUrl}/api/ai/assistant/signout`, {
      method: 'POST'
    });
    assert.strictEqual(signoutRes.status, 200);
    const signoutBody = await signoutRes.json();
    assert.strictEqual(signoutBody.success, true);
    assert.strictEqual(signoutBody.connected, false);

    // Verify status reflects signed-out state
    const statusRes1 = await fetch(`${baseUrl}/api/ai/assistant/status`);
    const statusBody1 = await statusRes1.json();
    assert.strictEqual(statusBody1.connected, false);

    // Test sign-in (syncing local Google account session)
    const signinRes = await fetch(`${baseUrl}/api/ai/assistant/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.strictEqual(signinRes.status, 200);
    const signinBody = await signinRes.json();
    assert.strictEqual(signinBody.success, true);
    assert.strictEqual(signinBody.connected, true);
    assert.ok(signinBody.email, 'Signed-in Google email should be returned');
    assert.ok(signinBody.message.includes('Successfully signed in'));

    // Verify status reflects signed-in state
    const statusRes2 = await fetch(`${baseUrl}/api/ai/assistant/status`);
    const statusBody2 = await statusRes2.json();
    assert.strictEqual(statusBody2.connected, true);
    assert.strictEqual(statusBody2.copilot, 'Antigravity CLI');
    assert.ok(statusBody2.email);
  });

  test('5. POST /api/ai/assistant/chat: Antigravity Copilot designs deterministic workflow from prompt', async () => {
    const res = await fetch(`${baseUrl}/api/ai/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Build a webhook workflow that receives new order data and outputs a webhook response',
        currentWorkflow: null
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.copilot, 'Antigravity CLI');
    assert.ok(body.data, 'Response should contain data');
    assert.ok(body.data.reply, 'Response should contain reply message');
    if (body.data.workflow) {
      assert.ok(Array.isArray(body.data.workflow.nodes), 'Workflow should contain nodes array');
      assert.ok(body.data.workflow.nodes.length > 0, 'Should have created at least one node');
    }
  });

  test('6. POST /api/ai/assistant/auto-fix: Antigravity Self-Healing analyzes node failure', async () => {
    const mockWorkflow = {
      id: 'wf_err_test',
      name: 'Error Healing Test',
      nodes: [
        {
          id: 'node_err_http',
          name: 'Fetch User',
          type: 'http-request',
          position: { x: 100, y: 160 },
          parameters: {
            url: 'http://invalid-url-domain/api/users', // bad scheme
            method: 'GET'
          }
        }
      ],
      connections: []
    };

    const res = await fetch(`${baseUrl}/api/ai/assistant/auto-fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflow: mockWorkflow,
        nodeId: 'node_err_http',
        error: 'Invalid URL: http://invalid-url-domain/api/users (unknown protocol)',
        inputData: [{ json: { id: 101 } }]
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.copilot, 'Antigravity CLI');
    assert.ok(body.data.diagnosis, 'Diagnosis should be present');
    assert.ok(body.data.fixedParameters, 'Fixed parameters should be provided');
  });
});
