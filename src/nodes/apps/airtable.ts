import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class AirtableNode extends BaseNode {
  type = 'airtable';
  name = 'Airtable';
  description = 'Create, list, and update records in Airtable bases';
  category = 'app' as const;
  icon = 'database';
  color = '#18BFFF'; // Airtable Cyan

  inputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Input' }
  ];
  outputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Output' }
  ];

  properties: PropertyDefinition[] = [
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      default: 'createRecord',
      options: [
        { name: 'Create Record', value: 'createRecord' },
        { name: 'Search Records', value: 'searchRecords' },
        { name: 'Update Record', value: 'updateRecord' }
      ]
    },
    {
      name: 'baseId',
      displayName: 'Base ID',
      type: 'string',
      required: true,
      description: 'Airtable Base ID (e.g. appXXXXXXXXXXXXXX)'
    },
    {
      name: 'tableName',
      displayName: 'Table Name or ID',
      type: 'string',
      required: true,
      description: 'Table name (e.g. Customers, Tasks, Pipeline)'
    },
    {
      name: 'apiKey',
      displayName: 'Personal Access Token',
      type: 'string',
      required: true,
      description: 'Airtable Personal Access Token (pat...)'
    },
    {
      name: 'recordId',
      displayName: 'Record ID (for Update)',
      type: 'string',
      description: 'Airtable Record ID (e.g. recXXXXXXXXXXXXXX)'
    },
    {
      name: 'fieldsJson',
      displayName: 'Fields JSON',
      type: 'json',
      default: '{\n  "Name": "{{ $json.name }}",\n  "Status": "Active"\n}',
      description: 'JSON object with the field values to set'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = context.getNodeParameter('operation', i, 'createRecord');
      const baseId = context.getNodeParameter('baseId', i, '');
      const tableName = context.getNodeParameter('tableName', i, '');
      const apiKey = context.getNodeParameter('apiKey', i, '');
      const recordId = context.getNodeParameter('recordId', i, '');
      const rawFields = context.getNodeParameter('fieldsJson', i, '{}');

      if (!baseId) throw new Error('Airtable node requires a Base ID.');
      if (!tableName) throw new Error('Airtable node requires a Table Name.');
      if (!apiKey) throw new Error('Airtable node requires a Personal Access Token.');

      // Sandbox / Mock testing
      if (apiKey.startsWith('test-') || apiKey.includes('mock') || apiKey === 'sandbox') {
        results.push({
          json: {
            success: true,
            id: `rec${Date.now()}${Math.floor(Math.random() * 1000)}`,
            fields: typeof rawFields === 'string' ? JSON.parse(rawFields || '{}') : rawFields,
            createdTime: new Date().toISOString(),
            mock: true
          }
        });
        continue;
      }

      let parsedFields: Record<string, any> = {};
      try {
        parsedFields = typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields;
      } catch {}

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        let url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
        let method = 'POST';
        let body: any = undefined;

        if (operation === 'createRecord') {
          body = JSON.stringify({ fields: parsedFields });
        } else if (operation === 'searchRecords') {
          method = 'GET';
        } else if (operation === 'updateRecord') {
          if (!recordId) throw new Error('Update Record operation requires a Record ID.');
          url = `${url}/${recordId}`;
          method = 'PATCH';
          body = JSON.stringify({ fields: parsedFields });
        }

        const res = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body,
          signal: controller.signal
        });

        clearTimeout(timeout);
        const data = await res.json() as any;

        if (!res.ok || data.error) {
          const errMsg = data.error?.message || `HTTP ${res.status}`;
          throw new Error(`Airtable API error: ${errMsg}`);
        }

        results.push({
          json: {
            success: true,
            operation,
            record: data
          }
        });
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          throw new Error('Airtable API request timed out after 15 seconds.');
        }
        throw err;
      }
    }

    return [results];
  }
}
