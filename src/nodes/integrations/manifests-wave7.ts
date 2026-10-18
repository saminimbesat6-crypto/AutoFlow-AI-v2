import { DeclarativeManifest } from '../declarative-node';

export const WAVE7_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // BILLING, PAYMENTS & ACCOUNTING
  // ==========================================
  {
    type: 'paypal',
    name: 'PayPal',
    description: 'Create draft invoices, send billing notices, and track transactions on PayPal',
    category: 'app',
    icon: 'credit-card',
    color: '#003087',
    baseURL: 'https://api-m.paypal.com/v2',
    auth: {
      type: 'bearer',
      credentialType: 'paypal_token'
    },
    resources: [
      {
        name: 'invoice',
        displayName: 'Invoice',
        operations: [
          {
            name: 'createDraft',
            displayName: 'Create Draft Invoice',
            method: 'POST',
            path: '/invoicing/invoices',
            properties: [
              { name: 'recipientEmail', displayName: 'Recipient Email', type: 'string', required: true },
              { name: 'itemAmount', displayName: 'Amount', type: 'string', required: true },
              { name: 'itemCurrency', displayName: 'Currency Code', type: 'string', default: 'USD' }
            ],
            bodyParameters: {
              primary_recipients: [{ billing_info: { email_address: '$param:recipientEmail' } }],
              items: [
                {
                  name: 'Invoice Item',
                  quantity: '1',
                  unit_amount: { currency_code: '$param:itemCurrency', value: '$param:itemAmount' }
                }
              ]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'chargebee',
    name: 'Chargebee',
    description: 'Manage SaaS recurring subscriptions, customers, and hosted checkout on Chargebee',
    category: 'app',
    icon: 'refresh-cw',
    color: '#7b16ff',
    baseURL: 'https://{siteName}.chargebee.com/api/v2',
    auth: {
      type: 'basic',
      credentialType: 'chargebee_api_key'
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
              { name: 'siteName', displayName: 'Chargebee Site Name', type: 'string', required: true },
              { name: 'email', displayName: 'Email', type: 'string', required: true },
              { name: 'firstName', displayName: 'First Name', type: 'string' },
              { name: 'lastName', displayName: 'Last Name', type: 'string' }
            ],
            bodyParameters: {
              email: '$param:email',
              first_name: '$param:firstName',
              last_name: '$param:lastName'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'recurly',
    name: 'Recurly',
    description: 'Automate subscription billing and manage subscriber accounts with Recurly',
    category: 'app',
    icon: 'credit-card',
    color: '#ff4c3b',
    baseURL: 'https://v3.recurly.com',
    auth: {
      type: 'basic',
      credentialType: 'recurly_api_key'
    },
    resources: [
      {
        name: 'account',
        displayName: 'Account',
        operations: [
          {
            name: 'create',
            displayName: 'Create Account',
            method: 'POST',
            path: '/accounts',
            properties: [
              { name: 'code', displayName: 'Account Code', type: 'string', required: true },
              { name: 'email', displayName: 'Email', type: 'string', required: true },
              { name: 'first_name', displayName: 'First Name', type: 'string' }
            ],
            bodyParameters: {
              code: '$param:code',
              email: '$param:email',
              first_name: '$param:first_name'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'square',
    name: 'Square',
    description: 'Process in-person and digital payments, manage items and orders via Square API',
    category: 'app',
    icon: 'square',
    color: '#000000',
    baseURL: 'https://connect.squareup.com/v2',
    auth: {
      type: 'bearer',
      credentialType: 'square_access_token'
    },
    resources: [
      {
        name: 'payment',
        displayName: 'Payment',
        operations: [
          {
            name: 'create',
            displayName: 'Create Payment',
            method: 'POST',
            path: '/payments',
            properties: [
              { name: 'sourceId', displayName: 'Source ID (Card Nonce)', type: 'string', required: true },
              { name: 'idempotencyKey', displayName: 'Idempotency Key', type: 'string', required: true },
              { name: 'amount', displayName: 'Amount (in cents)', type: 'number', required: true },
              { name: 'currency', displayName: 'Currency', type: 'string', default: 'USD' }
            ],
            bodyParameters: {
              source_id: '$param:sourceId',
              idempotency_key: '$param:idempotencyKey',
              amount_money: {
                amount: '$param:amount',
                currency: '$param:currency'
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'lemonsqueezy',
    name: 'Lemon Squeezy',
    description: 'Process global digital product payments, manage subscriptions and license keys',
    category: 'app',
    icon: 'shopping-bag',
    color: '#ffc233',
    baseURL: 'https://api.lemonsqueezy.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'lemonsqueezy_token'
    },
    resources: [
      {
        name: 'order',
        displayName: 'Order',
        operations: [
          {
            name: 'list',
            displayName: 'List Orders',
            method: 'GET',
            path: '/orders',
            itemsPath: 'data'
          }
        ]
      },
      {
        name: 'subscription',
        displayName: 'Subscription',
        operations: [
          {
            name: 'list',
            displayName: 'List Subscriptions',
            method: 'GET',
            path: '/subscriptions',
            itemsPath: 'data'
          }
        ]
      }
    ]
  },

  {
    type: 'paddle',
    name: 'Paddle',
    description: 'B2B and B2C global software billing, tax handling, and subscription operations on Paddle',
    category: 'app',
    icon: 'credit-card',
    color: '#344154',
    baseURL: 'https://api.paddle.com',
    auth: {
      type: 'bearer',
      credentialType: 'paddle_api_key'
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
              { name: 'email', displayName: 'Customer Email', type: 'string', required: true },
              { name: 'name', displayName: 'Customer Name', type: 'string' }
            ],
            bodyParameters: {
              email: '$param:email',
              name: '$param:name'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'freshbooks',
    name: 'FreshBooks',
    description: 'Manage small business accounting, client invoices, and expenses in FreshBooks',
    category: 'app',
    icon: 'dollar-sign',
    color: '#0075dd',
    baseURL: 'https://api.freshbooks.com/accounting/account/{accountId}',
    auth: {
      type: 'bearer',
      credentialType: 'freshbooks_token'
    },
    resources: [
      {
        name: 'invoice',
        displayName: 'Invoice',
        operations: [
          {
            name: 'list',
            displayName: 'List Invoices',
            method: 'GET',
            path: '/invoices/invoices',
            itemsPath: 'response.result.invoices',
            properties: [
              { name: 'accountId', displayName: 'FreshBooks Account ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'revolut_business',
    name: 'Revolut Business',
    description: 'Automate business payments, corporate accounts, and international transfers on Revolut',
    category: 'app',
    icon: 'send',
    color: '#0075eb',
    baseURL: 'https://b2b.revolut.com/api/1.0',
    auth: {
      type: 'bearer',
      credentialType: 'revolut_token'
    },
    resources: [
      {
        name: 'account',
        displayName: 'Account',
        operations: [
          {
            name: 'list',
            displayName: 'List Accounts',
            method: 'GET',
            path: '/accounts'
          }
        ]
      }
    ]
  },

  {
    type: 'coinbase_commerce',
    name: 'Coinbase Commerce',
    description: 'Accept cryptocurrency payments and generate Web3 checkout charges on Coinbase',
    category: 'app',
    icon: 'shield',
    color: '#0052ff',
    baseURL: 'https://api.commerce.coinbase.com',
    auth: {
      type: 'header',
      headerName: 'X-CC-Api-Key',
      credentialType: 'coinbase_commerce_key'
    },
    resources: [
      {
        name: 'charge',
        displayName: 'Charge',
        operations: [
          {
            name: 'create',
            displayName: 'Create Crypto Charge',
            method: 'POST',
            path: '/charges',
            properties: [
              { name: 'name', displayName: 'Charge Name', type: 'string', required: true },
              { name: 'description', displayName: 'Description', type: 'string' },
              { name: 'amount', displayName: 'Pricing Amount', type: 'string', required: true },
              { name: 'currency', displayName: 'Fiat / Crypto Currency', type: 'string', default: 'USD' }
            ],
            bodyParameters: {
              name: '$param:name',
              description: '$param:description',
              pricing_type: 'fixed_price',
              local_price: {
                amount: '$param:amount',
                currency: '$param:currency'
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'zoho_books',
    name: 'Zoho Books',
    description: 'Manage sales orders, invoices, and accounting entries in Zoho Books',
    category: 'app',
    icon: 'book',
    color: '#e42528',
    baseURL: 'https://books.zoho.com/api/v3',
    auth: {
      type: 'bearer',
      credentialType: 'zoho_token'
    },
    resources: [
      {
        name: 'invoice',
        displayName: 'Invoice',
        operations: [
          {
            name: 'list',
            displayName: 'List Invoices',
            method: 'GET',
            path: '/invoices',
            itemsPath: 'invoices',
            properties: [
              { name: 'organization_id', displayName: 'Zoho Organization ID', type: 'string', required: true }
            ],
            queryParameters: {
              organization_id: '$param:organization_id'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'gusto',
    name: 'Gusto',
    description: 'Manage payroll, employee records, benefits, and time tracking in Gusto',
    category: 'app',
    icon: 'users',
    color: '#f44336',
    baseURL: 'https://api.gusto.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'gusto_token'
    },
    resources: [
      {
        name: 'employee',
        displayName: 'Employee',
        operations: [
          {
            name: 'list',
            displayName: 'List Company Employees',
            method: 'GET',
            path: '/companies/{companyId}/employees',
            properties: [
              { name: 'companyId', displayName: 'Company ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'deel',
    name: 'Deel',
    description: 'Automate international contractor management, payroll contracts, and invoices on Deel',
    category: 'app',
    icon: 'globe',
    color: '#15357a',
    baseURL: 'https://api.letsdeel.com/rest/v1',
    auth: {
      type: 'bearer',
      credentialType: 'deel_token'
    },
    resources: [
      {
        name: 'contract',
        displayName: 'Contract',
        operations: [
          {
            name: 'list',
            displayName: 'List Contracts',
            method: 'GET',
            path: '/contracts',
            itemsPath: 'data'
          }
        ]
      }
    ]
  },

  // ==========================================
  // E-COMMERCE & LOGISTICS
  // ==========================================
  {
    type: 'bigcommerce',
    name: 'BigCommerce',
    description: 'Manage online store catalog, orders, and customer accounts in BigCommerce',
    category: 'app',
    icon: 'shopping-cart',
    color: '#121118',
    baseURL: 'https://api.bigcommerce.com/stores/{storeHash}/v3',
    auth: {
      type: 'header',
      headerName: 'X-Auth-Token',
      credentialType: 'bigcommerce_token'
    },
    resources: [
      {
        name: 'order',
        displayName: 'Order',
        operations: [
          {
            name: 'list',
            displayName: 'List Orders',
            method: 'GET',
            path: '/orders',
            properties: [
              { name: 'storeHash', displayName: 'Store Hash', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'shippo',
    name: 'Shippo',
    description: 'Compare multi-carrier shipping rates, create parcel labels, and track shipments',
    category: 'app',
    icon: 'truck',
    color: '#2b78ff',
    baseURL: 'https://api.goshippo.com',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'ShippoToken ',
      credentialType: 'shippo_token'
    },
    resources: [
      {
        name: 'shipment',
        displayName: 'Shipment',
        operations: [
          {
            name: 'create',
            displayName: 'Create Shipment',
            method: 'POST',
            path: '/shipments',
            properties: [
              { name: 'addressFrom', displayName: 'Sender Address JSON', type: 'json', required: true },
              { name: 'addressTo', displayName: 'Recipient Address JSON', type: 'json', required: true },
              { name: 'parcels', displayName: 'Parcels Array JSON', type: 'json', required: true }
            ],
            bodyParameters: {
              address_from: '$param:addressFrom',
              address_to: '$param:addressTo',
              parcels: '$param:parcels'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'aftership',
    name: 'AfterShip',
    description: 'Track parcel shipments across 900+ couriers and notify customers on delivery updates',
    category: 'app',
    icon: 'package',
    color: '#ff6200',
    baseURL: 'https://api.aftership.com/tracking/2024-04',
    auth: {
      type: 'header',
      headerName: 'as-api-key',
      credentialType: 'aftership_api_key'
    },
    resources: [
      {
        name: 'tracking',
        displayName: 'Tracking',
        operations: [
          {
            name: 'create',
            displayName: 'Create Tracking',
            method: 'POST',
            path: '/trackings',
            properties: [
              { name: 'trackingNumber', displayName: 'Tracking Number', type: 'string', required: true },
              { name: 'slug', displayName: 'Courier Slug (e.g. dhl, fedex, usps)', type: 'string' }
            ],
            bodyParameters: {
              tracking: {
                tracking_number: '$param:trackingNumber',
                slug: '$param:slug'
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'printful',
    name: 'Printful',
    description: 'Create print-on-demand custom merchandise, orders, and estimate fulfillment costs',
    category: 'app',
    icon: 'shopping-bag',
    color: '#cd2026',
    baseURL: 'https://api.printful.com',
    auth: {
      type: 'bearer',
      credentialType: 'printful_token'
    },
    resources: [
      {
        name: 'order',
        displayName: 'Order',
        operations: [
          {
            name: 'list',
            displayName: 'List Orders',
            method: 'GET',
            path: '/orders',
            itemsPath: 'result'
          }
        ]
      }
    ]
  },

  {
    type: 'taxjar',
    name: 'TaxJar',
    description: 'Calculate real-time sales tax rates and automate sales tax filings with TaxJar',
    category: 'app',
    icon: 'percent',
    color: '#00bfa5',
    baseURL: 'https://api.taxjar.com/v2',
    auth: {
      type: 'bearer',
      credentialType: 'taxjar_token'
    },
    resources: [
      {
        name: 'tax',
        displayName: 'Sales Tax',
        operations: [
          {
            name: 'calculate',
            displayName: 'Calculate Tax for Order',
            method: 'POST',
            path: '/taxes',
            properties: [
              { name: 'to_country', displayName: 'Destination Country', type: 'string', required: true, default: 'US' },
              { name: 'to_zip', displayName: 'Destination ZIP', type: 'string', required: true },
              { name: 'to_state', displayName: 'Destination State', type: 'string', required: true },
              { name: 'amount', displayName: 'Order Amount', type: 'number', required: true },
              { name: 'shipping', displayName: 'Shipping Fee', type: 'number', default: 0 }
            ],
            bodyParameters: {
              to_country: '$param:to_country',
              to_zip: '$param:to_zip',
              to_state: '$param:to_state',
              amount: '$param:amount',
              shipping: '$param:shipping'
            }
          }
        ]
      }
    ]
  }
];
