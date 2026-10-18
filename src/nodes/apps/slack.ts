import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class SlackNode extends BaseNode {
  type = 'slack';
  name = 'Slack';
  description = 'Sends messages, alerts, and Block Kit notifications to Slack channels via Webhooks';
  category = 'app' as const;
  icon = 'message-square';
  color = '#4A154B'; // Slack Aubergine

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
      description: 'Slack Incoming Webhook URL (from Slack App Management)'
    },
    {
      name: 'text',
      displayName: 'Message Text',
      type: 'string',
      required: true,
      description: 'Message body text (supports mrkdwn formatting and expressions)'
    },
    {
      name: 'channel',
      displayName: 'Channel Override',
      type: 'string',
      description: 'Optional channel name (e.g. #alerts) or user (@alice)'
    },
    {
      name: 'username',
      displayName: 'Bot Name',
      type: 'string',
      default: 'AutoFlow AI',
      description: 'Custom display username'
    },
    {
      name: 'iconEmoji',
      displayName: 'Icon Emoji',
      type: 'string',
      default: ':zap:',
      description: 'e.g. :robot_face:, :warning:, :white_check_mark:'
    },
    {
      name: 'blocksJson',
      displayName: 'Block Kit JSON',
      type: 'json',
      description: 'Optional Block Kit array for rich interactive Slack cards'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const webhookUrl = context.getNodeParameter('webhookUrl', i, '');
      const text = context.getNodeParameter('text', i, '');
      const channel = context.getNodeParameter('channel', i, '');
      const username = context.getNodeParameter('username', i, 'AutoFlow AI');
      const iconEmoji = context.getNodeParameter('iconEmoji', i, ':zap:');
      const rawBlocks = context.getNodeParameter('blocksJson', i, null);

      if (!webhookUrl) {
        throw new Error('Slack node requires an Incoming Webhook URL.');
      }
      if (!text && !rawBlocks) {
        throw new Error('Slack node requires either Message Text or Block Kit JSON.');
      }

      const payload: Record<string, any> = {
        text: String(text || '')
      };

      if (channel) payload.channel = channel;
      if (username) payload.username = username;
      if (iconEmoji) payload.icon_emoji = iconEmoji;

      if (rawBlocks) {
        try {
          payload.blocks = typeof rawBlocks === 'string' ? JSON.parse(rawBlocks) : rawBlocks;
        } catch {}
      }

      // Sandbox / Mock testing
      if (webhookUrl.includes('mock') || webhookUrl.includes('test') || webhookUrl === 'sandbox') {
        results.push({
          json: {
            success: true,
            status: 'ok',
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
        const resText = await res.text();

        if (!res.ok || resText !== 'ok') {
          throw new Error(`Slack Webhook error (${res.status}): ${resText}`);
        }

        results.push({
          json: {
            success: true,
            status: 'delivered',
            deliveredAt: new Date().toISOString(),
            payload
          }
        });
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          throw new Error('Slack Webhook request timed out after 15 seconds.');
        }
        throw err;
      }
    }

    return [results];
  }
}
