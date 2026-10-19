const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const { NodeRegistry } = require('../dist/nodes/registry');
const { ExecutionContext } = require('../dist/engine/context');

describe('AutoFlow AI Python Code Node (n8n Parity) Test Suite', () => {
  let registry;
  let codeNode;
  let execCtx;

  before(() => {
    registry = NodeRegistry.getInstance();
    codeNode = registry.get('code');
    execCtx = new ExecutionContext();
  });

  test('1. JavaScript Mode: Preserves fast in-memory execution for JS code', async () => {
    const config = {
      id: 'code-js',
      name: 'Code JS',
      type: 'code',
      position: { x: 0, y: 0 },
      parameters: {
        language: 'javaScript',
        mode: 'runOnceForAllItems',
        jsCode: 'for (const it of $input.all()) { it.json.jsAdded = true; } return $input.all();'
      }
    };
    const ctx = execCtx.createNodeContext(config, [{ json: { num: 42 } }]);
    const output = await codeNode.execute(ctx);
    assert.strictEqual(output[0][0].json.num, 42);
    assert.strictEqual(output[0][0].json.jsAdded, true);
  });

  test('2. Python Mode (All Items): Transforms items using Python 3 data structures', async () => {
    const config = {
      id: 'code-py-all',
      name: 'Code Python All',
      type: 'code',
      position: { x: 0, y: 0 },
      parameters: {
        language: 'python',
        mode: 'runOnceForAllItems',
        pythonCode: `
for item in _items:
    item['json']['doubled'] = item['json']['val'] * 2
return _items
`
      }
    };
    const ctx = execCtx.createNodeContext(config, [
      { json: { val: 21 } },
      { json: { val: 50 } }
    ]);
    const output = await codeNode.execute(ctx);
    assert.strictEqual(output[0].length, 2);
    assert.strictEqual(output[0][0].json.doubled, 42);
    assert.strictEqual(output[0][1].json.doubled, 100);
  });

  test('3. Python Mode (_input helper): Accesses _input.all() and math operations', async () => {
    const config = {
      id: 'code-py-input',
      name: 'Code Python Input Helper',
      type: 'code',
      position: { x: 0, y: 0 },
      parameters: {
        language: 'python',
        mode: 'runOnceForAllItems',
        pythonCode: `
total = sum(x['json']['amount'] for x in _input.all())
return [{'json': {'totalRevenue': total, 'count': len(_input.all())}}]
`
      }
    };
    const ctx = execCtx.createNodeContext(config, [
      { json: { amount: 150 } },
      { json: { amount: 350 } }
    ]);
    const output = await codeNode.execute(ctx);
    assert.strictEqual(output[0][0].json.totalRevenue, 500);
    assert.strictEqual(output[0][0].json.count, 2);
  });

  test('4. Python Mode (Each Item Mode): Transforms item individually with _item dict', async () => {
    const config = {
      id: 'code-py-each',
      name: 'Code Python Each',
      type: 'code',
      position: { x: 0, y: 0 },
      parameters: {
        language: 'python',
        mode: 'runOnceForEachItem',
        pythonCode: `
_item['tax'] = _item['price'] * 0.15
return _item
`
      }
    };
    const ctx = execCtx.createNodeContext(config, [
      { json: { product: 'Server', price: 1000 } },
      { json: { product: 'Router', price: 200 } }
    ]);
    const output = await codeNode.execute(ctx);
    assert.strictEqual(output[0].length, 2);
    assert.strictEqual(output[0][0].json.tax, 150);
    assert.strictEqual(output[0][1].json.tax, 30);
  });

  test('5. Python Error Handling: Formats clean actionable Python traceback', async () => {
    const config = {
      id: 'code-py-err',
      name: 'Code Python Error',
      type: 'code',
      position: { x: 0, y: 0 },
      parameters: {
        language: 'python',
        mode: 'runOnceForAllItems',
        pythonCode: `
# Attempting undefined key access
val = _items[0]['json']['non_existent_key']['sub']
return _items
`
      }
    };
    const ctx = execCtx.createNodeContext(config, [{ json: { foo: 'bar' } }]);
    await assert.rejects(
      async () => {
        await codeNode.execute(ctx);
      },
      /Python execution error: 'non_existent_key'/,
      'Must surface Python KeyError cleanly'
    );
  });
});
