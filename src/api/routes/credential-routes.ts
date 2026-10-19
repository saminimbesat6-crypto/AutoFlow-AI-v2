import { Router, Request, Response } from 'express';
import { CredentialsManager } from '../../credentials/manager';
import { OAuth2Manager } from '../../credentials/oauth2-manager';

export function createCredentialRouter(
  credentialsManager: CredentialsManager,
  oauth2Manager?: OAuth2Manager
): Router {
  const router = Router();
  const oauth = oauth2Manager || new OAuth2Manager(undefined, credentialsManager);

  // List all credentials (safe metadata only)
  router.get('/', (_req: Request, res: Response) => {
    try {
      const list = credentialsManager.list();
      res.json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get OAuth2 presets
  router.get('/oauth2/presets', (_req: Request, res: Response) => {
    try {
      const presets = oauth.getPresets();
      res.json({ success: true, data: presets });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Start OAuth2 authorization flow
  router.post('/oauth2/start', (req: Request, res: Response) => {
    try {
      const {
        credentialId,
        name,
        provider,
        clientId,
        clientSecret,
        authUrl,
        tokenUrl,
        scope,
        authQueryParameters
      } = req.body;

      if (!clientId || !clientSecret) {
        return res.status(400).json({
          success: false,
          error: 'Client ID and Client Secret are required to initiate OAuth2'
        });
      }

      // Default redirect URI pointing to current server host callback
      const host = req.get('host') || 'localhost:3456';
      const protocol = req.protocol || 'http';
      const redirectUri = req.body.redirectUri || `${protocol}://${host}/api/credentials/oauth2/callback`;

      const result = oauth.startAuth({
        credentialId,
        name,
        provider,
        clientId,
        clientSecret,
        authUrl,
        tokenUrl,
        scope,
        redirectUri,
        authQueryParameters
      });

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // OAuth2 Callback endpoint (RFC 6749)
  router.get('/oauth2/callback', async (req: Request, res: Response) => {
    const code = req.query.code ? String(req.query.code) : '';
    const state = req.query.state ? String(req.query.state) : '';
    const error = req.query.error ? String(req.query.error) : '';
    const errorDescription = req.query.error_description ? String(req.query.error_description) : '';

    if (error) {
      const html = oauth.renderCallbackHtml(false, errorDescription || error);
      return res.status(400).send(html);
    }

    try {
      const result = await oauth.handleCallback(code, state);
      const html = oauth.renderCallbackHtml(true, 'Connected successfully!', result.credentialId);
      res.send(html);
    } catch (err: any) {
      const html = oauth.renderCallbackHtml(false, err.message);
      res.status(400).send(html);
    }
  });

  // Refresh OAuth2 Token manually
  router.post('/oauth2/refresh/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const newToken = await oauth.refreshToken(id);
      res.json({ success: true, message: 'OAuth2 token refreshed successfully', hasToken: !!newToken });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Verify and retrieve valid OAuth2 access token
  router.get('/oauth2/token/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const token = await oauth.getValidAccessToken(id);
      res.json({ success: true, valid: true, preview: `${token.slice(0, 8)}...` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Test connection for a credential (n8n parity)
  router.post('/test', async (req: Request, res: Response) => {
    try {
      const { id, type, data } = req.body;
      let credType = type;
      let credData = data;

      if (id) {
        const existing = credentialsManager.get(id, true);
        if (!existing) {
          return res.status(404).json({ success: false, error: 'Credential not found' });
        }
        credType = existing.type;
        credData = credData || existing.data;
      }

      if (!credType) {
        return res.status(400).json({ success: false, error: 'Credential type is required' });
      }

      const result = await credentialsManager.testCredential(credType, credData || {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create credential
  router.post('/', (req: Request, res: Response) => {
    try {
      const { name, type, data } = req.body;
      if (!name || !type || !data) {
        return res.status(400).json({ success: false, error: 'Name, type, and data are required' });
      }

      const created = credentialsManager.create(name, type, data);
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update credential
  router.put('/:id', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const { name, data } = req.body;
      const updated = credentialsManager.update(id, name, data);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Credential not found' });
      }
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete credential
  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      credentialsManager.delete(id);
      res.json({ success: true, message: 'Credential deleted' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

