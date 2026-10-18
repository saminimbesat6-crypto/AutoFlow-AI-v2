import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class NotionNode extends BaseNode {
  type = 'notion';
  name = 'Notion';
  description = 'Creates pages, queries databases, and appends blocks in Notion workspaces';
  category = 'app' as const;
  icon = 'book-open';
  color = '#000000'; // Notion Black

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
      default: 'createPage',
      options: [
        { name: 'Create Database Page', value: 'createPage', description: 'Create a new row/page inside a Notion database' },
        { name: 'Query Database', value: 'queryDatabase', description: 'Filter and retrieve entries from a Notion database' },
        { name: 'Get Page', value: 'getPage', description: 'Retrieve properties of a specific Notion page' },
        { name: 'Append Block Children', value: 'appendBlock', description: 'Append text or checklist blocks to an existing page' }
      ]
    },
    {
      name: 'databaseId',
      displayName: 'Database ID',
      type: 'string',
      description: '32-character Notion Database ID (e.g. 59833787269f4b32bb3345d0008fbbf4)'
    },
    {
      name: 'pageId',
      displayName: 'Page ID',
      type: 'string',
      description: 'Notion Page ID for Get Page or Append Block'
    },
    {
      name: 'title',
      displayName: 'Page Title',
      type: 'string',
      default: '{{ $json.title || "Automated Note" }}',
      description: 'Title for newly created database page'
    },
    {
      name: 'content',
      displayName: 'Page Content (Text/Markdown)',
      type: 'string',
      default: '{{ $json.content || "" }}',
      description: 'Paragraph content to insert into page body'
    },
    {
      name: 'apiKey',
      displayName: 'Notion API Token',
      type: 'string',
      description: 'Internal Integration Secret token (starts with secret_...)'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = context.getNodeParameter('operation', i, 'createPage');
      const databaseId = context.getNodeParameter('databaseId', i, '').replace(/-/g, '');
      const pageId = context.getNodeParameter('pageId', i, '').replace(/-/g, '');
      const title = context.getNodeParameter('title', i, 'New Page');
      const content = context.getNodeParameter('content', i, '');
      const apiKey = context.getNodeParameter('apiKey', i, '') || process.env.NOTION_API_KEY || '';

      // Test/mock mode
      if (apiKey.includes('test') || apiKey.includes('mock') || !apiKey) {
        results.push({
          json: {
            success: true,
            operation,
            title,
            databaseId,
            pageId,
            notionId: 'mock_notion_id_' + Date.now(),
            url: `https://notion.so/${pageId || databaseId}`,
            mock: true,
            note: 'Mock execution succeeded. Supply Notion Internal Integration Secret for live sync.'
          },
          pairedItem: i
        });
        continue;
      }

      const headers = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      };

      let endpoint = '';
      let method = 'GET';
      let body: any = undefined;

      if (operation === 'createPage') {
        endpoint = 'https://api.notion.com/v1/pages';
        method = 'POST';
        body = {
          parent: { database_id: databaseId },
          properties: {
            Name: {
              title: [{ text: { content: String(title) } }]
            }
          }
        };

        if (content) {
          body.children = [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content: String(content) } }]
              }
            }
          ];
        }
      } else if (operation === 'queryDatabase') {
        endpoint = `https://api.notion.com/v1/databases/${databaseId}/query`;
        method = 'POST';
        body = { page_size: 20 };
      } else if (operation === 'getPage') {
        endpoint = `https://api.notion.com/v1/pages/${pageId}`;
        method = 'GET';
      } else if (operation === 'appendBlock') {
        endpoint = `https://api.notion.com/v1/blocks/${pageId}/children`;
        method = 'PATCH';
        body = {
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content: String(content || title) } }]
              }
            }
          ]
        };
      }

      const res = await fetch(endpoint, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(`Notion API error (${res.status}): ${data.message || JSON.stringify(data)}`);
      }

      if (operation === 'queryDatabase' && Array.isArray(data.results)) {
        for (const r of data.results) {
          results.push({ json: r, pairedItem: i });
        }
      } else {
        results.push({ json: data, pairedItem: i });
      }
    }

    return [results];
  }
}
