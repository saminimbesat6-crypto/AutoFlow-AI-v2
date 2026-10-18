import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class ExtractFromFileNode extends BaseNode {
  type = 'extract-from-file';
  name = 'Extract From File';
  description = 'Parses CSV, JSON, or text content from binary file data into structured JSON workflow items';
  category = 'transform' as const;
  icon = 'file-text';
  color = '#0284c7'; // Blue

  inputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Input' }
  ];
  outputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Output' }
  ];

  properties: PropertyDefinition[] = [
    {
      name: 'fileFormat',
      displayName: 'File Format',
      type: 'options',
      default: 'csv',
      options: [
        { name: 'CSV (Spreadsheet / Tabular)', value: 'csv' },
        { name: 'JSON (Array or Object)', value: 'json' },
        { name: 'Plain Text (Line by Line or Full Text)', value: 'text' }
      ]
    },
    {
      name: 'binaryPropertyName',
      displayName: 'Binary Property Name',
      type: 'string',
      default: 'data',
      description: 'The property name under $binary containing the file'
    },
    {
      name: 'headerRow',
      displayName: 'Has Header Row (for CSV)',
      type: 'boolean',
      default: true
    },
    {
      name: 'delimiter',
      displayName: 'Delimiter (for CSV)',
      type: 'string',
      default: ','
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [];

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const format = context.getNodeParameter('fileFormat', i, 'csv');
      const binaryProp = String(context.getNodeParameter('binaryPropertyName', i, 'data') || 'data');
      const hasHeader = context.getNodeParameter('headerRow', i, true);
      const delimiter = String(context.getNodeParameter('delimiter', i, ',') || ',');

      const binaryItem = items[i].binary?.[binaryProp];
      if (!binaryItem || !binaryItem.data) {
        throw new Error(`Item ${i} contains no binary data under property "${binaryProp}".`);
      }

      const decodedText = Buffer.from(binaryItem.data, 'base64').toString('utf8');

      if (format === 'json') {
        try {
          const parsed = JSON.parse(decodedText);
          if (Array.isArray(parsed)) {
            for (let j = 0; j < parsed.length; j++) {
              results.push({ json: parsed[j], pairedItem: i });
            }
          } else {
            results.push({ json: parsed, pairedItem: i });
          }
        } catch (e: any) {
          throw new Error(`Failed to parse binary JSON file: ${e.message}`);
        }
      } else if (format === 'csv') {
        const lines = decodedText.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length === 0) continue;

        let headers: string[] = [];
        let startIndex = 0;

        if (hasHeader) {
          headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
          startIndex = 1;
        }

        for (let r = startIndex; r < lines.length; r++) {
          const cols = lines[r].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
          const rowObj: Record<string, any> = {};

          if (hasHeader && headers.length > 0) {
            for (let c = 0; c < headers.length; c++) {
              rowObj[headers[c] || `col_${c}`] = cols[c] !== undefined ? cols[c] : '';
            }
          } else {
            for (let c = 0; c < cols.length; c++) {
              rowObj[`col_${c}`] = cols[c];
            }
          }

          results.push({ json: rowObj, pairedItem: i });
        }
      } else if (format === 'text') {
        results.push({
          json: {
            text: decodedText,
            lineCount: decodedText.split(/\r?\n/).length,
            charCount: decodedText.length
          },
          pairedItem: i
        });
      }
    }

    return [results];
  }
}
