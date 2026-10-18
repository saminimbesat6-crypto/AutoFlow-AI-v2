import { DeclarativeManifest } from '../declarative-node';

export const WAVE15_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // E-COMMERCE & WAREHOUSE LOGISTICS
  // ==========================================
  {
    type: 'ecwid',
    name: 'Ecwid',
    description: 'Manage online store products, inventory levels, and customer orders in Ecwid',
    category: 'app',
    icon: 'shopping-bag',
    color: '#2a5caa',
    baseURL: 'https://app.ecwid.com/api/v3/{storeId}',
    auth: {
      type: 'bearer',
      credentialType: 'ecwid_token'
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
            itemsPath: 'items',
            properties: [
              { name: 'storeId', displayName: 'Store ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'commerce_layer',
    name: 'Commerce Layer',
    description: 'Composable global commerce engine for enterprise multi-currency checkout and orders',
    category: 'app',
    icon: 'shopping-cart',
    color: '#000000',
    baseURL: 'https://{slug}.commercelayer.io/api',
    auth: {
      type: 'bearer',
      credentialType: 'commerce_layer_token'
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
            itemsPath: 'data',
            properties: [
              { name: 'slug', displayName: 'Organization Slug', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'easyship',
    name: 'Easyship',
    description: 'Calculate worldwide courier shipping rates, generate customs labels, and track shipments',
    category: 'app',
    icon: 'truck',
    color: '#ff6200',
    baseURL: 'https://api.easyship.com/2023-01',
    auth: {
      type: 'bearer',
      credentialType: 'easyship_token'
    },
    resources: [
      {
        name: 'rates',
        displayName: 'Rates',
        operations: [
          {
            name: 'requestRates',
            displayName: 'Request Shipping Rates',
            method: 'POST',
            path: '/rates',
            itemsPath: 'rates',
            properties: [
              { name: 'destination_country_alpha2', displayName: 'Destination Country Code (e.g. US)', type: 'string', required: true },
              { name: 'destination_postal_code', displayName: 'Destination Postal Code', type: 'string', required: true }
            ],
            bodyParameters: {
              destination_country_alpha2: '$param:destination_country_alpha2',
              destination_postal_code: '$param:destination_postal_code'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'sendcloud',
    name: 'Sendcloud',
    description: 'Automate European parcel shipping, create multi-carrier labels, and handle returns',
    category: 'app',
    icon: 'package',
    color: '#1a73e8',
    baseURL: 'https://panel.sendcloud.sc/api/v2',
    auth: {
      type: 'basic',
      credentialType: 'sendcloud_auth'
    },
    resources: [
      {
        name: 'parcel',
        displayName: 'Parcel',
        operations: [
          {
            name: 'create',
            displayName: 'Create Parcel',
            method: 'POST',
            path: '/parcels',
            properties: [
              { name: 'name', displayName: 'Recipient Name', type: 'string', required: true },
              { name: 'address', displayName: 'Street Address', type: 'string', required: true },
              { name: 'city', displayName: 'City', type: 'string', required: true },
              { name: 'postal_code', displayName: 'Postal Code', type: 'string', required: true },
              { name: 'country', displayName: 'Country ISO Code', type: 'string', required: true }
            ],
            bodyParameters: {
              parcel: {
                name: '$param:name',
                address: '$param:address',
                city: '$param:city',
                postal_code: '$param:postal_code',
                country: '$param:country'
              }
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // HR & HUMAN CAPITAL MANAGEMENT
  // ==========================================
  {
    type: 'rippling',
    name: 'Rippling',
    description: 'Manage unified employee records, devices, payroll, and app provisioning in Rippling',
    category: 'app',
    icon: 'users',
    color: '#f9d342',
    baseURL: 'https://api.rippling.com/platform/api',
    auth: {
      type: 'bearer',
      credentialType: 'rippling_token'
    },
    resources: [
      {
        name: 'employee',
        displayName: 'Employee',
        operations: [
          {
            name: 'list',
            displayName: 'List Employees',
            method: 'GET',
            path: '/employees'
          }
        ]
      }
    ]
  },

  {
    type: 'factorial',
    name: 'Factorial HR',
    description: 'Manage European employee contracts, attendance, time tracking, and leave requests',
    category: 'app',
    icon: 'user-check',
    color: '#ff3056',
    baseURL: 'https://api.factorialhr.com/resources/v2',
    auth: {
      type: 'bearer',
      credentialType: 'factorial_token'
    },
    resources: [
      {
        name: 'employee',
        displayName: 'Employee',
        operations: [
          {
            name: 'list',
            displayName: 'List Employees',
            method: 'GET',
            path: '/employees',
            itemsPath: 'data'
          }
        ]
      }
    ]
  },

  {
    type: 'hibob',
    name: 'HiBob',
    description: 'Global HR platform to manage employee profiles, departments, and payroll sync',
    category: 'app',
    icon: 'users',
    color: '#ff3366',
    baseURL: 'https://api.hibob.com/v1',
    auth: {
      type: 'basic',
      credentialType: 'hibob_auth'
    },
    resources: [
      {
        name: 'people',
        displayName: 'People',
        operations: [
          {
            name: 'search',
            displayName: 'Search People',
            method: 'POST',
            path: '/people/search',
            itemsPath: 'employees'
          }
        ]
      }
    ]
  },

  // ==========================================
  // ONLINE FORMS & BUILDERS
  // ==========================================
  {
    type: 'cognito_forms',
    name: 'Cognito Forms',
    description: 'Collect complex online form entries, calculate conditions, and manage entries',
    category: 'app',
    icon: 'file-text',
    color: '#00a887',
    baseURL: 'https://www.cognitoforms.com/api/v1',
    auth: {
      type: 'apiKey',
      headerName: 'Authorization',
      tokenPrefix: 'Bearer ',
      credentialType: 'cognito_api_key'
    },
    resources: [
      {
        name: 'entry',
        displayName: 'Entry',
        operations: [
          {
            name: 'list',
            displayName: 'List Form Entries',
            method: 'GET',
            path: '/forms/{formId}/entries',
            properties: [
              { name: 'formId', displayName: 'Cognito Form ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'wufoo',
    name: 'Wufoo Forms',
    description: 'Retrieve online form submissions, field entries, and reports from SurveyMonkey Wufoo',
    category: 'app',
    icon: 'file-text',
    color: '#ff4f00',
    baseURL: 'https://{subdomain}.wufoo.com/api/v3',
    auth: {
      type: 'basic',
      credentialType: 'wufoo_api_key'
    },
    resources: [
      {
        name: 'entry',
        displayName: 'Entry',
        operations: [
          {
            name: 'list',
            displayName: 'List Form Entries',
            method: 'GET',
            path: '/forms/{formId}/entries.json',
            itemsPath: 'Entries',
            properties: [
              { name: 'subdomain', displayName: 'Wufoo Subdomain', type: 'string', required: true },
              { name: 'formId', displayName: 'Form Identifier / Hash', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'feathery',
    name: 'Feathery Forms',
    description: 'Trigger enterprise product flows, embed onboarding steps, and fetch submissions',
    category: 'app',
    icon: 'layers',
    color: '#6366f1',
    baseURL: 'https://api.feathery.io/api',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'Token ',
      credentialType: 'feathery_api_key'
    },
    resources: [
      {
        name: 'submission',
        displayName: 'Submission',
        operations: [
          {
            name: 'list',
            displayName: 'List Submissions',
            method: 'GET',
            path: '/forms/{formId}/submissions',
            properties: [
              { name: 'formId', displayName: 'Feathery Form ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  }
];
