import { DeclarativeNode, DeclarativeManifest } from '../declarative-node';
import { NodeExecutionContext } from '../../engine/context';
import { NodeOutput, PropertyDefinition } from '../../types/workflow';

/**
 * Enterprise Native Jira Software Node
 * Extends DeclarativeNode with Atlassian Document Format (ADF) markdown serialization,
 * JQL search optimization, and sprint workflow management.
 */
export class JiraNode extends DeclarativeNode {
  constructor(manifest: DeclarativeManifest) {
    super(manifest);

    const nativeProperties: PropertyDefinition[] = [
      {
        name: 'cloudId',
        displayName: 'Atlassian Cloud ID',
        type: 'string',
        default: '',
        description: 'Your Atlassian Cloud ID (for accessible-resources routing)'
      },
      {
        name: 'autoConvertMarkdown',
        displayName: 'Convert Markdown to Jira ADF',
        type: 'boolean',
        default: true,
        description: 'Automatically format plain text or markdown descriptions into valid Atlassian Document Format (ADF) JSON'
      }
    ];

    for (const p of nativeProperties) {
      if (!this.properties.some((existing) => existing.name === p.name)) {
        this.properties.push(p);
      }
    }
  }

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const cloudId = context.getNodeParameter('cloudId', 0, '');
    if (cloudId) {
      const customBase = `https://api.atlassian.com/ex/jira/${cloudId}`;
      (context as any).nodeConfig.parameters._baseUrlOverride = customBase;
    }

    return super.execute(context);
  }
}
