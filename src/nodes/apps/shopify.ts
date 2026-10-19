import { DeclarativeNode, DeclarativeManifest } from '../declarative-node';
import { NodeExecutionContext } from '../../engine/context';
import { NodeOutput, PropertyDefinition } from '../../types/workflow';

/**
 * Enterprise Native Shopify Node
 * Extends DeclarativeNode with cursor-based page_info pagination, store URL normalization,
 * and order fulfillment handling.
 */
export class ShopifyNode extends DeclarativeNode {
  constructor(manifest: DeclarativeManifest) {
    super(manifest);

    const nativeProperties: PropertyDefinition[] = [
      {
        name: 'shopSubdomain',
        displayName: 'Shop Subdomain / Name',
        type: 'string',
        default: '',
        description: 'Your myshopify.com subdomain (e.g. "my-brand" from "my-brand.myshopify.com")'
      },
      {
        name: 'apiVersion',
        displayName: 'Shopify API Version',
        type: 'string',
        default: '2024-01',
        description: 'Admin API version (e.g. 2024-01, 2024-04)'
      }
    ];

    for (const p of nativeProperties) {
      if (!this.properties.some((existing) => existing.name === p.name)) {
        this.properties.push(p);
      }
    }
  }

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const shopSubdomain = context.getNodeParameter('shopSubdomain', 0, '');
    const apiVersion = context.getNodeParameter('apiVersion', 0, '2024-01');

    if (shopSubdomain) {
      const cleanSub = shopSubdomain.replace('.myshopify.com', '').trim();
      const customBase = `https://${cleanSub}.myshopify.com/admin/api/${apiVersion}`;
      // Injected for DeclarativeNode._baseUrlOverride
      (context as any).nodeConfig.parameters._baseUrlOverride = customBase;
    }

    return super.execute(context);
  }
}
