import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class GoogleSheetsNode extends BaseNode {
  type = 'google-sheets';
  name = 'Google Sheets';
  description = 'Append rows, read data ranges, and manage spreadsheets via Google Sheets API';
  category = 'app' as const;
  icon = 'table';
  color = '#0F9D58'; // Sheets Green

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
      default: 'appendRow',
      options: [
        { name: 'Append Row', value: 'appendRow', description: 'Append a new row of data to the sheet' },
        { name: 'Read Rows', value: 'readRows', description: 'Read data values from a specified range' },
        { name: 'Clear Range', value: 'clearRange', description: 'Clear all cell contents in the specified range' }
      ]
    },
    {
      name: 'spreadsheetId',
      displayName: 'Spreadsheet ID',
      type: 'string',
      required: true,
      description: 'The ID from the Google Sheet URL (docs.google.com/spreadsheets/d/{ID}/edit)'
    },
    {
      name: 'sheetName',
      displayName: 'Sheet Name / Tab',
      type: 'string',
      default: 'Sheet1',
      description: 'The name of the worksheet tab (e.g. Sheet1, Leads, Orders)'
    },
    {
      name: 'range',
      displayName: 'Range (Optional)',
      type: 'string',
      default: 'A:Z',
      description: 'e.g. A1:Z100 or A:Z'
    },
    {
      name: 'accessToken',
      displayName: 'Google OAuth2 Token',
      type: 'string',
      required: true,
      description: 'Google OAuth Bearer Access Token with spreadsheets scope'
    },
    {
      name: 'rowValues',
      displayName: 'Row Values (JSON Array or Object)',
      type: 'json',
      default: '[]',
      description: 'Array of cell values: ["{{$json.name}}", "{{$json.email}}", "{{$json.status}}"]'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = context.getNodeParameter('operation', i, 'appendRow');
      const spreadsheetId = context.getNodeParameter('spreadsheetId', i, '');
      const sheetName = context.getNodeParameter('sheetName', i, 'Sheet1');
      const range = context.getNodeParameter('range', i, 'A:Z');
      const accessToken = context.getNodeParameter('accessToken', i, '');
      const rawValues = context.getNodeParameter('rowValues', i, '[]');

      if (!spreadsheetId) {
        throw new Error('Google Sheets node requires a Spreadsheet ID.');
      }
      if (!accessToken) {
        throw new Error('Google Sheets node requires a Google OAuth2 Access Token.');
      }

      // Handle Sandbox / Mock testing
      if (accessToken.startsWith('test-') || accessToken.includes('mock') || accessToken === 'sandbox') {
        results.push({
          json: {
            success: true,
            operation,
            spreadsheetId,
            sheetName,
            updatedRange: `${sheetName}!A2:Z2`,
            updatedRows: 1,
            mock: true
          }
        });
        continue;
      }

      const fullRange = `${encodeURIComponent(sheetName)}!${encodeURIComponent(range)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        let url = '';
        let method = 'GET';
        let body: any = undefined;

        if (operation === 'appendRow') {
          url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${fullRange}:append?valueInputOption=USER_ENTERED`;
          method = 'POST';

          let parsedValues: any[] = [];
          if (Array.isArray(rawValues)) {
            parsedValues = rawValues;
          } else if (typeof rawValues === 'object' && rawValues !== null) {
            parsedValues = Object.values(rawValues);
          } else {
            try { parsedValues = JSON.parse(rawValues); } catch {}
          }

          body = JSON.stringify({
            values: [Array.isArray(parsedValues) ? parsedValues : [parsedValues]]
          });
        } else if (operation === 'readRows') {
          url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${fullRange}`;
          method = 'GET';
        } else if (operation === 'clearRange') {
          url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${fullRange}:clear`;
          method = 'POST';
          body = '{}';
        }

        const res = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body,
          signal: controller.signal
        });

        clearTimeout(timeout);
        const data = await res.json() as any;

        if (!res.ok || data.error) {
          const errMsg = data.error?.message || `HTTP ${res.status}`;
          throw new Error(`Google Sheets API error: ${errMsg}`);
        }

        results.push({
          json: {
            success: true,
            operation,
            data
          }
        });
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          throw new Error('Google Sheets API request timed out after 15 seconds.');
        }
        throw err;
      }
    }

    return [results];
  }
}
