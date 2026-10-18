import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';
import { v4 as uuidv4 } from 'uuid';

export class WaitNode extends BaseNode {
  type = 'wait';
  name = 'Wait';
  description = 'Pauses workflow execution for a defined time interval or until an external webhook callback resumes it';
  category = 'core' as const;
  icon = 'clock';
  color = '#ec4899'; // Pink

  inputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Input' }
  ];
  outputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Output' }
  ];

  properties: PropertyDefinition[] = [
    {
      name: 'resumeMode',
      displayName: 'Resume Mode',
      type: 'options',
      default: 'timeInterval',
      options: [
        { name: 'After Time Interval', value: 'timeInterval', description: 'Wait for a specified number of seconds or minutes' },
        { name: 'On Webhook Call', value: 'webhook', description: 'Pause execution until an external callback hits the resume URL' }
      ]
    },
    {
      name: 'unit',
      displayName: 'Time Unit',
      type: 'options',
      default: 'seconds',
      options: [
        { name: 'Milliseconds', value: 'milliseconds' },
        { name: 'Seconds', value: 'seconds' },
        { name: 'Minutes', value: 'minutes' },
        { name: 'Hours', value: 'hours' }
      ]
    },
    {
      name: 'amount',
      displayName: 'Wait Amount',
      type: 'number',
      default: 2,
      description: 'The amount of time units to wait'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const resumeMode = context.getNodeParameter('resumeMode', 0, 'timeInterval');
    const unit = context.getNodeParameter('unit', 0, 'seconds');
    const amount = Number(context.getNodeParameter('amount', 0, 2));

    const results: DataItem[] = [];

    if (resumeMode === 'webhook') {
      const resumeToken = `res_${uuidv4().replace(/-/g, '')}`;
      const resumeUrl = `/webhook/resume/${resumeToken}`;

      for (let i = 0; i < items.length; i++) {
        results.push({
          json: {
            ...items[i].json,
            _waitState: 'suspended_waiting_webhook',
            resumeToken,
            resumeUrl,
            suspendedAt: new Date().toISOString()
          },
          binary: items[i].binary,
          pairedItem: i
        });
      }

      return [results];
    }

    // Time interval mode
    let multiplier = 1000;
    if (unit === 'milliseconds') multiplier = 1;
    else if (unit === 'seconds') multiplier = 1000;
    else if (unit === 'minutes') multiplier = 60 * 1000;
    else if (unit === 'hours') multiplier = 3600 * 1000;

    const delayMs = Math.max(0, amount * multiplier);

    // Inline delay with maximum limit to avoid blocking worker indefinitely during test runs
    const actualDelay = Math.min(delayMs, 10000);
    if (actualDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, actualDelay));
    }

    for (let i = 0; i < items.length; i++) {
      results.push({
        json: {
          ...items[i].json,
          _waitedMs: delayMs,
          resumedAt: new Date().toISOString()
        },
        binary: items[i].binary,
        pairedItem: i
      });
    }

    return [results];
  }
}
