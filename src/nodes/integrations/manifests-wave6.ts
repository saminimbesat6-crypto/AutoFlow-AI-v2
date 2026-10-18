import { DeclarativeManifest } from '../declarative-node';

export const WAVE6_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // COMMUNICATION & MESSAGING CHANNELS
  // ==========================================
  {
    type: 'cisco_webex',
    name: 'Cisco Webex',
    description: 'Post messages, manage spaces, and trigger meetings in Cisco Webex',
    category: 'communication',
    icon: 'message-square',
    color: '#00bceb',
    baseURL: 'https://webexapis.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'webex_token'
    },
    resources: [
      {
        name: 'message',
        displayName: 'Message',
        operations: [
          {
            name: 'create',
            displayName: 'Post Message',
            method: 'POST',
            path: '/messages',
            properties: [
              { name: 'roomId', displayName: 'Room / Space ID', type: 'string', required: true },
              { name: 'markdown', displayName: 'Markdown Text', type: 'string', required: true }
            ],
            bodyParameters: {
              roomId: '$param:roomId',
              markdown: '$param:markdown'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'line_messaging',
    name: 'LINE Messaging',
    description: 'Send push messages, flex messages, and broadcasts via LINE Bot API',
    category: 'communication',
    icon: 'message-circle',
    color: '#00c300',
    baseURL: 'https://api.line.me/v2/bot',
    auth: {
      type: 'bearer',
      credentialType: 'line_channel_token'
    },
    resources: [
      {
        name: 'message',
        displayName: 'Message',
        operations: [
          {
            name: 'push',
            displayName: 'Push Message',
            method: 'POST',
            path: '/message/push',
            properties: [
              { name: 'to', displayName: 'User or Group ID', type: 'string', required: true },
              { name: 'text', displayName: 'Text Message', type: 'string', required: true }
            ],
            bodyParameters: {
              to: '$param:to',
              messages: [{ type: 'text', text: '$param:text' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'viber',
    name: 'Viber Bot',
    description: 'Send messages, rich cards, and transactional alerts via Viber Bot API',
    category: 'communication',
    icon: 'message-circle',
    color: '#7360f2',
    baseURL: 'https://chatapi.viber.com/pa',
    auth: {
      type: 'header',
      headerName: 'X-Viber-Auth-Token',
      credentialType: 'viber_auth_token'
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
            path: '/send_message',
            properties: [
              { name: 'receiver', displayName: 'Subscriber ID', type: 'string', required: true },
              { name: 'text', displayName: 'Message Text', type: 'string', required: true }
            ],
            bodyParameters: {
              receiver: '$param:receiver',
              type: 'text',
              text: '$param:text'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'rocket_chat',
    name: 'Rocket.Chat',
    description: 'Post messages, create channels, and manage users in Rocket.Chat',
    category: 'communication',
    icon: 'message-square',
    color: '#f5455c',
    baseURL: 'https://{host}/api/v1',
    auth: {
      type: 'header',
      headerName: 'X-Auth-Token',
      credentialType: 'rocket_chat_token'
    },
    resources: [
      {
        name: 'chat',
        displayName: 'Chat',
        operations: [
          {
            name: 'postMessage',
            displayName: 'Post Message',
            method: 'POST',
            path: '/chat.postMessage',
            properties: [
              { name: 'host', displayName: 'Rocket.Chat Host Domain', type: 'string', required: true },
              { name: 'roomId', displayName: 'Room / Channel ID', type: 'string', required: true },
              { name: 'text', displayName: 'Message Text', type: 'string', required: true }
            ],
            bodyParameters: {
              roomId: '$param:roomId',
              text: '$param:text'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'zulip',
    name: 'Zulip',
    description: 'Organize team communication and send stream or private topic messages in Zulip',
    category: 'communication',
    icon: 'message-square',
    color: '#6492e8',
    baseURL: 'https://{zulipDomain}/api/v1',
    auth: {
      type: 'basic',
      credentialType: 'zulip_api'
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
              { name: 'zulipDomain', displayName: 'Zulip Domain', type: 'string', required: true },
              { name: 'type', displayName: 'Message Type', type: 'options', options: [{ name: 'Stream', value: 'stream' }, { name: 'Direct Message', value: 'direct' }], default: 'stream' },
              { name: 'to', displayName: 'Stream Name or User Email', type: 'string', required: true },
              { name: 'topic', displayName: 'Topic Name', type: 'string', default: 'General' },
              { name: 'content', displayName: 'Markdown Content', type: 'string', required: true }
            ],
            bodyParameters: {
              type: '$param:type',
              to: '$param:to',
              topic: '$param:topic',
              content: '$param:content'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'matrix',
    name: 'Matrix / Element',
    description: 'Send decentralized, encrypted room messages via Matrix Client-Server API',
    category: 'communication',
    icon: 'hash',
    color: '#0dbd8b',
    baseURL: 'https://{homeserver}/_matrix/client/v3',
    auth: {
      type: 'bearer',
      credentialType: 'matrix_token'
    },
    resources: [
      {
        name: 'room',
        displayName: 'Room',
        operations: [
          {
            name: 'sendMessage',
            displayName: 'Send Message',
            method: 'POST',
            path: '/rooms/{roomId}/send/m.room.message/{txnId}',
            properties: [
              { name: 'homeserver', displayName: 'Matrix Homeserver', type: 'string', required: true, default: 'matrix.org' },
              { name: 'roomId', displayName: 'Room ID', type: 'string', required: true },
              { name: 'txnId', displayName: 'Transaction ID', type: 'string', required: true },
              { name: 'body', displayName: 'Message Body', type: 'string', required: true }
            ],
            bodyParameters: {
              msgtype: 'm.text',
              body: '$param:body'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'messagebird',
    name: 'MessageBird (Bird)',
    description: 'Send global SMS, WhatsApp, and omnichannel messages via MessageBird API',
    category: 'communication',
    icon: 'smartphone',
    color: '#2481d7',
    baseURL: 'https://rest.messagebird.com',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'AccessKey ',
      credentialType: 'messagebird_key'
    },
    resources: [
      {
        name: 'sms',
        displayName: 'SMS',
        operations: [
          {
            name: 'send',
            displayName: 'Send SMS',
            method: 'POST',
            path: '/messages',
            properties: [
              { name: 'originator', displayName: 'Originator / Sender ID', type: 'string', required: true },
              { name: 'recipients', displayName: 'Recipient Phone', type: 'string', required: true },
              { name: 'body', displayName: 'Message Text', type: 'string', required: true }
            ],
            bodyParameters: {
              originator: '$param:originator',
              recipients: '$param:recipients',
              body: '$param:body'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'sinch',
    name: 'Sinch',
    description: 'Send high-volume SMS messages and verify one-time passwords via Sinch API',
    category: 'communication',
    icon: 'message-square',
    color: '#f9d342',
    baseURL: 'https://sms.api.sinch.com/xms/v1/{servicePlanId}',
    auth: {
      type: 'bearer',
      credentialType: 'sinch_token'
    },
    resources: [
      {
        name: 'sms',
        displayName: 'SMS',
        operations: [
          {
            name: 'send',
            displayName: 'Send SMS',
            method: 'POST',
            path: '/batches',
            properties: [
              { name: 'servicePlanId', displayName: 'Service Plan ID', type: 'string', required: true },
              { name: 'from', displayName: 'From Phone Number', type: 'string', required: true },
              { name: 'to', displayName: 'To Phone Number', type: 'string', required: true },
              { name: 'body', displayName: 'Message Body', type: 'string', required: true }
            ],
            bodyParameters: {
              from: '$param:from',
              to: ['$param:to'],
              body: '$param:body'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'plivo',
    name: 'Plivo',
    description: 'Send SMS messages and make programmatic voice calls using Plivo Cloud',
    category: 'communication',
    icon: 'phone',
    color: '#00a859',
    baseURL: 'https://api.plivo.com/v1/Account/{authId}',
    auth: {
      type: 'basic',
      credentialType: 'plivo_auth'
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
            path: '/Message/',
            properties: [
              { name: 'authId', displayName: 'Plivo Auth ID', type: 'string', required: true },
              { name: 'src', displayName: 'Sender Phone Number', type: 'string', required: true },
              { name: 'dst', displayName: 'Destination Phone Number', type: 'string', required: true },
              { name: 'text', displayName: 'Message Text', type: 'string', required: true }
            ],
            bodyParameters: {
              src: '$param:src',
              dst: '$param:dst',
              text: '$param:text'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'clicksend',
    name: 'ClickSend',
    description: 'Send SMS, MMS, voice, and post letters worldwide via ClickSend REST API',
    category: 'communication',
    icon: 'send',
    color: '#0085ff',
    baseURL: 'https://rest.clicksend.com/v3',
    auth: {
      type: 'basic',
      credentialType: 'clicksend_auth'
    },
    resources: [
      {
        name: 'sms',
        displayName: 'SMS',
        operations: [
          {
            name: 'send',
            displayName: 'Send SMS',
            method: 'POST',
            path: '/sms/send',
            properties: [
              { name: 'to', displayName: 'Recipient Phone', type: 'string', required: true },
              { name: 'body', displayName: 'Message Body', type: 'string', required: true }
            ],
            bodyParameters: {
              messages: [{ to: '$param:to', body: '$param:body' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'vonage',
    name: 'Vonage (Nexmo)',
    description: 'Send SMS and execute multi-factor authentication verifications via Vonage API',
    category: 'communication',
    icon: 'phone-call',
    color: '#1a1a1a',
    baseURL: 'https://rest.nexmo.com',
    auth: {
      type: 'apiKey',
      queryParamName: 'api_key',
      credentialType: 'vonage_api'
    },
    resources: [
      {
        name: 'sms',
        displayName: 'SMS',
        operations: [
          {
            name: 'send',
            displayName: 'Send SMS',
            method: 'POST',
            path: '/sms/json',
            properties: [
              { name: 'from', displayName: 'Sender Name / Number', type: 'string', required: true },
              { name: 'to', displayName: 'Recipient Phone', type: 'string', required: true },
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
    type: 'zoom',
    name: 'Zoom',
    description: 'Create scheduled meetings, manage webinars, and inspect cloud recordings in Zoom',
    category: 'communication',
    icon: 'video',
    color: '#2d8cff',
    baseURL: 'https://api.zoom.us/v2',
    auth: {
      type: 'bearer',
      credentialType: 'zoom_token'
    },
    resources: [
      {
        name: 'meeting',
        displayName: 'Meeting',
        operations: [
          {
            name: 'create',
            displayName: 'Create Meeting',
            method: 'POST',
            path: '/users/{userId}/meetings',
            properties: [
              { name: 'userId', displayName: 'User ID or "me"', type: 'string', default: 'me' },
              { name: 'topic', displayName: 'Meeting Topic', type: 'string', required: true },
              { name: 'startTime', displayName: 'Start Time (ISO 8601)', type: 'string' },
              { name: 'duration', displayName: 'Duration (Minutes)', type: 'number', default: 60 }
            ],
            bodyParameters: {
              topic: '$param:topic',
              start_time: '$param:startTime',
              duration: '$param:duration',
              type: 2
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // PROJECT MANAGEMENT & COLLABORATION
  // ==========================================
  {
    type: 'basecamp',
    name: 'Basecamp',
    description: 'Create to-dos, messages, and campfire chat messages in Basecamp 3',
    category: 'app',
    icon: 'check-square',
    color: '#1d9e74',
    baseURL: 'https://3.basecampapi.com/{accountId}',
    auth: {
      type: 'bearer',
      credentialType: 'basecamp_token'
    },
    resources: [
      {
        name: 'todo',
        displayName: 'To-Do',
        operations: [
          {
            name: 'create',
            displayName: 'Create To-Do',
            method: 'POST',
            path: '/buckets/{bucketId}/todolists/{todoListId}/todos.json',
            properties: [
              { name: 'accountId', displayName: 'Basecamp Account ID', type: 'string', required: true },
              { name: 'bucketId', displayName: 'Project / Bucket ID', type: 'string', required: true },
              { name: 'todoListId', displayName: 'To-Do List ID', type: 'string', required: true },
              { name: 'content', displayName: 'To-Do Title', type: 'string', required: true },
              { name: 'description', displayName: 'Notes / Description', type: 'string' }
            ],
            bodyParameters: {
              content: '$param:content',
              description: '$param:description'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'wrike',
    name: 'Wrike',
    description: 'Manage tasks, folders, workflows, and custom fields in Wrike work management',
    category: 'app',
    icon: 'check-circle',
    color: '#08ac35',
    baseURL: 'https://www.wrike.com/api/v4',
    auth: {
      type: 'bearer',
      credentialType: 'wrike_token'
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
            path: '/folders/{folderId}/tasks',
            properties: [
              { name: 'folderId', displayName: 'Folder ID', type: 'string', required: true },
              { name: 'title', displayName: 'Task Title', type: 'string', required: true },
              { name: 'description', displayName: 'Description', type: 'string' }
            ],
            bodyParameters: {
              title: '$param:title',
              description: '$param:description'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'teamwork',
    name: 'Teamwork',
    description: 'Manage client work, tasks, milestones, and project time tracking in Teamwork',
    category: 'app',
    icon: 'users',
    color: '#2f43fc',
    baseURL: 'https://{siteName}.teamwork.com',
    auth: {
      type: 'basic',
      credentialType: 'teamwork_api'
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
            path: '/tasklists/{taskListId}/tasks.json',
            properties: [
              { name: 'siteName', displayName: 'Teamwork Site Name', type: 'string', required: true },
              { name: 'taskListId', displayName: 'Task List ID', type: 'string', required: true },
              { name: 'content', displayName: 'Task Name', type: 'string', required: true }
            ],
            bodyParameters: {
              'todo-item': { content: '$param:content' }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'youtrack',
    name: 'JetBrains YouTrack',
    description: 'Track software bugs, user stories, and agile sprints with JetBrains YouTrack',
    category: 'app',
    icon: 'terminal',
    color: '#000000',
    baseURL: 'https://{youtrackHost}/api',
    auth: {
      type: 'bearer',
      credentialType: 'youtrack_token'
    },
    resources: [
      {
        name: 'issue',
        displayName: 'Issue',
        operations: [
          {
            name: 'create',
            displayName: 'Create Issue',
            method: 'POST',
            path: '/issues',
            properties: [
              { name: 'youtrackHost', displayName: 'YouTrack Server Host', type: 'string', required: true },
              { name: 'projectId', displayName: 'Project ID', type: 'string', required: true },
              { name: 'summary', displayName: 'Issue Summary', type: 'string', required: true },
              { name: 'description', displayName: 'Description', type: 'string' }
            ],
            bodyParameters: {
              project: { id: '$param:projectId' },
              summary: '$param:summary',
              description: '$param:description'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'shortcut',
    name: 'Shortcut',
    description: 'Plan software roadmaps, create stories, and track releases in Shortcut (Clubhouse)',
    category: 'app',
    icon: 'play',
    color: '#5e43f3',
    baseURL: 'https://api.app.shortcut.com/api/v3',
    auth: {
      type: 'header',
      headerName: 'Shortcut-Token',
      credentialType: 'shortcut_token'
    },
    resources: [
      {
        name: 'story',
        displayName: 'Story',
        operations: [
          {
            name: 'create',
            displayName: 'Create Story',
            method: 'POST',
            path: '/stories',
            properties: [
              { name: 'name', displayName: 'Story Title', type: 'string', required: true },
              { name: 'workflow_state_id', displayName: 'Workflow State ID', type: 'number', required: true },
              { name: 'story_type', displayName: 'Story Type', type: 'options', options: [{ name: 'Feature', value: 'feature' }, { name: 'Bug', value: 'bug' }, { name: 'Chore', value: 'chore' }], default: 'feature' }
            ],
            bodyParameters: {
              name: '$param:name',
              workflow_state_id: '$param:workflow_state_id',
              story_type: '$param:story_type'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'meistertask',
    name: 'MeisterTask',
    description: 'Automate Kanban task management and project workflows on MeisterTask',
    category: 'app',
    icon: 'check-square',
    color: '#00a3e0',
    baseURL: 'https://www.meistertask.com/api',
    auth: {
      type: 'bearer',
      credentialType: 'meistertask_token'
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
            path: '/sections/{sectionId}/tasks',
            properties: [
              { name: 'sectionId', displayName: 'Section ID', type: 'string', required: true },
              { name: 'name', displayName: 'Task Name', type: 'string', required: true },
              { name: 'notes', displayName: 'Notes', type: 'string' }
            ],
            bodyParameters: {
              name: '$param:name',
              notes: '$param:notes'
            }
          }
        ]
      }
    ]
  }
];
