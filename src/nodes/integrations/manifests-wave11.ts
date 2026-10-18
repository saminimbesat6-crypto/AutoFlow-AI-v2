import { DeclarativeManifest } from '../declarative-node';

export const WAVE11_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // CLOUD STORAGE & DOCUMENTS
  // ==========================================
  {
    type: 'onedrive',
    name: 'Microsoft OneDrive',
    description: 'Upload, search, and manage files and folders in Microsoft OneDrive',
    category: 'app',
    icon: 'cloud',
    color: '#0078d4',
    baseURL: 'https://graph.microsoft.com/v1.0',
    auth: {
      type: 'oauth2',
      credentialType: 'microsoft'
    },
    resources: [
      {
        name: 'driveItem',
        displayName: 'File / Folder',
        operations: [
          {
            name: 'listRoot',
            displayName: 'List Root Files',
            method: 'GET',
            path: '/me/drive/root/children',
            itemsPath: 'value'
          }
        ]
      }
    ]
  },

  {
    type: 'sharepoint',
    name: 'Microsoft SharePoint',
    description: 'Manage document libraries, sites, and list items in Microsoft SharePoint',
    category: 'app',
    icon: 'folder',
    color: '#038387',
    baseURL: 'https://graph.microsoft.com/v1.0',
    auth: {
      type: 'oauth2',
      credentialType: 'microsoft'
    },
    resources: [
      {
        name: 'site',
        displayName: 'Site',
        operations: [
          {
            name: 'get',
            displayName: 'Get Root Site',
            method: 'GET',
            path: '/sites/root'
          }
        ]
      }
    ]
  },

  {
    type: 'nextcloud',
    name: 'Nextcloud',
    description: 'Access self-hosted private cloud files, shares, and user data on Nextcloud',
    category: 'app',
    icon: 'cloud',
    color: '#0082c9',
    baseURL: 'https://{host}/ocs/v1.php/apps/files_sharing/api/v1',
    auth: {
      type: 'basic',
      credentialType: 'nextcloud_auth'
    },
    resources: [
      {
        name: 'shares',
        displayName: 'Shares',
        operations: [
          {
            name: 'list',
            displayName: 'List Shared Links',
            method: 'GET',
            path: '/shares',
            headers: {
              'OCS-APIRequest': 'true',
              'Accept': 'application/json'
            },
            properties: [
              { name: 'host', displayName: 'Nextcloud Host Domain', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'google_docs',
    name: 'Google Docs',
    description: 'Create rich documents, insert text, and format sections in Google Docs',
    category: 'app',
    icon: 'file-text',
    color: '#4285f4',
    baseURL: 'https://docs.googleapis.com/v1',
    auth: {
      type: 'oauth2',
      credentialType: 'google'
    },
    resources: [
      {
        name: 'document',
        displayName: 'Document',
        operations: [
          {
            name: 'create',
            displayName: 'Create Document',
            method: 'POST',
            path: '/documents',
            properties: [
              { name: 'title', displayName: 'Document Title', type: 'string', required: true }
            ],
            bodyParameters: {
              title: '$param:title'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'pdf_co',
    name: 'PDF.co',
    description: 'Generate, convert HTML to PDF, extract text, and merge PDF documents with PDF.co',
    category: 'app',
    icon: 'file',
    color: '#f55d3e',
    baseURL: 'https://api.pdf.co/v1',
    auth: {
      type: 'header',
      headerName: 'x-api-key',
      credentialType: 'pdf_co_api_key'
    },
    resources: [
      {
        name: 'pdf',
        displayName: 'PDF',
        operations: [
          {
            name: 'fromHtml',
            displayName: 'Convert HTML to PDF',
            method: 'POST',
            path: '/pdf/convert/from/html',
            properties: [
              { name: 'html', displayName: 'HTML String', type: 'string', required: true },
              { name: 'name', displayName: 'Output Filename', type: 'string', default: 'output.pdf' }
            ],
            bodyParameters: {
              html: '$param:html',
              name: '$param:name'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'docusign',
    name: 'DocuSign',
    description: 'Send electronic signature envelope requests and track signer status on DocuSign',
    category: 'app',
    icon: 'pen-tool',
    color: '#ffc82c',
    baseURL: 'https://{env}.docusign.net/restapi/v2.1/accounts/{accountId}',
    auth: {
      type: 'bearer',
      credentialType: 'docusign_token'
    },
    resources: [
      {
        name: 'envelope',
        displayName: 'Envelope',
        operations: [
          {
            name: 'list',
            displayName: 'List Envelopes',
            method: 'GET',
            path: '/envelopes',
            itemsPath: 'envelopes',
            properties: [
              { name: 'env', displayName: 'Environment (demo or www)', type: 'string', default: 'demo' },
              { name: 'accountId', displayName: 'Account ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'pandadoc',
    name: 'PandaDoc',
    description: 'Create and send trackable sales quotes, contracts, and proposals via PandaDoc API',
    category: 'app',
    icon: 'file-text',
    color: '#00af66',
    baseURL: 'https://api.pandadoc.com/public/v1',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'API-Key ',
      credentialType: 'pandadoc_api_key'
    },
    resources: [
      {
        name: 'document',
        displayName: 'Document',
        operations: [
          {
            name: 'list',
            displayName: 'List Documents',
            method: 'GET',
            path: '/documents',
            itemsPath: 'results'
          }
        ]
      }
    ]
  },

  // ==========================================
  // SCHEDULING, TIME TRACKING & HR
  // ==========================================
  {
    type: 'calendly',
    name: 'Calendly',
    description: 'Query scheduled meetings, invitees, and available booking slots in Calendly',
    category: 'app',
    icon: 'calendar',
    color: '#006bff',
    baseURL: 'https://api.calendly.com',
    auth: {
      type: 'bearer',
      credentialType: 'calendly_token'
    },
    resources: [
      {
        name: 'user',
        displayName: 'User',
        operations: [
          {
            name: 'me',
            displayName: 'Get Current User',
            method: 'GET',
            path: '/users/me'
          }
        ]
      },
      {
        name: 'event',
        displayName: 'Scheduled Event',
        operations: [
          {
            name: 'list',
            displayName: 'List Scheduled Events',
            method: 'GET',
            path: '/scheduled_events',
            itemsPath: 'collection',
            properties: [
              { name: 'user', displayName: 'User URI', type: 'string', required: true }
            ],
            queryParameters: {
              user: '$param:user'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'cal_com',
    name: 'Cal.com',
    description: 'Schedule appointments, inspect bookings, and manage event types on Cal.com',
    category: 'app',
    icon: 'calendar',
    color: '#111827',
    baseURL: 'https://api.cal.com/v1',
    auth: {
      type: 'apiKey',
      queryParamName: 'apiKey',
      credentialType: 'cal_com_api_key'
    },
    resources: [
      {
        name: 'booking',
        displayName: 'Booking',
        operations: [
          {
            name: 'list',
            displayName: 'List Bookings',
            method: 'GET',
            path: '/bookings',
            itemsPath: 'bookings'
          }
        ]
      }
    ]
  },

  {
    type: 'clockify',
    name: 'Clockify',
    description: 'Track billable hours, log time entries, and manage workspaces on Clockify',
    category: 'app',
    icon: 'clock',
    color: '#03a9f4',
    baseURL: 'https://api.clockify.me/api/v1',
    auth: {
      type: 'header',
      headerName: 'X-Api-Key',
      credentialType: 'clockify_api_key'
    },
    resources: [
      {
        name: 'timeEntry',
        displayName: 'Time Entry',
        operations: [
          {
            name: 'create',
            displayName: 'Add Time Entry',
            method: 'POST',
            path: '/workspaces/{workspaceId}/time-entries',
            properties: [
              { name: 'workspaceId', displayName: 'Workspace ID', type: 'string', required: true },
              { name: 'description', displayName: 'Entry Description', type: 'string', required: true },
              { name: 'start', displayName: 'Start Time (ISO 8601)', type: 'string', required: true }
            ],
            bodyParameters: {
              description: '$param:description',
              start: '$param:start'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'toggl',
    name: 'Toggl Track',
    description: 'Track project hours, start timers, and report client billable time on Toggl',
    category: 'app',
    icon: 'clock',
    color: '#e57cd8',
    baseURL: 'https://api.track.toggl.com/api/v9',
    auth: {
      type: 'basic',
      credentialType: 'toggl_api_key'
    },
    resources: [
      {
        name: 'timeEntry',
        displayName: 'Time Entry',
        operations: [
          {
            name: 'create',
            displayName: 'Start / Create Time Entry',
            method: 'POST',
            path: '/workspaces/{workspaceId}/time_entries',
            properties: [
              { name: 'workspaceId', displayName: 'Workspace ID', type: 'number', required: true },
              { name: 'description', displayName: 'Task Description', type: 'string', required: true },
              { name: 'start', displayName: 'Start Time (ISO 8601)', type: 'string', required: true }
            ],
            bodyParameters: {
              workspace_id: '$param:workspaceId',
              description: '$param:description',
              start: '$param:start',
              created_with: 'AutoFlow-AI'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'personio',
    name: 'Personio',
    description: 'Manage HR records, employee onboarding, absences, and attendances on Personio',
    category: 'app',
    icon: 'users',
    color: '#28464b',
    baseURL: 'https://api.personio.de/v1',
    auth: {
      type: 'bearer',
      credentialType: 'personio_token'
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
            path: '/company/employees',
            itemsPath: 'data'
          }
        ]
      }
    ]
  },

  // ==========================================
  // CMS, CONTENT & SOCIAL MEDIA
  // ==========================================
  {
    type: 'ghost_cms',
    name: 'Ghost CMS',
    description: 'Publish blog posts, manage newsletters, and curate members on Ghost CMS',
    category: 'app',
    icon: 'edit-3',
    color: '#15171a',
    baseURL: 'https://{ghostDomain}/ghost/api/admin',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'Ghost ',
      credentialType: 'ghost_admin_token'
    },
    resources: [
      {
        name: 'post',
        displayName: 'Post',
        operations: [
          {
            name: 'create',
            displayName: 'Create Draft Post',
            method: 'POST',
            path: '/posts',
            properties: [
              { name: 'ghostDomain', displayName: 'Ghost Domain', type: 'string', required: true },
              { name: 'title', displayName: 'Post Title', type: 'string', required: true },
              { name: 'html', displayName: 'HTML Content', type: 'string', required: true }
            ],
            bodyParameters: {
              posts: [{ title: '$param:title', html: '$param:html', status: 'draft' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'strapi',
    name: 'Strapi Headless CMS',
    description: 'Manage headless content types, publish localized entries, and upload media in Strapi',
    category: 'app',
    icon: 'layers',
    color: '#4945ff',
    baseURL: 'https://{strapiHost}/api',
    auth: {
      type: 'bearer',
      credentialType: 'strapi_api_token'
    },
    resources: [
      {
        name: 'entry',
        displayName: 'Content Entry',
        operations: [
          {
            name: 'create',
            displayName: 'Create Content Entry',
            method: 'POST',
            path: '/{contentType}',
            properties: [
              { name: 'strapiHost', displayName: 'Strapi Server Host', type: 'string', required: true },
              { name: 'contentType', displayName: 'Content Type Plural (e.g. articles)', type: 'string', required: true },
              { name: 'data', displayName: 'Entry Data JSON', type: 'json', required: true }
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
    type: 'contentful',
    name: 'Contentful',
    description: 'Query omnichannel content entries, assets, and spaces from Contentful CDN',
    category: 'app',
    icon: 'box',
    color: '#2478cc',
    baseURL: 'https://cdn.contentful.com/spaces/{spaceId}/environments/{environmentId}',
    auth: {
      type: 'bearer',
      credentialType: 'contentful_cda_token'
    },
    resources: [
      {
        name: 'entry',
        displayName: 'Entry',
        operations: [
          {
            name: 'list',
            displayName: 'List Entries',
            method: 'GET',
            path: '/entries',
            itemsPath: 'items',
            properties: [
              { name: 'spaceId', displayName: 'Space ID', type: 'string', required: true },
              { name: 'environmentId', displayName: 'Environment ID', type: 'string', default: 'master' }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'sanity',
    name: 'Sanity.io',
    description: 'Execute GROQ queries and mutate structured content documents in Sanity.io',
    category: 'app',
    icon: 'edit',
    color: '#f03e2f',
    baseURL: 'https://{projectId}.api.sanity.io/v2021-06-07/data/query/{dataset}',
    auth: {
      type: 'bearer',
      credentialType: 'sanity_token'
    },
    resources: [
      {
        name: 'query',
        displayName: 'GROQ Query',
        operations: [
          {
            name: 'query',
            displayName: 'Execute GROQ Query',
            method: 'GET',
            path: '/',
            itemsPath: 'result',
            properties: [
              { name: 'projectId', displayName: 'Project ID', type: 'string', required: true },
              { name: 'dataset', displayName: 'Dataset Name', type: 'string', default: 'production' },
              { name: 'query', displayName: 'GROQ Query String', type: 'string', required: true, default: '*[_type == "post"]' }
            ],
            queryParameters: {
              query: '$param:query'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'webflow',
    name: 'Webflow',
    description: 'Manage CMS collections, publish live items, and update static site pages in Webflow',
    category: 'app',
    icon: 'layout',
    color: '#4353ff',
    baseURL: 'https://api.webflow.com/v2',
    auth: {
      type: 'bearer',
      credentialType: 'webflow_token'
    },
    resources: [
      {
        name: 'item',
        displayName: 'CMS Item',
        operations: [
          {
            name: 'create',
            displayName: 'Create CMS Item',
            method: 'POST',
            path: '/collections/{collectionId}/items',
            properties: [
              { name: 'collectionId', displayName: 'Collection ID', type: 'string', required: true },
              { name: 'fieldData', displayName: 'Field Data JSON', type: 'json', required: true }
            ],
            bodyParameters: {
              fieldData: '$param:fieldData'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'medium',
    name: 'Medium',
    description: 'Publish articles and drafts directly to Medium profiles and publications',
    category: 'app',
    icon: 'book-open',
    color: '#000000',
    baseURL: 'https://api.medium.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'medium_token'
    },
    resources: [
      {
        name: 'post',
        displayName: 'Post',
        operations: [
          {
            name: 'create',
            displayName: 'Create Post',
            method: 'POST',
            path: '/users/{authorId}/posts',
            properties: [
              { name: 'authorId', displayName: 'Author User ID', type: 'string', required: true },
              { name: 'title', displayName: 'Post Title', type: 'string', required: true },
              { name: 'contentFormat', displayName: 'Format', type: 'options', options: [{ name: 'Markdown', value: 'markdown' }, { name: 'HTML', value: 'html' }], default: 'markdown' },
              { name: 'content', displayName: 'Article Body', type: 'string', required: true }
            ],
            bodyParameters: {
              title: '$param:title',
              contentFormat: '$param:contentFormat',
              content: '$param:content',
              publishStatus: 'draft'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'mastodon',
    name: 'Mastodon',
    description: 'Publish decentralized federated statuses and interact with followers on Mastodon',
    category: 'social',
    icon: 'share-2',
    color: '#6364ff',
    baseURL: 'https://{instance}/api/v1',
    auth: {
      type: 'bearer',
      credentialType: 'mastodon_token'
    },
    resources: [
      {
        name: 'status',
        displayName: 'Status / Toot',
        operations: [
          {
            name: 'create',
            displayName: 'Post Status',
            method: 'POST',
            path: '/statuses',
            properties: [
              { name: 'instance', displayName: 'Mastodon Instance', type: 'string', required: true, default: 'mastodon.social' },
              { name: 'status', displayName: 'Status Text', type: 'string', required: true }
            ],
            bodyParameters: {
              status: '$param:status'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'pinterest',
    name: 'Pinterest',
    description: 'Create pins, pinboards, and publish visual inspiration via Pinterest API',
    category: 'social',
    icon: 'image',
    color: '#e60023',
    baseURL: 'https://api.pinterest.com/v5',
    auth: {
      type: 'bearer',
      credentialType: 'pinterest_token'
    },
    resources: [
      {
        name: 'pin',
        displayName: 'Pin',
        operations: [
          {
            name: 'create',
            displayName: 'Create Pin',
            method: 'POST',
            path: '/pins',
            properties: [
              { name: 'board_id', displayName: 'Board ID', type: 'string', required: true },
              { name: 'title', displayName: 'Title', type: 'string', required: true },
              { name: 'description', displayName: 'Description', type: 'string' },
              { name: 'link', displayName: 'Destination Link', type: 'string' }
            ],
            bodyParameters: {
              board_id: '$param:board_id',
              title: '$param:title',
              description: '$param:description',
              link: '$param:link'
            }
          }
        ]
      }
    ]
  }
];
