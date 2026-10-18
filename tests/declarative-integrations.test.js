const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const { NodeRegistry } = require('../dist/nodes/registry');
const { DeclarativeNode } = require('../dist/nodes/declarative-node');
const { ALL_INTEGRATION_MANIFESTS } = require('../dist/nodes/integrations');
const { INTEGRATION_MANIFESTS } = require('../dist/nodes/integrations/manifests');
const { ExecutionContext } = require('../dist/engine/context');

describe('AutoFlow AI Declarative Integrations & Enterprise Ecosystem Test Suite', () => {
  let mockServer;
  let mockPort;
  let registry;

  before(async () => {
    registry = NodeRegistry.getInstance();

    await new Promise((resolve) => {
      mockServer = http.createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          // Route 1: Contacts list
          if (req.method === 'GET' && (req.url === '/crm/v3/objects/contacts' || req.url.startsWith('/crm/v3/objects/contacts?'))) {
            const auth = req.headers['authorization'];
            if (!auth) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ message: 'Unauthorized' }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              results: [
                { id: 'cnt-1', email: 'alice@example.com' },
                { id: 'cnt-2', email: 'bob@example.com' }
              ]
            }));
          }

          // Route 2: Single contact get with path param
          if (req.method === 'GET' && req.url === '/crm/v3/objects/contacts/cnt-123') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ id: 'cnt-123', name: 'Charlie' }));
          }

          // Route 3: Contact create with body
          if (req.method === 'POST' && req.url === '/crm/v3/objects/contacts') {
            const parsed = JSON.parse(body || '{}');
            res.writeHead(201, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              id: 'new-cnt-999',
              properties: parsed.properties
            }));
          }

          // Route 4: API Error simulation
          if (req.url === '/error-endpoint') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'ResourceNotFound', message: 'The item does not exist' }));
          }

          res.writeHead(404);
          res.end();
        });
      });

      mockServer.listen(0, '127.0.0.1', () => {
        mockPort = mockServer.address().port;
        resolve();
      });
    });
  });

  after(() => {
    if (mockServer) mockServer.close();
  });

  test('1. Registry Catalog: Successfully loads 400+ production-grade integration and utility nodes', () => {
    const list = registry.list();
    assert.ok(list.length >= 400, `Expected at least 400 nodes for full n8n parity, got ${list.length}`);

    // Verify key CRM nodes
    assert.ok(registry.get('hubspot'), 'HubSpot node must be registered');
    assert.ok(registry.get('salesforce'), 'Salesforce node must be registered');
    assert.ok(registry.get('pipedrive'), 'Pipedrive node must be registered');
    assert.ok(registry.get('zoho-crm'), 'Zoho CRM node must be registered');

    // Verify key Support nodes
    assert.ok(registry.get('zendesk'), 'Zendesk node must be registered');
    assert.ok(registry.get('freshdesk'), 'Freshdesk node must be registered');
    assert.ok(registry.get('intercom'), 'Intercom node must be registered');

    // Verify key PM nodes
    assert.ok(registry.get('jira'), 'Jira node must be registered');
    assert.ok(registry.get('asana'), 'Asana node must be registered');
    assert.ok(registry.get('trello'), 'Trello node must be registered');
    assert.ok(registry.get('clickup'), 'ClickUp node must be registered');
    assert.ok(registry.get('linear'), 'Linear node must be registered');
    assert.ok(registry.get('monday'), 'Monday.com node must be registered');

    // Verify Marketing & Commerce nodes
    assert.ok(registry.get('mailchimp'), 'Mailchimp node must be registered');
    assert.ok(registry.get('sendgrid'), 'SendGrid node must be registered');
    assert.ok(registry.get('brevo'), 'Brevo node must be registered');
    assert.ok(registry.get('shopify'), 'Shopify node must be registered');
    assert.ok(registry.get('woocommerce'), 'WooCommerce node must be registered');

    // Verify DevOps & Cloud nodes
    assert.ok(registry.get('gitlab'), 'GitLab node must be registered');
    assert.ok(registry.get('docker'), 'Docker node must be registered');
    assert.ok(registry.get('kubernetes'), 'Kubernetes node must be registered');
    assert.ok(registry.get('cloudflare'), 'Cloudflare node must be registered');
    assert.ok(registry.get('vercel'), 'Vercel node must be registered');

    // Verify AI & Vector DB nodes
    assert.ok(registry.get('anthropic'), 'Anthropic Claude node must be registered');
    assert.ok(registry.get('groq'), 'Groq node must be registered');
    assert.ok(registry.get('mistral'), 'Mistral AI node must be registered');
    assert.ok(registry.get('cohere'), 'Cohere node must be registered');
    assert.ok(registry.get('perplexity'), 'Perplexity node must be registered');
    assert.ok(registry.get('pinecone'), 'Pinecone node must be registered');
    assert.ok(registry.get('qdrant'), 'Qdrant node must be registered');

    // Verify Cloud Infrastructure & Security additions
    assert.ok(registry.get('clickhouse'), 'ClickHouse node must be registered');
    assert.ok(registry.get('snowflake'), 'Snowflake node must be registered');
    assert.ok(registry.get('hashicorp_vault'), 'Vault node must be registered');
    assert.ok(registry.get('okta_users'), 'Okta node must be registered');
    assert.ok(registry.get('auth0_users'), 'Auth0 node must be registered');
    assert.ok(registry.get('bannerbear'), 'Bannerbear node must be registered');
    assert.ok(registry.get('openweathermap'), 'OpenWeatherMap node must be registered');
  });

  test('2. Manifest Structure Integrity: All 350+ manifests specify valid resources, operations, and HTTP methods', () => {
    assert.ok(ALL_INTEGRATION_MANIFESTS.length >= 350, `Must have at least 350 integration manifests, got ${ALL_INTEGRATION_MANIFESTS.length}`);

    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    for (const m of ALL_INTEGRATION_MANIFESTS) {
      assert.ok(m.type, 'Manifest must have a unique type');
      assert.ok(m.name, `Manifest ${m.type} must have a name`);
      assert.ok(m.baseURL, `Manifest ${m.type} must specify a baseURL`);
      assert.ok(m.resources.length > 0, `Manifest ${m.type} must have at least one resource`);

      for (const r of m.resources) {
        assert.ok(r.operations.length > 0, `Resource ${r.name} in ${m.type} must have operations`);
        for (const op of r.operations) {
          assert.ok(validMethods.includes(op.method), `Invalid HTTP method ${op.method} in ${m.type}:${r.name}:${op.name}`);
          assert.ok(op.path, `Operation ${op.name} in ${m.type} must specify a path`);
        }
      }
    }
  });

  test('3. Declarative Execution: GET request with itemsPath array extraction and Bearer Auth', async () => {
    const hubspotManifest = { ...INTEGRATION_MANIFESTS.find((m) => m.type === 'hubspot') };
    hubspotManifest.baseURL = `http://127.0.0.1:${mockPort}`;

    const testNode = new DeclarativeNode(hubspotManifest);

    const mockCreds = {
      get: (id) => ({ id, data: { token: 'pat-hubspot-secret-token' } })
    };
    const execCtx = new ExecutionContext(mockCreds);

    const nodeConfig = {
      id: 'hs-node-1',
      name: 'HubSpot',
      type: 'hubspot',
      position: { x: 0, y: 0 },
      credentials: { hubspot_api_key: 'cred-hs' },
      parameters: {
        resource: 'contact',
        operation: 'contact:getAll',
        limit: 10
      }
    };

    const nodeCtx = execCtx.createNodeContext(nodeConfig, [{ json: {} }]);
    const output = await testNode.execute(nodeCtx);

    // itemsPath 'results' extracted 2 items
    assert.strictEqual(output[0].length, 2);
    assert.strictEqual(output[0][0].json.id, 'cnt-1');
    assert.strictEqual(output[0][1].json.id, 'cnt-2');
  });

  test('4. Declarative Execution: Path variable replacement and single record lookup', async () => {
    const hubspotManifest = { ...INTEGRATION_MANIFESTS.find((m) => m.type === 'hubspot') };
    hubspotManifest.baseURL = `http://127.0.0.1:${mockPort}`;

    const testNode = new DeclarativeNode(hubspotManifest);

    const mockCreds = {
      get: (id) => ({ id, data: { token: 'pat-hubspot-secret-token' } })
    };
    const execCtx = new ExecutionContext(mockCreds);

    const nodeConfig = {
      id: 'hs-node-get',
      name: 'HubSpot Get',
      type: 'hubspot',
      position: { x: 0, y: 0 },
      credentials: { hubspot_api_key: 'cred-hs' },
      parameters: {
        resource: 'contact',
        operation: 'contact:get',
        contactId: 'cnt-123'
      }
    };

    const nodeCtx = execCtx.createNodeContext(nodeConfig, [{ json: {} }]);
    const output = await testNode.execute(nodeCtx);

    assert.strictEqual(output[0].length, 1);
    assert.strictEqual(output[0][0].json.id, 'cnt-123');
    assert.strictEqual(output[0][0].json.name, 'Charlie');
  });

  test('5. Declarative Execution: POST request with parameter mapping into structured body', async () => {
    const hubspotManifest = { ...INTEGRATION_MANIFESTS.find((m) => m.type === 'hubspot') };
    hubspotManifest.baseURL = `http://127.0.0.1:${mockPort}`;

    const testNode = new DeclarativeNode(hubspotManifest);

    const mockCreds = {
      get: (id) => ({ id, data: { token: 'pat-hubspot-secret-token' } })
    };
    const execCtx = new ExecutionContext(mockCreds);

    const nodeConfig = {
      id: 'hs-node-create',
      name: 'HubSpot Create',
      type: 'hubspot',
      position: { x: 0, y: 0 },
      credentials: { hubspot_api_key: 'cred-hs' },
      parameters: {
        resource: 'contact',
        operation: 'contact:create',
        email: 'dave@example.com',
        firstname: 'Dave',
        lastname: 'Smith'
      }
    };

    const nodeCtx = execCtx.createNodeContext(nodeConfig, [{ json: {} }]);
    const output = await testNode.execute(nodeCtx);

    assert.strictEqual(output[0].length, 1);
    assert.strictEqual(output[0][0].json.id, 'new-cnt-999');
    assert.strictEqual(output[0][0].json.properties.email, 'dave@example.com');
    assert.strictEqual(output[0][0].json.properties.firstname, 'Dave');
  });

  test('6. Error Handling: Formats actionable diagnostic message when external API returns HTTP error', async () => {
    const errorManifest = {
      type: 'err-svc',
      name: 'Error Service',
      description: 'Test service',
      category: 'app',
      icon: 'alert-triangle',
      color: '#ff0000',
      baseURL: `http://127.0.0.1:${mockPort}`,
      auth: { type: 'bearer' },
      resources: [
        {
          name: 'item',
          displayName: 'Item',
          operations: [
            {
              name: 'get',
              displayName: 'Get',
              method: 'GET',
              path: '/error-endpoint'
            }
          ]
        }
      ]
    };

    const testNode = new DeclarativeNode(errorManifest);
    const execCtx = new ExecutionContext();
    const nodeConfig = {
      id: 'err-node',
      name: 'Error Node',
      type: 'err-svc',
      position: { x: 0, y: 0 },
      parameters: { resource: 'item', operation: 'item:get' }
    };

    const nodeCtx = execCtx.createNodeContext(nodeConfig, [{ json: {} }]);
    await assert.rejects(
      async () => { await testNode.execute(nodeCtx); },
      /Error Service API error \(404\): The item does not exist/
    );
  });
});
