const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const { createApp } = require('../dist/server');
const { closeDatabase } = require('../dist/database/connection');
const { createZipBuffer, parseZipBuffer, sanitizeZipPath } = require('../dist/utils/zip');

describe('AutoFlow AI Multi-Project Workspace & Isolation Test Suite', () => {
  let server;
  let baseUrl;
  let testDbFile;
  let serverInstance;

  before(async () => {
    testDbFile = path.join(__dirname, 'test-projects.sqlite');
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

  test('1. Default Project Seeding: Automatically initialized upon boot', async () => {
    const res = await fetch(`${baseUrl}/api/projects`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);

    const defaultProj = body.data.find((p) => p.id === 'default');
    assert.ok(defaultProj, 'Default project must exist');
    assert.strictEqual(defaultProj.name, 'Default Project');
    assert.strictEqual(defaultProj.health.status, 'idle');
    assert.strictEqual(defaultProj.health.totalRuns, 0);
  });

  test('2. Project Lifecycle: Create, Read, Update, Archive, and Health metrics', async () => {
    // Create new project
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E-Commerce Automation',
        description: 'Order fulfillment and inventory workflows',
        labels: ['sales', 'ops'],
        settings: { color: '#10b981', alertEmail: 'ops@store.com' }
      })
    });

    assert.strictEqual(createRes.status, 201);
    const created = (await createRes.json()).data;
    assert.ok(created.id);
    assert.strictEqual(created.name, 'E-Commerce Automation');
    assert.deepStrictEqual(created.labels, ['sales', 'ops']);
    assert.strictEqual(created.workflowCount, 0);

    // Update project
    const updateRes = await fetch(`${baseUrl}/api/projects/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E-Commerce & Retail Ops',
        description: 'Updated description'
      })
    });
    assert.strictEqual(updateRes.status, 200);
    const updated = (await updateRes.json()).data;
    assert.strictEqual(updated.name, 'E-Commerce & Retail Ops');

    // Archive project
    const archiveRes = await fetch(`${baseUrl}/api/projects/${created.id}`, {
      method: 'DELETE'
    });
    assert.strictEqual(archiveRes.status, 200);

    // Verify archived project is hidden from active list
    const activeListRes = await fetch(`${baseUrl}/api/projects`);
    const activeList = (await activeListRes.json()).data;
    assert.strictEqual(activeList.find((p) => p.id === created.id), undefined);

    // Verify archived project appears in archived list
    const archivedListRes = await fetch(`${baseUrl}/api/projects?archived=true`);
    const archivedList = (await archivedListRes.json()).data;
    assert.ok(archivedList.find((p) => p.id === created.id));

    // Unarchive
    await fetch(`${baseUrl}/api/projects/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false })
    });
  });

  test('3. Project Isolation: Workflows belong to specific projects and do not leak', async () => {
    // Create Project A
    const projARes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Project Alpha' })
    });
    const projA = (await projARes.json()).data;

    // Create Project B
    const projBRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Project Beta' })
    });
    const projB = (await projBRes.json()).data;

    // Add Workflow to Project A
    const wfARes = await fetch(`${baseUrl}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alpha Secret Workflow',
        projectId: projA.id,
        nodes: [
          { id: 'start', name: 'Start', type: 'manual-trigger', position: { x: 0, y: 0 }, parameters: {} }
        ],
        connections: [],
        active: false
      })
    });
    assert.strictEqual(wfARes.status, 201);

    // Add Workflow to Project B
    const wfBRes = await fetch(`${baseUrl}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Beta Pipeline Workflow',
        projectId: projB.id,
        nodes: [
          { id: 'start', name: 'Start', type: 'manual-trigger', position: { x: 0, y: 0 }, parameters: {} }
        ],
        connections: [],
        active: false
      })
    });
    assert.strictEqual(wfBRes.status, 201);

    // Query workflows for Project A only
    const listARes = await fetch(`${baseUrl}/api/workflows?projectId=${projA.id}`);
    const listA = (await listARes.json()).data;
    assert.strictEqual(listA.length, 1);
    assert.strictEqual(listA[0].name, 'Alpha Secret Workflow');
    assert.strictEqual(listA[0].projectId, projA.id);

    // Query workflows for Project B only
    const listBRes = await fetch(`${baseUrl}/api/workflows?projectId=${projB.id}`);
    const listB = (await listBRes.json()).data;
    assert.strictEqual(listB.length, 1);
    assert.strictEqual(listB[0].name, 'Beta Pipeline Workflow');
    assert.strictEqual(listB[0].projectId, projB.id);

    // Verify project summaries reflect workflow counts
    const summARes = await fetch(`${baseUrl}/api/projects/${projA.id}`);
    const summA = (await summARes.json()).data;
    assert.strictEqual(summA.workflowCount, 1);
    assert.strictEqual(summA.workflows[0].name, 'Alpha Secret Workflow');
  });

  test('4. Project Duplication: Clones project metadata and deep-clones workflows', async () => {
    // Create source project with a workflow
    const origProjRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Template Blueprint',
        description: 'Template with preconfigured DAG',
        labels: ['template']
      })
    });
    const origProj = (await origProjRes.json()).data;

    await fetch(`${baseUrl}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Blueprint Child Flow',
        projectId: origProj.id,
        nodes: [
          { id: 'm1', name: 'Manual', type: 'manual-trigger', position: { x: 10, y: 10 }, parameters: {} },
          { id: 's1', name: 'Set Data', type: 'set-data', position: { x: 200, y: 10 }, parameters: { mode: 'manual', values: { foo: 'bar' } } }
        ],
        connections: [
          { source: 'Manual', sourceOutput: 0, target: 'Set Data', targetInput: 0 }
        ],
        active: false
      })
    });

    // Duplicate Project
    const dupRes = await fetch(`${baseUrl}/api/projects/${origProj.id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Cloned Production Project' })
    });
    assert.strictEqual(dupRes.status, 201);
    const dupData = (await dupRes.json()).data;

    assert.ok(dupData.project.id);
    assert.notStrictEqual(dupData.project.id, origProj.id);
    assert.strictEqual(dupData.project.name, 'Cloned Production Project');
    assert.strictEqual(dupData.workflows.length, 1);
    assert.strictEqual(dupData.workflows[0].name, 'Blueprint Child Flow');
    assert.strictEqual(dupData.workflows[0].projectId, dupData.project.id);
    assert.strictEqual(dupData.workflows[0].nodes.length, 2);
    assert.strictEqual(dupData.workflows[0].connections.length, 1);
  });

  test('5. Project Bundle Export & Import (JSON): Secret redaction and manifest verification', async () => {
    // Create Project to export
    const expProjRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Exportable Pipeline',
        description: 'Export verification',
        labels: ['export-test']
      })
    });
    const expProj = (await expProjRes.json()).data;

    await fetch(`${baseUrl}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Exported Flow 1',
        projectId: expProj.id,
        nodes: [
          { id: 'wh1', name: 'Webhook', type: 'webhook-trigger', position: { x: 0, y: 0 }, parameters: { path: 'test-wh' } }
        ],
        connections: [],
        active: false
      })
    });

    // Export as JSON bundle
    const exportRes = await fetch(`${baseUrl}/api/projects/${expProj.id}/export?format=json`);
    assert.strictEqual(exportRes.status, 200);
    assert.ok(exportRes.headers.get('content-type').includes('application/json'));
    const bundle = await exportRes.json();

    assert.strictEqual(bundle.manifest.schemaVersion, '2.0');
    assert.strictEqual(bundle.manifest.totalWorkflows, 1);
    assert.ok(bundle.manifest.nodeTypesUsed.includes('webhook-trigger'));
    assert.strictEqual(bundle.workflows.length, 1);
    assert.strictEqual(bundle.workflows[0].name, 'Exported Flow 1');

    // Import bundle as a NEW project
    const importRes = await fetch(`${baseUrl}/api/projects/import-bundle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bundle)
    });
    assert.strictEqual(importRes.status, 201);
    const importedData = (await importRes.json()).data;

    assert.ok(importedData.project.id);
    assert.notStrictEqual(importedData.project.id, expProj.id);
    assert.strictEqual(importedData.importedCount, 1);
    assert.strictEqual(importedData.workflows[0].name, 'Exported Flow 1');
  });

  test('6. Pure Node.js ZIP Utility: Compression, extraction, CRC32, and path traversal protection', () => {
    // Test safe path sanitization
    assert.strictEqual(sanitizeZipPath('../../etc/passwd'), 'etc/passwd');
    assert.strictEqual(sanitizeZipPath('/var/log/secret.txt'), 'var/log/secret.txt');
    assert.strictEqual(sanitizeZipPath('C:\\Windows\\System32\\cmd.exe'), 'Windows/System32/cmd.exe');
    assert.strictEqual(sanitizeZipPath('workflows/my_flow.json'), 'workflows/my_flow.json');

    // Test creating zip buffer with files
    const sampleFiles = [
      { name: 'manifest.json', content: JSON.stringify({ version: '2.0', name: 'Test' }) },
      { name: 'workflows/flow1.json', content: JSON.stringify({ id: 'wf1', name: 'Flow 1' }) },
      { name: 'readme.txt', content: 'AutoFlow AI Export Archive' }
    ];

    const zipBuffer = createZipBuffer(sampleFiles);
    assert.ok(Buffer.isBuffer(zipBuffer));
    assert.ok(zipBuffer.length > 100);

    // Test extracting files from zip buffer
    const extracted = parseZipBuffer(zipBuffer);
    assert.strictEqual(extracted.length, 3);

    const manifestEntry = extracted.find((e) => e.name === 'manifest.json');
    assert.ok(manifestEntry);
    const parsedManifest = manifestEntry.json();
    assert.strictEqual(parsedManifest.version, '2.0');

    const wfEntry = extracted.find((e) => e.name === 'workflows/flow1.json');
    assert.ok(wfEntry);
    assert.strictEqual(wfEntry.json().name, 'Flow 1');

    const readmeEntry = extracted.find((e) => e.name === 'readme.txt');
    assert.ok(readmeEntry);
    assert.strictEqual(readmeEntry.text(), 'AutoFlow AI Export Archive');
  });

  test('7. Project Bundle Export & Import (ZIP): Full binary archive round-trip', async () => {
    // Create Project
    const projRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Zip Archive Project' })
    });
    const proj = (await projRes.json()).data;

    await fetch(`${baseUrl}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Zip Flow Target',
        projectId: proj.id,
        nodes: [
          { id: 'm1', name: 'Manual', type: 'manual-trigger', position: { x: 0, y: 0 }, parameters: {} }
        ],
        connections: [],
        active: false
      })
    });

    // Export as ZIP
    const exportZipRes = await fetch(`${baseUrl}/api/projects/${proj.id}/export?format=zip`);
    assert.strictEqual(exportZipRes.status, 200);
    assert.strictEqual(exportZipRes.headers.get('content-type'), 'application/zip');
    const zipArrayBuf = await exportZipRes.arrayBuffer();
    const zipBuf = Buffer.from(zipArrayBuf);

    assert.ok(zipBuf.length > 0);

    // Verify ZIP contains manifest.json, project.json, and workflows/*.json
    const parsedEntries = parseZipBuffer(zipBuf);
    assert.ok(parsedEntries.some((e) => e.name === 'manifest.json'));
    assert.ok(parsedEntries.some((e) => e.name === 'project.json'));
    assert.ok(parsedEntries.some((e) => e.name.startsWith('workflows/')));

    // Import ZIP buffer as a new project
    const importZipRes = await fetch(`${baseUrl}/api/projects/import-bundle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/zip' },
      body: zipBuf
    });

    assert.strictEqual(importZipRes.status, 201);
    const importZipData = (await importZipRes.json()).data;
    assert.ok(importZipData.project.id);
    assert.strictEqual(importZipData.importedCount, 1);
    assert.strictEqual(importZipData.workflows[0].name, 'Zip Flow Target');
  });

  test('8. Safety Guard: Default project cannot be deleted', async () => {
    const res = await fetch(`${baseUrl}/api/projects/default?hard=true`, {
      method: 'DELETE'
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('default project cannot be deleted'));
  });
});
