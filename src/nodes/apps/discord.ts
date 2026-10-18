import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class DiscordNode extends BaseNode {
  type = 'discord';
  name = 'Discord';
  description = 'Sends messages, alerts, and rich embed cards to Discord channels via Webhooks';
  category = 'action' as const;
  icon = 'message-square';
  color = '#5865F2'; // Discord Blurple

  inputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Input' }
  ];
  outputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Output' }
  ];

  properties: PropertyDefinition[] = [
    {
      name: 'webhookUrl',
      displayName: 'Webhook URL',
      type: 'string',
      required: true,
      description: 'Discord Webhook URL (from Server Settings -> Integrations -> Webhooks)'
    },
    {
      name: 'content',
      displayName: 'Message Content',
      type: 'string',
      description: 'Message body text (supports Markdown and {{ expressions }})'
    },
    {
      name: 'username',
      displayName: 'Bot Username',
      type: 'string',
      default: 'AutoFlow AI',
      description: 'Custom display name for the bot in Discord'
    },
    {
      name: 'avatarUrl',
      displayName: 'Avatar URL',
      type: 'string',
      description: 'Custom avatar image URL for the bot'
    },
    {
      name: 'sendEmbed',
      displayName: 'Include Embed Card',
      type: 'boolean',
      default: false
    },
    {
      name: 'embedTitle',
      displayName: 'Embed Title',
      type: 'string',
      description: 'Title for the rich embed card'
    },
    {
      name: 'embedDescription',
      displayName: 'Embed Description',
      type: 'string',
      description: 'Body text or markdown inside the embed card'
    },
    {
      name: 'embedColor',
      displayName: 'Embed Color',
      type: 'string',
      default: '#5865F2',
      description: 'Hex color code (e.g. #5865F2, #10b981, #ef4444)'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const webhookUrl = context.getNodeParameter('webhookUrl', i, '');
      const content = context.getNodeParameter('content', i, '');
      const username = context.getNodeParameter('username', i, 'AutoFlow AI');
      const avatarUrl = context.getNodeParameter('avatarUrl', i, '');
      const sendEmbed = context.getNodeParameter('sendEmbed', i, false);
      const embedTitle = context.getNodeParameter('embedTitle', i, '');
      const embedDescription = context.getNodeParameter('embedDescription', i, '');
      const embedColorHex = context.getNodeParameter('embedColor', i, '#5865F2');

      if (!webhookUrl) {
        throw new Error('Discord node requires a Webhook URL.');
      }

      if (!content && !sendEmbed) {
        throw new Error('Discord node requires either Message Content or an Embed Card.');
      }

      // Build Discord payload
      const payload: Record<string, any> = {};

      if (content) payload.content = String(content);
      if (username) payload.username = String(username);
      if (avatarUrl) payload.avatar_url = String(avatarUrl);

      if (sendEmbed) {
        let decimalColor = 0x5865f2;
        if (typeof embedColorHex === 'string') {
          const cleanHex = embedColorHex.replace('#', '');
          const parsed = parseInt(cleanHex, 16);
          if (!isNaN(parsed)) decimalColor = parsed;
        }

        const embed: Record<string, any> = {
          color: decimalColor,
          timestamp: new Date().toISOString()
        };

        if (embedTitle) embed.title = String(embedTitle);
        if (embedDescription) embed.description = String(embedDescription);
        embed.footer = { text: 'Dispatched by AutoFlow AI' };

        payload.embeds = [embed];
      }

      // Handle mock or sandbox testing
      if (webhookUrl.includes('mock') || webhookUrl.includes('test-webhook') || webhookUrl === 'sandbox') {
        results.push({
          json: {
            success: true,
            status: 204,
            deliveredAt: new Date().toISOString(),
            payload,
            mock: true
          }
        });
        continue;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const errorText = await res.text().catch(() => '');
          throw new Error(`Discord Webhook failed with status ${res.status}: ${errorText}`);
        }

        results.push({
          json: {
            success: true,
            status: res.status,
            deliveredAt: new Date().toISOString(),
            payload
          }
        });
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          throw new Error('Discord Webhook request timed out after 15 seconds.');
        }
        throw err;
      }
    }

    return [results];
  }
}
