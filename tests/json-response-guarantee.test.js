const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const { createApp } = require('../dist/server');
const { closeDatabase } = require('../dist/database/connection');

describe('AutoFlow AI JSON Response Guarantee & Metrics Overview Suite', () => {
  let server;
  let baseUrl;
  let testDbFile;
  let serverInstance;

  before(async () => {
    testDbFile = path.join(__dirname, 'test-json-guarantee.sqlite');
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

  test('1. GET /api/projects/metrics/overview returns structured JSON with 200 OK', async () => {
    const res = await fetch(`${baseUrl}/api/projects/metrics/overview`);
    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('application/json'), `Expected application/json, got ${contentType}`);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data, 'Metrics data should exist');
    assert.strictEqual(typeof body.data.totalProjects, 'number');
    assert.strictEqual(typeof body.data.totalWorkflows, 'number');
    assert.strictEqual(typeof body.data.activeWorkflows, 'number');
    assert.strictEqual(typeof body.data.overallHealthRate, 'number');
    assert.ok(body.data.totalProjects >= 1, 'Should include at least default project');
  });

  test('2. Unmatched API routes return 404 JSON (never HTML error page)', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent-endpoint-test`);
    assert.strictEqual(res.status, 404);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('application/json'), `Expected application/json, got ${contentType}`);

    const raw = await res.text();
    assert.ok(!raw.includes('<!DOCTYPE'), 'Response must NOT contain HTML doctype');
    const body = JSON.parse(raw);
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('API endpoint not found: GET /api/nonexistent-endpoint-test'));
  });

  test('3. Unmatched POST/PUT/DELETE API routes return 404 JSON', async () => {
    const res = await fetch(`${baseUrl}/api/unknown/subpath/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 1 })
    });
    assert.strictEqual(res.status, 404);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('application/json'), `Expected application/json, got ${contentType}`);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('API endpoint not found: POST /api/unknown/subpath/action'));
  });

  test('4. SPA fallback serves HTML for UI paths but never intercepts /api or /webhook', async () => {
    const uiRes = await fetch(`${baseUrl}/projects`);
    assert.strictEqual(uiRes.status, 200);
    const uiContentType = uiRes.headers.get('content-type') || '';
    assert.ok(uiContentType.includes('text/html'));
    const uiText = await uiRes.text();
    assert.ok(uiText.includes('<!DOCTYPE html>'));

    const apiRes = await fetch(`${baseUrl}/api/projects/unknown-uuid-9999`);
    assert.strictEqual(apiRes.status, 404);
    const apiContentType = apiRes.headers.get('content-type') || '';
    assert.ok(apiContentType.includes('application/json'));
    const apiBody = await apiRes.json();
    assert.strictEqual(apiBody.success, false);
  });

  test('5. Safe API parser simulation prevents SyntaxError on HTML content', async () => {
    // Simulate what app.js api() does when receiving an HTML response
    async function safeParseResponse(mockRes) {
      const contentType = mockRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          return await mockRes.json();
        } catch {
          throw new Error('Invalid JSON received');
        }
      } else {
        const rawText = await mockRes.text();
        const isHtml = rawText.trim().startsWith('<') || contentType.includes('text/html');
        if (isHtml) {
          throw new Error(`Unexpected HTML response from server (HTTP ${mockRes.status}). Expected JSON.`);
        }
        throw new Error(rawText.slice(0, 100));
      }
    }

    const htmlResponse = new Response('<!DOCTYPE html><html><body>Error</body></html>', {
      status: 502,
      headers: { 'content-type': 'text/html' }
    });

    await assert.rejects(
      async () => {
        await safeParseResponse(htmlResponse);
      },
      (err) => {
        assert.ok(err.message.includes('Unexpected HTML response from server (HTTP 502)'));
        assert.ok(!err.message.includes("Unexpected token '<'"));
        return true;
      }
    );
  });
});
