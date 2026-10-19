import { DeclarativeNode, DeclarativeManifest } from '../declarative-node';
import { NodeExecutionContext } from '../../engine/context';
import { NodeOutput, PropertyDefinition } from '../../types/workflow';

/**
 * Enterprise Native Supabase Node
 * Extends DeclarativeNode with PostgREST query filters, project URL routing,
 * and upsert resolution headers.
 */
export class SupabaseNode extends DeclarativeNode {
  constructor(manifest: DeclarativeManifest) {
    super(manifest);

    const nativeProperties: PropertyDefinition[] = [
      {
        name: 'projectUrl',
        displayName: 'Supabase Project URL',
        type: 'string',
        default: '',
        description: 'Your Supabase project URL (e.g. "https://xyzcompany.supabase.co")'
      },
      {
        name: 'upsertResolution',
        displayName: 'Upsert Resolution',
        type: 'options',
        default: 'merge-duplicates',
        options: [
          { name: 'Merge Duplicates', value: 'merge-duplicates' },
          { name: 'Ignore Duplicates', value: 'ignore-duplicates' }
        ],
        description: 'How to handle primary key conflicts on insert/upsert'
      }
    ];

    for (const p of nativeProperties) {
      if (!this.properties.some((existing) => existing.name === p.name)) {
        this.properties.push(p);
      }
    }
  }

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const projectUrl = context.getNodeParameter('projectUrl', 0, '');

    if (projectUrl) {
      const cleanUrl = projectUrl.replace(/\/$/, '').trim();
      const customBase = `${cleanUrl}/rest/v1`;
      (context as any).nodeConfig.parameters._baseUrlOverride = customBase;
    }

    return super.execute(context);
  }
}
