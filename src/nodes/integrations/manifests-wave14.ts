import { DeclarativeManifest } from '../declarative-node';

export const WAVE14_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // CUSTOMER SUPPORT & TICKETING
  // ==========================================
  {
    type: 'zoho_desk',
    name: 'Zoho Desk',
    description: 'Manage customer service support tickets, departments, and contacts in Zoho Desk',
    category: 'app',
    icon: 'life-buoy',
    color: '#009688',
    baseURL: 'https://desk.zoho.com/api/v1',
    auth: {
      type: 'bearer',
      credentialType: 'zoho_token'
    },
    resources: [
      {
        name: 'ticket',
        displayName: 'Ticket',
        operations: [
          {
            name: 'create',
            displayName: 'Create Ticket',
            method: 'POST',
            path: '/tickets',
            properties: [
              { name: 'orgId', displayName: 'Organization ID', type: 'string', required: true },
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'departmentId', displayName: 'Department ID', type: 'string', required: true },
              { name: 'contactId', displayName: 'Contact ID', type: 'string' },
              { name: 'description', displayName: 'Description', type: 'string' }
            ],
            headers: {
              'orgId': '$param:orgId'
            },
            bodyParameters: {
              subject: '$param:subject',
              departmentId: '$param:departmentId',
              contactId: '$param:contactId',
              description: '$param:description'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'groove_hq',
    name: 'Groove HQ',
    description: 'Collaborate on customer support tickets, mailboxes, and customer profiles on Groove',
    category: 'app',
    icon: 'mail',
    color: '#2b78fe',
    baseURL: 'https://api.groovehq.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'groove_token'
    },
    resources: [
      {
        name: 'ticket',
        displayName: 'Ticket',
        operations: [
          {
            name: 'create',
            displayName: 'Create Ticket',
            method: 'POST',
            path: '/tickets',
            properties: [
              { name: 'body', displayName: 'Message Body', type: 'string', required: true },
              { name: 'from', displayName: 'Customer Email', type: 'string', required: true },
              { name: 'to', displayName: 'Mailbox Email', type: 'string', required: true },
              { name: 'subject', displayName: 'Subject', type: 'string', required: true }
            ],
            bodyParameters: {
              body: '$param:body',
              from: '$param:from',
              to: '$param:to',
              subject: '$param:subject'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'chatwoot',
    name: 'Chatwoot',
    description: 'Open-source omnichannel customer engagement, live chat, and support inbox platform',
    category: 'app',
    icon: 'message-circle',
    color: '#1f93ff',
    baseURL: 'https://{chatwootHost}/api/v1/accounts/{accountId}',
    auth: {
      type: 'header',
      headerName: 'api_access_token',
      credentialType: 'chatwoot_token'
    },
    resources: [
      {
        name: 'message',
        displayName: 'Message',
        operations: [
          {
            name: 'create',
            displayName: 'Send Message in Conversation',
            method: 'POST',
            path: '/conversations/{conversationId}/messages',
            properties: [
              { name: 'chatwootHost', displayName: 'Chatwoot Host Domain', type: 'string', required: true, default: 'app.chatwoot.com' },
              { name: 'accountId', displayName: 'Account ID', type: 'number', required: true },
              { name: 'conversationId', displayName: 'Conversation ID', type: 'number', required: true },
              { name: 'content', displayName: 'Message Content', type: 'string', required: true }
            ],
            bodyParameters: {
              content: '$param:content',
              message_type: 'outgoing'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'tidio',
    name: 'Tidio',
    description: 'Connect live website visitors with support agents and AI chatbots via Tidio API',
    category: 'app',
    icon: 'message-square',
    color: '#0026e6',
    baseURL: 'https://api.tidio.co',
    auth: {
      type: 'bearer',
      credentialType: 'tidio_token'
    },
    resources: [
      {
        name: 'message',
        displayName: 'Message',
        operations: [
          {
            name: 'send',
            displayName: 'Send Chat Message',
            method: 'POST',
            path: '/chats/{chatId}/messages',
            properties: [
              { name: 'chatId', displayName: 'Chat ID', type: 'string', required: true },
              { name: 'message', displayName: 'Message Text', type: 'string', required: true }
            ],
            bodyParameters: {
              message: '$param:message'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'drift',
    name: 'Drift',
    description: 'Conversational marketing, visitor identification, and meeting bookings via Drift',
    category: 'app',
    icon: 'message-circle',
    color: '#000000',
    baseURL: 'https://driftapi.com',
    auth: {
      type: 'bearer',
      credentialType: 'drift_token'
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
              { name: 'email', displayName: 'Email Address', type: 'string', required: true }
            ],
            bodyParameters: {
              attributes: {
                email: '$param:email'
              }
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // OMNICHANNEL SMS & TELEPHONY
  // ==========================================
  {
    type: 'telnyx',
    name: 'Telnyx',
    description: 'Send high-speed global SMS, MMS, and configure phone numbers with Telnyx v2 API',
    category: 'communication',
    icon: 'phone',
    color: '#00c389',
    baseURL: 'https://api.telnyx.com/v2',
    auth: {
      type: 'bearer',
      credentialType: 'telnyx_token'
    },
    resources: [
      {
        name: 'message',
        displayName: 'Message',
        operations: [
          {
            name: 'send',
            displayName: 'Send SMS',
            method: 'POST',
            path: '/messages',
            properties: [
              { name: 'from', displayName: 'From Phone Number', type: 'string', required: true },
              { name: 'to', displayName: 'To Phone Number', type: 'string', required: true },
              { name: 'text', displayName: 'Message Text', type: 'string', required: true }
            ],
            bodyParameters: {
              from: '$param:from',
              to: '$param:to',
              text: '$param:text'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'bandwidth',
    name: 'Bandwidth',
    description: 'Enterprise voice, messaging, and 911 telecommunications via Bandwidth REST API',
    category: 'communication',
    icon: 'phone-call',
    color: '#0065a4',
    baseURL: 'https://messaging.bandwidth.com/api/v2/users/{accountId}',
    auth: {
      type: 'basic',
      credentialType: 'bandwidth_auth'
    },
    resources: [
      {
        name: 'message',
        displayName: 'Message',
        operations: [
          {
            name: 'send',
            displayName: 'Send Message',
            method: 'POST',
            path: '/messages',
            properties: [
              { name: 'accountId', displayName: 'Bandwidth Account ID', type: 'string', required: true },
              { name: 'applicationId', displayName: 'Application ID', type: 'string', required: true },
              { name: 'from', displayName: 'From Number', type: 'string', required: true },
              { name: 'to', displayName: 'To Number', type: 'string', required: true },
              { name: 'text', displayName: 'Text Body', type: 'string', required: true }
            ],
            bodyParameters: {
              applicationId: '$param:applicationId',
              to: ['$param:to'],
              from: '$param:from',
              text: '$param:text'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'textmagic',
    name: 'TextMagic',
    description: 'Send bulk business SMS text alerts and manage contacts worldwide with TextMagic',
    category: 'communication',
    icon: 'smartphone',
    color: '#00a3e0',
    baseURL: 'https://rest.textmagic.com/api/v2',
    auth: {
      type: 'header',
      headerName: 'X-TM-Key',
      credentialType: 'textmagic_key'
    },
    resources: [
      {
        name: 'message',
        displayName: 'Message',
        operations: [
          {
            name: 'send',
            displayName: 'Send SMS',
            method: 'POST',
            path: '/messages',
            properties: [
              { name: 'phones', displayName: 'Recipient Phone Numbers', type: 'string', required: true },
              { name: 'text', displayName: 'Message Text', type: 'string', required: true }
            ],
            bodyParameters: {
              phones: '$param:phones',
              text: '$param:text'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'simpletexting',
    name: 'SimpleTexting',
    description: 'Send 1-on-1 two-way SMS conversations and mass marketing text blasts on SimpleTexting',
    category: 'communication',
    icon: 'message-circle',
    color: '#00b289',
    baseURL: 'https://api-app2.simpletexting.com/v2/api',
    auth: {
      type: 'bearer',
      credentialType: 'simpletexting_token'
    },
    resources: [
      {
        name: 'message',
        displayName: 'Message',
        operations: [
          {
            name: 'send',
            displayName: 'Send SMS',
            method: 'POST',
            path: '/messages',
            properties: [
              { name: 'accountPhone', displayName: 'Account Phone Number', type: 'string', required: true },
              { name: 'contactPhone', displayName: 'Contact Phone Number', type: 'string', required: true },
              { name: 'text', displayName: 'Message Text', type: 'string', required: true }
            ],
            bodyParameters: {
              accountPhone: '$param:accountPhone',
              contactPhone: '$param:contactPhone',
              text: '$param:text'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'whatsapp_cloud',
    name: 'WhatsApp Cloud API',
    description: 'Send official Meta WhatsApp business template and text messages via Graph API',
    category: 'communication',
    icon: 'message-circle',
    color: '#25d366',
    baseURL: 'https://graph.facebook.com/v20.0/{phoneNumberId}',
    auth: {
      type: 'bearer',
      credentialType: 'whatsapp_system_user_token'
    },
    resources: [
      {
        name: 'messages',
        displayName: 'Messages',
        operations: [
          {
            name: 'sendText',
            displayName: 'Send Text Message',
            method: 'POST',
            path: '/messages',
            properties: [
              { name: 'phoneNumberId', displayName: 'Phone Number ID', type: 'string', required: true },
              { name: 'to', displayName: 'Recipient Phone (E.164)', type: 'string', required: true },
              { name: 'body', displayName: 'Message Text', type: 'string', required: true }
            ],
            bodyParameters: {
              messaging_product: 'whatsapp',
              to: '$param:to',
              type: 'text',
              text: { body: '$param:body' }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'gupshup',
    name: 'Gupshup',
    description: 'Send conversational AI messages, WhatsApp templates, and interactive bot messages on Gupshup',
    category: 'communication',
    icon: 'message-square',
    color: '#ec1c24',
    baseURL: 'https://api.gupshup.io/sm/api/v1',
    auth: {
      type: 'header',
      headerName: 'apikey',
      credentialType: 'gupshup_api_key'
    },
    resources: [
      {
        name: 'msg',
        displayName: 'Message',
        operations: [
          {
            name: 'send',
            displayName: 'Send WhatsApp Message',
            method: 'POST',
            path: '/msg',
            properties: [
              { name: 'channel', displayName: 'Channel', type: 'string', default: 'whatsapp' },
              { name: 'source', displayName: 'Source Number / App Name', type: 'string', required: true },
              { name: 'destination', displayName: 'Destination Phone', type: 'string', required: true },
              { name: 'message', displayName: 'Message Text', type: 'string', required: true }
            ],
            bodyParameters: {
              channel: '$param:channel',
              source: '$param:source',
              destination: '$param:destination',
              message: '$param:message'
            }
          }
        ]
      }
    ]
  }
];
