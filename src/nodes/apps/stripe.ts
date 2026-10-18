import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class StripeNode extends BaseNode {
  type = 'stripe';
  name = 'Stripe';
  description = 'Automate customers, payment links, and subscription billing with Stripe';
  category = 'app' as const;
  icon = 'credit-card';
  color = '#635BFF'; // Stripe Purple

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
      default: 'createCustomer',
      options: [
        { name: 'Create Customer', value: 'createCustomer', description: 'Create a new customer in Stripe' },
        { name: 'Create Payment Link', value: 'createPaymentLink', description: 'Generate a hosted checkout payment URL' },
        { name: 'Retrieve Customer', value: 'retrieveCustomer', description: 'Fetch customer details by customer ID' }
      ]
    },
    {
      name: 'apiKey',
      displayName: 'Stripe Secret Key',
      type: 'string',
      required: true,
      description: 'Stripe API Secret Key (sk_test_... or sk_live_...)'
    },
    {
      name: 'customerEmail',
      displayName: 'Customer Email',
      type: 'string',
      description: 'Email address (e.g. {{ $json.email }})'
    },
    {
      name: 'customerName',
      displayName: 'Customer Name',
      type: 'string',
      description: 'Full name (e.g. {{ $json.name }})'
    },
    {
      name: 'customerId',
      displayName: 'Customer ID (for Retrieve)',
      type: 'string',
      description: 'Stripe Customer ID (cus_...)'
    },
    {
      name: 'amount',
      displayName: 'Amount (in Cents)',
      type: 'number',
      default: 2000,
      description: 'Price in smallest currency unit (e.g. 2000 = $20.00)'
    },
    {
      name: 'currency',
      displayName: 'Currency',
      type: 'string',
      default: 'usd',
      description: 'Three-letter ISO currency code (usd, eur, gbp)'
    },
    {
      name: 'productName',
      displayName: 'Product Name',
      type: 'string',
      default: 'Digital Order',
      description: 'Product or service label for payment link'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = context.getNodeParameter('operation', i, 'createCustomer');
      const apiKey = context.getNodeParameter('apiKey', i, '');
      const email = context.getNodeParameter('customerEmail', i, '');
      const name = context.getNodeParameter('customerName', i, '');
      const customerId = context.getNodeParameter('customerId', i, '');
      const amount = Number(context.getNodeParameter('amount', i, 2000));
      const currency = context.getNodeParameter('currency', i, 'usd');
      const productName = context.getNodeParameter('productName', i, 'Order');

      if (!apiKey) throw new Error('Stripe node requires an API Secret Key.');

      // Sandbox / Mock testing
      if (apiKey.startsWith('test-') || apiKey.includes('mock') || apiKey === 'sandbox') {
        results.push({
          json: {
            success: true,
            operation,
            customerId: customerId || `cus_${Date.now()}`,
            url: operation === 'createPaymentLink' ? `https://buy.stripe.com/mock_${Date.now()}` : undefined,
            amount,
            currency,
            email,
            name,
            mock: true
          }
        });
        continue;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        let endpoint = '';
        let bodyParams = new URLSearchParams();

        if (operation === 'createCustomer') {
          endpoint = 'https://api.stripe.com/v1/customers';
          if (email) bodyParams.append('email', email);
          if (name) bodyParams.append('name', name);
        } else if (operation === 'retrieveCustomer') {
          if (!customerId) throw new Error('Retrieve Customer requires a Customer ID.');
          endpoint = `https://api.stripe.com/v1/customers/${customerId}`;
        } else if (operation === 'createPaymentLink') {
          // Create price first, then payment link, or use direct payment links API
          endpoint = 'https://api.stripe.com/v1/payment_links';
          bodyParams.append('line_items[0][price_data][currency]', currency);
          bodyParams.append('line_items[0][price_data][unit_amount]', String(amount));
          bodyParams.append('line_items[0][price_data][product_data][name]', productName);
          bodyParams.append('line_items[0][quantity]', '1');
        }

        const res = await fetch(endpoint, {
          method: operation === 'retrieveCustomer' ? 'GET' : 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: operation === 'retrieveCustomer' ? undefined : bodyParams.toString(),
          signal: controller.signal
        });

        clearTimeout(timeout);
        const data = await res.json() as any;

        if (!res.ok || data.error) {
          const errMsg = data.error?.message || `HTTP ${res.status}`;
          throw new Error(`Stripe API error: ${errMsg}`);
        }

        results.push({
          json: {
            success: true,
            operation,
            data
          }
        });
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          throw new Error('Stripe API request timed out after 15 seconds.');
        }
        throw err;
      }
    }

    return [results];
  }
}
