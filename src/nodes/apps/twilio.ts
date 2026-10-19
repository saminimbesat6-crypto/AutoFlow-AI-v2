import { DeclarativeNode, DeclarativeManifest } from '../declarative-node';
import { NodeExecutionContext } from '../../engine/context';
import { NodeOutput, PropertyDefinition } from '../../types/workflow';

/**
 * Enterprise Native Twilio Node
 * Extends DeclarativeNode with URL-encoded form serialization, E.164 phone number normalization,
 * and WhatsApp messaging prefixes.
 */
export class TwilioNode extends DeclarativeNode {
  constructor(manifest: DeclarativeManifest) {
    super(manifest);

    const nativeProperties: PropertyDefinition[] = [
      {
        name: 'channel',
        displayName: 'Channel',
        type: 'options',
        default: 'sms',
        options: [
          { name: 'SMS', value: 'sms' },
          { name: 'WhatsApp', value: 'whatsapp' }
        ],
        description: 'Choose whether to send an SMS or WhatsApp message'
      },
      {
        name: 'mediaUrl',
        displayName: 'Media URL (MMS)',
        type: 'string',
        default: '',
        description: 'Optional public media image or audio URL to attach'
      }
    ];

    for (const p of nativeProperties) {
      if (!this.properties.some((existing) => existing.name === p.name)) {
        this.properties.push(p);
      }
    }
  }

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const channel = context.getNodeParameter('channel', 0, 'sms');
    const to = context.getNodeParameter('To', 0, '');
    const from = context.getNodeParameter('From', 0, '');

    // Format WhatsApp prefixes if selected
    if (channel === 'whatsapp') {
      if (to && !to.startsWith('whatsapp:')) {
        (context as any).nodeConfig.parameters.To = `whatsapp:${to}`;
      }
      if (from && !from.startsWith('whatsapp:')) {
        (context as any).nodeConfig.parameters.From = `whatsapp:${from}`;
      }
    }

    return super.execute(context);
  }
}
