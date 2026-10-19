const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { createApp } = require('../dist/server');

describe('AutoFlow AI Credential Test Connection (n8n Parity) Suite', () => {
  let app;
  let server;
  let port;
  let baseUrl;
  let mockProbeServer;
  let mockProbePort;
  let mockProbeUrl;
  let credentialsManager;
  let serverInstance;

  before(async () => {
    // 1. Start local mock external probe server
    await new Promise((resolve) => {
      mockProbeServer = http.createServer((req, res) => {
        if (req.url === '/auth-check') {
          if (req.headers['x-api-key'] === 'super-secret-key-123') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'ok' }));
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Unauthorized' }));
          }
        }
        res.writeHead(404);
        res.end();
      });

      mockProbeServer.listen(0, '127.0.0.1', () => {
        mockProbePort = mockProbeServer.address().port;
        mockProbeUrl = `http://127.0.0.1:${mockProbePort}/auth-check`;
        resolve();
      });
    });

    // 2. Start AutoFlow app
    serverInstance = createApp();
    app = serverInstance.app;
    credentialsManager = serverInstance.credentialsManager;

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
    if (mockProbeServer) mockProbeServer.close();
    if (serverInstance?.schedulerManager) serverInstance.schedulerManager.destroy();
  });

  test('1. HTTP Header Probe: Successfully verifies valid authentication header', async () => {
    const res = await fetch(`${baseUrl}/api/credentials/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'httpHeaderAuth',
        data: {
          testUrl: mockProbeUrl,
          name: 'X-API-Key',
          value: 'super-secret-key-123'
        }
      })
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.message.includes('Successfully verified credential'));
  });

  test('2. HTTP Header Probe: Rejects invalid authentication header with HTTP 401 message', async () => {
    const res = await fetch(`${baseUrl}/api/credentials/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'httpHeaderAuth',
        data: {
          testUrl: mockProbeUrl,
          name: 'X-API-Key',
          value: 'wrong-key'
        }
      })
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.ok(json.error.includes('returned HTTP 401'));
  });

  test('3. Test by Credential ID: Decrypts and tests existing stored credential', async () => {
    const saved = credentialsManager.create('Production API Header', 'httpHeaderAuth', {
      testUrl: mockProbeUrl,
      name: 'X-API-Key',
      value: 'super-secret-key-123'
    });

    const res = await fetch(`${baseUrl}/api/credentials/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: saved.id })
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.message.includes('Successfully verified credential'));
  });

  test('4. Empty Data Validation: Rejects empty credentials cleanly', async () => {
    const res = await fetch(`${baseUrl}/api/credentials/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'httpBearerAuth', data: {} })
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'Credential data cannot be empty');
  });
});
