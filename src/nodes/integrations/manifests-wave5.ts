import { DeclarativeManifest } from '../declarative-node';

export const WAVE5_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // MARKETING & EMAIL AUTOMATION
  // ==========================================
  {
    type: 'activecampaign',
    name: 'ActiveCampaign',
    description: 'Manage contacts, tags, deals, and lists in ActiveCampaign CRM & Marketing',
    category: 'app',
    icon: 'mail',
    color: '#356ae6',
    baseURL: 'https://{accountName}.api-us1.com/api/3',
    auth: {
      type: 'header',
      headerName: 'Api-Token',
      credentialType: 'activecampaign_api'
    },
    resources: [
      {
        name: 'contact',
        displayName: 'Contact',
        operations: [
          {
            name: 'createOrUpdate',
            displayName: 'Create or Update Contact',
            method: 'POST',
            path: '/contact/sync',
            properties: [
              { name: 'accountName', displayName: 'Account Subdomain', type: 'string', required: true },
              { name: 'email', displayName: 'Email Address', type: 'string', required: true },
              { name: 'firstName', displayName: 'First Name', type: 'string' },
              { name: 'lastName', displayName: 'Last Name', type: 'string' },
              { name: 'phone', displayName: 'Phone', type: 'string' }
            ],
            bodyParameters: {
              contact: {
                email: '$param:email',
                firstName: '$param:firstName',
                lastName: '$param:lastName',
                phone: '$param:phone'
              }
            }
          },
          {
            name: 'get',
            displayName: 'Get Contact',
            method: 'GET',
            path: '/contacts/{id}',
            properties: [
              { name: 'accountName', displayName: 'Account Subdomain', type: 'string', required: true },
              { name: 'id', displayName: 'Contact ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'klaviyo',
    name: 'Klaviyo',
    description: 'Manage customer profiles, metrics, and event tracking in Klaviyo',
    category: 'app',
    icon: 'send',
    color: '#000000',
    baseURL: 'https://a.klaviyo.com/api',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'klaviyo_api_key'
    },
    resources: [
      {
        name: 'profile',
        displayName: 'Profile',
        operations: [
          {
            name: 'create',
            displayName: 'Create Profile',
            method: 'POST',
            path: '/profiles',
            headers: {
              'revision': '2024-02-15',
              'Content-Type': 'application/vnd.api+json'
            },
            properties: [
              { name: 'email', displayName: 'Email', type: 'string', required: true },
              { name: 'firstName', displayName: 'First Name', type: 'string' },
              { name: 'lastName', displayName: 'Last Name', type: 'string' }
            ],
            bodyParameters: {
              data: {
                type: 'profile',
                attributes: {
                  email: '$param:email',
                  first_name: '$param:firstName',
                  last_name: '$param:lastName'
                }
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'customer_io',
    name: 'Customer.io',
    description: 'Track customer behaviors, attributes, and events in Customer.io',
    category: 'app',
    icon: 'user-check',
    color: '#1b2432',
    baseURL: 'https://track.customer.io/api/v1',
    auth: {
      type: 'basic',
      credentialType: 'customerio_api'
    },
    resources: [
      {
        name: 'customer',
        displayName: 'Customer',
        operations: [
          {
            name: 'identify',
            displayName: 'Add / Update Customer',
            method: 'PUT',
            path: '/customers/{customerId}',
            properties: [
              { name: 'customerId', displayName: 'Customer ID', type: 'string', required: true },
              { name: 'email', displayName: 'Email', type: 'string', required: true },
              { name: 'createdAt', displayName: 'Created Timestamp', type: 'number' }
            ],
            bodyParameters: {
              email: '$param:email',
              created_at: '$param:createdAt'
            }
          },
          {
            name: 'track',
            displayName: 'Track Event',
            method: 'POST',
            path: '/customers/{customerId}/events',
            properties: [
              { name: 'customerId', displayName: 'Customer ID', type: 'string', required: true },
              { name: 'eventName', displayName: 'Event Name', type: 'string', required: true },
              { name: 'data', displayName: 'Event Data JSON', type: 'json' }
            ],
            bodyParameters: {
              name: '$param:eventName',
              data: '$param:data'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'mailerlite',
    name: 'MailerLite',
    description: 'Manage email marketing subscribers, groups, and campaigns in MailerLite',
    category: 'app',
    icon: 'mail',
    color: '#00a154',
    baseURL: 'https://connect.mailerlite.com/api',
    auth: {
      type: 'bearer',
      credentialType: 'mailerlite_token'
    },
    resources: [
      {
        name: 'subscriber',
        displayName: 'Subscriber',
        operations: [
          {
            name: 'create',
            displayName: 'Create or Update Subscriber',
            method: 'POST',
            path: '/subscribers',
            properties: [
              { name: 'email', displayName: 'Email', type: 'string', required: true },
              { name: 'fields', displayName: 'Custom Fields JSON', type: 'json' }
            ],
            bodyParameters: {
              email: '$param:email',
              fields: '$param:fields'
            }
          },
          {
            name: 'list',
            displayName: 'List Subscribers',
            method: 'GET',
            path: '/subscribers',
            itemsPath: 'data'
          }
        ]
      }
    ]
  },

  {
    type: 'convertkit',
    name: 'ConvertKit (Kit)',
    description: 'Grow email audience and automate creator newsletters via ConvertKit (Kit) API',
    category: 'app',
    icon: 'mail',
    color: '#fb6970',
    baseURL: 'https://api.kit.com/v4',
    auth: {
      type: 'bearer',
      credentialType: 'convertkit_token'
    },
    resources: [
      {
        name: 'subscriber',
        displayName: 'Subscriber',
        operations: [
          {
            name: 'create',
            displayName: 'Create Subscriber',
            method: 'POST',
            path: '/subscribers',
            properties: [
              { name: 'email_address', displayName: 'Email Address', type: 'string', required: true },
              { name: 'first_name', displayName: 'First Name', type: 'string' }
            ],
            bodyParameters: {
              email_address: '$param:email_address',
              first_name: '$param:first_name'
            }
          },
          {
            name: 'list',
            displayName: 'List Subscribers',
            method: 'GET',
            path: '/subscribers',
            itemsPath: 'subscribers'
          }
        ]
      }
    ]
  },

  {
    type: 'getresponse',
    name: 'GetResponse',
    description: 'Manage email contacts, autoresponders, and campaigns in GetResponse',
    category: 'app',
    icon: 'mail',
    color: '#00bafe',
    baseURL: 'https://api.getresponse.com/v3',
    auth: {
      type: 'header',
      headerName: 'X-Auth-Token',
      credentialType: 'getresponse_api_key'
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
            path: '/contacts',
            properties: [
              { name: 'name', displayName: 'Contact Name', type: 'string' },
              { name: 'email', displayName: 'Email Address', type: 'string', required: true },
              { name: 'campaignId', displayName: 'Campaign / List ID', type: 'string', required: true }
            ],
            bodyParameters: {
              name: '$param:name',
              email: '$param:email',
              campaign: { campaignId: '$param:campaignId' }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'mailgun',
    name: 'Mailgun',
    description: 'Send high-deliverability transactional emails and validate addresses with Mailgun',
    category: 'app',
    icon: 'send',
    color: '#e53935',
    baseURL: 'https://api.mailgun.net/v3',
    auth: {
      type: 'basic',
      credentialType: 'mailgun_api'
    },
    resources: [
      {
        name: 'message',
        displayName: 'Message',
        operations: [
          {
            name: 'send',
            displayName: 'Send Email',
            method: 'POST',
            path: '/{domain}/messages',
            properties: [
              { name: 'domain', displayName: 'Mailgun Domain', type: 'string', required: true },
              { name: 'from', displayName: 'From Address', type: 'string', required: true },
              { name: 'to', displayName: 'To Address', type: 'string', required: true },
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'text', displayName: 'Text Content', type: 'string' },
              { name: 'html', displayName: 'HTML Content', type: 'string' }
            ],
            bodyParameters: {
              from: '$param:from',
              to: '$param:to',
              subject: '$param:subject',
              text: '$param:text',
              html: '$param:html'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'campaign_monitor',
    name: 'Campaign Monitor',
    description: 'Manage subscribers and transactional email campaigns in Campaign Monitor',
    category: 'app',
    icon: 'mail',
    color: '#717579',
    baseURL: 'https://api.createsend.com/api/v3.3',
    auth: {
      type: 'basic',
      credentialType: 'campaign_monitor_api'
    },
    resources: [
      {
        name: 'subscriber',
        displayName: 'Subscriber',
        operations: [
          {
            name: 'add',
            displayName: 'Add Subscriber',
            method: 'POST',
            path: '/subscribers/{listId}.json',
            properties: [
              { name: 'listId', displayName: 'List ID', type: 'string', required: true },
              { name: 'emailAddress', displayName: 'Email Address', type: 'string', required: true },
              { name: 'name', displayName: 'Name', type: 'string' }
            ],
            bodyParameters: {
              EmailAddress: '$param:emailAddress',
              Name: '$param:name',
              Resubscribe: true
            }
          }
        ]
      }
    ]
  },

  {
    type: 'drip',
    name: 'Drip',
    description: 'E-commerce marketing automation, subscriber tagging, and custom events on Drip',
    category: 'app',
    icon: 'droplet',
    color: '#eb1467',
    baseURL: 'https://api.getdrip.com/v2',
    auth: {
      type: 'bearer',
      credentialType: 'drip_token'
    },
    resources: [
      {
        name: 'subscriber',
        displayName: 'Subscriber',
        operations: [
          {
            name: 'createOrUpdate',
            displayName: 'Create or Update Subscriber',
            method: 'POST',
            path: '/{accountId}/subscribers',
            properties: [
              { name: 'accountId', displayName: 'Drip Account ID', type: 'string', required: true },
              { name: 'email', displayName: 'Email Address', type: 'string', required: true },
              { name: 'tags', displayName: 'Tags (comma separated)', type: 'string' }
            ],
            bodyParameters: {
              subscribers: [
                {
                  email: '$param:email'
                }
              ]
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // SALES, ENRICHMENT & PROSPECTING
  // ==========================================
  {
    type: 'close_crm',
    name: 'Close CRM',
    description: 'Manage inside sales leads, contacts, opportunities, and activities in Close CRM',
    category: 'app',
    icon: 'user-check',
    color: '#0052cc',
    baseURL: 'https://api.close.com/api/v1',
    auth: {
      type: 'basic',
      credentialType: 'close_api'
    },
    resources: [
      {
        name: 'lead',
        displayName: 'Lead',
        operations: [
          {
            name: 'create',
            displayName: 'Create Lead',
            method: 'POST',
            path: '/lead',
            properties: [
              { name: 'name', displayName: 'Company / Lead Name', type: 'string', required: true },
              { name: 'description', displayName: 'Description', type: 'string' }
            ],
            bodyParameters: {
              name: '$param:name',
              description: '$param:description'
            }
          },
          {
            name: 'list',
            displayName: 'List Leads',
            method: 'GET',
            path: '/lead',
            itemsPath: 'data'
          }
        ]
      }
    ]
  },

  {
    type: 'copper_crm',
    name: 'Copper CRM',
    description: 'Manage Google Workspace CRM leads, people, and pipeline opportunities in Copper',
    category: 'app',
    icon: 'briefcase',
    color: '#da4453',
    baseURL: 'https://api.copper.com/developer_api/v1',
    auth: {
      type: 'header',
      headerName: 'X-PW-AccessToken',
      credentialType: 'copper_api'
    },
    resources: [
      {
        name: 'person',
        displayName: 'Person',
        operations: [
          {
            name: 'create',
            displayName: 'Create Person',
            method: 'POST',
            path: '/people',
            properties: [
              { name: 'name', displayName: 'Name', type: 'string', required: true },
              { name: 'email', displayName: 'Email', type: 'string', required: true }
            ],
            bodyParameters: {
              name: '$param:name',
              emails: [{ email: '$param:email', category: 'work' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'freshsales',
    name: 'Freshsales CRM',
    description: 'Manage contacts, sales accounts, deals, and activities in Freshsales',
    category: 'app',
    icon: 'users',
    color: '#ff5a00',
    baseURL: 'https://{bundleAlias}.freshsales.io/api',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'Token token=',
      credentialType: 'freshsales_token'
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
            path: '/contacts',
            properties: [
              { name: 'bundleAlias', displayName: 'Freshsales Domain/Bundle Alias', type: 'string', required: true },
              { name: 'first_name', displayName: 'First Name', type: 'string' },
              { name: 'last_name', displayName: 'Last Name', type: 'string', required: true },
              { name: 'email', displayName: 'Email', type: 'string', required: true }
            ],
            bodyParameters: {
              contact: {
                first_name: '$param:first_name',
                last_name: '$param:last_name',
                email: '$param:email'
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'capsule_crm',
    name: 'Capsule CRM',
    description: 'Track relationships, sales pipeline, and milestones in Capsule CRM',
    category: 'app',
    icon: 'box',
    color: '#1a3b5c',
    baseURL: 'https://api.capsulecrm.com/api/v2',
    auth: {
      type: 'bearer',
      credentialType: 'capsule_token'
    },
    resources: [
      {
        name: 'party',
        displayName: 'Party / Contact',
        operations: [
          {
            name: 'list',
            displayName: 'List Parties',
            method: 'GET',
            path: '/parties',
            itemsPath: 'parties'
          }
        ]
      }
    ]
  },

  {
    type: 'apollo_io',
    name: 'Apollo.io',
    description: 'Search B2B leads, enrich business emails, and manage sequences on Apollo.io',
    category: 'app',
    icon: 'target',
    color: '#ffc83b',
    baseURL: 'https://api.apollo.io/v1',
    auth: {
      type: 'header',
      headerName: 'X-Api-Key',
      credentialType: 'apollo_api_key'
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
            path: '/mixed_people/search',
            itemsPath: 'people',
            properties: [
              { name: 'q_keywords', displayName: 'Keywords / Title', type: 'string' },
              { name: 'person_titles', displayName: 'Titles Array', type: 'json' }
            ],
            bodyParameters: {
              q_keywords: '$param:q_keywords',
              person_titles: '$param:person_titles'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'hunter_io',
    name: 'Hunter.io',
    description: 'Find professional email addresses and verify deliverability on Hunter.io',
    category: 'app',
    icon: 'search',
    color: '#ff6633',
    baseURL: 'https://api.hunter.io/v2',
    auth: {
      type: 'apiKey',
      queryParamName: 'api_key',
      credentialType: 'hunter_api_key'
    },
    resources: [
      {
        name: 'email',
        displayName: 'Email',
        operations: [
          {
            name: 'verify',
            displayName: 'Verify Email',
            method: 'GET',
            path: '/email-verifier',
            properties: [
              { name: 'email', displayName: 'Email to Verify', type: 'string', required: true }
            ],
            queryParameters: {
              email: '$param:email'
            }
          },
          {
            name: 'domainSearch',
            displayName: 'Domain Search',
            method: 'GET',
            path: '/domain-search',
            itemsPath: 'data.emails',
            properties: [
              { name: 'domain', displayName: 'Domain Name', type: 'string', required: true }
            ],
            queryParameters: {
              domain: '$param:domain'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'clearbit',
    name: 'Clearbit',
    description: 'Enrich person and company data in real-time with Clearbit intelligence API',
    category: 'app',
    icon: 'user',
    color: '#4985ea',
    baseURL: 'https://person-stream.clearbit.com/v2',
    auth: {
      type: 'bearer',
      credentialType: 'clearbit_key'
    },
    resources: [
      {
        name: 'person',
        displayName: 'Person',
        operations: [
          {
            name: 'find',
            displayName: 'Find by Email',
            method: 'GET',
            path: '/combined/find',
            properties: [
              { name: 'email', displayName: 'Email Address', type: 'string', required: true }
            ],
            queryParameters: {
              email: '$param:email'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'snov_io',
    name: 'Snov.io',
    description: 'Verify email addresses, find leads, and launch email drip campaigns with Snov.io',
    category: 'app',
    icon: 'mail',
    color: '#5542f6',
    baseURL: 'https://api.snov.io/v1',
    auth: {
      type: 'bearer',
      credentialType: 'snov_access_token'
    },
    resources: [
      {
        name: 'email',
        displayName: 'Email Verification',
        operations: [
          {
            name: 'verify',
            displayName: 'Verify Email',
            method: 'POST',
            path: '/get-emails-verification-status',
            properties: [
              { name: 'email', displayName: 'Email to Verify', type: 'string', required: true }
            ],
            bodyParameters: {
              emails: ['$param:email']
            }
          }
        ]
      }
    ]
  },

  {
    type: 'lemlist',
    name: 'Lemlist',
    description: 'Automate personalized cold email outreach and sales engagement with Lemlist',
    category: 'app',
    icon: 'send',
    color: '#ff3d57',
    baseURL: 'https://api.lemlist.com/api',
    auth: {
      type: 'basic',
      credentialType: 'lemlist_api'
    },
    resources: [
      {
        name: 'lead',
        displayName: 'Lead',
        operations: [
          {
            name: 'add',
            displayName: 'Add Lead to Campaign',
            method: 'POST',
            path: '/campaigns/{campaignId}/leads/{email}',
            properties: [
              { name: 'campaignId', displayName: 'Campaign ID', type: 'string', required: true },
              { name: 'email', displayName: 'Lead Email', type: 'string', required: true },
              { name: 'firstName', displayName: 'First Name', type: 'string' },
              { name: 'companyName', displayName: 'Company Name', type: 'string' }
            ],
            bodyParameters: {
              firstName: '$param:firstName',
              companyName: '$param:companyName'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'instantly_ai',
    name: 'Instantly.ai',
    description: 'Manage high-volume cold email campaigns, leads, and warmup on Instantly.ai',
    category: 'app',
    icon: 'zap',
    color: '#5b21b6',
    baseURL: 'https://api.instantly.ai/api/v1',
    auth: {
      type: 'apiKey',
      queryParamName: 'api_key',
      credentialType: 'instantly_api_key'
    },
    resources: [
      {
        name: 'lead',
        displayName: 'Lead',
        operations: [
          {
            name: 'add',
            displayName: 'Add Leads to Campaign',
            method: 'POST',
            path: '/lead/add',
            properties: [
              { name: 'campaign_id', displayName: 'Campaign ID', type: 'string', required: true },
              { name: 'email', displayName: 'Email', type: 'string', required: true },
              { name: 'first_name', displayName: 'First Name', type: 'string' }
            ],
            bodyParameters: {
              campaign_id: '$param:campaign_id',
              leads: [{ email: '$param:email', first_name: '$param:first_name' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'woodpecker',
    name: 'Woodpecker.co',
    description: 'Create prospect lists and track cold outreach follow-ups in Woodpecker.co',
    category: 'app',
    icon: 'send',
    color: '#289d70',
    baseURL: 'https://api.woodpecker.co/rest/v1',
    auth: {
      type: 'bearer',
      credentialType: 'woodpecker_token'
    },
    resources: [
      {
        name: 'prospect',
        displayName: 'Prospect',
        operations: [
          {
            name: 'add',
            displayName: 'Add Prospect',
            method: 'POST',
            path: '/add_prospects_campaign',
            properties: [
              { name: 'campaign_id', displayName: 'Campaign ID', type: 'string', required: true },
              { name: 'email', displayName: 'Email', type: 'string', required: true }
            ],
            bodyParameters: {
              campaign: { id: '$param:campaign_id' },
              prospects: [{ email: '$param:email' }]
            }
          }
        ]
      }
    ]
  }
];
