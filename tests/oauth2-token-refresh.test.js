const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const { runMigrations } = require('../dist/database/migrations');
const { CredentialsManager } = require('../dist/credentials/manager');
const { OAuth2Manager, OAUTH2_PRESETS } = require('../dist/credentials/oauth2-manager');
const { HttpRequestNode } = require('../dist/nodes/core/http-request');
const { ExecutionContext } = require('../dist/engine/context');

describe('AutoFlow AI OAuth2 Engine & Token Refresh (Phase B) Test Suite', () => {
  const dbPath = path.join(__dirname, 'test-oauth2.sqlite');
  let db;
  let credentialsManager;
  let oauth2Manager;
  let mockServer;
  let mockServerPort;

  before(async () => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    db = new DatabaseSync(dbPath);
    runMigrations(db);

    credentialsManager = new CredentialsManager(db);
    oauth2Manager = new OAuth2Manager(db, credentialsManager);

    // Setup local mock OAuth2 token server
    await new Promise((resolve) => {
      mockServer = http.createServer((req, res) => {
        if (req.method === 'POST' && req.url === '/oauth/token') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            const params = new URLSearchParams(body);
            const grantType = params.get('grant_type');

            if (grantType === 'authorization_code') {
              const code = params.get('code');
              if (code === 'valid-auth-code') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  access_token: 'initial-access-token-12345',
                  refresh_token: 'valid-refresh-token-67890',
                  expires_in: 3600,
                  token_type: 'Bearer',
                  scope: 'read:user repo'
                }));
              } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Code is invalid' }));
              }
            } else if (grantType === 'refresh_token') {
              const rToken = params.get('refresh_token');
              if (rToken === 'valid-refresh-token-67890' || rToken === 'expiring-refresh-token') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  access_token: 'refreshed-access-token-99999',
                  refresh_token: 'valid-refresh-token-67890',
                  expires_in: 7200,
                  token_type: 'Bearer'
                }));
              } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Refresh token expired' }));
              }
            } else {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'unsupported_grant_type' }));
            }
          });
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      mockServer.listen(0, '127.0.0.1', () => {
        mockServerPort = mockServer.address().port;
        resolve();
      });
    });
  });

  after(() => {
    if (mockServer) mockServer.close();
    if (db) db.close();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const wal = `${dbPath}-wal`;
    const shm = `${dbPath}-shm`;
    if (fs.existsSync(wal)) fs.unlinkSync(wal);
    if (fs.existsSync(shm)) fs.unlinkSync(shm);
  });

  test('1. OAuth2 Presets: Provides definitions for Google, GitHub, Slack, Notion, Microsoft', () => {
    const presets = oauth2Manager.getPresets();
    assert.ok(presets.length >= 7, 'Should provide at least 7 presets');

    const google = oauth2Manager.getPreset('google');
    assert.strictEqual(google.id, 'google');
    assert.ok(google.authUrl.includes('accounts.google.com'));
    assert.strictEqual(google.authQueryParameters.access_type, 'offline');

    const github = oauth2Manager.getPreset('github');
    assert.strictEqual(github.id, 'github');
    assert.ok(github.authUrl.includes('github.com'));

    const slack = oauth2Manager.getPreset('slack');
    assert.strictEqual(slack.id, 'slack');
    assert.ok(slack.authUrl.includes('slack.com'));
  });

  test('2. StartAuth: Generates cryptographic state and builds RFC 6749 authorization URL', () => {
    const startResult = oauth2Manager.startAuth({
      provider: 'github',
      clientId: 'gh-client-id-xyz',
      clientSecret: 'gh-secret-abc',
      redirectUri: 'http://localhost:3456/api/credentials/oauth2/callback'
    });

    assert.ok(startResult.authUrl, 'Should return authUrl');
    assert.ok(startResult.state, 'Should return state token');
    assert.strictEqual(startResult.state.length, 48, 'State should be 24 random hex bytes');

    const parsed = new URL(startResult.authUrl);
    assert.strictEqual(parsed.origin, 'https://github.com');
    assert.strictEqual(parsed.searchParams.get('client_id'), 'gh-client-id-xyz');
    assert.strictEqual(parsed.searchParams.get('state'), startResult.state);
    assert.strictEqual(parsed.searchParams.get('response_type'), 'code');

    // Verify stored state in DB
    const checkState = db.prepare('SELECT * FROM oauth2_states WHERE state = ?').get(startResult.state);
    assert.ok(checkState, 'State must be recorded in SQLite oauth2_states table');
  });

  test('3. Callback & Token Exchange: Exchanges auth code for access & refresh tokens', async () => {
    const startResult = oauth2Manager.startAuth({
      name: 'My Custom OAuth Service',
      provider: 'custom',
      clientId: 'mock-client',
      clientSecret: 'mock-secret',
      authUrl: `http://127.0.0.1:${mockServerPort}/oauth/auth`,
      tokenUrl: `http://127.0.0.1:${mockServerPort}/oauth/token`,
      redirectUri: `http://localhost:3456/api/credentials/oauth2/callback`
    });

    // Execute callback with valid code
    const callbackResult = await oauth2Manager.handleCallback('valid-auth-code', startResult.state);
    assert.strictEqual(callbackResult.success, true);
    assert.ok(callbackResult.credentialId, 'Should yield created credential ID');

    // Verify state was deleted (single-use anti-replay)
    const stateRow = db.prepare('SELECT * FROM oauth2_states WHERE state = ?').get(startResult.state);
    assert.strictEqual(stateRow, undefined, 'State token must be consumed and deleted after callback');

    // Verify credential stored encrypted in database
    const cred = credentialsManager.get(callbackResult.credentialId, true);
    assert.ok(cred, 'Credential must exist in database');
    assert.strictEqual(cred.type, 'oauth2');
    assert.strictEqual(cred.data.accessToken, 'initial-access-token-12345');
    assert.strictEqual(cred.data.refreshToken, 'valid-refresh-token-67890');
    assert.strictEqual(cred.data.status, 'connected');
    assert.ok(cred.data.expiresAt > Date.now(), 'expiresAt should be computed into future');
  });

  test('4. Token Refresh Engine: Automatically renews expired access token', async () => {
    // Create an expired OAuth2 credential
    const expiredCred = credentialsManager.create('Expired API Account', 'oauth2', {
      provider: 'custom',
      clientId: 'mock-client',
      clientSecret: 'mock-secret',
      tokenUrl: `http://127.0.0.1:${mockServerPort}/oauth/token`,
      accessToken: 'old-expired-token',
      refreshToken: 'valid-refresh-token-67890',
      expiresAt: Date.now() - 5000, // Expired 5 seconds ago
      status: 'connected'
    });

    // getValidAccessToken should detect expiration and transparently call refreshToken
    const validToken = await oauth2Manager.getValidAccessToken(expiredCred.id);
    assert.strictEqual(validToken, 'refreshed-access-token-99999', 'Must return newly refreshed token');

    // Verify DB updated with refreshed token
    const updatedCred = credentialsManager.get(expiredCred.id, true);
    assert.strictEqual(updatedCred.data.accessToken, 'refreshed-access-token-99999');
    assert.ok(updatedCred.data.expiresAt > Date.now() + 1000, 'expiresAt updated to new TTL');
    assert.ok(updatedCred.data.refreshedAt, 'refreshedAt timestamp recorded');
  });

  test('5. ExecutionContext Integration: Automatically provides OAuth2 token to HTTP Request Node', async () => {
    const cred = credentialsManager.create('Github Integration', 'oauth2', {
      provider: 'github',
      accessToken: 'gho_current_valid_token_abc',
      refreshToken: 'ghr_refresh_token_123',
      expiresAt: Date.now() + 3600000, // Valid for 1 hour
      status: 'connected'
    });

    const execContext = new ExecutionContext(credentialsManager, process.env, undefined, oauth2Manager);

    const httpNode = new HttpRequestNode();
    const nodeConfig = {
      id: 'http-1',
      name: 'Fetch User',
      type: 'http-request',
      position: { x: 100, y: 100 },
      credentials: { oauth2: cred.id },
      parameters: {
        url: `http://127.0.0.1:${mockServerPort}/test-auth-header`,
        method: 'GET',
        authentication: 'oAuth2',
        allowPrivateNetwork: true
      }
    };

    // Test intercepting request headers inside local mock server
    let capturedAuthHeader = null;
    const testHeaderServer = http.createServer((req, res) => {
      capturedAuthHeader = req.headers['authorization'];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ authenticated: true }));
    });

    await new Promise((res) => testHeaderServer.listen(0, '127.0.0.1', res));
    const testPort = testHeaderServer.address().port;
    nodeConfig.parameters.url = `http://127.0.0.1:${testPort}/test-auth-header`;

    try {
      const nodeCtx = execContext.createNodeContext(nodeConfig, [{ json: {} }]);
      const output = await httpNode.execute(nodeCtx);

      assert.strictEqual(capturedAuthHeader, 'Bearer gho_current_valid_token_abc');
      assert.strictEqual(output[0][0].json.data.authenticated, true);
    } finally {
      testHeaderServer.close();
    }
  });

  test('6. HTML Callback View: Renders clean postMessage script and user confirmation', () => {
    const htmlSuccess = oauth2Manager.renderCallbackHtml(true, 'Connected', 'cred-123');
    assert.ok(htmlSuccess.includes('Authorization Successful!'));
    assert.ok(htmlSuccess.includes('OAUTH2_AUTH_COMPLETE'));
    assert.ok(htmlSuccess.includes('cred-123'));
    assert.ok(htmlSuccess.includes('window.close()'));

    const htmlFailure = oauth2Manager.renderCallbackHtml(false, 'User denied permissions');
    assert.ok(htmlFailure.includes('Authorization Failed'));
    assert.ok(htmlFailure.includes('User denied permissions'));
  });
});
