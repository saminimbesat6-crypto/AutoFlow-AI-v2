import * as crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../database/connection';
import { CredentialsManager } from './manager';

export interface OAuth2ProviderPreset {
  id: string;
  name: string;
  authUrl: string;
  tokenUrl: string;
  defaultScope: string;
  authQueryParameters: Record<string, string>;
  description: string;
  docsUrl?: string;
}

export const OAUTH2_PRESETS: Record<string, OAuth2ProviderPreset> = {
  google: {
    id: 'google',
    name: 'Google (Sheets, Drive, Gmail)',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    defaultScope: 'openid email profile https://www.googleapis.com/auth/spreadsheets',
    authQueryParameters: {
      access_type: 'offline',
      prompt: 'consent'
    },
    description: 'Connect Google APIs with automatic refresh tokens.'
  },
  github: {
    id: 'github',
    name: 'GitHub',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    defaultScope: 'repo read:user user:email',
    authQueryParameters: {},
    description: 'Access GitHub repositories, issues, and user profiles.'
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    defaultScope: 'chat:write,channels:read,users:read',
    authQueryParameters: {},
    description: 'Post messages, read channels, and manage users in Slack workspaces.'
  },
  microsoft: {
    id: 'microsoft',
    name: 'Microsoft 365 / Azure Graph',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    defaultScope: 'offline_access https://graph.microsoft.com/.default',
    authQueryParameters: {},
    description: 'Connect to Microsoft Graph, OneDrive, Excel, and Outlook.'
  },
  notion: {
    id: 'notion',
    name: 'Notion',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    defaultScope: '',
    authQueryParameters: { owner: 'user' },
    description: 'Integrate Notion workspaces, databases, and pages via OAuth.'
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    authUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    defaultScope: 'identify bot applications.commands',
    authQueryParameters: {},
    description: 'Send messages and interact with Discord guilds and channels.'
  },
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    authUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    defaultScope: 'user-read-private user-read-email playlist-read-private',
    authQueryParameters: {},
    description: 'Access Spotify playback, playlists, and user library.'
  },
  custom: {
    id: 'custom',
    name: 'Custom OAuth2 Provider',
    authUrl: '',
    tokenUrl: '',
    defaultScope: '',
    authQueryParameters: {},
    description: 'Connect any RFC 6749 compliant OAuth2 service.'
  }
};

export interface StartAuthOptions {
  credentialId?: string;
  name?: string;
  provider?: string;
  clientId: string;
  clientSecret: string;
  authUrl?: string;
  tokenUrl?: string;
  scope?: string;
  redirectUri: string;
  authQueryParameters?: Record<string, string>;
}

export class OAuth2Manager {
  private db: DatabaseSync;
  private credentialsManager: CredentialsManager;

  constructor(db?: DatabaseSync, credentialsManager?: CredentialsManager) {
    this.db = db || getDatabase();
    this.credentialsManager = credentialsManager || new CredentialsManager(this.db);
  }

  getPresets(): OAuth2ProviderPreset[] {
    return Object.values(OAUTH2_PRESETS);
  }

  getPreset(id: string): OAuth2ProviderPreset | undefined {
    return OAUTH2_PRESETS[id.toLowerCase()];
  }

  startAuth(options: StartAuthOptions): { authUrl: string; state: string } {
    const {
      credentialId,
      name,
      provider = 'custom',
      clientId,
      clientSecret,
      redirectUri
    } = options;

    if (!clientId || !clientSecret) {
      throw new Error('clientId and clientSecret are required to initiate OAuth2 authorization');
    }

    const preset = this.getPreset(provider);
    const authUrlBase = options.authUrl || preset?.authUrl;
    const tokenUrl = options.tokenUrl || preset?.tokenUrl;
    const scope = options.scope !== undefined ? options.scope : (preset?.defaultScope || '');

    if (!authUrlBase) {
      throw new Error(`Authorization URL is missing for provider "${provider}"`);
    }
    if (!tokenUrl) {
      throw new Error(`Token exchange URL is missing for provider "${provider}"`);
    }

    // Generate cryptographically secure state
    const state = crypto.randomBytes(24).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 mins TTL

    const statePayload = {
      credentialId,
      name: name || `${preset?.name || provider} Credential`,
      provider,
      clientId,
      clientSecret,
      tokenUrl,
      redirectUri,
      scope
    };

    // Store state in oauth2_states table
    const stmt = this.db.prepare(
      'INSERT INTO oauth2_states (state, credential_id, config, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(state, credentialId || null, JSON.stringify(statePayload), now.toISOString(), expiresAt);

    // Build URL query parameters
    const url = new URL(authUrlBase);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);

    if (scope && scope.trim().length > 0) {
      url.searchParams.set('scope', scope);
    }

    // Merge preset authQueryParameters and custom ones
    const extraParams = {
      ...(preset?.authQueryParameters || {}),
      ...(options.authQueryParameters || {})
    };

    for (const [key, val] of Object.entries(extraParams)) {
      if (val !== undefined && val !== null) {
        url.searchParams.set(key, String(val));
      }
    }

    return {
      authUrl: url.toString(),
      state
    };
  }

  async handleCallback(code: string, state: string): Promise<{ success: boolean; credentialId: string; name: string }> {
    if (!state || !code) {
      throw new Error('Missing code or state parameter in OAuth2 callback');
    }

    // Retrieve and validate state
    const stmt = this.db.prepare('SELECT state, credential_id, config, expires_at FROM oauth2_states WHERE state = ?');
    const row = stmt.get(state) as any;

    if (!row) {
      throw new Error('Invalid or expired OAuth2 state. Please re-initiate connection.');
    }

    // Immediately remove state to avoid replay attacks
    const delStmt = this.db.prepare('DELETE FROM oauth2_states WHERE state = ?');
    delStmt.run(state);

    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error('OAuth2 state token has expired. Please re-initiate connection.');
    }

    const config = JSON.parse(row.config);
    const { credentialId, name, provider, clientId, clientSecret, tokenUrl, redirectUri, scope } = config;

    // Exchange authorization code for tokens
    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };

    // Some providers like Notion require Basic Auth
    if (provider === 'notion') {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body: bodyParams.toString()
    });

    const rawText = await response.text();
    let tokenData: any;
    try {
      tokenData = JSON.parse(rawText);
    } catch {
      // Check if it's urlencoded format (like legacy github)
      const parsed = new URLSearchParams(rawText);
      if (parsed.has('access_token')) {
        tokenData = Object.fromEntries(parsed.entries());
      } else {
        throw new Error(`Failed to parse OAuth2 token response: ${rawText.slice(0, 200)}`);
      }
    }

    if (!response.ok || tokenData.error) {
      const errorMsg = tokenData.error_description || tokenData.error || `HTTP ${response.status} from ${tokenUrl}`;
      throw new Error(`OAuth2 token exchange failed: ${errorMsg}`);
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in ? Number(tokenData.expires_in) : undefined;
    const expiresAt = expiresIn ? Date.now() + (expiresIn * 1000) : undefined;
    const tokenType = tokenData.token_type || 'Bearer';

    if (!accessToken) {
      throw new Error('OAuth2 provider response did not contain an access_token');
    }

    // Prepare credential data
    const credentialPayload: Record<string, any> = {
      provider,
      clientId,
      clientSecret,
      tokenUrl,
      redirectUri,
      scope: tokenData.scope || scope,
      accessToken,
      refreshToken: refreshToken || undefined,
      tokenType,
      expiresAt,
      connectedAt: new Date().toISOString(),
      status: 'connected'
    };

    let targetId = credentialId;

    if (targetId) {
      const existing = this.credentialsManager.get(targetId, true);
      if (existing) {
        // Retain existing refresh token if provider did not return a new one
        if (!credentialPayload.refreshToken && existing.data?.refreshToken) {
          credentialPayload.refreshToken = existing.data.refreshToken;
        }
        this.credentialsManager.update(targetId, existing.name, {
          ...(existing.data || {}),
          ...credentialPayload
        });
      } else {
        const created = this.credentialsManager.create(name, 'oauth2', credentialPayload);
        targetId = created.id;
      }
    } else {
      const created = this.credentialsManager.create(name, 'oauth2', credentialPayload);
      targetId = created.id;
    }

    return {
      success: true,
      credentialId: targetId,
      name
    };
  }

  async refreshToken(credentialId: string): Promise<string> {
    const cred = this.credentialsManager.get(credentialId, true);
    if (!cred) {
      throw new Error(`Credential "${credentialId}" not found`);
    }
    if (cred.type !== 'oauth2') {
      throw new Error(`Credential "${credentialId}" is of type "${cred.type}", not "oauth2"`);
    }

    const data = cred.data || {};
    const { tokenUrl, clientId, clientSecret, refreshToken, provider } = data;

    if (!refreshToken) {
      throw new Error(`Credential "${cred.name}" has no refresh token to renew`);
    }
    if (!tokenUrl || !clientId || !clientSecret) {
      throw new Error(`Credential "${cred.name}" is missing OAuth2 configuration required for token refresh`);
    }

    const bodyParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };

    if (provider === 'notion') {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body: bodyParams.toString()
    });

    const rawText = await response.text();
    let tokenData: any;
    try {
      tokenData = JSON.parse(rawText);
    } catch {
      throw new Error(`Failed to parse refresh token response: ${rawText.slice(0, 200)}`);
    }

    if (!response.ok || tokenData.error) {
      const errorMsg = tokenData.error_description || tokenData.error || `HTTP ${response.status}`;
      throw new Error(`Token refresh failed for "${cred.name}": ${errorMsg}`);
    }

    const newAccessToken = tokenData.access_token;
    if (!newAccessToken) {
      throw new Error(`Refresh response did not include a new access_token`);
    }

    const expiresIn = tokenData.expires_in ? Number(tokenData.expires_in) : undefined;
    const expiresAt = expiresIn ? Date.now() + (expiresIn * 1000) : undefined;

    // Update credential record
    const updatedData = {
      ...data,
      accessToken: newAccessToken,
      refreshToken: tokenData.refresh_token || refreshToken, // retain old if not rotated
      expiresAt,
      refreshedAt: new Date().toISOString()
    };

    this.credentialsManager.update(credentialId, cred.name, updatedData);
    return newAccessToken;
  }

  async getValidAccessToken(credentialId: string): Promise<string> {
    const cred = this.credentialsManager.get(credentialId, true);
    if (!cred) {
      throw new Error(`Credential "${credentialId}" not found`);
    }
    if (cred.type !== 'oauth2') {
      throw new Error(`Credential "${credentialId}" is not an OAuth2 credential`);
    }

    const data = cred.data || {};
    const { accessToken, refreshToken, expiresAt } = data;

    // Check if current access token is valid and not close to expiring (within 60s window)
    const BUFFER_MS = 60000;
    const isExpired = expiresAt ? Date.now() >= (expiresAt - BUFFER_MS) : false;

    if (accessToken && !isExpired) {
      return accessToken;
    }

    // If expired or missing, try refreshing
    if (refreshToken) {
      return await this.refreshToken(credentialId);
    }

    if (accessToken) {
      // No refresh token available, but access token exists (might still work if provider doesn't enforce strict expires)
      return accessToken;
    }

    throw new Error(`OAuth2 credential "${cred.name}" has no valid access token and no refresh token available`);
  }

  renderCallbackHtml(success: boolean, message: string, credentialId?: string): string {
    const color = success ? '#10b981' : '#ef4444';
    const title = success ? 'Authorization Successful!' : 'Authorization Failed';
    const subText = success
      ? 'Your account has been securely connected to AutoFlow AI. You may close this window.'
      : message;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} - AutoFlow AI</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090d16;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      padding: 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      background: ${success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
      color: ${color};
    }
    h2 { margin: 0 0 10px; font-size: 22px; font-weight: 700; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 24px; }
    .btn {
      background: ${color};
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 10px 24px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      ${success ? '✓' : '✕'}
    </div>
    <h2>${title}</h2>
    <p>${subText}</p>
    <button class="btn" onclick="window.close()">Close Window</button>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({
          type: 'OAUTH2_AUTH_COMPLETE',
          success: ${success},
          credentialId: ${JSON.stringify(credentialId || null)},
          message: ${JSON.stringify(message)}
        }, '*');
        setTimeout(() => {
          window.close();
        }, 1500);
      }
    } catch (e) {
      console.error(e);
    }
  </script>
</body>
</html>`;
  }
}
