import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class WhatsAppNode extends BaseNode {
  type = 'whatsapp';
  name = 'WhatsApp Business';
  description = 'Sends WhatsApp text messages, media, and template notifications via Meta Cloud API';
  category = 'app' as const;
  icon = 'message-circle';
  color = '#25D366'; // WhatsApp Green

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
      default: 'sendMessage',
      options: [
        { name: 'Send Text Message', value: 'sendMessage', description: 'Send regular text message to WhatsApp user' },
        { name: 'Send Media (Image/Doc)', value: 'sendMedia', description: 'Send image, PDF document, or audio file' },
        { name: 'Send Template Message', value: 'sendTemplate', description: 'Send approved Meta business template' }
      ]
    },
    {
      name: 'phoneNumberId',
      displayName: 'Phone Number ID',
      type: 'string',
      required: true,
      description: 'Meta WhatsApp Business Phone Number ID'
    },
    {
      name: 'accessToken',
      displayName: 'Access Token',
      type: 'string',
      required: true,
      description: 'Meta Graph API System User or Bearer Access Token'
    },
    {
      name: 'recipient',
      displayName: 'Recipient Phone Number',
      type: 'string',
      required: true,
      description: 'Recipient phone number with country code (e.g. +14155552671 or {{ $json.phone }})'
    },
    {
      name: 'message',
      displayName: 'Message Text',
      type: 'string',
      description: 'Text message to send (supports WhatsApp Markdown *bold*, _italic_)'
    },
    {
      name: 'mediaType',
      displayName: 'Media Type',
      type: 'options',
      default: 'image',
      options: [
        { name: 'Image (JPEG/PNG)', value: 'image' },
        { name: 'Document (PDF/DOC)', value: 'document' },
        { name: 'Audio (MP3/OGG)', value: 'audio' },
        { name: 'Video (MP4)', value: 'video' }
      ]
    },
    {
      name: 'mediaUrl',
      displayName: 'Media URL',
      type: 'string',
      description: 'Public URL to the media asset'
    },
    {
      name: 'templateName',
      displayName: 'Template Name',
      type: 'string',
      description: 'Approved WhatsApp Template Name (e.g. order_confirmation)'
    },
    {
      name: 'templateLanguage',
      displayName: 'Template Language Code',
      type: 'string',
      default: 'en_US',
      description: 'e.g. en_US, es_LA, pt_BR'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = context.getNodeParameter('operation', i, 'sendMessage');
      const phoneNumberId = context.getNodeParameter('phoneNumberId', i, '');
      const accessToken = context.getNodeParameter('accessToken', i, '');
      const recipientRaw = context.getNodeParameter('recipient', i, '');
      const message = context.getNodeParameter('message', i, '');
      const mediaType = context.getNodeParameter('mediaType', i, 'image');
      const mediaUrl = context.getNodeParameter('mediaUrl', i, '');
      const templateName = context.getNodeParameter('templateName', i, '');
      const templateLanguage = context.getNodeParameter('templateLanguage', i, 'en_US');

      if (!phoneNumberId) {
        throw new Error('WhatsApp node requires a Meta Phone Number ID.');
      }
      if (!accessToken) {
        throw new Error('WhatsApp node requires a Meta Graph API Access Token.');
      }
      if (!recipientRaw) {
        throw new Error('WhatsApp node requires a Recipient phone number.');
      }

      // Clean recipient phone format (digits only, strip + and spaces)
      const recipient = String(recipientRaw).replace(/[^0-9]/g, '');

      // Sandbox / Mock handling
      if (accessToken.startsWith('test-') || accessToken.includes('mock') || accessToken === 'sandbox') {
        results.push({
          json: {
            success: true,
            messageId: `wamid.HBgL${Date.now()}${Math.floor(Math.random() * 10000)}==`,
            recipient,
            operation,
            status: 'sent',
            sentAt: new Date().toISOString(),
            mock: true
          }
        });
        continue;
      }

      // Build WhatsApp Graph API payload
      const body: Record<string, any> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient
      };

      if (operation === 'sendMessage') {
        body.type = 'text';
        body.text = { preview_url: true, body: String(message || '') };
      } else if (operation === 'sendMedia') {
        body.type = mediaType;
        body[mediaType] = { link: mediaUrl, caption: message || undefined };
      } else if (operation === 'sendTemplate') {
        body.type = 'template';
        body.template = {
          name: templateName,
          language: { code: templateLanguage }
        };
      }

      const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timeout);
        const data = await res.json() as any;

        if (!res.ok || data.error) {
          const errDetail = data.error?.message || `HTTP ${res.status}`;
          throw new Error(`WhatsApp API error: ${errDetail}`);
        }

        const msgInfo = data.messages?.[0] || {};
        results.push({
          json: {
            success: true,
            messageId: msgInfo.id,
            recipient,
            status: 'delivered',
            sentAt: new Date().toISOString(),
            raw: data
          }
        });
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          throw new Error('WhatsApp API request timed out after 15 seconds.');
        }
        throw err;
      }
    }

    return [results];
  }
}
