import { DeclarativeManifest } from '../declarative-node';

export const WAVE19_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // CALENDARS, TASKS & WORKSPACES
  // ==========================================
  {
    type: 'google_calendar_event',
    name: 'Google Calendar Events',
    description: 'Create scheduled meetings, invite guests, and update events in Google Calendar',
    category: 'app',
    icon: 'calendar',
    color: '#4285f4',
    baseURL: 'https://www.googleapis.com/calendar/v3',
    auth: {
      type: 'oauth2',
      credentialType: 'google'
    },
    resources: [
      {
        name: 'event',
        displayName: 'Event',
        operations: [
          {
            name: 'create',
            displayName: 'Create Calendar Event',
            method: 'POST',
            path: '/calendars/{calendarId}/events',
            properties: [
              { name: 'calendarId', displayName: 'Calendar ID (e.g. primary)', type: 'string', default: 'primary' },
              { name: 'summary', displayName: 'Event Title', type: 'string', required: true },
              { name: 'description', displayName: 'Description', type: 'string' },
              { name: 'startDateTime', displayName: 'Start Time (ISO 8601)', type: 'string', required: true },
              { name: 'endDateTime', displayName: 'End Time (ISO 8601)', type: 'string', required: true }
            ],
            bodyParameters: {
              summary: '$param:summary',
              description: '$param:description',
              start: { dateTime: '$param:startDateTime' },
              end: { dateTime: '$param:endDateTime' }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'outlook_mail',
    name: 'Microsoft Outlook Mail',
    description: 'Send high-priority emails, attachments, and draft messages in Microsoft 365 Outlook',
    category: 'app',
    icon: 'mail',
    color: '#0078d4',
    baseURL: 'https://graph.microsoft.com/v1.0',
    auth: {
      type: 'oauth2',
      credentialType: 'microsoft'
    },
    resources: [
      {
        name: 'mail',
        displayName: 'Mail',
        operations: [
          {
            name: 'send',
            displayName: 'Send Mail',
            method: 'POST',
            path: '/me/sendMail',
            properties: [
              { name: 'to', displayName: 'Recipient Email', type: 'string', required: true },
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'body', displayName: 'HTML Body', type: 'string', required: true }
            ],
            bodyParameters: {
              message: {
                subject: '$param:subject',
                body: { contentType: 'HTML', content: '$param:body' },
                toRecipients: [{ emailAddress: { address: '$param:to' } }]
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'asana_task',
    name: 'Asana Tasks',
    description: 'Create tasks, assign owners, set due dates, and update project boards in Asana',
    category: 'app',
    icon: 'check-circle',
    color: '#fc636b',
    baseURL: 'https://app.asana.com/api/1.0',
    auth: {
      type: 'bearer',
      credentialType: 'asana_token'
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
              { name: 'workspace', displayName: 'Workspace ID', type: 'string', required: true },
              { name: 'name', displayName: 'Task Name', type: 'string', required: true },
              { name: 'notes', displayName: 'Task Notes', type: 'string' }
            ],
            bodyParameters: {
              data: {
                workspace: '$param:workspace',
                name: '$param:name',
                notes: '$param:notes'
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'trello_card',
    name: 'Trello Cards',
    description: 'Create Kanban cards, assign labels, checklists, and members in Atlassian Trello',
    category: 'app',
    icon: 'trello',
    color: '#0079bf',
    baseURL: 'https://api.trello.com/1',
    auth: {
      type: 'apiKey',
      queryParamName: 'key',
      credentialType: 'trello_api'
    },
    resources: [
      {
        name: 'card',
        displayName: 'Card',
        operations: [
          {
            name: 'create',
            displayName: 'Create Card',
            method: 'POST',
            path: '/cards',
            properties: [
              { name: 'idList', displayName: 'List ID', type: 'string', required: true },
              { name: 'name', displayName: 'Card Name', type: 'string', required: true },
              { name: 'desc', displayName: 'Description', type: 'string' }
            ],
            bodyParameters: {
              idList: '$param:idList',
              name: '$param:name',
              desc: '$param:desc'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'clickup_task',
    name: 'ClickUp Tasks',
    description: 'Create tasks, set priority flags, assignees, and custom field values in ClickUp',
    category: 'app',
    icon: 'check-square',
    color: '#7b68ee',
    baseURL: 'https://api.clickup.com/api/v2',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'clickup_api_token'
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
            path: '/list/{listId}/task',
            properties: [
              { name: 'listId', displayName: 'List ID', type: 'string', required: true },
              { name: 'name', displayName: 'Task Title', type: 'string', required: true },
              { name: 'description', displayName: 'Description', type: 'string' }
            ],
            bodyParameters: {
              name: '$param:name',
              description: '$param:description'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'linear_issue',
    name: 'Linear Issues',
    description: 'Create high-velocity engineering issue tickets and cycles in Linear software tool',
    category: 'app',
    icon: 'target',
    color: '#5e6ad2',
    baseURL: 'https://api.linear.app/graphql',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'linear_api_key'
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
            path: '/',
            properties: [
              { name: 'teamId', displayName: 'Team ID', type: 'string', required: true },
              { name: 'title', displayName: 'Issue Title', type: 'string', required: true },
              { name: 'description', displayName: 'Description', type: 'string' }
            ],
            bodyParameters: {
              query: 'mutation CreateIssue($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id title url } } }',
              variables: {
                input: {
                  teamId: '$param:teamId',
                  title: '$param:title',
                  description: '$param:description'
                }
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'todoist_task',
    name: 'Todoist Tasks',
    description: 'Add personal and team productivity tasks, due dates, and priorities in Todoist',
    category: 'app',
    icon: 'check-square',
    color: '#e44332',
    baseURL: 'https://api.todoist.com/rest/v2',
    auth: {
      type: 'bearer',
      credentialType: 'todoist_token'
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
              { name: 'content', displayName: 'Task Content', type: 'string', required: true },
              { name: 'description', displayName: 'Description', type: 'string' },
              { name: 'due_string', displayName: 'Due String (e.g. tomorrow at 12pm)', type: 'string' }
            ],
            bodyParameters: {
              content: '$param:content',
              description: '$param:description',
              due_string: '$param:due_string'
            }
          }
        ]
      }
    ]
  }
];
