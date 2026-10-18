import * as crypto from 'node:crypto';
import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class PollingTriggerNode extends BaseNode {
  type = 'polling-trigger';
  name = 'Polling Trigger';
  description = 'Polls an external HTTP API or resource on a schedule, deduplicating records so only newly added items trigger the workflow.';
  category = 'trigger' as const;
  icon = 'refresh-cw';
  color = '#10b981';

  inputs: PortDefinition[] = [];
  outputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'New Items' }
  ];

  properties: PropertyDefinition[] = [
    {
      name: 'pollInterval',
      displayName: 'Poll Interval',
      type: 'options',
      default: '5m',
      options: [
        { name: 'Every 1 Minute', value: '1m' },
        { name: 'Every 5 Minutes', value: '5m' },
        { name: 'Every 15 Minutes', value: '15m' },
        { name: 'Every 30 Minutes', value: '30m' },
        { name: 'Every 1 Hour', value: '1h' },
        { name: 'Custom Cron Expression', value: 'custom' }
      ]
    },
    {
      name: 'customCron',
      displayName: 'Custom Cron',
      type: 'string',
      default: '*/5 * * * *',
      description: 'Standard 5-field cron expression when pollInterval is custom'
    },
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      default: 'http',
      options: [
        { name: 'HTTP REST API', value: 'http' },
        { name: 'Custom Items Feed', value: 'custom' }
      ]
    },
    {
      name: 'url',
      displayName: 'URL',
      type: 'string',
      default: 'https://api.example.com/items',
      description: 'API endpoint to poll. Supports {{ $staticData.lastPollTime }} interpolation'
    },
    {
      name: 'method',
      displayName: 'Method',
      type: 'options',
      default: 'GET',
      options: [
        { name: 'GET', value: 'GET' },
        { name: 'POST', value: 'POST' }
      ]
    },
    {
      name: 'authentication',
      displayName: 'Authentication',
      type: 'options',
      default: 'none',
      options: [
        { name: 'None', value: 'none' },
        { name: 'Bearer Token', value: 'bearer' },
        { name: 'OAuth2 Credential', value: 'oauth2' },
        { name: 'Header Auth', value: 'header' }
      ]
    },
    {
      name: 'itemsPath',
      displayName: 'Items Property Path',
      type: 'string',
      default: '',
      description: 'Path to items array in response JSON (e.g. "data" or "items"). Leave empty if response is already an array.'
    },
    {
      name: 'deduplicationStrategy',
      displayName: 'Deduplication Strategy',
      type: 'options',
      default: 'id',
      options: [
        { name: 'By Identifier (Unique ID)', value: 'id' },
        { name: 'By Timestamp (created_at / updated_at)', value: 'timestamp' },
        { name: 'By Item Content Hash', value: 'hash' }
      ]
    },
    {
      name: 'idProperty',
      displayName: 'ID Property Name',
      type: 'string',
      default: 'id',
      description: 'The property name containing the unique ID (e.g. "id", "uuid", "key")'
    },
    {
      name: 'timestampProperty',
      displayName: 'Timestamp Property Name',
      type: 'string',
      default: 'created_at',
      description: 'The property name containing the ISO timestamp'
    },
    {
      name: 'firstRunMode',
      displayName: 'First Run Behavior',
      type: 'options',
      default: 'only_new',
      options: [
        { name: 'Only New Items (Skip Existing)', value: 'only_new' },
        { name: 'Emit All Existing Items', value: 'emit_all' }
      ],
      description: 'Whether to emit existing items on the very first execution or initialize state silently.'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const mode = context.getNodeParameter('mode', 0, 'http');
    const deduplicationStrategy = context.getNodeParameter('deduplicationStrategy', 0, 'id');
    const idProperty = context.getNodeParameter('idProperty', 0, 'id');
    const timestampProperty = context.getNodeParameter('timestampProperty', 0, 'created_at');
    const firstRunMode = context.getNodeParameter('firstRunMode', 0, 'only_new');
    const itemsPath = context.getNodeParameter('itemsPath', 0, '');

    // Retrieve persistent static data across runs for this node
    const staticData = context.getWorkflowStaticData('node');

    let rawItems: any[] = [];

    if (mode === 'custom') {
      const customItems = context.getNodeParameter('customItems', 0, null);
      if (Array.isArray(customItems)) {
        rawItems = customItems;
      } else if (context.inputData && context.inputData.length > 0) {
        rawItems = context.inputData.map((d) => d.json);
      }
    } else {
      // HTTP Fetch
      const rawUrl = context.getNodeParameter('url', 0, '');
      const url = context.evaluateExpression(rawUrl);
      const method = context.getNodeParameter('method', 0, 'GET');
      const auth = context.getNodeParameter('authentication', 0, 'none');

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'AutoFlow-AI/1.0'
      };

      if (auth === 'bearer') {
        const token = context.getNodeParameter('token', 0, '');
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } else if (auth === 'oauth2') {
        const token = await context.getOAuth2Token('oauth2');
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } else if (auth === 'header') {
        const hName = context.getNodeParameter('headerName', 0, 'X-API-Key');
        const hVal = context.getNodeParameter('headerValue', 0, '');
        if (hName && hVal) headers[hName] = hVal;
      }

      const customHeaders = context.getNodeParameter('headers', 0, null);
      if (customHeaders && typeof customHeaders === 'object') {
        Object.assign(headers, customHeaders);
      }

      let body: string | undefined = undefined;
      if (method === 'POST') {
        const rawBody = context.getNodeParameter('body', 0, null);
        if (rawBody) {
          body = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
          if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
          }
        }
      }

      const res = await fetch(url, {
        method,
        headers,
        body
      });

      if (!res.ok) {
        throw new Error(`Polling request to ${url} failed with HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (itemsPath && itemsPath.trim()) {
        const parts = itemsPath.split('.');
        let current = data;
        for (const part of parts) {
          if (current && typeof current === 'object' && part in current) {
            current = current[part];
          } else {
            current = [];
            break;
          }
        }
        rawItems = Array.isArray(current) ? current : (current ? [current] : []);
      } else if (Array.isArray(data)) {
        rawItems = data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.items)) rawItems = data.items;
        else if (Array.isArray(data.data)) rawItems = data.data;
        else if (Array.isArray(data.results)) rawItems = data.results;
        else rawItems = [data];
      }
    }

    const MAX_MEMORY = 1000;

    // First Run Initialization
    if (staticData.initialized !== true) {
      staticData.initialized = true;
      staticData.lastPollTime = new Date().toISOString();
      staticData.seenIds = [];
      staticData.seenHashes = [];

      for (const item of rawItems) {
        if (!item) continue;
        if (item[idProperty] !== undefined) {
          staticData.seenIds.push(String(item[idProperty]));
        }
        const hash = crypto.createHash('sha256').update(JSON.stringify(item)).digest('hex');
        staticData.seenHashes.push(hash);
      }

      if (staticData.seenIds.length > MAX_MEMORY) {
        staticData.seenIds = staticData.seenIds.slice(-MAX_MEMORY);
      }
      if (staticData.seenHashes.length > MAX_MEMORY) {
        staticData.seenHashes = staticData.seenHashes.slice(-MAX_MEMORY);
      }

      if (firstRunMode === 'only_new') {
        return [[]];
      }

      return [rawItems.map((item) => ({ json: item }))];
    }

    // Subsequent Runs: Apply Deduplication Strategy
    let newItems: any[] = [];

    if (deduplicationStrategy === 'id') {
      const seenSet = new Set(staticData.seenIds || []);
      newItems = rawItems.filter((item) => {
        if (!item || item[idProperty] === undefined) return false;
        return !seenSet.has(String(item[idProperty]));
      });

      const newlySeen = newItems.map((i) => String(i[idProperty]));
      staticData.seenIds = [...(staticData.seenIds || []), ...newlySeen].slice(-MAX_MEMORY);
      staticData.lastPollTime = new Date().toISOString();
    } else if (deduplicationStrategy === 'timestamp') {
      const lastPollMs = staticData.lastPollTime ? new Date(staticData.lastPollTime).getTime() : 0;
      newItems = rawItems.filter((item) => {
        if (!item || !item[timestampProperty]) return false;
        const itemMs = new Date(item[timestampProperty]).getTime();
        return itemMs > lastPollMs;
      });

      staticData.lastPollTime = new Date().toISOString();
    } else if (deduplicationStrategy === 'hash') {
      const seenSet = new Set(staticData.seenHashes || []);
      const newHashes: string[] = [];

      newItems = rawItems.filter((item) => {
        if (!item) return false;
        const hash = crypto.createHash('sha256').update(JSON.stringify(item)).digest('hex');
        if (seenSet.has(hash)) return false;
        newHashes.push(hash);
        return true;
      });

      staticData.seenHashes = [...(staticData.seenHashes || []), ...newHashes].slice(-MAX_MEMORY);
      staticData.lastPollTime = new Date().toISOString();
    }

    const outputData: DataItem[] = newItems.map((item) => ({
      json: item
    }));

    return [outputData];
  }
}
