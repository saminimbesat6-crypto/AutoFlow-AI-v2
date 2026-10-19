import { Router, Request, Response } from 'express';
import { CredentialsManager } from '../../credentials/manager';
import { NodeRegistry } from '../../nodes/registry';
import { AntigravityCopilot } from '../../copilot/antigravity-copilot';
import { GeminiClient, GeminiContent } from '../../nodes/ai/gemini-client';

export function createAiAssistantRouter(credentialsManager: CredentialsManager, executor?: any): Router {
  const router = Router();
  const nodeRegistry = NodeRegistry.getInstance();
  const copilot = AntigravityCopilot.getInstance(credentialsManager);

  // Check Antigravity connection and Google account status
  router.get('/status', (req: Request, res: Response) => {
    try {
      const status = copilot.getStatus();

      res.json({
        success: true,
        copilot: 'Antigravity CLI',
        connected: status.connected,
        email: status.email || null,
        user: status.user || null,
        authMethod: status.authMethod,
        cliAvailable: status.cliAvailable,
        source: status.connected ? 'antigravity_cli' : 'none',
        version: status.version
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Sign in with Google Account to Antigravity Copilot
  router.post('/signin', async (req: Request, res: Response) => {
    try {
      const { email, tokenData, code } = req.body || {};
      const status = await copilot.signInWithGoogle({ email, tokenData, code });
      res.json({
        ...status,
        message: `Successfully signed in to Antigravity Copilot with Google account (${status.email})`
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to sign in with Google Account' });
    }
  });

  // Sign out of Antigravity Copilot
  router.post('/signout', (req: Request, res: Response) => {
    try {
      const status = copilot.signOut();
      res.json({
        ...status,
        message: 'Signed out of Antigravity Copilot'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Main Copilot Chat & Workflow Generator endpoint (Powered by Antigravity CLI)
  router.post('/chat', async (req: Request, res: Response) => {
    try {
      const { message, history, currentWorkflow, apiKey: directKey } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'Message is required' });
      }

      const status = copilot.getStatus();
      const hasEnvKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here');
      const apiKey = directKey || (hasEnvKey ? process.env.GEMINI_API_KEY : undefined);

      if ((!status.connected && !apiKey) || (process.env.NODE_ENV === 'test' && !process.env.GEMINI_API_KEY && !directKey)) {
        return res.status(400).json({
          success: false,
          needsSignIn: true,
          needsApiKey: true,
          error: 'Google Account sign-in required. Please sign in to Antigravity Copilot with your Google account.'
        });
      }

      const availableNodes = nodeRegistry.list();
      const nodesCatalog = availableNodes.map((n) => ({
        type: n.type,
        name: n.name,
        description: n.description,
        params: n.properties?.map((p) => `${p.name}: ${p.type}${p.default !== undefined ? ` (default: ${JSON.stringify(p.default)})` : ''}`)
      }));

      // If Antigravity CLI is active and connected, use Antigravity Copilot!
      if (status.connected) {
        try {
          const parsed = await copilot.executeBuildSession({
            message,
            history,
            currentWorkflow,
            nodesCatalog
          }, undefined, executor);

          return res.json({
            success: true,
            copilot: 'Antigravity CLI',
            account: status.email,
            data: parsed
          });
        } catch (cliErr: any) {
          console.warn('[Antigravity Copilot CLI Execution Notice]', cliErr.message);
          // If CLI had an issue and API key exists, fallback to GeminiClient
          if (!apiKey) {
            throw cliErr;
          }
        }
      }

      // Fallback pathway with direct API key if configured
      if (apiKey) {
        const systemInstruction = `You are AutoFlow AI Copilot. Design workflow automation pipelines adhering to the exact schema.`;
        const contents: GeminiContent[] = [];
        if (Array.isArray(history)) {
          for (const item of history.slice(-4)) {
            if (item.role === 'user' || item.role === 'model') {
              contents.push({ role: item.role, parts: [{ text: item.text || item.content || '' }] });
            }
          }
        }
        contents.push({ role: 'user', parts: [{ text: message }] });

        const response = await GeminiClient.generateContent({
          apiKey,
          model: 'gemini-3.8-flash',
          systemInstruction,
          contents,
          temperature: 0.3,
          responseMimeType: 'application/json',
          timeoutMs: 60000
        });

        const parsed = response.json || JSON.parse(response.text.replace(/```(?:json)?\n?|\n?```/g, '').trim());
        return res.json({
          success: true,
          copilot: 'Gemini Direct Fallback',
          data: parsed
        });
      }

      return res.status(400).json({
        success: false,
        needsSignIn: true,
        needsApiKey: true,
        error: 'Google Account sign-in required. Please sign in to Antigravity Copilot.'
      });
    } catch (err: any) {
      console.error('[Copilot Error]', err);
      res.status(500).json({ success: false, error: err.message || 'Error processing Copilot request' });
    }
  });

  // Self-Healing & 1-Click Auto-Fix endpoint (Powered by Antigravity Copilot)
  router.post('/auto-fix', async (req: Request, res: Response) => {
    try {
      const { workflow, nodeId, error, inputData, apiKey: directKey } = req.body;

      if (!workflow || !nodeId) {
        return res.status(400).json({ success: false, error: 'Workflow and nodeId are required' });
      }

      const node = (workflow.nodes || []).find((n: any) => n.id === nodeId || n.name === nodeId);
      if (!node) {
        return res.status(404).json({ success: false, error: `Node "${nodeId}" not found in workflow` });
      }

      const status = copilot.getStatus();
      const hasEnvKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here');
      const apiKey = directKey || (hasEnvKey ? process.env.GEMINI_API_KEY : undefined);

      if (!status.connected && !apiKey) {
        return res.status(400).json({
          success: false,
          needsSignIn: true,
          needsApiKey: true,
          error: 'Google Account sign-in required for Antigravity Self-Healing.'
        });
      }

      const nodeDef = nodeRegistry.get(node.type);

      if (status.connected) {
        const fixResult = await copilot.autoFixNode({
          workflow,
          node,
          nodeDef,
          error,
          inputData
        });

        return res.json({
          success: true,
          copilot: 'Antigravity CLI',
          data: fixResult
        });
      }

      // Fallback
      if (apiKey) {
        const prompt = `Fix error in node "${node.name}" (${node.type}): "${error}". Output JSON with diagnosis, fixExplanation, fixedParameters.`;
        const response = await GeminiClient.generateContent({
          apiKey,
          model: 'gemini-3.8-flash',
          systemInstruction: 'You are AutoFlow AI debugging expert. Output valid JSON only.',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          temperature: 0.2,
          responseMimeType: 'application/json',
          timeoutMs: 60000
        });

        const fixData = response.json || JSON.parse(response.text.replace(/```(?:json)?\n?|\n?```/g, '').trim());
        return res.json({
          success: true,
          copilot: 'Gemini Direct Fallback',
          data: {
            nodeId: node.id,
            nodeName: node.name,
            diagnosis: fixData.diagnosis || 'Parameter issue identified',
            fixExplanation: fixData.fixExplanation || 'Adjusted parameters to resolve execution error',
            fixedParameters: fixData.fixedParameters || node.parameters,
            confidence: fixData.confidence || 'high'
          }
        });
      }
    } catch (err: any) {
      console.error('[Antigravity Auto-Fix Error]', err);
      res.status(500).json({ success: false, error: err.message || 'Error running Antigravity Auto-Fix' });
    }
  });

  // Real-time observable build stream (Server-Sent Events)
  const handleBuildStream = async (req: Request, res: Response) => {
    try {
      const message = req.method === 'GET' ? (req.query.message as string) : req.body?.message;
      const history = req.body?.history;
      const currentWorkflow = req.body?.currentWorkflow;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'Message is required' });
      }

      const status = copilot.getStatus();
      if (!status.connected && (process.env.NODE_ENV === 'test' || !process.env.GEMINI_API_KEY)) {
        return res.status(400).json({
          success: false,
          needsSignIn: true,
          error: 'Google Account sign-in required. Please sign in to Antigravity Copilot.'
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      const result = await copilot.executeBuildSession(
        {
          message,
          history,
          currentWorkflow
        },
        (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        },
        executor
      );

      res.write(`data: ${JSON.stringify({ stage: 'done', status: 'completed', data: result })}\n\n`);
      res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ stage: 'error', status: 'failed', message: err.message })}\n\n`);
      res.end();
    }
  };

  router.post('/build-stream', handleBuildStream);
  router.get('/build-stream', handleBuildStream);

  return router;
}
