import { DeclarativeManifest } from '../declarative-node';

export const WAVE18_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // COMMERCE, INVOICES & PAYMENTS
  // ==========================================
  {
    type: 'stripe_customer',
    name: 'Stripe Customers',
    description: 'Create, update, and search customer billing profiles and default payment methods on Stripe',
    category: 'app',
    icon: 'user-plus',
    color: '#6772e5',
    baseURL: 'https://api.stripe.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'stripe_api_key'
    },
    resources: [
      {
        name: 'customer',
        displayName: 'Customer',
        operations: [
          {
            name: 'create',
            displayName: 'Create Customer',
            method: 'POST',
            path: '/customers',
            properties: [
              { name: 'email', displayName: 'Email Address', type: 'string', required: true },
              { name: 'name', displayName: 'Customer Name', type: 'string' },
              { name: 'description', displayName: 'Description', type: 'string' }
            ],
            bodyParameters: {
              email: '$param:email',
              name: '$param:name',
              description: '$param:description'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'stripe_invoice',
    name: 'Stripe Invoices',
    description: 'Generate customer invoices, finalize billing statements, and collect payments on Stripe',
    category: 'app',
    icon: 'file-text',
    color: '#6772e5',
    baseURL: 'https://api.stripe.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'stripe_api_key'
    },
    resources: [
      {
        name: 'invoice',
        displayName: 'Invoice',
        operations: [
          {
            name: 'create',
            displayName: 'Create Draft Invoice',
            method: 'POST',
            path: '/invoices',
            properties: [
              { name: 'customer', displayName: 'Stripe Customer ID', type: 'string', required: true },
              { name: 'auto_advance', displayName: 'Auto Finalize', type: 'boolean', default: true }
            ],
            bodyParameters: {
              customer: '$param:customer',
              auto_advance: '$param:auto_advance'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'woocommerce_products',
    name: 'WooCommerce Products',
    description: 'Create products, manage inventory prices, and categories in WordPress WooCommerce',
    category: 'app',
    icon: 'shopping-bag',
    color: '#96588a',
    baseURL: 'https://{wpUrl}/wp-json/wc/v3',
    auth: {
      type: 'basic',
      credentialType: 'woocommerce_auth'
    },
    resources: [
      {
        name: 'product',
        displayName: 'Product',
        operations: [
          {
            name: 'create',
            displayName: 'Create Product',
            method: 'POST',
            path: '/products',
            properties: [
              { name: 'wpUrl', displayName: 'WordPress Site URL', type: 'string', required: true },
              { name: 'name', displayName: 'Product Name', type: 'string', required: true },
              { name: 'regular_price', displayName: 'Price', type: 'string', required: true },
              { name: 'description', displayName: 'Description HTML', type: 'string' }
            ],
            bodyParameters: {
              name: '$param:name',
              regular_price: '$param:regular_price',
              description: '$param:description'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'shopify_product',
    name: 'Shopify Products',
    description: 'Create products, manage variants, and update price tags in Shopify store',
    category: 'app',
    icon: 'shopping-bag',
    color: '#96bf48',
    baseURL: 'https://{shopName}.myshopify.com/admin/api/2024-04',
    auth: {
      type: 'header',
      headerName: 'X-Shopify-Access-Token',
      credentialType: 'shopify_token'
    },
    resources: [
      {
        name: 'product',
        displayName: 'Product',
        operations: [
          {
            name: 'create',
            displayName: 'Create Product',
            method: 'POST',
            path: '/products.json',
            properties: [
              { name: 'shopName', displayName: 'Shopify Store Subdomain', type: 'string', required: true },
              { name: 'title', displayName: 'Product Title', type: 'string', required: true },
              { name: 'body_html', displayName: 'Body HTML', type: 'string' },
              { name: 'vendor', displayName: 'Vendor', type: 'string' }
            ],
            bodyParameters: {
              product: {
                title: '$param:title',
                body_html: '$param:body_html',
                vendor: '$param:vendor'
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'quickbooks_customer',
    name: 'QuickBooks Customers',
    description: 'Create customers, track balances, and sync invoices in Intuit QuickBooks Online',
    category: 'app',
    icon: 'briefcase',
    color: '#2ca01c',
    baseURL: 'https://quickbooks.api.intuit.com/v3/company/{realmId}',
    auth: {
      type: 'bearer',
      credentialType: 'quickbooks_token'
    },
    resources: [
      {
        name: 'customer',
        displayName: 'Customer',
        operations: [
          {
            name: 'create',
            displayName: 'Create Customer',
            method: 'POST',
            path: '/customer',
            properties: [
              { name: 'realmId', displayName: 'Company Realm ID', type: 'string', required: true },
              { name: 'DisplayName', displayName: 'Display Name', type: 'string', required: true },
              { name: 'PrimaryEmailAddr', displayName: 'Email Address', type: 'string' }
            ],
            bodyParameters: {
              DisplayName: '$param:DisplayName',
              PrimaryEmailAddr: { Address: '$param:PrimaryEmailAddr' }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'xero_contact',
    name: 'Xero Contacts',
    description: 'Create suppliers and customers, manage tax numbers, and contact details in Xero',
    category: 'app',
    icon: 'users',
    color: '#13b5ea',
    baseURL: 'https://api.xero.com/api.xro/2.0',
    auth: {
      type: 'bearer',
      credentialType: 'xero_token'
    },
    resources: [
      {
        name: 'contact',
        displayName: 'Contact',
        operations: [
          {
            name: 'create',
            displayName: 'Create Contact',
            method: 'POST',
            path: '/Contacts',
            properties: [
              { name: 'xeroTenantId', displayName: 'Xero Tenant ID', type: 'string', required: true },
              { name: 'Name', displayName: 'Contact Name', type: 'string', required: true },
              { name: 'EmailAddress', displayName: 'Email Address', type: 'string' }
            ],
            headers: {
              'Xero-Tenant-Id': '$param:xeroTenantId'
            },
            bodyParameters: {
              Contacts: [
                {
                  Name: '$param:Name',
                  EmailAddress: '$param:EmailAddress'
                }
              ]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'braintree',
    name: 'Braintree',
    description: 'Process credit card and PayPal payments through PayPal Braintree payment gateway',
    category: 'app',
    icon: 'credit-card',
    color: '#000000',
    baseURL: 'https://api.{environment}.braintreegateway.com/merchants/{merchantId}',
    auth: {
      type: 'basic',
      credentialType: 'braintree_auth'
    },
    resources: [
      {
        name: 'customer',
        displayName: 'Customer',
        operations: [
          {
            name: 'create',
            displayName: 'Create Customer',
            method: 'POST',
            path: '/customers',
            properties: [
              { name: 'environment', displayName: 'Environment (sandbox or payments)', type: 'string', default: 'sandbox' },
              { name: 'merchantId', displayName: 'Merchant ID', type: 'string', required: true },
              { name: 'firstName', displayName: 'First Name', type: 'string' },
              { name: 'lastName', displayName: 'Last Name', type: 'string' },
              { name: 'email', displayName: 'Email', type: 'string', required: true }
            ],
            bodyParameters: {
              customer: {
                firstName: '$param:firstName',
                lastName: '$param:lastName',
                email: '$param:email'
              }
            }
          }
        ]
      }
    ]
  }
];
