import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class OpenAiNode extends BaseNode {
  type = 'openai';
  name = 'OpenAI / Multi-LLM';
  description = 'Generates text, completions, and structured JSON using OpenAI (GPT-4o, o3-mini), DeepSeek, Ollama, or Groq';
  category = 'ai' as const;
  icon = 'cpu';
  color = '#10a37f'; // OpenAI Emerald

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
      default: 'gpt-4o-mini',
      options: [
        { name: 'GPT-4o Mini (Fast & Cost-Efficient)', value: 'gpt-4o-mini' },
        { name: 'GPT-4o (High Intelligence Flagship)', value: 'gpt-4o' },
        { name: 'o3-mini (High-speed Reasoning)', value: 'o3-mini' },
        { name: 'o1-preview (Deep Reasoning)', value: 'o1-preview' },
        { name: 'DeepSeek Chat (deepseek-chat)', value: 'deepseek-chat' },
        { name: 'Custom / Local Model Name', value: 'custom' }
      ]
    },
    {
      name: 'customModel',
      displayName: 'Custom Model Name',
      type: 'string',
      default: 'llama3:latest',
      description: 'Used when Model is set to "Custom / Local Model Name" (e.g. for Ollama, vLLM)'
    },
    {
      name: 'prompt',
      displayName: 'Prompt / User Message',
      type: 'string',
      required: true,
      default: 'Analyze this input data: {{ JSON.stringify($json) }}',
      description: 'The user message passed to the model'
    },
    {
      name: 'systemPrompt',
      displayName: 'System Message (Instructions)',
      type: 'string',
      default: 'You are an intelligent data processing assistant. Output clear, concise answers.',
      description: 'Defines the persona and rules for the AI'
    },
    {
      name: 'temperature',
      displayName: 'Temperature',
      type: 'number',
      default: 0.7,
      description: 'Creativity / randomness from 0.0 to 1.0'
    },
    {
      name: 'jsonMode',
      displayName: 'Enforce JSON Output',
      type: 'boolean',
      default: false,
      description: 'Guarantee valid JSON object output (requires mentioning "json" in prompt)'
    },
    {
      name: 'baseURL',
      displayName: 'API Base URL',
      type: 'string',
      default: 'https://api.openai.com/v1',
      description: 'Custom endpoint (e.g. https://api.deepseek.com/v1 or http://localhost:11434/v1 for Ollama)'
    },
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'string',
      description: 'OpenAI, DeepSeek, or Groq API Key (or env OPENAI_API_KEY)'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const selectedModel = context.getNodeParameter('model', i, 'gpt-4o-mini');
      const customModel = context.getNodeParameter('customModel', i, '');
      const model = selectedModel === 'custom' && customModel ? customModel : selectedModel;
      const prompt = context.getNodeParameter('prompt', i, '');
      const systemPrompt = context.getNodeParameter('systemPrompt', i, '');
      const temperature = Number(context.getNodeParameter('temperature', i, 0.7));
      const jsonMode = Boolean(context.getNodeParameter('jsonMode', i, false));
      const baseURL = context.getNodeParameter('baseURL', i, 'https://api.openai.com/v1').replace(/\/$/, '');
      const apiKey = context.getNodeParameter('apiKey', i, '') || process.env.OPENAI_API_KEY || '';

      if (!prompt) {
        throw new Error('OpenAI node requires a prompt message.');
      }

      // Test/mock mode
      if (apiKey.includes('test') || apiKey.includes('mock') || (!apiKey && !baseURL.includes('localhost') && !baseURL.includes('127.0.0.1'))) {
        results.push({
          json: {
            success: true,
            model,
            content: `[Mock AI Response for: "${prompt.slice(0, 40)}..."] Summary: Processing completed successfully.`,
            mock: true,
            note: 'Mock execution succeeded. Supply OPENAI_API_KEY for live completions.'
          },
          pairedItem: i
        });
        continue;
      }

      const messages: Array<{ role: string; content: string }> = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const requestBody: any = {
        model,
        messages,
        temperature
      };

      if (jsonMode) {
        requestBody.response_format = { type: 'json_object' };
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const res = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(`OpenAI API error (${res.status}): ${data.error?.message || JSON.stringify(data)}`);
      }

      const choice = data.choices?.[0];
      const messageContent = choice?.message?.content || '';

      let parsedJson: any = null;
      if (jsonMode) {
        try {
          parsedJson = JSON.parse(messageContent);
        } catch {}
      }

      results.push({
        json: {
          success: true,
          model: data.model || model,
          content: messageContent,
          parsedJson: parsedJson || undefined,
          usage: data.usage || null,
          finishReason: choice?.finish_reason || 'stop'
        },
        pairedItem: i
      });
    }

    return [results];
  }
}
