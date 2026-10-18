const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('AutoFlow AI Integration Ecosystem & Custom Node SDK Suite', () => {
  let NodeRegistry, CustomNodeLoader, ExecutionContext;
  let PostgresNode, RedisNode, AwsS3Node, NotionNode, OpenAiNode, DateTimeNode, AggregateNode;

  before(() => {
    ({ NodeRegistry } = require('../dist/nodes/registry'));
    ({ CustomNodeLoader } = require('../dist/nodes/custom-loader'));
    ({ ExecutionContext } = require('../dist/engine/context'));
    ({ PostgresNode } = require('../dist/nodes/apps/postgres'));
    ({ RedisNode } = require('../dist/nodes/apps/redis'));
    ({ AwsS3Node } = require('../dist/nodes/apps/aws-s3'));
    ({ NotionNode } = require('../dist/nodes/apps/notion'));
    ({ OpenAiNode } = require('../dist/nodes/ai/openai-node'));
    ({ DateTimeNode } = require('../dist/nodes/core/date-time'));
    ({ AggregateNode } = require('../dist/nodes/core/aggregate'));
  });

  function makeContext(node, inputData = [{ json: {} }]) {
    const ec = new ExecutionContext();
    return ec.createNodeContext(node, inputData);
  }

  test('1. Node Registry: Includes all core enterprise & utility nodes', () => {
    const registry = NodeRegistry.getInstance();
    const list = registry.list();
    const types = list.map((n) => n.type);

    assert.ok(types.includes('postgres'), 'Registry must include postgres node');
    assert.ok(types.includes('redis'), 'Registry must include redis node');
    assert.ok(types.includes('aws-s3'), 'Registry must include aws-s3 node');
    assert.ok(types.includes('notion'), 'Registry must include notion node');
    assert.ok(types.includes('openai'), 'Registry must include openai node');
    assert.ok(types.includes('date-time'), 'Registry must include date-time node');
    assert.ok(types.includes('aggregate'), 'Registry must include aggregate node');
    assert.ok(list.length >= 31, `Expected at least 31 registered nodes, got ${list.length}`);
  });

  test('2. CustomNodeLoader SDK: Installs, loads, and executes dynamic custom node', async () => {
    const loader = CustomNodeLoader.getInstance();

    const customNodeCode = `
      class WeatherForecastNode {
        constructor() {
          this.type = 'custom-weather-forecast';
          this.name = 'Weather Forecast';
          this.description = 'Fetches simulated weather forecasts for a city';
          this.category = 'app';
          this.icon = 'sun';
          this.color = '#eab308';
          this.inputs = [{ name: 'main', type: 'main', label: 'Input' }];
          this.outputs = [{ name: 'main', type: 'main', label: 'Output' }];
          this.properties = [
            { name: 'city', displayName: 'City', type: 'string', default: 'Tokyo' }
          ];
        }

        async execute(context) {
          const items = context.inputData || [{ json: {} }];
          return [items.map((it, idx) => ({
            json: {
              city: context.getNodeParameter('city', idx, 'Tokyo'),
              temp: 22,
              condition: 'Sunny',
              customLoaded: true
            },
            pairedItem: idx
          }))];
        }
      }
      module.exports = WeatherForecastNode;
    `;

    // Install custom node via SDK
    const installed = await loader.installNode('weather-forecast.node.js', customNodeCode);
    assert.strictEqual(installed.type, 'custom-weather-forecast');
    assert.strictEqual(installed.name, 'Weather Forecast');
    assert.strictEqual(installed.status, 'active');

    // Verify it is registered in NodeRegistry
    const registry = NodeRegistry.getInstance();
    const registered = registry.get('custom-weather-forecast');
    assert.ok(registered, 'Custom node must be registered in NodeRegistry');

    // Execute through context
    const fakeNode = {
      id: 'weather_1',
      name: 'Weather Forecast',
      type: 'custom-weather-forecast',
      parameters: { city: 'San Francisco' },
      position: [0, 0]
    };

    const ctx = makeContext(fakeNode, [{ json: { request: 'forecast' } }]);
    const out = await registered.execute(ctx);
    assert.ok(Array.isArray(out) && out[0].length === 1);
    assert.strictEqual(out[0][0].json.city, 'San Francisco');
    assert.strictEqual(out[0][0].json.temp, 22);
    assert.strictEqual(out[0][0].json.customLoaded, true);

    // Clean up test custom node file
    const customFilePath = path.join(loader.getCustomNodesDirectory(), 'weather-forecast.node.js');
    if (fs.existsSync(customFilePath)) {
      fs.unlinkSync(customFilePath);
    }
  });

  test('3. Postgres Node: Parameterized queries, CRUD operations and mock fallback', async () => {
    const node = new PostgresNode();

    // Test executeQuery in mock mode
    const fakeNode = {
      id: 'pg_1',
      name: 'PostgreSQL',
      type: 'postgres',
      parameters: {
        operation: 'executeQuery',
        host: 'mock-db.internal',
        database: 'testdb',
        user: 'postgres',
        query: 'SELECT * FROM users WHERE status = $1',
        parameters: '["active"]'
      },
      position: [0, 0]
    };

    const ctx = makeContext(fakeNode, [{ json: {} }]);
    const out = await node.execute(ctx);
    assert.ok(Array.isArray(out) && out[0].length === 1);
    const row = out[0][0].json;
    assert.strictEqual(row.success, true);
    assert.strictEqual(row.operation, 'executeQuery');
    assert.strictEqual(row.rowCount, 2);
    assert.strictEqual(row.rows[0].name, 'Alice');
  });

  test('4. Redis Node: Operations and simulated client handling', async () => {
    const node = new RedisNode();

    const fakeNode = {
      id: 'redis_1',
      name: 'Redis',
      type: 'redis',
      parameters: {
        operation: 'set',
        host: 'mock-redis',
        key: 'session:user_123',
        value: 'active_token',
        ttl: 3600
      },
      position: [0, 0]
    };

    const ctx = makeContext(fakeNode, [{ json: {} }]);
    const out = await node.execute(ctx);
    assert.ok(Array.isArray(out) && out[0].length === 1);
    assert.strictEqual(out[0][0].json.success, true);
    assert.strictEqual(out[0][0].json.key, 'session:user_123');
    assert.strictEqual(out[0][0].json.value, 'active_token');
    assert.strictEqual(out[0][0].json.ttl, 3600);
  });

  test('5. AWS S3 Node: Upload, Download, and List validation', async () => {
    const node = new AwsS3Node();

    const fakeNode = {
      id: 's3_1',
      name: 'AWS S3',
      type: 'aws-s3',
      parameters: {
        operation: 'upload',
        bucket: 'mock-data-bucket',
        key: 'reports/sales.json',
        region: 'us-west-2'
      },
      position: [0, 0]
    };

    const ctx = makeContext(fakeNode, [{ json: { total: 4500 } }]);
    const out = await node.execute(ctx);
    assert.ok(Array.isArray(out) && out[0].length === 1);
    assert.strictEqual(out[0][0].json.success, true);
    assert.strictEqual(out[0][0].json.bucket, 'mock-data-bucket');
    assert.strictEqual(out[0][0].json.key, 'reports/sales.json');
  });

  test('6. Notion Node: Database page creation and querying', async () => {
    const node = new NotionNode();

    const fakeNode = {
      id: 'notion_1',
      name: 'Notion',
      type: 'notion',
      parameters: {
        operation: 'createPage',
        apiKey: 'mock_secret_notion_key',
        databaseId: 'test-db-123',
        title: 'Q4 Product Roadmap'
      },
      position: [0, 0]
    };

    const ctx = makeContext(fakeNode, [{ json: {} }]);
    const out = await node.execute(ctx);
    assert.ok(Array.isArray(out) && out[0].length === 1);
    assert.strictEqual(out[0][0].json.success, true);
    assert.strictEqual(out[0][0].json.title, 'Q4 Product Roadmap');
  });

  test('7. OpenAI / Multi-LLM Node: Chat completion and JSON mode execution', async () => {
    const node = new OpenAiNode();

    const fakeNode = {
      id: 'openai_1',
      name: 'OpenAI / Multi-LLM',
      type: 'openai',
      parameters: {
        model: 'gpt-4o-mini',
        prompt: 'Extract key sentiment from user feedback',
        apiKey: 'mock-openai-key',
        jsonMode: true
      },
      position: [0, 0]
    };

    const ctx = makeContext(fakeNode, [{ json: { feedback: 'Great product, loved the speed!' } }]);
    const out = await node.execute(ctx);
    assert.ok(Array.isArray(out) && out[0].length === 1);
    assert.strictEqual(out[0][0].json.success, true);
    assert.strictEqual(out[0][0].json.model, 'gpt-4o-mini');
    assert.ok(out[0][0].json.content.includes('Mock AI Response'));
  });

  test('8. Date & Time Node: Formatting, arithmetic, and duration calculation', async () => {
    const node = new DateTimeNode();

    // Test Format
    const formatNode = {
      id: 'dt_1',
      name: 'Date & Time',
      type: 'date-time',
      parameters: {
        operation: 'formatDate',
        date: '2026-10-19T03:00:00Z',
        outputFormat: 'YYYY-MM-DD',
        outputPropertyName: 'formatted'
      },
      position: [0, 0]
    };

    const ctx1 = makeContext(formatNode, [{ json: { id: 1 } }]);
    const out1 = await node.execute(ctx1);
    assert.strictEqual(out1[0][0].json.formatted, '2026-10-19');

    // Test Add 5 Days
    const addNode = {
      id: 'dt_2',
      name: 'Date & Time',
      type: 'date-time',
      parameters: {
        operation: 'addToDate',
        date: '2026-10-10T00:00:00Z',
        amount: 5,
        unit: 'days',
        outputFormat: 'YYYY-MM-DD',
        outputPropertyName: 'futureDate'
      },
      position: [0, 0]
    };

    const ctx2 = makeContext(addNode, [{ json: {} }]);
    const out2 = await node.execute(ctx2);
    assert.strictEqual(out2[0][0].json.futureDate, '2026-10-15');

    // Test Time Between
    const diffNode = {
      id: 'dt_3',
      name: 'Date & Time',
      type: 'date-time',
      parameters: {
        operation: 'timeBetween',
        date: '2026-10-01T00:00:00Z',
        secondDate: '2026-10-06T00:00:00Z',
        unit: 'days',
        outputPropertyName: 'daysDiff'
      },
      position: [0, 0]
    };

    const ctx3 = makeContext(diffNode, [{ json: {} }]);
    const out3 = await node.execute(ctx3);
    assert.strictEqual(out3[0][0].json.daysDiff, 5);
  });

  test('9. Aggregate Node: All items list, field arrays, and math calculations', async () => {
    const node = new AggregateNode();

    const sampleItems = [
      { json: { id: 1, name: 'Widget A', price: 100 } },
      { json: { id: 2, name: 'Widget B', price: 250 } },
      { json: { id: 3, name: 'Widget C', price: 50 } }
    ];

    // 1. Math Operation: Sum of price
    const sumNode = {
      id: 'agg_1',
      name: 'Aggregate',
      type: 'aggregate',
      parameters: {
        aggregateType: 'mathOperation',
        mathOperation: 'sum',
        targetMathField: 'price'
      },
      position: [0, 0]
    };

    const ctx1 = makeContext(sumNode, sampleItems);
    const out1 = await node.execute(ctx1);
    assert.strictEqual(out1[0][0].json.result, 400);
    assert.strictEqual(out1[0][0].json.count, 3);

    // 2. Aggregate Specific Fields: names and ids
    const fieldsNode = {
      id: 'agg_2',
      name: 'Aggregate',
      type: 'aggregate',
      parameters: {
        aggregateType: 'aggregateFields',
        fieldsToAggregate: 'id, name'
      },
      position: [0, 0]
    };

    const ctx2 = makeContext(fieldsNode, sampleItems);
    const out2 = await node.execute(ctx2);
    assert.deepStrictEqual(out2[0][0].json.id, [1, 2, 3]);
    assert.deepStrictEqual(out2[0][0].json.name, ['Widget A', 'Widget B', 'Widget C']);

    // 3. All items into single list
    const allNode = {
      id: 'agg_3',
      name: 'Aggregate',
      type: 'aggregate',
      parameters: {
        aggregateType: 'aggregateAllItems',
        destinationField: 'itemsList'
      },
      position: [0, 0]
    };

    const ctx3 = makeContext(allNode, sampleItems);
    const out3 = await node.execute(ctx3);
    assert.strictEqual(out3[0][0].json.itemsList.length, 3);
    assert.strictEqual(out3[0][0].json.count, 3);
  });
});
