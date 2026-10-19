import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class ReadWriteFileNode extends BaseNode {
  type = 'read-write-file';
  name = 'Read/Write Files from Disk';
  description = 'Reads binary files or text from disk into items, or writes item data and binary attachments to local disk storage';
  category = 'core' as const;
  icon = 'file-text';
  color = '#64748b'; // Slate

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
      default: 'read',
      options: [
        { name: 'Read File from Disk', value: 'read', description: 'Read a file into binary data or text property' },
        { name: 'Write File to Disk', value: 'write', description: 'Write binary data or text to a file on disk' }
      ]
    },
    {
      name: 'filePath',
      displayName: 'File Path',
      type: 'string',
      required: true,
      description: 'Absolute or relative path to the file (e.g. ./data/report.pdf, supports {{ $json.filename }})'
    },
    {
      name: 'binaryPropertyName',
      displayName: 'Binary Property Name',
      type: 'string',
      default: 'data',
      description: 'The property name under $binary to store or read the file'
    },
    {
      name: 'textContent',
      displayName: 'Text Content (for Write Text)',
      type: 'string',
      description: 'Optional text string to write if not using binary data'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = context.getNodeParameter('operation', i, 'read');
      const filePathRaw = String(context.getNodeParameter('filePath', i, '') || '').trim();
      const binaryProp = String(context.getNodeParameter('binaryPropertyName', i, 'data') || 'data');
      const textContent = context.getNodeParameter('textContent', i, '');

      if (!filePathRaw) {
        throw new Error('Read/Write Files node requires a File Path.');
      }

      const resolvedPath = path.resolve(filePathRaw);

      // Security: Block path traversal targeting sensitive system & configuration files
      const baseName = path.basename(resolvedPath).toLowerCase();
      if (
        baseName.startsWith('.env') ||
        baseName.includes('autoflow.sqlite') ||
        resolvedPath.includes('/.git/') ||
        baseName.includes('credential') ||
        baseName.includes('id_rsa') ||
        baseName.includes('id_ed25519') ||
        resolvedPath.startsWith('/etc/') ||
        resolvedPath.startsWith('/sys/') ||
        resolvedPath.startsWith('/proc/')
      ) {
        throw new Error(`Security violation: Access to sensitive file path "${resolvedPath}" is blocked.`);
      }

      if (operation === 'read') {
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`File not found: "${resolvedPath}"`);
        }

        const stats = fs.statSync(resolvedPath);
        const fileBuffer = fs.readFileSync(resolvedPath);
        const base64Data = fileBuffer.toString('base64');
        const ext = path.extname(resolvedPath).replace('.', '');
        const filename = path.basename(resolvedPath);

        let mimeType = 'application/octet-stream';
        if (ext === 'json') mimeType = 'application/json';
        else if (ext === 'csv') mimeType = 'text/csv';
        else if (ext === 'txt') mimeType = 'text/plain';
        else if (ext === 'pdf') mimeType = 'application/pdf';
        else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

        const item: DataItem = {
          json: {
            ...items[i].json,
            filePath: resolvedPath,
            fileName: filename,
            fileSize: stats.size,
            fileExtension: ext,
            mimeType
          },
          binary: {
            [binaryProp]: {
              data: base64Data,
              mimeType,
              fileName: filename,
              fileExtension: ext,
              fileSize: stats.size
            }
          },
          pairedItem: i
        };

        results.push(item);
      } else if (operation === 'write') {
        // Create directory if it doesn't exist
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Check if writing binary or text
        const binaryItem = items[i].binary?.[binaryProp];
        if (binaryItem && binaryItem.data) {
          const buf = Buffer.from(binaryItem.data, 'base64');
          fs.writeFileSync(resolvedPath, buf);
        } else if (textContent) {
          fs.writeFileSync(resolvedPath, String(textContent), 'utf8');
        } else if (items[i].json) {
          fs.writeFileSync(resolvedPath, JSON.stringify(items[i].json, null, 2), 'utf8');
        }

        const stats = fs.statSync(resolvedPath);
        results.push({
          json: {
            ...items[i].json,
            writtenPath: resolvedPath,
            bytesWritten: stats.size,
            writtenAt: new Date().toISOString()
          },
          pairedItem: i
        });
      }
    }

    return [results];
  }
}
