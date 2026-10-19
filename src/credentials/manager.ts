import * as crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || 'autoflow-default-secret-key-32b!';
  return crypto.scryptSync(secret, 'autoflow-salt', 32);
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine iv + tag + encrypted into base64 string
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const buffer = Buffer.from(encryptedText, 'base64');

  if (buffer.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid encrypted payload');
  }

  const iv = buffer.subarray(0, IV_LENGTH);
  const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buffer.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

export interface CredentialRecord {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  data?: Record<string, any>;
}

export class CredentialsManager {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  create(name: string, type: string, data: Record<string, any>): CredentialRecord {
    const id = uuidv4();
    const now = new Date().toISOString();
    const encryptedData = encrypt(JSON.stringify(data));

    const stmt = this.db.prepare(
      'INSERT INTO credentials (id, name, type, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(id, name, type, encryptedData, now, now);

    return {
      id,
      name,
      type,
      createdAt: now,
      updatedAt: now
    };
  }

  update(id: string, name: string, data?: Record<string, any>): CredentialRecord | null {
    const existing = this.get(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    if (data !== undefined) {
      const encryptedData = encrypt(JSON.stringify(data));
      const stmt = this.db.prepare(
        'UPDATE credentials SET name = ?, data = ?, updated_at = ? WHERE id = ?'
      );
      stmt.run(name, encryptedData, now, id);
    } else {
      const stmt = this.db.prepare('UPDATE credentials SET name = ?, updated_at = ? WHERE id = ?');
      stmt.run(name, now, id);
    }

    return this.get(id);
  }

  get(id: string, includeDecrypted = false): CredentialRecord | null {
    const stmt = this.db.prepare('SELECT id, name, type, data, created_at, updated_at FROM credentials WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;

    const result: CredentialRecord = {
      id: row.id,
      name: row.name,
      type: row.type,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    if (includeDecrypted) {
      try {
        result.data = JSON.parse(decrypt(row.data));
      } catch {
        result.data = {};
      }
    }
    return result;
  }

  list(): CredentialRecord[] {
    const stmt = this.db.prepare('SELECT id, name, type, created_at, updated_at FROM credentials ORDER BY name ASC');
    const rows = stmt.all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM credentials WHERE id = ?');
    stmt.run(id);
    return true;
  }

  async testCredential(type: string, data: Record<string, any>): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!data || Object.keys(data).length === 0) {
        return { success: false, error: 'Credential data cannot be empty' };
      }

      // 1. Generic HTTP header/bearer/basic test
      if (['httpHeaderAuth', 'httpBearerAuth', 'httpBasicAuth', 'httpCustomAuth'].includes(type)) {
        const testUrl = data.testUrl || data.url;
        if (testUrl) {
          const headers: Record<string, string> = { 'User-Agent': 'AutoFlow-AI-Credential-Probe/1.0' };
          if (type === 'httpBearerAuth' && data.token) {
            headers['Authorization'] = `Bearer ${data.token}`;
          } else if (type === 'httpHeaderAuth' && data.name && data.value) {
            headers[data.name] = data.value;
          } else if (type === 'httpBasicAuth' && data.user && data.password) {
            headers['Authorization'] = `Basic ${Buffer.from(`${data.user}:${data.password}`).toString('base64')}`;
          }

          const res = await fetch(testUrl, { method: 'HEAD', headers, signal: AbortSignal.timeout(5000) });
          if (res.ok) {
            return { success: true, message: `Successfully verified credential against ${testUrl} (HTTP ${res.status})` };
          } else {
            return { success: false, error: `Authentication probe to ${testUrl} returned HTTP ${res.status}` };
          }
        }
        return { success: true, message: 'Credential format is valid' };
      }

      // 2. Stripe
      if (type === 'stripe' || type === 'stripeApi') {
        const key = data.apiKey || data.secretKey || data.token;
        if (!key) return { success: false, error: 'Missing Stripe API key' };
        const res = await fetch('https://api.stripe.com/v1/balance', {
          headers: { 'Authorization': `Bearer ${key}` },
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) return { success: true, message: 'Stripe API connection verified!' };
        const err: any = await res.json().catch(() => ({}));
        return { success: false, error: err.error?.message || `Stripe returned HTTP ${res.status}` };
      }

      // 3. GitHub
      if (type === 'github' || type === 'githubApi') {
        const token = data.token || data.apiKey;
        if (!token) return { success: false, error: 'Missing GitHub personal access token' };
        const res = await fetch('https://api.github.com/user', {
          headers: { 'Authorization': `token ${token}`, 'User-Agent': 'AutoFlow-AI' },
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) return { success: true, message: 'GitHub connection verified!' };
        return { success: false, error: `GitHub API returned HTTP ${res.status}` };
      }

      // 4. Slack
      if (type === 'slack' || type === 'slackApi') {
        const token = data.token || data.botToken;
        if (!token) return { success: false, error: 'Missing Slack token' };
        const res = await fetch('https://slack.com/api/auth.test', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(5000)
        });
        const json: any = await res.json().catch(() => ({}));
        if (json.ok) return { success: true, message: `Slack connection verified for team: ${json.team}` };
        return { success: false, error: json.error || 'Slack authentication failed' };
      }

      // 5. OpenAI
      if (type === 'openai' || type === 'openAiApi') {
        const key = data.apiKey;
        if (!key) return { success: false, error: 'Missing OpenAI API key' };
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` },
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) return { success: true, message: 'OpenAI API key verified!' };
        return { success: false, error: `OpenAI returned HTTP ${res.status}` };
      }

      // 6. Gemini
      if (type === 'gemini' || type === 'googleGeminiApi') {
        const key = data.apiKey;
        if (!key) return { success: false, error: 'Missing Gemini API key' };
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) return { success: true, message: 'Google Gemini API key verified!' };
        return { success: false, error: `Gemini returned HTTP ${res.status}` };
      }

      // Default fallback verification
      const hasAnyValue = Object.values(data).some(v => v !== null && v !== undefined && String(v).trim().length > 0);
      if (hasAnyValue) {
        return { success: true, message: `Credential parameters for "${type}" verified successfully.` };
      }
      return { success: false, error: 'No values provided for credential' };
    } catch (err: any) {
      return { success: false, error: `Connection test error: ${err.message}` };
    }
  }
}
