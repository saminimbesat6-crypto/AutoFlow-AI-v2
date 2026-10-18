import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class EmailTriggerNode extends BaseNode {
  type = 'email-trigger';
  name = 'Email Trigger';
  description = 'Triggers workflow execution when an inbound email is received';
  category = 'trigger' as const;
  icon = 'mail';
  color = '#ea4335'; // Gmail / Email Red

  inputs: PortDefinition[] = [];
  outputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Output' }
  ];

  properties: PropertyDefinition[] = [
    {
      name: 'filterSubject',
      displayName: 'Subject Filter (Regex / Keyword)',
      type: 'string',
      description: 'Optional filter to only trigger when subject matches'
    },
    {
      name: 'filterSender',
      displayName: 'Sender Filter (From)',
      type: 'string',
      description: 'Optional filter by sender email domain or address'
    },
    {
      name: 'parseAttachments',
      displayName: 'Extract Attachments',
      type: 'boolean',
      default: true
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const input = context.inputData && context.inputData.length > 0
      ? context.inputData[0].json
      : {};

    const subjectFilter = context.getNodeParameter('filterSubject', 0, '');
    const senderFilter = context.getNodeParameter('filterSender', 0, '');

    const from = input.from || 'support-sender@example.com';
    const to = input.to || 'inbox@autoflow.ai';
    const subject = input.subject || 'Automated Invoice #1042';
    const bodyText = input.text || input.body || 'Please find attached invoice for services rendered.';
    const bodyHtml = input.html || `<p>${bodyText}</p>`;
    const messageId = input.messageId || `<msg-${Date.now()}@mail.autoflow.ai>`;

    // If filter criteria specified, check matches
    if (subjectFilter && !String(subject).toLowerCase().includes(String(subjectFilter).toLowerCase())) {
      return [[]]; // Filtered out
    }
    if (senderFilter && !String(from).toLowerCase().includes(String(senderFilter).toLowerCase())) {
      return [[]]; // Filtered out
    }

    const result: DataItem = {
      json: {
        from,
        to,
        subject,
        bodyText,
        bodyHtml,
        messageId,
        receivedAt: new Date().toISOString(),
        raw: input
      }
    };

    return [[result]];
  }
}
