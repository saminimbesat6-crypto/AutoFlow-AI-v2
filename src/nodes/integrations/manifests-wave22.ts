import { DeclarativeManifest } from '../declarative-node';

export const WAVE22_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // BUSINESS INTELLIGENCE & DASHBOARDS
  // ==========================================
  {
    type: 'metabase',
    name: 'Metabase',
    description: 'Execute analytical SQL queries, retrieve cards, and export dataset tables on Metabase',
    category: 'app',
    icon: 'bar-chart-2',
    color: '#509ee3',
    baseURL: 'https://{metabaseHost}/api',
    auth: {
      type: 'header',
      headerName: 'X-Metabase-Session',
      credentialType: 'metabase_session'
    },
    resources: [
      {
        name: 'card',
        displayName: 'Card / Query',
        operations: [
          {
            name: 'query',
            displayName: 'Query Card Data',
            method: 'POST',
            path: '/card/{cardId}/query/json',
            properties: [
              { name: 'metabaseHost', displayName: 'Metabase Host URL', type: 'string', required: true },
              { name: 'cardId', displayName: 'Card ID', type: 'number', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'geckoboard',
    name: 'Geckoboard',
    description: 'Push custom metric records and real-time operational data into Geckoboard dashboards',
    category: 'app',
    icon: 'activity',
    color: '#00af80',
    baseURL: 'https://api.geckoboard.com',
    auth: {
      type: 'basic',
      credentialType: 'geckoboard_api_key'
    },
    resources: [
      {
        name: 'dataset',
        displayName: 'Dataset',
        operations: [
          {
            name: 'appendData',
            displayName: 'Append Data to Dataset',
            method: 'POST',
            path: '/datasets/{datasetId}/data',
            properties: [
              { name: 'datasetId', displayName: 'Dataset ID', type: 'string', required: true },
              { name: 'data', displayName: 'Records Array JSON', type: 'json', required: true }
            ],
            bodyParameters: {
              data: '$param:data'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'klipfolio',
    name: 'Klipfolio',
    description: 'Update dashboard data sources and sync company KPIs into Klipfolio',
    category: 'app',
    icon: 'pie-chart',
    color: '#3498db',
    baseURL: 'https://app.klipfolio.com/api/1.0',
    auth: {
      type: 'header',
      headerName: 'kf-api-key',
      credentialType: 'klipfolio_api_key'
    },
    resources: [
      {
        name: 'datasource',
        displayName: 'Data Source',
        operations: [
          {
            name: 'refresh',
            displayName: 'Refresh Data Source',
            method: 'POST',
            path: '/datasource-instances/{datasourceId}/refresh',
            properties: [
              { name: 'datasourceId', displayName: 'Data Source ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  // ==========================================
  // DOCUMENT GENERATION & PDF ENGINES
  // ==========================================
  {
    type: 'anvil_pdf',
    name: 'Anvil PDF',
    description: 'Fill PDF templates, generate dynamic documents, and collect digital signatures with Anvil',
    category: 'app',
    icon: 'file-text',
    color: '#5266eb',
    baseURL: 'https://app.useanvil.com/api/v1',
    auth: {
      type: 'basic',
      credentialType: 'anvil_api_key'
    },
    resources: [
      {
        name: 'pdf',
        displayName: 'PDF Generation',
        operations: [
          {
            name: 'generateFromHtml',
            displayName: 'Generate PDF from HTML',
            method: 'POST',
            path: '/generate-pdf',
            properties: [
              { name: 'html', displayName: 'HTML String', type: 'string', required: true },
              { name: 'title', displayName: 'Document Title', type: 'string', default: 'Document.pdf' }
            ],
            bodyParameters: {
              data: {
                html: '$param:html'
              },
              title: '$param:title'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'docupilot',
    name: 'Docupilot',
    description: 'Merge JSON workflow data into templates to create dynamic invoices, agreements, and PDFs',
    category: 'app',
    icon: 'file',
    color: '#3f51b5',
    baseURL: 'https://api.docupilot.app/v1',
    auth: {
      type: 'header',
      headerName: 'apikey',
      credentialType: 'docupilot_api_key'
    },
    resources: [
      {
        name: 'template',
        displayName: 'Template',
        operations: [
          {
            name: 'merge',
            displayName: 'Merge Template',
            method: 'POST',
            path: '/templates/{templateId}/merge',
            properties: [
              { name: 'templateId', displayName: 'Template ID', type: 'string', required: true },
              { name: 'data', displayName: 'Payload JSON', type: 'json', required: true }
            ],
            bodyParameters: {
              data: '$param:data'
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // TRANSACTIONAL & UTILITY APIS
  // ==========================================
  {
    type: 'abstract_currency',
    name: 'Abstract Currency API',
    description: 'Convert currencies in real time with live central bank and forex exchange rates',
    category: 'app',
    icon: 'dollar-sign',
    color: '#00af80',
    baseURL: 'https://exchange-rates.abstractapi.com/v1',
    auth: {
      type: 'apiKey',
      queryParamName: 'api_key',
      credentialType: 'abstract_api_key'
    },
    resources: [
      {
        name: 'rates',
        displayName: 'Rates',
        operations: [
          {
            name: 'convert',
            displayName: 'Convert Currency',
            method: 'GET',
            path: '/convert',
            properties: [
              { name: 'base', displayName: 'Base Currency (e.g. USD)', type: 'string', required: true, default: 'USD' },
              { name: 'target', displayName: 'Target Currency (e.g. EUR)', type: 'string', required: true, default: 'EUR' },
              { name: 'base_amount', displayName: 'Base Amount', type: 'number', required: true, default: 1 }
            ],
            queryParameters: {
              base: '$param:base',
              target: '$param:target',
              base_amount: '$param:base_amount'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'abstract_phone',
    name: 'Abstract Phone Validator',
    description: 'Verify phone number format, international carrier, line type, and location',
    category: 'app',
    icon: 'phone',
    color: '#00af80',
    baseURL: 'https://phonevalidation.abstractapi.com/v1',
    auth: {
      type: 'apiKey',
      queryParamName: 'api_key',
      credentialType: 'abstract_api_key'
    },
    resources: [
      {
        name: 'phone',
        displayName: 'Phone Validation',
        operations: [
          {
            name: 'validate',
            displayName: 'Validate Phone',
            method: 'GET',
            path: '/',
            properties: [
              { name: 'phone', displayName: 'Phone Number (+E.164)', type: 'string', required: true }
            ],
            queryParameters: {
              phone: '$param:phone'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'emailjs',
    name: 'EmailJS',
    description: 'Send transactional emails directly without backend server dependencies via EmailJS',
    category: 'app',
    icon: 'send',
    color: '#ff9900',
    baseURL: 'https://api.emailjs.com/api/v1.0',
    auth: {
      type: 'bearer',
      credentialType: 'emailjs_token'
    },
    resources: [
      {
        name: 'email',
        displayName: 'Email',
        operations: [
          {
            name: 'send',
            displayName: 'Send Template Email',
            method: 'POST',
            path: '/email/send',
            properties: [
              { name: 'service_id', displayName: 'Service ID', type: 'string', required: true },
              { name: 'template_id', displayName: 'Template ID', type: 'string', required: true },
              { name: 'user_id', displayName: 'Public Key / User ID', type: 'string', required: true },
              { name: 'template_params', displayName: 'Template Parameters JSON', type: 'json' }
            ],
            bodyParameters: {
              service_id: '$param:service_id',
              template_id: '$param:template_id',
              user_id: '$param:user_id',
              template_params: '$param:template_params'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'postmark_templates',
    name: 'Postmark Templates',
    description: 'List, validate, and send localized transactional templates on ActiveCampaign Postmark',
    category: 'app',
    icon: 'mail',
    color: '#ffd200',
    baseURL: 'https://api.postmarkapp.com',
    auth: {
      type: 'header',
      headerName: 'X-Postmark-Server-Token',
      credentialType: 'postmark_server_token'
    },
    resources: [
      {
        name: 'templates',
        displayName: 'Templates',
        operations: [
          {
            name: 'list',
            displayName: 'List Templates',
            method: 'GET',
            path: '/templates',
            itemsPath: 'Templates'
          }
        ]
      }
    ]
  },

  {
    type: 'zerobounce_status',
    name: 'ZeroBounce Credits',
    description: 'Query API account balance and remaining email verification credits in ZeroBounce',
    category: 'app',
    icon: 'shield',
    color: '#43a047',
    baseURL: 'https://api.zerobounce.net/v2',
    auth: {
      type: 'apiKey',
      queryParamName: 'api_key',
      credentialType: 'zerobounce_api_key'
    },
    resources: [
      {
        name: 'account',
        displayName: 'Account',
        operations: [
          {
            name: 'getCredits',
            displayName: 'Get Credits Balance',
            method: 'GET',
            path: '/getcredits'
          }
        ]
      }
    ]
  }
];
