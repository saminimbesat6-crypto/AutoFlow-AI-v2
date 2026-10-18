import { DeclarativeManifest } from '../declarative-node';

export const WAVE3_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // DEVELOPER TOOLS & CI/CD
  // ==========================================
  {
    type: 'bitbucket',
    name: 'Bitbucket',
    description: 'Manage repositories, pull requests, and commits in Atlassian Bitbucket',
    category: 'app',
    icon: 'git-branch',
    color: '#0052cc',
    baseURL: 'https://api.bitbucket.org/2.0',
    auth: {
      type: 'basic',
      credentialType: 'bitbucket_api'
    },
    resources: [
      {
        name: 'pullrequest',
        displayName: 'Pull Request',
        operations: [
          {
            name: 'list',
            displayName: 'List Pull Requests',
            method: 'GET',
            path: '/repositories/{workspace}/{repo_slug}/pullrequests',
            itemsPath: 'values',
            properties: [
              { name: 'workspace', displayName: 'Workspace ID', type: 'string', required: true },
              { name: 'repo_slug', displayName: 'Repository Slug', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'circleci',
    name: 'CircleCI',
    description: 'Trigger pipelines, manage workflows, and inspect job outcomes in CircleCI',
    category: 'app',
    icon: 'refresh-cw',
    color: '#343434',
    baseURL: 'https://circleci.com/api/v2',
    auth: {
      type: 'header',
      headerName: 'Circle-Token',
      credentialType: 'circleci_token'
    },
    resources: [
      {
        name: 'pipeline',
        displayName: 'Pipeline',
        operations: [
          {
            name: 'trigger',
            displayName: 'Trigger Pipeline',
            method: 'POST',
            path: '/project/{projectSlug}/pipeline',
            properties: [
              { name: 'projectSlug', displayName: 'Project Slug (e.g. gh/org/repo)', type: 'string', required: true },
              { name: 'branch', displayName: 'Branch', type: 'string', default: 'main' }
            ],
            bodyParameters: {
              branch: '$param:branch'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'jenkins',
    name: 'Jenkins',
    description: 'Trigger builds and query job statuses on Jenkins automation servers',
    category: 'app',
    icon: 'settings',
    color: '#d33833',
    baseURL: 'http://jenkins.example.com',
    auth: {
      type: 'basic',
      credentialType: 'jenkins_auth'
    },
    resources: [
      {
        name: 'job',
        displayName: 'Job',
        operations: [
          {
            name: 'build',
            displayName: 'Build Job',
            method: 'POST',
            path: '/job/{jobName}/build',
            properties: [
              { name: 'jobName', displayName: 'Job Name', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  // ==========================================
  // IDENTITY & SECURITY
  // ==========================================
  {
    type: 'auth0',
    name: 'Auth0',
    description: 'Manage users, roles, organizations, and security logs with Auth0 Management API',
    category: 'app',
    icon: 'lock',
    color: '#eb5424',
    baseURL: 'https://xyz.auth0.com/api/v2',
    auth: {
      type: 'bearer',
      credentialType: 'auth0_token'
    },
    resources: [
      {
        name: 'user',
        displayName: 'User',
        operations: [
          {
            name: 'getAll',
            displayName: 'Search Users',
            method: 'GET',
            path: '/users',
            properties: [
              { name: 'q', displayName: 'Search Query', type: 'string' }
            ],
            queryParameters: { q: '$param:q' }
          },
          {
            name: 'get',
            displayName: 'Get User',
            method: 'GET',
            path: '/users/{userId}',
            properties: [
              { name: 'userId', displayName: 'User ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'okta',
    name: 'Okta',
    description: 'Identity management: query users, assign groups, and check application status',
    category: 'app',
    icon: 'shield',
    color: '#007dc1',
    baseURL: 'https://example.okta.com/api/v1',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'SSWS ',
      credentialType: 'okta_api_token'
    },
    resources: [
      {
        name: 'user',
        displayName: 'User',
        operations: [
          {
            name: 'getAll',
            displayName: 'List Users',
            method: 'GET',
            path: '/users'
          }
        ]
      }
    ]
  },

  // ==========================================
  // SEARCH & FAST DATABASES
  // ==========================================
  {
    type: 'meilisearch',
    name: 'Meilisearch',
    description: 'Lightning-fast, typo-tolerant full-text search engine',
    category: 'app',
    icon: 'search',
    color: '#ff4b8b',
    baseURL: 'http://localhost:7700',
    auth: {
      type: 'bearer',
      credentialType: 'meilisearch_key'
    },
    resources: [
      {
        name: 'document',
        displayName: 'Document Search',
        operations: [
          {
            name: 'search',
            displayName: 'Search Index',
            method: 'POST',
            path: '/indexes/{indexUid}/search',
            itemsPath: 'hits',
            properties: [
              { name: 'indexUid', displayName: 'Index UID', type: 'string', required: true },
              { name: 'q', displayName: 'Search Query', type: 'string', required: true }
            ],
            bodyParameters: {
              q: '$param:q'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'typesense',
    name: 'Typesense',
    description: 'Fast, typo-tolerant search engine optimized for developer productivity',
    category: 'app',
    icon: 'search',
    color: '#d14343',
    baseURL: 'http://localhost:8108',
    auth: {
      type: 'header',
      headerName: 'X-TYPESENSE-API-KEY',
      credentialType: 'typesense_api_key'
    },
    resources: [
      {
        name: 'document',
        displayName: 'Document',
        operations: [
          {
            name: 'search',
            displayName: 'Search Documents',
            method: 'GET',
            path: '/collections/{collectionName}/documents/search',
            itemsPath: 'hits',
            properties: [
              { name: 'collectionName', displayName: 'Collection', type: 'string', required: true },
              { name: 'q', displayName: 'Query', type: 'string', required: true },
              { name: 'query_by', displayName: 'Query Fields', type: 'string', required: true }
            ],
            queryParameters: {
              q: '$param:q',
              query_by: '$param:query_by'
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // PRODUCTIVITY, CALENDARS & TASKS
  // ==========================================
  {
    type: 'google-calendar',
    name: 'Google Calendar',
    description: 'Create, search, and synchronize calendar events in Google Calendar',
    category: 'app',
    icon: 'calendar',
    color: '#4285f4',
    baseURL: 'https://www.googleapis.com/calendar/v3',
    auth: {
      type: 'oauth2',
      credentialType: 'google_oauth2'
    },
    resources: [
      {
        name: 'event',
        displayName: 'Event',
        operations: [
          {
            name: 'create',
            displayName: 'Create Event',
            method: 'POST',
            path: '/calendars/{calendarId}/events',
            properties: [
              { name: 'calendarId', displayName: 'Calendar ID', type: 'string', default: 'primary' },
              { name: 'summary', displayName: 'Event Summary / Title', type: 'string', required: true },
              { name: 'description', displayName: 'Description', type: 'string' }
            ],
            bodyParameters: {
              summary: '$param:summary',
              description: '$param:description'
            }
          },
          {
            name: 'getAll',
            displayName: 'List Events',
            method: 'GET',
            path: '/calendars/{calendarId}/events',
            itemsPath: 'items',
            properties: [
              { name: 'calendarId', displayName: 'Calendar ID', type: 'string', default: 'primary' }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'microsoft-outlook',
    name: 'Microsoft Outlook',
    description: 'Send emails, read messages, and manage calendar appointments in Outlook 365',
    category: 'app',
    icon: 'mail',
    color: '#0078d4',
    baseURL: 'https://graph.microsoft.com/v1.0/me',
    auth: {
      type: 'oauth2',
      credentialType: 'microsoft_oauth2'
    },
    resources: [
      {
        name: 'mail',
        displayName: 'Email',
        operations: [
          {
            name: 'send',
            displayName: 'Send Mail',
            method: 'POST',
            path: '/sendMail',
            properties: [
              { name: 'toEmail', displayName: 'To Email', type: 'string', required: true },
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'content', displayName: 'Content', type: 'string', required: true }
            ],
            bodyParameters: {
              message: {
                subject: '$param:subject',
                body: { contentType: 'HTML', content: '$param:content' },
                toRecipients: [{ emailAddress: { address: '$param:toEmail' } }]
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'todoist',
    name: 'Todoist',
    description: 'Create tasks, organize projects, and check items in Todoist',
    category: 'app',
    icon: 'check-square',
    color: '#e44332',
    baseURL: 'https://api.todoist.com/rest/v2',
    auth: {
      type: 'bearer',
      credentialType: 'todoist_api_token'
    },
    resources: [
      {
        name: 'task',
        displayName: 'Task',
        operations: [
          {
            name: 'create',
            displayName: 'Create Task',
            method: 'POST',
            path: '/tasks',
            properties: [
              { name: 'content', displayName: 'Task Name / Content', type: 'string', required: true },
              { name: 'description', displayName: 'Description', type: 'string' }
            ]
          },
          {
            name: 'getAll',
            displayName: 'List Active Tasks',
            method: 'GET',
            path: '/tasks'
          }
        ]
      }
    ]
  },

  // ==========================================
  // EXPANDED AI, VOICE & LLM MODELS
  // ==========================================
  {
    type: 'replicate',
    name: 'Replicate',
    description: 'Run open-source machine learning models in the cloud with Replicate',
    category: 'ai',
    icon: 'cpu',
    color: '#000000',
    baseURL: 'https://api.replicate.com/v1',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'Token ',
      credentialType: 'replicate_api_token'
    },
    resources: [
      {
        name: 'prediction',
        displayName: 'Prediction',
        operations: [
          {
            name: 'create',
            displayName: 'Create Prediction',
            method: 'POST',
            path: '/predictions',
            properties: [
              { name: 'version', displayName: 'Model Version ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'deepseek',
    name: 'DeepSeek AI',
    description: 'Deep reasoning and code intelligence models (DeepSeek-R1 / DeepSeek-V3)',
    category: 'ai',
    icon: 'cpu',
    color: '#0066ff',
    baseURL: 'https://api.deepseek.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'deepseek_api_key'
    },
    resources: [
      {
        name: 'chat',
        displayName: 'Chat Completion',
        operations: [
          {
            name: 'complete',
            displayName: 'Chat with DeepSeek-R1',
            method: 'POST',
            path: '/chat/completions',
            properties: [
              { name: 'model', displayName: 'Model', type: 'string', default: 'deepseek-reasoner' },
              { name: 'prompt', displayName: 'User Prompt', type: 'string', required: true }
            ],
            bodyParameters: {
              model: '$param:model',
              messages: [{ role: 'user', content: '$param:prompt' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'together-ai',
    name: 'Together AI',
    description: 'Fast cloud inference for open source LLMs and multimodal AI models',
    category: 'ai',
    icon: 'zap',
    color: '#0f6fff',
    baseURL: 'https://api.together.xyz/v1',
    auth: {
      type: 'bearer',
      credentialType: 'together_api_key'
    },
    resources: [
      {
        name: 'chat',
        displayName: 'Chat',
        operations: [
          {
            name: 'complete',
            displayName: 'Generate Chat',
            method: 'POST',
            path: '/chat/completions',
            properties: [
              { name: 'model', displayName: 'Model', type: 'string', default: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
              { name: 'prompt', displayName: 'Prompt', type: 'string', required: true }
            ],
            bodyParameters: {
              model: '$param:model',
              messages: [{ role: 'user', content: '$param:prompt' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Generate hyper-realistic synthetic voices and speech with ElevenLabs',
    category: 'ai',
    icon: 'mic',
    color: '#000000',
    baseURL: 'https://api.elevenlabs.io/v1',
    auth: {
      type: 'header',
      headerName: 'xi-api-key',
      credentialType: 'elevenlabs_api_key'
    },
    resources: [
      {
        name: 'voices',
        displayName: 'Voices',
        operations: [
          {
            name: 'getAll',
            displayName: 'Get Voices',
            method: 'GET',
            path: '/voices',
            itemsPath: 'voices'
          }
        ]
      }
    ]
  },

  // ==========================================
  // SHIPPING, LOGISTICS & COMMERCE
  // ==========================================
  {
    type: 'shipstation',
    name: 'ShipStation',
    description: 'Manage ecommerce shipments, print labels, and track delivery status',
    category: 'app',
    icon: 'truck',
    color: '#008443',
    baseURL: 'https://ssapi.shipstation.com',
    auth: {
      type: 'basic',
      credentialType: 'shipstation_auth'
    },
    resources: [
      {
        name: 'order',
        displayName: 'Order',
        operations: [
          {
            name: 'getAll',
            displayName: 'List Orders',
            method: 'GET',
            path: '/orders',
            itemsPath: 'orders'
          }
        ]
      }
    ]
  },

  {
    type: 'easypost',
    name: 'EasyPost',
    description: 'Multi-carrier shipping API for rates, label purchasing, and tracking',
    category: 'app',
    icon: 'package',
    color: '#1a73e8',
    baseURL: 'https://api.easypost.com/v2',
    auth: {
      type: 'basic',
      credentialType: 'easypost_api_key'
    },
    resources: [
      {
        name: 'tracker',
        displayName: 'Tracker',
        operations: [
          {
            name: 'create',
            displayName: 'Create Tracker',
            method: 'POST',
            path: '/trackers',
            properties: [
              { name: 'tracking_code', displayName: 'Tracking Code', type: 'string', required: true },
              { name: 'carrier', displayName: 'Carrier', type: 'string' }
            ]
          }
        ]
      }
    ]
  },

  // ==========================================
  // BANKING & TRANSFERS
  // ==========================================
  {
    type: 'plaid',
    name: 'Plaid',
    description: 'Connect bank accounts, fetch transactions, and check account balances',
    category: 'app',
    icon: 'credit-card',
    color: '#111111',
    baseURL: 'https://sandbox.plaid.com',
    auth: {
      type: 'header',
      credentialType: 'plaid_credentials'
    },
    resources: [
      {
        name: 'auth',
        displayName: 'Account Verification',
        operations: [
          {
            name: 'getAccounts',
            displayName: 'Get Accounts',
            method: 'POST',
            path: '/accounts/get',
            itemsPath: 'accounts',
            properties: [
              { name: 'access_token', displayName: 'Access Token', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'wise',
    name: 'Wise (TransferWise)',
    description: 'Send international money transfers, manage balances, and create quotes',
    category: 'app',
    icon: 'send',
    color: '#00b9ff',
    baseURL: 'https://api.wise.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'wise_token'
    },
    resources: [
      {
        name: 'profile',
        displayName: 'User Profile',
        operations: [
          {
            name: 'getAll',
            displayName: 'List Profiles',
            method: 'GET',
            path: '/profiles'
          }
        ]
      }
    ]
  },

  // ==========================================
  // WEB SCRAPING & AUTOMATION ACTORS
  // ==========================================
  {
    type: 'apify',
    name: 'Apify',
    description: 'Run cloud web scrapers, crawlers, and automation actors with Apify',
    category: 'app',
    icon: 'terminal',
    color: '#00a651',
    baseURL: 'https://api.apify.com/v2',
    auth: {
      type: 'apiKey',
      queryParamName: 'token',
      credentialType: 'apify_token'
    },
    resources: [
      {
        name: 'actor',
        displayName: 'Actor',
        operations: [
          {
            name: 'run',
            displayName: 'Run Actor',
            method: 'POST',
            path: '/acts/{actorId}/runs',
            properties: [
              { name: 'actorId', displayName: 'Actor ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  }
];
