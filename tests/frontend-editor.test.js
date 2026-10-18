const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

describe('AutoFlow AI Frontend Editor & Mobile Layout Test Suite', () => {
  const publicDir = path.join(__dirname, '../public');
  const htmlContent = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const cssContent = fs.readFileSync(path.join(publicDir, 'css/styles.css'), 'utf8');
  const canvasJs = fs.readFileSync(path.join(publicDir, 'js/canvas.js'), 'utf8');
  const editorJs = fs.readFileSync(path.join(publicDir, 'js/editor.js'), 'utf8');
  const appJs = fs.readFileSync(path.join(publicDir, 'js/app.js'), 'utf8');

  test('1. Client Scripts Syntax: canvas.js, editor.js, and app.js parse cleanly', () => {
    assert.doesNotThrow(() => {
      new vm.Script(canvasJs, { filename: 'canvas.js' });
    }, 'canvas.js must parse with zero syntax errors');

    assert.doesNotThrow(() => {
      new vm.Script(editorJs, { filename: 'editor.js' });
    }, 'editor.js must parse with zero syntax errors');

    assert.doesNotThrow(() => {
      new vm.Script(appJs, { filename: 'app.js' });
    }, 'app.js must parse with zero syntax errors');
  });

  test('2. DOM Structure: Required IDs, palettes, and buttons exist in index.html', () => {
    assert.ok(htmlContent.includes('id="palette-categories"'), 'Must have #palette-categories');
    assert.ok(htmlContent.includes('id="editor-sidebar"'), 'Must have #editor-sidebar');
    assert.ok(htmlContent.includes('id="mobile-palette-btn"'), 'Must have #mobile-palette-btn toggle');
    assert.ok(htmlContent.includes('id="close-palette-btn"'), 'Must have #close-palette-btn');
    assert.ok(htmlContent.includes('id="sidebar-backdrop"'), 'Must have #sidebar-backdrop');
    assert.ok(htmlContent.includes('id="node-drawer"'), 'Must have #node-drawer');
    assert.ok(htmlContent.includes('id="drawer-form"'), 'Must have #drawer-form');
    assert.ok(htmlContent.includes('id="canvas-plane"'), 'Must have #canvas-plane');

    // Ensure all buttons in header-actions are closed properly
    const openButtons = (htmlContent.match(/<button\b/g) || []).length;
    const closeButtons = (htmlContent.match(/<\/button>/g) || []).length;
    assert.strictEqual(openButtons, closeButtons, 'All button tags must be properly closed');
  });

  test('3. Mobile Layout CSS: Rules for responsive drawers, compact toolbar, and overflow', () => {
    assert.ok(cssContent.includes('.sidebar-backdrop'), 'CSS must define .sidebar-backdrop');
    assert.ok(cssContent.includes('.mobile-palette-toggle'), 'CSS must define .mobile-palette-toggle');
    assert.ok(cssContent.includes('@media (max-width: 768px)'), 'CSS must have max-width: 768px media query');

    // Ensure sidebar is slide-out drawer on mobile
    const mobileMediaIdx = cssContent.indexOf('@media (max-width: 768px)');
    assert.ok(mobileMediaIdx !== -1, 'Must contain 768px media query');
    const mobileCss = cssContent.slice(mobileMediaIdx);

    assert.ok(mobileCss.includes('.editor-sidebar'), 'Mobile CSS must style .editor-sidebar');
    assert.ok(mobileCss.includes('.node-drawer'), 'Mobile CSS must style .node-drawer for mobile viewports');
    assert.ok(mobileCss.includes('.ai-copilot-drawer'), 'Mobile CSS must style .ai-copilot-drawer for mobile viewports');
    assert.ok(mobileCss.includes('overflow-x: hidden'), 'Mobile CSS must prevent horizontal window scroll');
  });

  test('4. Node Palette Category Mapping: All registered categories render items', () => {
    // Import NodeRegistry from compiled dist
    const { NodeRegistry } = require('../dist/nodes/registry');
    const registry = NodeRegistry.getInstance();
    const nodeTypes = registry.list();

    assert.ok(nodeTypes.length >= 24, `Expected at least 24 registered nodes, got ${nodeTypes.length}`);

    // Replicate Palette categorizer logic
    const categories = {
      trigger: { title: 'Triggers', items: [] },
      app: { title: 'Apps & Social Media', items: [] },
      ai: { title: 'Gemini AI', items: [] },
      core: { title: 'Core Logic', items: [] },
      action: { title: 'Actions & Network', items: [] },
      transform: { title: 'Data Transformation', items: [] }
    };

    for (const nt of nodeTypes) {
      const cat = categories[nt.category] || categories.core;
      cat.items.push(nt);
    }

    assert.ok(categories.trigger.items.length > 0, 'Trigger category must have items');
    assert.ok(categories.app.items.length > 0, 'App category must have items');
    assert.ok(categories.ai.items.length > 0, 'AI category must have items');
    assert.ok(categories.core.items.length > 0, 'Core category must have items');

    // Ensure our new control flow and transformation nodes are categorized
    const coreTypes = categories.core.items.map((n) => n.type);
    const transformTypes = categories.transform.items.map((n) => n.type);

    assert.ok(coreTypes.includes('switch'), 'Switch node must be in Core Logic');
    assert.ok(coreTypes.includes('loop'), 'Loop node must be in Core Logic');
    assert.ok(coreTypes.includes('wait'), 'Wait node must be in Core Logic');
    assert.ok(coreTypes.includes('execute-workflow'), 'Execute Workflow node must be in Core Logic');
    assert.ok(coreTypes.includes('read-write-file'), 'File Read/Write node must be in Core Logic');
    assert.ok(transformTypes.includes('extract-from-file'), 'File Extract node must be in Data Transformation');
  });

  test('5. Mobile Gesture & Touch Handlers: Canvas supports touch panning & connecting', () => {
    assert.ok(canvasJs.includes("'touchstart'"), 'canvas.js must listen for touchstart');
    assert.ok(canvasJs.includes("'touchmove'"), 'canvas.js must listen for touchmove');
    assert.ok(canvasJs.includes("'touchend'"), 'canvas.js must listen for touchend');
    assert.ok(editorJs.includes('openMobilePalette'), 'editor.js must implement openMobilePalette');
    assert.ok(editorJs.includes('closeMobilePalette'), 'editor.js must implement closeMobilePalette');
  });

  test('6. Dynamic Red Error Port & Settings Tabs Logic in Editor', () => {
    assert.ok(editorJs.includes('drawer-tabs'), 'editor.js must render tabbed navigation');
    assert.ok(editorJs.includes('setting-on-error'), 'editor.js must render on-error selector');
    assert.ok(editorJs.includes('setting-retry-on-fail'), 'editor.js must render retry toggle');
    assert.ok(editorJs.includes('setting-disabled'), 'editor.js must render disabled toggle');
    assert.ok(canvasJs.includes('error-port'), 'canvas.js must render .error-port handle');
    assert.ok(canvasJs.includes('error-flow'), 'canvas.js must render .error-flow connection line');
  });

  test('7. Workflow Persistence Lifecycle: Add nodes, connect, save, and reload', async () => {
    // Test creating, saving, and verifying workflow with new nodes and connections
    const { getDatabase } = require('../dist/database/connection');
    const { WorkflowRepository } = require('../dist/database/repositories/workflow-repository');

    const testDbPath = path.join(__dirname, 'test-editor-persistence.sqlite');
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    const db = getDatabase(testDbPath);
    const { runMigrations } = require('../dist/database/migrations');
    runMigrations(db);

    const repo = new WorkflowRepository(db);

    // Initial workflow
    const wf = repo.create({
      name: 'Mobile & Desktop Test Flow',
      description: 'Verifies visual canvas persistence',
      nodes: [
        {
          id: 'manual_1',
          name: 'Manual Trigger',
          type: 'manual-trigger',
          position: { x: 100, y: 150 },
          parameters: {}
        }
      ],
      connections: [],
      settings: {},
      active: false
    });

    assert.ok(wf.id, 'Workflow should be created');

    // Simulate adding Switch node from palette
    const switchNode = {
      id: 'switch_1',
      name: 'Switch',
      type: 'switch',
      position: { x: 380, y: 150 },
      parameters: { mode: 'rules', rules: [] },
      onError: 'continueErrorOutput',
      retryOnFail: true,
      maxTries: 3
    };

    // Simulate connecting manual_1 to switch_1
    const newConnection = {
      source: 'Manual Trigger',
      sourceOutput: 0,
      target: 'Switch',
      targetInput: 0
    };

    // Save updated workflow
    const updated = repo.update(wf.id, {
      nodes: [...wf.nodes, switchNode],
      connections: [newConnection]
    });

    assert.strictEqual(updated.nodes.length, 2, 'Should have 2 nodes after addition');
    assert.strictEqual(updated.connections.length, 1, 'Should have 1 connection');

    // Reload from repository to ensure full roundtrip persistence
    const reloaded = repo.getById(wf.id);
    assert.ok(reloaded);
    assert.strictEqual(reloaded.name, 'Mobile & Desktop Test Flow');
    assert.strictEqual(reloaded.nodes.length, 2);
    assert.strictEqual(reloaded.nodes[1].type, 'switch');
    assert.strictEqual(reloaded.nodes[1].onError, 'continueErrorOutput');
    assert.strictEqual(reloaded.connections[0].source, 'Manual Trigger');
    assert.strictEqual(reloaded.connections[0].target, 'Switch');

    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });
});
