import { DeclarativeManifest } from '../declarative-node';

export const WAVE13_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // SALES ENGAGEMENT & OUTREACH
  // ==========================================
  {
    type: 'salesloft',
    name: 'Salesloft',
    description: 'Manage sales cadence tasks, log call activities, and manage prospects in Salesloft',
    category: 'app',
    icon: 'phone-forwarded',
    color: '#0066f5',
    baseURL: 'https://api.salesloft.com/v2',
    auth: {
      type: 'bearer',
      credentialType: 'salesloft_token'
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
              { name: 'email_address', displayName: 'Email Address', type: 'string', required: true },
              { name: 'first_name', displayName: 'First Name', type: 'string' },
              { name: 'last_name', displayName: 'Last Name', type: 'string' }
            ],
            bodyParameters: {
              email_address: '$param:email_address',
              first_name: '$param:first_name',
              last_name: '$param:last_name'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'outreach',
    name: 'Outreach.io',
    description: 'Automate sales workflows, sequence prospects, and record buyer engagement in Outreach',
    category: 'app',
    icon: 'user-plus',
    color: '#5b52f5',
    baseURL: 'https://api.outreach.io/api/v2',
    auth: {
      type: 'bearer',
      credentialType: 'outreach_token'
    },
    resources: [
      {
        name: 'prospect',
        displayName: 'Prospect',
        operations: [
          {
            name: 'create',
            displayName: 'Create Prospect',
            method: 'POST',
            path: '/prospects',
            headers: {
              'Content-Type': 'application/vnd.api+json'
            },
            properties: [
              { name: 'email', displayName: 'Email', type: 'string', required: true },
              { name: 'firstName', displayName: 'First Name', type: 'string' },
              { name: 'lastName', displayName: 'Last Name', type: 'string' }
            ],
            bodyParameters: {
              data: {
                type: 'prospect',
                attributes: {
                  emails: ['$param:email'],
                  firstName: '$param:firstName',
                  lastName: '$param:lastName'
                }
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'mixmax',
    name: 'Mixmax',
    description: 'Add contacts to automated email sequences and track engagement on Mixmax',
    category: 'app',
    icon: 'mail',
    color: '#0052cc',
    baseURL: 'https://api.mixmax.com/v1',
    auth: {
      type: 'header',
      headerName: 'X-API-Token',
      credentialType: 'mixmax_api_key'
    },
    resources: [
      {
        name: 'sequence',
        displayName: 'Sequence',
        operations: [
          {
            name: 'addRecipient',
            displayName: 'Add Recipient to Sequence',
            method: 'POST',
            path: '/sequences/{sequenceId}/recipients',
            properties: [
              { name: 'sequenceId', displayName: 'Sequence ID', type: 'string', required: true },
              { name: 'email', displayName: 'Email Address', type: 'string', required: true }
            ],
            bodyParameters: {
              recipients: [{ email: '$param:email' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'reply_io',
    name: 'Reply.io',
    description: 'Automate sales email sequences, multichannel touchpoints, and prospect sync in Reply.io',
    category: 'app',
    icon: 'send',
    color: '#3455db',
    baseURL: 'https://api.reply.io/v1',
    auth: {
      type: 'apiKey',
      headerName: 'X-Api-Key',
      credentialType: 'reply_api_key'
    },
    resources: [
      {
        name: 'people',
        displayName: 'People',
        operations: [
          {
            name: 'create',
            displayName: 'Create Person',
            method: 'POST',
            path: '/actions/addandpushtocampaign',
            properties: [
              { name: 'campaignId', displayName: 'Campaign ID', type: 'string', required: true },
              { name: 'email', displayName: 'Email Address', type: 'string', required: true },
              { name: 'firstName', displayName: 'First Name', type: 'string' }
            ],
            bodyParameters: {
              campaignId: '$param:campaignId',
              email: '$param:email',
              firstName: '$param:firstName'
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // TRANSACTIONAL & BULK EMAIL PROVIDERS
  // ==========================================
  {
    type: 'mailjet',
    name: 'Mailjet',
    description: 'Send high-volume transactional and marketing emails via Mailjet Send API v3.1',
    category: 'app',
    icon: 'mail',
    color: '#ff9900',
    baseURL: 'https://api.mailjet.com/v3.1',
    auth: {
      type: 'basic',
      credentialType: 'mailjet_auth'
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
            path: '/send',
            properties: [
              { name: 'fromEmail', displayName: 'From Email', type: 'string', required: true },
              { name: 'toEmail', displayName: 'To Email', type: 'string', required: true },
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'htmlPart', displayName: 'HTML Body', type: 'string', required: true }
            ],
            bodyParameters: {
              Messages: [
                {
                  From: { Email: '$param:fromEmail' },
                  To: [{ Email: '$param:toEmail' }],
                  Subject: '$param:subject',
                  HTMLPart: '$param:htmlPart'
                }
              ]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'mailersend',
    name: 'MailerSend',
    description: 'Send transactional emails, verify deliverability, and use templates on MailerSend',
    category: 'app',
    icon: 'mail',
    color: '#131415',
    baseURL: 'https://api.mailersend.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'mailersend_token'
    },
    resources: [
      {
        name: 'email',
        displayName: 'Email',
        operations: [
          {
            name: 'send',
            displayName: 'Send Email',
            method: 'POST',
            path: '/email',
            properties: [
              { name: 'fromEmail', displayName: 'From Email', type: 'string', required: true },
              { name: 'toEmail', displayName: 'To Email', type: 'string', required: true },
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'html', displayName: 'HTML Body', type: 'string', required: true }
            ],
            bodyParameters: {
              from: { email: '$param:fromEmail' },
              to: [{ email: '$param:toEmail' }],
              subject: '$param:subject',
              html: '$param:html'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'sendpulse',
    name: 'SendPulse',
    description: 'Send emails, SMS, web push notifications, and manage subscriber address books',
    category: 'app',
    icon: 'send',
    color: '#008be2',
    baseURL: 'https://api.sendpulse.com',
    auth: {
      type: 'bearer',
      credentialType: 'sendpulse_token'
    },
    resources: [
      {
        name: 'email',
        displayName: 'Email',
        operations: [
          {
            name: 'send',
            displayName: 'Send SMTP Email',
            method: 'POST',
            path: '/smtp/emails',
            properties: [
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'html', displayName: 'HTML Content', type: 'string', required: true },
              { name: 'fromEmail', displayName: 'From Email', type: 'string', required: true },
              { name: 'toEmail', displayName: 'To Email', type: 'string', required: true }
            ],
            bodyParameters: {
              email: {
                html: '$param:html',
                subject: '$param:subject',
                from: { email: '$param:fromEmail' },
                to: [{ email: '$param:toEmail' }]
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'elastic_email',
    name: 'Elastic Email',
    description: 'High-speed transactional and marketing email delivery via Elastic Email v4 REST API',
    category: 'app',
    icon: 'mail',
    color: '#3498db',
    baseURL: 'https://api.elasticemail.com/v4',
    auth: {
      type: 'header',
      headerName: 'X-ElasticEmail-ApiKey',
      credentialType: 'elastic_email_key'
    },
    resources: [
      {
        name: 'emails',
        displayName: 'Emails',
        operations: [
          {
            name: 'send',
            displayName: 'Send Transactional Email',
            method: 'POST',
            path: '/emails/transactional',
            properties: [
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'to', displayName: 'Recipient Email', type: 'string', required: true },
              { name: 'body', displayName: 'HTML Body', type: 'string', required: true }
            ],
            bodyParameters: {
              Recipients: [{ Email: '$param:to' }],
              Content: {
                Body: [{ ContentType: 'HTML', Content: '$param:body' }],
                Subject: '$param:subject'
              }
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // EMAIL VERIFICATION & HYGIENE
  // ==========================================
  {
    type: 'zerobounce',
    name: 'ZeroBounce',
    description: 'Verify email bounce risk, spam traps, toxic domains, and validate MX records',
    category: 'app',
    icon: 'check-circle',
    color: '#43a047',
    baseURL: 'https://api.zerobounce.net/v2',
    auth: {
      type: 'apiKey',
      queryParamName: 'api_key',
      credentialType: 'zerobounce_api_key'
    },
    resources: [
      {
        name: 'validate',
        displayName: 'Validation',
        operations: [
          {
            name: 'validateEmail',
            displayName: 'Validate Single Email',
            method: 'GET',
            path: '/validate',
            properties: [
              { name: 'email', displayName: 'Email to Verify', type: 'string', required: true }
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
    type: 'neverbounce',
    name: 'NeverBounce',
    description: 'Verify email deliverability in real-time to maintain high sender reputation',
    category: 'app',
    icon: 'shield-check',
    color: '#1a73e8',
    baseURL: 'https://api.neverbounce.com/v4',
    auth: {
      type: 'apiKey',
      queryParamName: 'key',
      credentialType: 'neverbounce_api_key'
    },
    resources: [
      {
        name: 'single',
        displayName: 'Verification',
        operations: [
          {
            name: 'check',
            displayName: 'Check Single Email',
            method: 'GET',
            path: '/single/check',
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
    type: 'debounce',
    name: 'DeBounce',
    description: 'Validate email deliverability, disposable domains, and syntax errors with DeBounce',
    category: 'app',
    icon: 'check-square',
    color: '#3f51b5',
    baseURL: 'https://api.debounce.io/v1',
    auth: {
      type: 'apiKey',
      queryParamName: 'api',
      credentialType: 'debounce_api_key'
    },
    resources: [
      {
        name: 'validate',
        displayName: 'Validation',
        operations: [
          {
            name: 'check',
            displayName: 'Validate Email',
            method: 'GET',
            path: '/',
            properties: [
              { name: 'email', displayName: 'Email to Check', type: 'string', required: true }
            ],
            queryParameters: {
              email: '$param:email'
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // ADDITIONAL CRM & LEAD MANAGEMENT
  // ==========================================
  {
    type: 'nimble_crm',
    name: 'Nimble CRM',
    description: 'Manage smart contacts, pipeline deals, and relationship intelligence in Nimble CRM',
    category: 'app',
    icon: 'user-check',
    color: '#2b9cd8',
    baseURL: 'https://api.nimble.com/api/v1',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'Nimble token=',
      credentialType: 'nimble_token'
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
            path: '/contact',
            properties: [
              { name: 'first_name', displayName: 'First Name', type: 'string' },
              { name: 'last_name', displayName: 'Last Name', type: 'string', required: true },
              { name: 'email', displayName: 'Email', type: 'string', required: true }
            ],
            bodyParameters: {
              fields: {
                'first name': [{ value: '$param:first_name' }],
                'last name': [{ value: '$param:last_name' }],
                'email': [{ value: '$param:email' }]
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'onepagecrm',
    name: 'OnePageCRM',
    description: 'Action-focused sales CRM to convert leads and manage next action follow-ups',
    category: 'app',
    icon: 'check-circle',
    color: '#e4405f',
    baseURL: 'https://app.onepagecrm.com/api/v3',
    auth: {
      type: 'basic',
      credentialType: 'onepagecrm_auth'
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
              { name: 'first_name', displayName: 'First Name', type: 'string' },
              { name: 'last_name', displayName: 'Last Name', type: 'string', required: true },
              { name: 'email', displayName: 'Email', type: 'string', required: true }
            ],
            bodyParameters: {
              first_name: '$param:first_name',
              last_name: '$param:last_name',
              emails: [{ type: 'work', value: '$param:email' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'nutshell_crm',
    name: 'Nutshell CRM',
    description: 'B2B sales CRM, pipeline automation, and team contact management with Nutshell',
    category: 'app',
    icon: 'briefcase',
    color: '#00aa55',
    baseURL: 'https://app.nutshell.com/api/v1/json',
    auth: {
      type: 'basic',
      credentialType: 'nutshell_auth'
    },
    resources: [
      {
        name: 'contact',
        displayName: 'Contact',
        operations: [
          {
            name: 'create',
            displayName: 'New Contact',
            method: 'POST',
            path: '/',
            properties: [
              { name: 'name', displayName: 'Contact Name', type: 'string', required: true }
            ],
            bodyParameters: {
              method: 'newContact',
              params: {
                contact: { name: '$param:name' }
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'streak_crm',
    name: 'Streak CRM',
    description: 'Manage deals, CRM pipelines, and boxes built inside Gmail via Streak API',
    category: 'app',
    icon: 'inbox',
    color: '#f55734',
    baseURL: 'https://www.streak.com/api/v1',
    auth: {
      type: 'basic',
      credentialType: 'streak_api_key'
    },
    resources: [
      {
        name: 'box',
        displayName: 'Box / Deal',
        operations: [
          {
            name: 'create',
            displayName: 'Create Box in Pipeline',
            method: 'POST',
            path: '/pipelines/{pipelineKey}/boxes',
            properties: [
              { name: 'pipelineKey', displayName: 'Pipeline Key', type: 'string', required: true },
              { name: 'name', displayName: 'Box Name', type: 'string', required: true }
            ],
            bodyParameters: {
              name: '$param:name'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'omnisend',
    name: 'Omnisend',
    description: 'E-commerce email, SMS, and automation marketing platform for online stores',
    category: 'app',
    icon: 'shopping-cart',
    color: '#00d084',
    baseURL: 'https://api.omnisend.com/v3',
    auth: {
      type: 'header',
      headerName: 'X-API-KEY',
      credentialType: 'omnisend_api_key'
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
            path: '/contacts',
            properties: [
              { name: 'email', displayName: 'Email Address', type: 'string', required: true },
              { name: 'firstName', displayName: 'First Name', type: 'string' },
              { name: 'status', displayName: 'Subscription Status', type: 'options', options: [{ name: 'Subscribed', value: 'subscribed' }, { name: 'Non-Subscribed', value: 'nonSubscribed' }], default: 'subscribed' }
            ],
            bodyParameters: {
              identifiers: [{ type: 'email', id: '$param:email', channels: { email: { status: '$param:status' } } }],
              firstName: '$param:firstName'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'moosend',
    name: 'Moosend',
    description: 'Manage email marketing newsletters, subscribers, and automated mailing lists on Moosend',
    category: 'app',
    icon: 'mail',
    color: '#2a62ff',
    baseURL: 'https://api.moosend.com/v3',
    auth: {
      type: 'apiKey',
      queryParamName: 'apikey',
      credentialType: 'moosend_api_key'
    },
    resources: [
      {
        name: 'subscriber',
        displayName: 'Subscriber',
        operations: [
          {
            name: 'subscribe',
            displayName: 'Subscribe to Mailing List',
            method: 'POST',
            path: '/subscribers/{mailingListId}/subscribe.json',
            properties: [
              { name: 'mailingListId', displayName: 'Mailing List ID', type: 'string', required: true },
              { name: 'email', displayName: 'Email Address', type: 'string', required: true },
              { name: 'name', displayName: 'Name', type: 'string' }
            ],
            bodyParameters: {
              Email: '$param:email',
              Name: '$param:name'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'aweber',
    name: 'AWeber',
    description: 'Grow small business email lists, newsletters, and subscribers on AWeber',
    category: 'app',
    icon: 'mail',
    color: '#235999',
    baseURL: 'https://api.aweber.com/1.0',
    auth: {
      type: 'oauth2',
      credentialType: 'aweber_oauth2'
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
            path: '/accounts/{accountId}/lists/{listId}/subscribers',
            properties: [
              { name: 'accountId', displayName: 'AWeber Account ID', type: 'string', required: true },
              { name: 'listId', displayName: 'List ID', type: 'string', required: true },
              { name: 'email', displayName: 'Email Address', type: 'string', required: true },
              { name: 'name', displayName: 'Subscriber Name', type: 'string' }
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
    type: 'constant_contact',
    name: 'Constant Contact',
    description: 'Create contacts, manage marketing email lists, and campaigns in Constant Contact v3',
    category: 'app',
    icon: 'users',
    color: '#0055ff',
    baseURL: 'https://api.cc.email/v3',
    auth: {
      type: 'bearer',
      credentialType: 'constant_contact_token'
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
            path: '/contacts/sign_up_form',
            properties: [
              { name: 'email_address', displayName: 'Email Address', type: 'string', required: true },
              { name: 'first_name', displayName: 'First Name', type: 'string' },
              { name: 'list_memberships', displayName: 'List IDs Array', type: 'json', required: true }
            ],
            bodyParameters: {
              email_address: '$param:email_address',
              first_name: '$param:first_name',
              list_memberships: '$param:list_memberships'
            }
          }
        ]
      }
    ]
  }
];
