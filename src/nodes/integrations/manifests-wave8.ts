import { DeclarativeManifest } from '../declarative-node';

export const WAVE8_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // CUSTOMER SUPPORT & HELPDESK
  // ==========================================
  {
    type: 'help_scout',
    name: 'Help Scout',
    description: 'Manage shared inbox conversations, customer profiles, and tags in Help Scout',
    category: 'app',
    icon: 'life-buoy',
    color: '#1292ee',
    baseURL: 'https://api.helpscout.net/v2',
    auth: {
      type: 'bearer',
      credentialType: 'helpscout_token'
    },
    resources: [
      {
        name: 'conversation',
        displayName: 'Conversation',
        operations: [
          {
            name: 'create',
            displayName: 'Create Conversation',
            method: 'POST',
            path: '/conversations',
            properties: [
              { name: 'mailboxId', displayName: 'Mailbox ID', type: 'number', required: true },
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'customerEmail', displayName: 'Customer Email', type: 'string', required: true },
              { name: 'text', displayName: 'Message Body', type: 'string', required: true }
            ],
            bodyParameters: {
              mailboxId: '$param:mailboxId',
              subject: '$param:subject',
              customer: { email: '$param:customerEmail' },
              threads: [{ type: 'customer', text: '$param:text' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'front',
    name: 'Front',
    description: 'Manage collaborative customer communication and shared inbox messages in Front',
    category: 'app',
    icon: 'inbox',
    color: '#ff3366',
    baseURL: 'https://api2.frontapp.com',
    auth: {
      type: 'bearer',
      credentialType: 'front_token'
    },
    resources: [
      {
        name: 'message',
        displayName: 'Message',
        operations: [
          {
            name: 'send',
            displayName: 'Send Message in Channel',
            method: 'POST',
            path: '/channels/{channelId}/messages',
            properties: [
              { name: 'channelId', displayName: 'Channel ID', type: 'string', required: true },
              { name: 'to', displayName: 'Recipient', type: 'string', required: true },
              { name: 'body', displayName: 'Message Body', type: 'string', required: true }
            ],
            bodyParameters: {
              to: ['$param:to'],
              body: '$param:body'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'gorgias',
    name: 'Gorgias',
    description: 'E-commerce customer service, tickets, customer context, and macros on Gorgias',
    category: 'app',
    icon: 'smile',
    color: '#0062ff',
    baseURL: 'https://{domain}.gorgias.com/api',
    auth: {
      type: 'basic',
      credentialType: 'gorgias_auth'
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
              { name: 'domain', displayName: 'Gorgias Subdomain', type: 'string', required: true },
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'customerEmail', displayName: 'Customer Email', type: 'string', required: true },
              { name: 'bodyText', displayName: 'Message Content', type: 'string', required: true }
            ],
            bodyParameters: {
              subject: '$param:subject',
              customer: { email: '$param:customerEmail' },
              messages: [{ body_text: '$param:bodyText' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'livechat',
    name: 'LiveChat',
    description: 'Manage live website chats, routing, agent tickets, and customer history on LiveChat',
    category: 'app',
    icon: 'message-circle',
    color: '#ff5c00',
    baseURL: 'https://api.livechatinc.com/v3.5/agent/action',
    auth: {
      type: 'bearer',
      credentialType: 'livechat_token'
    },
    resources: [
      {
        name: 'chat',
        displayName: 'Chat',
        operations: [
          {
            name: 'sendMessage',
            displayName: 'Send Chat Message',
            method: 'POST',
            path: '/send_event',
            properties: [
              { name: 'chat_id', displayName: 'Chat ID', type: 'string', required: true },
              { name: 'text', displayName: 'Message Text', type: 'string', required: true }
            ],
            bodyParameters: {
              chat_id: '$param:chat_id',
              event: { type: 'message', text: '$param:text' }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'crisp',
    name: 'Crisp Chat',
    description: 'Engage website visitors, reply to conversations, and update CRM profiles in Crisp',
    category: 'app',
    icon: 'message-square',
    color: '#1a73e8',
    baseURL: 'https://api.crisp.chat/v1',
    auth: {
      type: 'basic',
      credentialType: 'crisp_auth'
    },
    resources: [
      {
        name: 'message',
        displayName: 'Message',
        operations: [
          {
            name: 'send',
            displayName: 'Send Message in Conversation',
            method: 'POST',
            path: '/website/{websiteId}/conversation/{sessionId}/message',
            properties: [
              { name: 'websiteId', displayName: 'Website ID', type: 'string', required: true },
              { name: 'sessionId', displayName: 'Conversation Session ID', type: 'string', required: true },
              { name: 'content', displayName: 'Message Text', type: 'string', required: true }
            ],
            bodyParameters: {
              type: 'text',
              content: '$param:content',
              from: 'operator',
              origin: 'chat'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'servicenow',
    name: 'ServiceNow',
    description: 'Manage enterprise IT service management incidents, changes, and tasks in ServiceNow',
    category: 'app',
    icon: 'activity',
    color: '#293e40',
    baseURL: 'https://{instance}.service-now.com/api/now',
    auth: {
      type: 'basic',
      credentialType: 'servicenow_auth'
    },
    resources: [
      {
        name: 'incident',
        displayName: 'Incident',
        operations: [
          {
            name: 'create',
            displayName: 'Create Incident',
            method: 'POST',
            path: '/table/incident',
            properties: [
              { name: 'instance', displayName: 'ServiceNow Instance Name', type: 'string', required: true },
              { name: 'short_description', displayName: 'Short Description', type: 'string', required: true },
              { name: 'urgency', displayName: 'Urgency (1=High, 2=Medium, 3=Low)', type: 'string', default: '2' }
            ],
            bodyParameters: {
              short_description: '$param:short_description',
              urgency: '$param:urgency'
            }
          },
          {
            name: 'list',
            displayName: 'List Incidents',
            method: 'GET',
            path: '/table/incident',
            itemsPath: 'result',
            properties: [
              { name: 'instance', displayName: 'ServiceNow Instance Name', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'freshservice',
    name: 'Freshservice',
    description: 'Automate IT service desk tickets, change management, and asset tracking in Freshservice',
    category: 'app',
    icon: 'server',
    color: '#00838f',
    baseURL: 'https://{domain}.freshservice.com/api/v2',
    auth: {
      type: 'basic',
      credentialType: 'freshservice_api'
    },
    resources: [
      {
        name: 'ticket',
        displayName: 'IT Ticket',
        operations: [
          {
            name: 'create',
            displayName: 'Create Ticket',
            method: 'POST',
            path: '/tickets',
            properties: [
              { name: 'domain', displayName: 'Freshservice Subdomain', type: 'string', required: true },
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'email', displayName: 'Requester Email', type: 'string', required: true },
              { name: 'priority', displayName: 'Priority (1=Low, 2=Med, 3=High, 4=Urgent)', type: 'number', default: 2 },
              { name: 'status', displayName: 'Status (2=Open)', type: 'number', default: 2 },
              { name: 'description', displayName: 'Description HTML', type: 'string', required: true }
            ],
            bodyParameters: {
              subject: '$param:subject',
              email: '$param:email',
              priority: '$param:priority',
              status: '$param:status',
              description: '$param:description'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'canny',
    name: 'Canny.io',
    description: 'Capture customer product feedback, feature requests, and votes via Canny API',
    category: 'app',
    icon: 'star',
    color: '#5555ff',
    baseURL: 'https://canny.io/api/v1',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'canny_api_key'
    },
    resources: [
      {
        name: 'post',
        displayName: 'Feedback Post',
        operations: [
          {
            name: 'create',
            displayName: 'Create Post',
            method: 'POST',
            path: '/posts/create',
            properties: [
              { name: 'apiKey', displayName: 'API Key', type: 'string', required: true },
              { name: 'boardID', displayName: 'Board ID', type: 'string', required: true },
              { name: 'title', displayName: 'Post Title', type: 'string', required: true },
              { name: 'details', displayName: 'Details / Description', type: 'string' },
              { name: 'authorID', displayName: 'Author User ID', type: 'string', required: true }
            ],
            bodyParameters: {
              apiKey: '$param:apiKey',
              boardID: '$param:boardID',
              title: '$param:title',
              details: '$param:details',
              authorID: '$param:authorID'
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // FORMS, SURVEYS & DATA COLLECTION
  // ==========================================
  {
    type: 'surveymonkey',
    name: 'SurveyMonkey',
    description: 'Retrieve surveys, questions, collector links, and respondent feedback on SurveyMonkey',
    category: 'app',
    icon: 'check-square',
    color: '#00bf6f',
    baseURL: 'https://api.surveymonkey.com/v3',
    auth: {
      type: 'bearer',
      credentialType: 'surveymonkey_token'
    },
    resources: [
      {
        name: 'survey',
        displayName: 'Survey',
        operations: [
          {
            name: 'list',
            displayName: 'List Surveys',
            method: 'GET',
            path: '/surveys',
            itemsPath: 'data'
          },
          {
            name: 'responses',
            displayName: 'Get Survey Responses',
            method: 'GET',
            path: '/surveys/{surveyId}/responses/bulk',
            itemsPath: 'data',
            properties: [
              { name: 'surveyId', displayName: 'Survey ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'tally',
    name: 'Tally Forms',
    description: 'Fetch form schema, submissions, and respondent data from Tally Forms',
    category: 'app',
    icon: 'file-text',
    color: '#000000',
    baseURL: 'https://api.tally.so',
    auth: {
      type: 'bearer',
      credentialType: 'tally_token'
    },
    resources: [
      {
        name: 'submission',
        displayName: 'Submission',
        operations: [
          {
            name: 'list',
            displayName: 'List Form Submissions',
            method: 'GET',
            path: '/forms/{formId}/submissions',
            itemsPath: 'items',
            properties: [
              { name: 'formId', displayName: 'Tally Form ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'formstack',
    name: 'Formstack',
    description: 'Collect digital form submissions, parse answers, and manage forms on Formstack',
    category: 'app',
    icon: 'file-text',
    color: '#2baf2b',
    baseURL: 'https://www.formstack.com/api/v2',
    auth: {
      type: 'bearer',
      credentialType: 'formstack_token'
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
            path: '/form/{formId}/submission.json',
            itemsPath: 'submissions',
            properties: [
              { name: 'formId', displayName: 'Form ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'paperform',
    name: 'Paperform',
    description: 'Process bespoke landing page form submissions and payments from Paperform',
    category: 'app',
    icon: 'file',
    color: '#1a1a1a',
    baseURL: 'https://api.paperform.co/v1',
    auth: {
      type: 'bearer',
      credentialType: 'paperform_token'
    },
    resources: [
      {
        name: 'form',
        displayName: 'Form',
        operations: [
          {
            name: 'list',
            displayName: 'List Forms',
            method: 'GET',
            path: '/forms',
            itemsPath: 'results'
          }
        ]
      }
    ]
  },

  {
    type: 'fillout',
    name: 'Fillout Forms',
    description: 'Fetch submissions, update responses, and manage workflows with Fillout Forms',
    category: 'app',
    icon: 'check-square',
    color: '#f87171',
    baseURL: 'https://api.fillout.com/v1/api',
    auth: {
      type: 'bearer',
      credentialType: 'fillout_token'
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
            itemsPath: 'responses',
            properties: [
              { name: 'formId', displayName: 'Fillout Form ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'surveysparrow',
    name: 'SurveySparrow',
    description: 'Engage audience with conversational surveys, NPS, and track feedback on SurveySparrow',
    category: 'app',
    icon: 'message-circle',
    color: '#00d084',
    baseURL: 'https://api.surveysparrow.com/v3',
    auth: {
      type: 'bearer',
      credentialType: 'surveysparrow_token'
    },
    resources: [
      {
        name: 'survey',
        displayName: 'Survey',
        operations: [
          {
            name: 'list',
            displayName: 'List Surveys',
            method: 'GET',
            path: '/surveys',
            itemsPath: 'data'
          }
        ]
      }
    ]
  }
];
