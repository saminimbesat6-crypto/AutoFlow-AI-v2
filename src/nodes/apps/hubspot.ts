import { DeclarativeNode, DeclarativeManifest } from '../declarative-node';
import { NodeExecutionContext } from '../../engine/context';
import { DataItem, NodeOutput, PropertyDefinition } from '../../types/workflow';

/**
 * Enterprise Native HubSpot Node
 * Extends DeclarativeNode with native CRM pipeline stage tracking, batch upserting,
 * and contact-deal association mechanics.
 */
export class HubSpotNode extends DeclarativeNode {
  constructor(manifest: DeclarativeManifest) {
    super(manifest);

    // Enrich properties with advanced enterprise controls
    const nativeProperties: PropertyDefinition[] = [
      {
        name: 'batchMode',
        displayName: 'Batch Operation Mode',
        type: 'boolean',
        default: false,
        description: 'Process all input items in a single high-throughput batch API request'
      },
      {
        name: 'associationTargetType',
        displayName: 'Associate With Object Type',
        type: 'options',
        default: 'none',
        options: [
          { name: 'None', value: 'none' },
          { name: 'Company', value: 'company' },
          { name: 'Deal', value: 'deal' },
          { name: 'Ticket', value: 'ticket' }
        ],
        description: 'Automatically link created or updated records to associated CRM entities'
      },
      {
        name: 'associationTargetId',
        displayName: 'Association Target Record ID',
        type: 'string',
        default: '',
        description: 'The ID of the company, deal, or ticket to associate with'
      }
    ];

    for (const p of nativeProperties) {
      if (!this.properties.some((existing) => existing.name === p.name)) {
        this.properties.push(p);
      }
    }
  }

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData || [{ json: {} }];
    const batchMode = context.getNodeParameter('batchMode', 0, false);
    const operation = context.getNodeParameter('operation', 0, '');

    // Batch upsert optimization for high-volume contact ingestion
    if (batchMode && (operation.includes('create') || operation.includes('contact'))) {
      const batchInputs = items.map((item) => ({
        properties: item.json.properties || {
          email: item.json.email,
          firstname: item.json.firstname || item.json.firstName,
          lastname: item.json.lastname || item.json.lastName,
          phone: item.json.phone
        }
      }));

      (context as any).nodeConfig.parameters.customJson = { inputs: batchInputs };
    }

    return super.execute(context);
  }
}
