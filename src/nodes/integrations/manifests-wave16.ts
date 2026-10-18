import { DeclarativeManifest } from '../declarative-node';

export const WAVE16_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // MARKETING, NEWSLETTERS & LEAD AUTOMATION
  // ==========================================
  {
    type: 'emailoctopus',
    name: 'EmailOctopus',
    description: 'Grow email lists and send affordable Amazon SES newsletters via EmailOctopus',
    category: 'app',
    icon: 'mail',
    color: '#34495e',
    baseURL: 'https://emailoctopus.com/api/1.6',
    auth: {
      type: 'apiKey',
      queryParamName: 'api_key',
      credentialType: 'emailoctopus_api_key'
    },
    resources: [
      {
        name: 'contact',
        displayName: 'Contact',
        operations: [
          {
            name: 'create',
            displayName: 'Create Contact in List',
            method: 'POST',
            path: '/lists/{listId}/contacts',
            properties: [
              { name: 'listId', displayName: 'List ID', type: 'string', required: true },
              { name: 'email_address', displayName: 'Email Address', type: 'string', required: true },
              { name: 'status', displayName: 'Status', type: 'options', options: [{ name: 'Subscribed', value: 'SUBSCRIBED' }, { name: 'Unsubscribed', value: 'UNSUBSCRIBED' }], default: 'SUBSCRIBED' }
            ],
            bodyParameters: {
              email_address: '$param:email_address',
              status: '$param:status'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'sendlane',
    name: 'Sendlane',
    description: 'E-commerce email, SMS, and marketing event tracking automation on Sendlane',
    category: 'app',
    icon: 'send',
    color: '#0055ff',
    baseURL: 'https://api.sendlane.com/v2',
    auth: {
      type: 'bearer',
      credentialType: 'sendlane_token'
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
            path: '/lists/{listId}/contacts',
            properties: [
              { name: 'listId', displayName: 'List ID', type: 'number', required: true },
              { name: 'email', displayName: 'Email', type: 'string', required: true },
              { name: 'first_name', displayName: 'First Name', type: 'string' }
            ],
            bodyParameters: {
              email: '$param:email',
              first_name: '$param:first_name'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'mailbluster',
    name: 'MailBluster',
    description: 'Send high-volume marketing campaigns through AWS SES at lowest cost with MailBluster',
    category: 'app',
    icon: 'mail',
    color: '#ff5a5f',
    baseURL: 'https://api.mailbluster.com/api',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'mailbluster_api_key'
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
            path: '/leads',
            properties: [
              { name: 'email', displayName: 'Email Address', type: 'string', required: true },
              { name: 'firstName', displayName: 'First Name', type: 'string' },
              { name: 'subscribed', displayName: 'Subscribed', type: 'boolean', default: true }
            ],
            bodyParameters: {
              email: '$param:email',
              firstName: '$param:firstName',
              subscribed: '$param:subscribed'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'sendy',
    name: 'Sendy',
    description: 'Subscribe users and trigger automated drip campaigns on self-hosted Sendy instances',
    category: 'app',
    icon: 'send',
    color: '#00a887',
    baseURL: 'https://{sendyUrl}',
    auth: {
      type: 'apiKey',
      queryParamName: 'api_key',
      credentialType: 'sendy_api_key'
    },
    resources: [
      {
        name: 'subscriber',
        displayName: 'Subscriber',
        operations: [
          {
            name: 'subscribe',
            displayName: 'Subscribe User',
            method: 'POST',
            path: '/subscribe',
            properties: [
              { name: 'sendyUrl', displayName: 'Sendy Installation URL', type: 'string', required: true },
              { name: 'list', displayName: 'List ID (Encrypted String)', type: 'string', required: true },
              { name: 'email', displayName: 'Email Address', type: 'string', required: true },
              { name: 'name', displayName: 'Name', type: 'string' }
            ],
            bodyParameters: {
              list: '$param:list',
              email: '$param:email',
              name: '$param:name',
              boolean: 'true'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'hubspot_deal',
    name: 'HubSpot Deals',
    description: 'Create, update, and manage sales deals and stages in HubSpot CRM pipeline',
    category: 'app',
    icon: 'dollar-sign',
    color: '#ff7a59',
    baseURL: 'https://api.hubapi.com/crm/v3/objects',
    auth: {
      type: 'bearer',
      credentialType: 'hubspot_api_key'
    },
    resources: [
      {
        name: 'deal',
        displayName: 'Deal',
        operations: [
          {
            name: 'create',
            displayName: 'Create Deal',
            method: 'POST',
            path: '/deals',
            properties: [
              { name: 'dealname', displayName: 'Deal Name', type: 'string', required: true },
              { name: 'amount', displayName: 'Deal Amount', type: 'string' },
              { name: 'pipeline', displayName: 'Pipeline ID', type: 'string', default: 'default' },
              { name: 'dealstage', displayName: 'Stage ID', type: 'string', default: 'appointmentscheduled' }
            ],
            bodyParameters: {
              properties: {
                dealname: '$param:dealname',
                amount: '$param:amount',
                pipeline: '$param:pipeline',
                dealstage: '$param:dealstage'
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'salesforce_lead',
    name: 'Salesforce Leads',
    description: 'Capture, qualify, and route new prospective leads into Salesforce Enterprise CRM',
    category: 'app',
    icon: 'user-plus',
    color: '#00a1e0',
    baseURL: 'https://{instance}.salesforce.com/services/data/v59.0/sobjects',
    auth: {
      type: 'bearer',
      credentialType: 'salesforce_token'
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
            path: '/Lead',
            properties: [
              { name: 'instance', displayName: 'Salesforce Instance', type: 'string', required: true },
              { name: 'LastName', displayName: 'Last Name', type: 'string', required: true },
              { name: 'Company', displayName: 'Company Name', type: 'string', required: true },
              { name: 'Email', displayName: 'Email Address', type: 'string' }
            ],
            bodyParameters: {
              LastName: '$param:LastName',
              Company: '$param:Company',
              Email: '$param:Email'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'pipedrive_deal',
    name: 'Pipedrive Deals',
    description: 'Add new deals, set stages, and track winning probabilities in Pipedrive CRM',
    category: 'app',
    icon: 'briefcase',
    color: '#26292c',
    baseURL: 'https://api.pipedrive.com/v1',
    auth: {
      type: 'apiKey',
      queryParamName: 'api_token',
      credentialType: 'pipedrive_api_token'
    },
    resources: [
      {
        name: 'deal',
        displayName: 'Deal',
        operations: [
          {
            name: 'create',
            displayName: 'Create Deal',
            method: 'POST',
            path: '/deals',
            properties: [
              { name: 'title', displayName: 'Deal Title', type: 'string', required: true },
              { name: 'value', displayName: 'Deal Value', type: 'number' },
              { name: 'currency', displayName: 'Currency', type: 'string', default: 'USD' }
            ],
            bodyParameters: {
              title: '$param:title',
              value: '$param:value',
              currency: '$param:currency'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'activecampaign_tag',
    name: 'ActiveCampaign Tags',
    description: 'Apply tags to contacts to trigger automated nurture sequences in ActiveCampaign',
    category: 'app',
    icon: 'tag',
    color: '#356ae6',
    baseURL: 'https://{accountName}.api-us1.com/api/3',
    auth: {
      type: 'header',
      headerName: 'Api-Token',
      credentialType: 'activecampaign_api'
    },
    resources: [
      {
        name: 'contactTag',
        displayName: 'Contact Tag',
        operations: [
          {
            name: 'addTag',
            displayName: 'Add Tag to Contact',
            method: 'POST',
            path: '/contactTags',
            properties: [
              { name: 'accountName', displayName: 'Account Subdomain', type: 'string', required: true },
              { name: 'contact', displayName: 'Contact ID', type: 'string', required: true },
              { name: 'tag', displayName: 'Tag ID', type: 'string', required: true }
            ],
            bodyParameters: {
              contactTag: {
                contact: '$param:contact',
                tag: '$param:tag'
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'sparkpost',
    name: 'SparkPost',
    description: 'Send high-volume transactional messages and inspect email metrics via SparkPost API',
    category: 'app',
    icon: 'send',
    color: '#fa6423',
    baseURL: 'https://api.sparkpost.com/api/v1',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'sparkpost_api_key'
    },
    resources: [
      {
        name: 'transmission',
        displayName: 'Transmission',
        operations: [
          {
            name: 'send',
            displayName: 'Send Transmission',
            method: 'POST',
            path: '/transmissions',
            properties: [
              { name: 'from', displayName: 'From Address', type: 'string', required: true },
              { name: 'to', displayName: 'To Address', type: 'string', required: true },
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'html', displayName: 'HTML Body', type: 'string', required: true }
            ],
            bodyParameters: {
              content: {
                from: '$param:from',
                subject: '$param:subject',
                html: '$param:html'
              },
              recipients: [{ address: '$param:to' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'sendinblue_sms',
    name: 'Brevo (Sendinblue) SMS',
    description: 'Send transactional SMS text alerts and OTP codes worldwide via Brevo API',
    category: 'communication',
    icon: 'smartphone',
    color: '#0092ff',
    baseURL: 'https://api.brevo.com/v3',
    auth: {
      type: 'header',
      headerName: 'api-key',
      credentialType: 'brevo_api_key'
    },
    resources: [
      {
        name: 'sms',
        displayName: 'Transactional SMS',
        operations: [
          {
            name: 'send',
            displayName: 'Send SMS',
            method: 'POST',
            path: '/transactionalSMS/sms',
            properties: [
              { name: 'sender', displayName: 'Sender Name (max 11 chars)', type: 'string', required: true },
              { name: 'recipient', displayName: 'Recipient Phone (+ country code)', type: 'string', required: true },
              { name: 'content', displayName: 'Message Content', type: 'string', required: true }
            ],
            bodyParameters: {
              sender: '$param:sender',
              recipient: '$param:recipient',
              content: '$param:content'
            }
          }
        ]
      }
    ]
  }
];
