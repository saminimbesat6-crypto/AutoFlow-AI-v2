import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';
import { GeminiClient } from './gemini-client';

export class GeminiNode extends BaseNode {
  type = 'gemini';
  name = 'Google Gemini';
  description = 'Generates text, answers questions, and extracts structured data with Google Gemini models';
  category = 'ai' as const;
  icon = 'sparkles';
  color = '#8b5cf6'; // purple

  inputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Input' }
  ];
  outputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Output' }
  ];

  properties: PropertyDefinition[] = [
    {
      name: 'model',
      displayName: 'Model',
      type: 'options',
      default: 'gemini-3.8-flash',
      options: [
        { name: 'Gemini 3.8 Flash (Latest, Fastest & Multimodal)', value: 'gemini-3.8-flash' },
        { name: 'Gemini 3.8 Pro (Latest Deep Reasoning)', value: 'gemini-3.8-pro' },
        { name: 'Gemini 1.5 Flash (Standard Fast)', value: 'gemini-1.5-flash' },
        { name: 'Gemini 1.5 Pro (Standard Reasoning)', value: 'gemini-1.5-pro' }
      ]
    },
    {
      name: 'prompt',
      displayName: 'Prompt',
      type: 'string',
      default: 'Analyze the following data and summarize key insights:\n{{ JSON.stringify($json) }}',
      required: true,
      description: 'The prompt text to send to Gemini. Supports expressions like {{ $json.field }}'
    },
    {
      name: 'systemInstruction',
      displayName: 'System Instruction',
      type: 'string',
      default: 'You are an intelligent workflow automation assistant.',
      description: 'Optional system prompt to guide Gemini behavior'
    },
    {
      name: 'jsonOutput',
      displayName: 'Require JSON Output',
      type: 'boolean',
      default: false,
      description: 'Enforces structured JSON format in model response'
    },
    {
      name: 'temperature',
      displayName: 'Temperature',
      type: 'number',
      default: 0.7,
      description: 'Sampling temperature (0.0 = deterministic, 1.0 = creative)'
    },
    {
      name: 'maxTokens',
      displayName: 'Max Output Tokens',
      type: 'number',
      default: 2048
    },
    {
      name: 'includeImage',
      displayName: 'Multi-Modal Vision (Image/Doc)',
      type: 'boolean',
      default: false,
      description: 'Enable multi-modal vision to analyze photos, diagrams, invoices, and documents'
    },
    {
      name: 'imageData',
      displayName: 'Image Data or URL',
      type: 'string',
      description: 'Base64 image string, data URL (data:image/jpeg;base64,...), or remote HTTP image URL'
    },
    {
      name: 'imageMimeType',
      displayName: 'Image / Document Type',
      type: 'options',
      default: 'image/jpeg',
      options: [
        { name: 'JPEG Image (image/jpeg)', value: 'image/jpeg' },
        { name: 'PNG Image (image/png)', value: 'image/png' },
        { name: 'WebP Image (image/webp)', value: 'image/webp' },
        { name: 'GIF Image (image/gif)', value: 'image/gif' },
        { name: 'PDF Document (application/pdf)', value: 'application/pdf' }
      ]
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    // Get API Key: Check credential first, then fall back to process.env.GEMINI_API_KEY
    const cred = context.getCredentials<{ apiKey?: string }>('gemini_api_key');
    const apiKey = cred?.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'Gemini API key is not configured! Please add a "gemini_api_key" credential or set GEMINI_API_KEY in your .env file.'
      );
    }

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const model = context.getNodeParameter('model', i, 'gemini-3.8-flash');
      const prompt = context.getNodeParameter('prompt', i, '');
      const systemInstruction = context.getNodeParameter('systemInstruction', i, '');
      const jsonOutput = context.getNodeParameter('jsonOutput', i, false);
      const temperature = Number(context.getNodeParameter('temperature', i, 0.7));
      const maxTokens = Number(context.getNodeParameter('maxTokens', i, 2048));
      const includeImage = context.getNodeParameter('includeImage', i, false);

      if (!prompt) {
        throw new Error('Gemini node requires a non-empty prompt.');
      }

      const parts: any[] = [{ text: prompt }];

      if (includeImage) {
        const rawImageData = String(context.getNodeParameter('imageData', i, '') || '').trim();
        let mimeType = context.getNodeParameter('imageMimeType', i, 'image/jpeg');
        let base64Data = rawImageData;

        if (rawImageData) {
          // Case 1: Data URL e.g. data:image/png;base64,iVBORw...
          const dataUrlMatch = rawImageData.match(/^data:([^;]+);base64,(.+)$/s);
          if (dataUrlMatch) {
            mimeType = dataUrlMatch[1];
            base64Data = dataUrlMatch[2].trim();
          } else if (rawImageData.startsWith('http://') || rawImageData.startsWith('https://')) {
            // Case 2: Remote image URL - fetch and encode
            try {
              const imgRes = await fetch(rawImageData);
              if (imgRes.ok) {
                const headerMime = imgRes.headers.get('content-type');
                if (headerMime) mimeType = headerMime.split(';')[0];
                const arrayBuf = await imgRes.arrayBuffer();
                base64Data = Buffer.from(arrayBuf).toString('base64');
              }
            } catch {
              // Proceed with fallback or error
            }
          }

          if (base64Data) {
            parts.push({
              inlineData: {
                mimeType,
                data: base64Data
              }
            });
          }
        }
      }

      const response = await GeminiClient.generateContent({
        apiKey,
        model,
        systemInstruction: systemInstruction || undefined,
        contents: [
          {
            role: 'user',
            parts
          }
        ],
        temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: jsonOutput ? 'application/json' : undefined
      });

      const outputJson: Record<string, any> = {
        text: response.text,
        json: response.json || null,
        usage: response.usage || {},
        model,
        promptUsed: prompt,
        hasVisionData: includeImage
      };

      if (response.json && typeof response.json === 'object' && !Array.isArray(response.json)) {
        Object.assign(outputJson, response.json);
      }

      results.push({
        json: outputJson,
        pairedItem: i
      });
    }

    return [results];
  }
}
