import { DeclarativeManifest } from '../declarative-node';

export const INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // 1. CRM & SALES
  // ==========================================
  {
    type: 'hubspot',
    name: 'HubSpot',
    description: 'Manage contacts, companies, deals, and CRM records in HubSpot',
    category: 'app',
    icon: 'hubspot',
    color: '#ff7a59',
    baseURL: 'https://api.hubapi.com',
    auth: {
      type: 'bearer',
      credentialType: 'hubspot_api_key'
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
            path: '/crm/v3/objects/contacts',
            description: 'Create a new contact in HubSpot',
            properties: [
              { name: 'email', displayName: 'Email', type: 'string', required: true },
              { name: 'firstname', displayName: 'First Name', type: 'string' },
              { name: 'lastname', displayName: 'Last Name', type: 'string' },
              { name: 'phone', displayName: 'Phone', type: 'string' }
            ],
            bodyParameters: {
              properties: {
                email: '$param:email',
                firstname: '$param:firstname',
                lastname: '$param:lastname',
                phone: '$param:phone'
              }
            }
          },
          {
            name: 'get',
            displayName: 'Get Contact',
            method: 'GET',
            path: '/crm/v3/objects/contacts/{contactId}',
            description: 'Get a contact by ID',
            properties: [
              { name: 'contactId', displayName: 'Contact ID', type: 'string', required: true }
            ]
          },
          {
            name: 'getAll',
            displayName: 'Get Many Contacts',
            method: 'GET',
            path: '/crm/v3/objects/contacts',
            description: 'List contacts in HubSpot',
            itemsPath: 'results',
            properties: [
              { name: 'limit', displayName: 'Limit', type: 'number', default: 20 }
            ],
            queryParameters: { limit: '$param:limit' }
          }
        ]
      },
      {
        name: 'deal',
        displayName: 'Deal',
        operations: [
          {
            name: 'create',
            displayName: 'Create Deal',
            method: 'POST',
            path: '/crm/v3/objects/deals',
            properties: [
              { name: 'dealname', displayName: 'Deal Name', type: 'string', required: true },
              { name: 'amount', displayName: 'Amount', type: 'string' },
              { name: 'dealstage', displayName: 'Stage', type: 'string', default: 'appointmentscheduled' }
            ],
            bodyParameters: {
              properties: {
                dealname: '$param:dealname',
                amount: '$param:amount',
                dealstage: '$param:dealstage'
              }
            }
          },
          {
            name: 'getAll',
            displayName: 'Get Many Deals',
            method: 'GET',
            path: '/crm/v3/objects/deals',
            itemsPath: 'results'
          }
        ]
      }
    ]
  },

  {
    type: 'salesforce',
    name: 'Salesforce',
    description: 'Query, create, and update records across Salesforce CRM objects',
    category: 'app',
    icon: 'cloud',
    color: '#00a1e0',
    baseURL: 'https://login.salesforce.com/services/data/v58.0',
    auth: {
      type: 'oauth2',
      credentialType: 'salesforce_oauth2'
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
            path: '/sobjects/Lead',
            properties: [
              { name: 'LastName', displayName: 'Last Name', type: 'string', required: true },
              { name: 'Company', displayName: 'Company', type: 'string', required: true },
              { name: 'Email', displayName: 'Email', type: 'string' }
            ]
          },
          {
            name: 'get',
            displayName: 'Get Lead',
            method: 'GET',
            path: '/sobjects/Lead/{leadId}',
            properties: [
              { name: 'leadId', displayName: 'Lead ID', type: 'string', required: true }
            ]
          }
        ]
      },
      {
        name: 'soql',
        displayName: 'SOQL Query',
        operations: [
          {
            name: 'query',
            displayName: 'Execute Query',
            method: 'GET',
            path: '/query',
            itemsPath: 'records',
            properties: [
              { name: 'q', displayName: 'SOQL Query', type: 'string', default: 'SELECT Id, Name, Email FROM Contact LIMIT 10', required: true }
            ],
            queryParameters: { q: '$param:q' }
          }
        ]
      }
    ]
  },

  {
    type: 'pipedrive',
    name: 'Pipedrive',
    description: 'Manage sales deals, activities, and contacts in Pipedrive',
    category: 'app',
    icon: 'target',
    color: '#027a48',
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
              { name: 'value', displayName: 'Value', type: 'string' },
              { name: 'currency', displayName: 'Currency', type: 'string', default: 'USD' }
            ]
          },
          {
            name: 'getAll',
            displayName: 'Get Deals',
            method: 'GET',
            path: '/deals',
            itemsPath: 'data'
          }
        ]
      },
      {
        name: 'person',
        displayName: 'Person (Contact)',
        operations: [
          {
            name: 'create',
            displayName: 'Create Person',
            method: 'POST',
            path: '/persons',
            properties: [
              { name: 'name', displayName: 'Full Name', type: 'string', required: true },
              { name: 'email', displayName: 'Email', type: 'string' }
            ]
          },
          {
            name: 'getAll',
            displayName: 'Get Persons',
            method: 'GET',
            path: '/persons',
            itemsPath: 'data'
          }
        ]
      }
    ]
  },

  {
    type: 'zoho-crm',
    name: 'Zoho CRM',
    description: 'Create and update leads, contacts, and deals in Zoho CRM',
    category: 'app',
    icon: 'layers',
    color: '#c8102e',
    baseURL: 'https://www.zohoapis.com/crm/v3',
    auth: {
      type: 'oauth2',
      credentialType: 'zoho_oauth2'
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
            path: '/Leads',
            properties: [
              { name: 'Last_Name', displayName: 'Last Name', type: 'string', required: true },
              { name: 'Company', displayName: 'Company', type: 'string', required: true },
              { name: 'Email', displayName: 'Email', type: 'string' }
            ]
          },
          {
            name: 'getAll',
            displayName: 'Get Leads',
            method: 'GET',
            path: '/Leads',
            itemsPath: 'data'
          }
        ]
      }
    ]
  },

  // ==========================================
  // 2. CUSTOMER SUPPORT & TICKETING
  // ==========================================
  {
    type: 'zendesk',
    name: 'Zendesk',
    description: 'Manage tickets, users, and satisfaction ratings in Zendesk Support',
    category: 'app',
    icon: 'life-buoy',
    color: '#03363d',
    baseURL: 'https://api.zendesk.com/api/v2',
    auth: {
      type: 'basic',
      credentialType: 'zendesk_api'
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
            path: '/tickets.json',
            properties: [
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'comment', displayName: 'Body / Comment', type: 'string', required: true },
              { name: 'priority', displayName: 'Priority', type: 'options', default: 'normal', options: [
                { name: 'Urgent', value: 'urgent' },
                { name: 'High', value: 'high' },
                { name: 'Normal', value: 'normal' },
                { name: 'Low', value: 'low' }
              ]}
            ],
            bodyParameters: {
              ticket: {
                subject: '$param:subject',
                comment: { body: '$param:comment' },
                priority: '$param:priority'
              }
            }
          },
          {
            name: 'get',
            displayName: 'Get Ticket',
            method: 'GET',
            path: '/tickets/{ticketId}.json',
            properties: [
              { name: 'ticketId', displayName: 'Ticket ID', type: 'string', required: true }
            ]
          },
          {
            name: 'getAll',
            displayName: 'Get Many Tickets',
            method: 'GET',
            path: '/tickets.json',
            itemsPath: 'tickets'
          }
        ]
      }
    ]
  },

  {
    type: 'freshdesk',
    name: 'Freshdesk',
    description: 'Create and update support tickets and customer contacts in Freshdesk',
    category: 'app',
    icon: 'help-circle',
    color: '#12344d',
    baseURL: 'https://api.freshdesk.com/v2',
    auth: {
      type: 'basic',
      credentialType: 'freshdesk_api'
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
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'description', displayName: 'Description', type: 'string', required: true },
              { name: 'email', displayName: 'Requester Email', type: 'string', required: true }
            ]
          },
          {
            name: 'getAll',
            displayName: 'Get Tickets',
            method: 'GET',
            path: '/tickets'
          }
        ]
      }
    ]
  },

  {
    type: 'intercom',
    name: 'Intercom',
    description: 'Send messages and manage user conversations in Intercom',
    category: 'app',
    icon: 'message-circle',
    color: '#1f8ded',
    baseURL: 'https://api.intercom.io',
    auth: {
      type: 'bearer',
      credentialType: 'intercom_token'
    },
    resources: [
      {
        name: 'contact',
        displayName: 'Contact / Lead',
        operations: [
          {
            name: 'create',
            displayName: 'Create Contact',
            method: 'POST',
            path: '/contacts',
            properties: [
              { name: 'email', displayName: 'Email', type: 'string', required: true },
              { name: 'name', displayName: 'Name', type: 'string' }
            ]
          },
          {
            name: 'getAll',
            displayName: 'List Contacts',
            method: 'GET',
            path: '/contacts',
            itemsPath: 'data'
          }
        ]
      }
    ]
  },

  // ==========================================
  // 3. PROJECT MANAGEMENT & ISSUE TRACKING
  // ==========================================
  {
    type: 'jira',
    name: 'Jira Software',
    description: 'Create, search, and update issues and sprints in Atlassian Jira',
    category: 'app',
    icon: 'check-square',
    color: '#0052cc',
    baseURL: 'https://api.atlassian.com/ex/jira',
    auth: {
      type: 'basic',
      credentialType: 'jira_api_token'
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
            path: '/rest/api/3/issue',
            properties: [
              { name: 'projectKey', displayName: 'Project Key', type: 'string', required: true },
              { name: 'summary', displayName: 'Summary', type: 'string', required: true },
              { name: 'issueType', displayName: 'Issue Type', type: 'string', default: 'Task' }
            ],
            bodyParameters: {
              fields: {
                project: { key: '$param:projectKey' },
                summary: '$param:summary',
                issuetype: { name: '$param:issueType' }
              }
            }
          },
          {
            name: 'get',
            displayName: 'Get Issue',
            method: 'GET',
            path: '/rest/api/3/issue/{issueKey}',
            properties: [
              { name: 'issueKey', displayName: 'Issue Key (e.g. PROJ-123)', type: 'string', required: true }
            ]
          },
          {
            name: 'search',
            displayName: 'Search Issues (JQL)',
            method: 'GET',
            path: '/rest/api/3/search',
            itemsPath: 'issues',
            properties: [
              { name: 'jql', displayName: 'JQL Query', type: 'string', default: 'order by created DESC' }
            ],
            queryParameters: { jql: '$param:jql' }
          }
        ]
      }
    ]
  },

  {
    type: 'asana',
    name: 'Asana',
    description: 'Manage tasks, projects, and workspaces in Asana',
    category: 'app',
    icon: 'trello',
    color: '#f06a6a',
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
              { name: 'workspace', displayName: 'Workspace GID', type: 'string', required: true },
              { name: 'name', displayName: 'Task Name', type: 'string', required: true },
              { name: 'notes', displayName: 'Description / Notes', type: 'string' }
            ],
            bodyParameters: {
              data: {
                workspace: '$param:workspace',
                name: '$param:name',
                notes: '$param:notes'
              }
            }
          },
          {
            name: 'get',
            displayName: 'Get Task',
            method: 'GET',
            path: '/tasks/{taskId}',
            properties: [
              { name: 'taskId', displayName: 'Task GID', type: 'string', required: true }
            ],
            itemsPath: 'data'
          }
        ]
      }
    ]
  },

  {
    type: 'trello',
    name: 'Trello',
    description: 'Create and update cards, lists, and boards on Trello',
    category: 'app',
    icon: 'trello',
    color: '#0079bf',
    baseURL: 'https://api.trello.com/1',
    auth: {
      type: 'apiKey',
      queryParamName: 'key',
      credentialType: 'trello_api_key'
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
              { name: 'name', displayName: 'Card Title', type: 'string', required: true },
              { name: 'desc', displayName: 'Description', type: 'string' }
            ]
          },
          {
            name: 'get',
            displayName: 'Get Card',
            method: 'GET',
            path: '/cards/{cardId}',
            properties: [
              { name: 'cardId', displayName: 'Card ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'clickup',
    name: 'ClickUp',
    description: 'Manage tasks, lists, and folders in ClickUp spaces',
    category: 'app',
    icon: 'check-circle',
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
              { name: 'name', displayName: 'Task Name', type: 'string', required: true },
              { name: 'description', displayName: 'Description', type: 'string' }
            ]
          },
          {
            name: 'get',
            displayName: 'Get Task',
            method: 'GET',
            path: '/task/{taskId}',
            properties: [
              { name: 'taskId', displayName: 'Task ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'linear',
    name: 'Linear',
    description: 'Streamlined issue tracking and project management for software teams',
    category: 'app',
    icon: 'compass',
    color: '#5e6ad2',
    baseURL: 'https://api.linear.app',
    auth: {
      type: 'bearer',
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
            path: '/graphql',
            properties: [
              { name: 'teamId', displayName: 'Team ID', type: 'string', required: true },
              { name: 'title', displayName: 'Title', type: 'string', required: true },
              { name: 'description', displayName: 'Description', type: 'string' }
            ],
            bodyParameters: {
              query: 'mutation CreateIssue($teamId: String!, $title: String!, $description: String) { issueCreate(input: { teamId: $teamId, title: $title, description: $description }) { success issue { id identifier title } } }',
              variables: {
                teamId: '$param:teamId',
                title: '$param:title',
                description: '$param:description'
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'monday',
    name: 'Monday.com',
    description: 'Execute queries and manage boards and items in Work OS Monday.com',
    category: 'app',
    icon: 'calendar',
    color: '#ff3d57',
    baseURL: 'https://api.monday.com/v2',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'monday_api_key'
    },
    resources: [
      {
        name: 'item',
        displayName: 'Item',
        operations: [
          {
            name: 'create',
            displayName: 'Create Item',
            method: 'POST',
            path: '/',
            properties: [
              { name: 'boardId', displayName: 'Board ID', type: 'string', required: true },
              { name: 'itemName', displayName: 'Item Name', type: 'string', required: true }
            ],
            bodyParameters: {
              query: 'mutation ($boardId: ID!, $itemName: String!) { create_item (board_id: $boardId, item_name: $itemName) { id } }',
              variables: {
                boardId: '$param:boardId',
                itemName: '$param:itemName'
              }
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // 4. MARKETING & EMAIL AUTOMATION
  // ==========================================
  {
    type: 'mailchimp',
    name: 'Mailchimp',
    description: 'Add and update subscribers and manage campaigns in Mailchimp',
    category: 'app',
    icon: 'mail',
    color: '#ffe01b',
    baseURL: 'https://us1.api.mailchimp.com/3.0',
    auth: {
      type: 'basic',
      credentialType: 'mailchimp_api_key'
    },
    resources: [
      {
        name: 'member',
        displayName: 'List Member',
        operations: [
          {
            name: 'add',
            displayName: 'Add / Subscribe Member',
            method: 'POST',
            path: '/lists/{listId}/members',
            properties: [
              { name: 'listId', displayName: 'Audience / List ID', type: 'string', required: true },
              { name: 'email_address', displayName: 'Email Address', type: 'string', required: true },
              { name: 'status', displayName: 'Status', type: 'options', default: 'subscribed', options: [
                { name: 'Subscribed', value: 'subscribed' },
                { name: 'Pending', value: 'pending' },
                { name: 'Unsubscribed', value: 'unsubscribed' }
              ]}
            ]
          },
          {
            name: 'getAll',
            displayName: 'Get Members',
            method: 'GET',
            path: '/lists/{listId}/members',
            properties: [
              { name: 'listId', displayName: 'Audience / List ID', type: 'string', required: true }
            ],
            itemsPath: 'members'
          }
        ]
      }
    ]
  },

  {
    type: 'sendgrid',
    name: 'SendGrid',
    description: 'Send transactional emails and manage contacts with Twilio SendGrid',
    category: 'app',
    icon: 'send',
    color: '#1a82e2',
    baseURL: 'https://api.sendgrid.com/v3',
    auth: {
      type: 'bearer',
      credentialType: 'sendgrid_api_key'
    },
    resources: [
      {
        name: 'mail',
        displayName: 'Mail Send',
        operations: [
          {
            name: 'send',
            displayName: 'Send Email',
            method: 'POST',
            path: '/mail/send',
            properties: [
              { name: 'to', displayName: 'To Email', type: 'string', required: true },
              { name: 'from', displayName: 'From Email', type: 'string', required: true },
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'content', displayName: 'Body (HTML or Text)', type: 'string', required: true }
            ],
            bodyParameters: {
              personalizations: [{ to: [{ email: '$param:to' }] }],
              from: { email: '$param:from' },
              subject: '$param:subject',
              content: [{ type: 'text/html', value: '$param:content' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'brevo',
    name: 'Brevo (Sendinblue)',
    description: 'Send transactional emails and SMS campaigns with Brevo',
    category: 'app',
    icon: 'mail',
    color: '#0092ff',
    baseURL: 'https://api.brevo.com/v3',
    auth: {
      type: 'header',
      headerName: 'api-key',
      credentialType: 'brevo_api_key'
    },
    resources: [
      {
        name: 'smtp',
        displayName: 'Transactional Email',
        operations: [
          {
            name: 'send',
            displayName: 'Send Email',
            method: 'POST',
            path: '/smtp/email',
            properties: [
              { name: 'toEmail', displayName: 'Recipient Email', type: 'string', required: true },
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'htmlContent', displayName: 'HTML Content', type: 'string', required: true }
            ],
            bodyParameters: {
              to: [{ email: '$param:toEmail' }],
              subject: '$param:subject',
              htmlContent: '$param:htmlContent'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'postmark',
    name: 'Postmark',
    description: 'Fast, reliable transactional email delivery for web applications',
    category: 'app',
    icon: 'mail',
    color: '#ffc700',
    baseURL: 'https://api.postmarkapp.com',
    auth: {
      type: 'header',
      headerName: 'X-Postmark-Server-Token',
      credentialType: 'postmark_server_token'
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
              { name: 'From', displayName: 'From Email', type: 'string', required: true },
              { name: 'To', displayName: 'To Email', type: 'string', required: true },
              { name: 'Subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'HtmlBody', displayName: 'HTML Body', type: 'string' }
            ]
          }
        ]
      }
    ]
  },

  // ==========================================
  // 5. E-COMMERCE & BILLING
  // ==========================================
  {
    type: 'shopify',
    name: 'Shopify',
    description: 'Access and automate orders, products, and customers in Shopify stores',
    category: 'app',
    icon: 'shopping-bag',
    color: '#95bf47',
    baseURL: 'https://myshopify.com/admin/api/2024-01',
    auth: {
      type: 'header',
      headerName: 'X-Shopify-Access-Token',
      credentialType: 'shopify_access_token'
    },
    resources: [
      {
        name: 'order',
        displayName: 'Order',
        operations: [
          {
            name: 'getAll',
            displayName: 'Get Orders',
            method: 'GET',
            path: '/orders.json',
            itemsPath: 'orders',
            properties: [
              { name: 'status', displayName: 'Status', type: 'string', default: 'any' }
            ],
            queryParameters: { status: '$param:status' }
          },
          {
            name: 'get',
            displayName: 'Get Order',
            method: 'GET',
            path: '/orders/{orderId}.json',
            properties: [
              { name: 'orderId', displayName: 'Order ID', type: 'string', required: true }
            ]
          }
        ]
      },
      {
        name: 'product',
        displayName: 'Product',
        operations: [
          {
            name: 'getAll',
            displayName: 'Get Products',
            method: 'GET',
            path: '/products.json',
            itemsPath: 'products'
          }
        ]
      }
    ]
  },

  {
    type: 'woocommerce',
    name: 'WooCommerce',
    description: 'Manage products, orders, and coupons in WooCommerce WordPress stores',
    category: 'app',
    icon: 'shopping-cart',
    color: '#7f54b3',
    baseURL: 'https://example.com/wp-json/wc/v3',
    auth: {
      type: 'basic',
      credentialType: 'woocommerce_api'
    },
    resources: [
      {
        name: 'order',
        displayName: 'Order',
        operations: [
          {
            name: 'getAll',
            displayName: 'Get Orders',
            method: 'GET',
            path: '/orders'
          }
        ]
      }
    ]
  },

  // ==========================================
  // 6. COMMUNICATION & MESSAGING
  // ==========================================
  {
    type: 'twilio',
    name: 'Twilio',
    description: 'Send SMS messages, make voice calls, and lookup phone numbers',
    category: 'app',
    icon: 'phone',
    color: '#f22f46',
    baseURL: 'https://api.twilio.com/2010-04-01',
    auth: {
      type: 'basic',
      credentialType: 'twilio_auth'
    },
    resources: [
      {
        name: 'sms',
        displayName: 'SMS Message',
        operations: [
          {
            name: 'send',
            displayName: 'Send SMS',
            method: 'POST',
            path: '/Accounts/{accountSid}/Messages.json',
            properties: [
              { name: 'accountSid', displayName: 'Account SID', type: 'string', required: true },
              { name: 'To', displayName: 'To Phone (+E.164)', type: 'string', required: true },
              { name: 'From', displayName: 'From Twilio Number', type: 'string', required: true },
              { name: 'Body', displayName: 'Message Body', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'ms-teams',
    name: 'Microsoft Teams',
    description: 'Send chat notifications and messages to Microsoft Teams channels',
    category: 'app',
    icon: 'message-square',
    color: '#464eb8',
    baseURL: 'https://graph.microsoft.com/v1.0',
    auth: {
      type: 'oauth2',
      credentialType: 'microsoft_oauth2'
    },
    resources: [
      {
        name: 'message',
        displayName: 'Channel Message',
        operations: [
          {
            name: 'send',
            displayName: 'Send Message',
            method: 'POST',
            path: '/teams/{teamId}/channels/{channelId}/messages',
            properties: [
              { name: 'teamId', displayName: 'Team ID', type: 'string', required: true },
              { name: 'channelId', displayName: 'Channel ID', type: 'string', required: true },
              { name: 'content', displayName: 'Message Content', type: 'string', required: true }
            ],
            bodyParameters: {
              body: { content: '$param:content' }
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // 7. DATABASES & CLOUD DATA
  // ==========================================
  {
    type: 'supabase',
    name: 'Supabase',
    description: 'Query and mutate database tables and manage auth via PostgREST',
    category: 'app',
    icon: 'database',
    color: '#3ecf8e',
    baseURL: 'https://xyz.supabase.co/rest/v1',
    auth: {
      type: 'header',
      headerName: 'apikey',
      credentialType: 'supabase_api_key'
    },
    resources: [
      {
        name: 'table',
        displayName: 'Database Table',
        operations: [
          {
            name: 'select',
            displayName: 'Select Rows',
            method: 'GET',
            path: '/{tableName}',
            properties: [
              { name: 'tableName', displayName: 'Table Name', type: 'string', required: true },
              { name: 'select', displayName: 'Columns', type: 'string', default: '*' }
            ],
            queryParameters: { select: '$param:select' }
          },
          {
            name: 'insert',
            displayName: 'Insert Row',
            method: 'POST',
            path: '/{tableName}',
            properties: [
              { name: 'tableName', displayName: 'Table Name', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  // ==========================================
  // 8. DEVOPS & INFRASTRUCTURE
  // ==========================================
  {
    type: 'cloudflare',
    name: 'Cloudflare',
    description: 'Manage DNS records, cache purges, and Workers on Cloudflare',
    category: 'app',
    icon: 'cloud',
    color: '#f38020',
    baseURL: 'https://api.cloudflare.com/client/v4',
    auth: {
      type: 'bearer',
      credentialType: 'cloudflare_api_token'
    },
    resources: [
      {
        name: 'dns',
        displayName: 'DNS Record',
        operations: [
          {
            name: 'getAll',
            displayName: 'List DNS Records',
            method: 'GET',
            path: '/zones/{zoneId}/dns_records',
            itemsPath: 'result',
            properties: [
              { name: 'zoneId', displayName: 'Zone ID', type: 'string', required: true }
            ]
          },
          {
            name: 'create',
            displayName: 'Create DNS Record',
            method: 'POST',
            path: '/zones/{zoneId}/dns_records',
            properties: [
              { name: 'zoneId', displayName: 'Zone ID', type: 'string', required: true },
              { name: 'type', displayName: 'Type (A, CNAME, TXT)', type: 'string', default: 'A' },
              { name: 'name', displayName: 'Record Name', type: 'string', required: true },
              { name: 'content', displayName: 'IPv4 Address / Content', type: 'string', required: true },
              { name: 'ttl', displayName: 'TTL', type: 'number', default: 3600 }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'digitalocean',
    name: 'DigitalOcean',
    description: 'Manage Droplets, domains, firewalls, and Kubernetes clusters',
    category: 'app',
    icon: 'server',
    color: '#0080ff',
    baseURL: 'https://api.digitalocean.com/v2',
    auth: {
      type: 'bearer',
      credentialType: 'digitalocean_token'
    },
    resources: [
      {
        name: 'droplet',
        displayName: 'Droplet',
        operations: [
          {
            name: 'getAll',
            displayName: 'List Droplets',
            method: 'GET',
            path: '/droplets',
            itemsPath: 'droplets'
          }
        ]
      }
    ]
  },

  // ==========================================
  // 9. OBSERVABILITY & INCIDENT MANAGEMENT
  // ==========================================
  {
    type: 'pagerduty',
    name: 'PagerDuty',
    description: 'Trigger, acknowledge, and resolve incidents in PagerDuty',
    category: 'app',
    icon: 'alert-triangle',
    color: '#00af43',
    baseURL: 'https://api.pagerduty.com',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'Token token=',
      credentialType: 'pagerduty_api_key'
    },
    resources: [
      {
        name: 'incident',
        displayName: 'Incident',
        operations: [
          {
            name: 'getAll',
            displayName: 'Get Incidents',
            method: 'GET',
            path: '/incidents',
            itemsPath: 'incidents'
          }
        ]
      }
    ]
  },

  {
    type: 'sentry',
    name: 'Sentry',
    description: 'Track application errors, crashes, and release performance',
    category: 'app',
    icon: 'alert-octagon',
    color: '#362d59',
    baseURL: 'https://sentry.io/api/0',
    auth: {
      type: 'bearer',
      credentialType: 'sentry_auth_token'
    },
    resources: [
      {
        name: 'issue',
        displayName: 'Issue',
        operations: [
          {
            name: 'getAll',
            displayName: 'List Project Issues',
            method: 'GET',
            path: '/projects/{organizationSlug}/{projectSlug}/issues/',
            properties: [
              { name: 'organizationSlug', displayName: 'Organization Slug', type: 'string', required: true },
              { name: 'projectSlug', displayName: 'Project Slug', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  // ==========================================
  // 10. AI & VECTOR EMBEDDINGS
  // ==========================================
  {
    type: 'anthropic',
    name: 'Anthropic Claude',
    description: 'State-of-the-art AI reasoning with Claude 3.5 Sonnet and Haiku',
    category: 'ai',
    icon: 'cpu',
    color: '#d97706',
    baseURL: 'https://api.anthropic.com/v1',
    auth: {
      type: 'header',
      headerName: 'x-api-key',
      credentialType: 'anthropic_api_key'
    },
    resources: [
      {
        name: 'messages',
        displayName: 'Messages',
        operations: [
          {
            name: 'create',
            displayName: 'Create Message',
            method: 'POST',
            path: '/messages',
            headers: { 'anthropic-version': '2023-06-01' },
            properties: [
              { name: 'model', displayName: 'Model', type: 'string', default: 'claude-3-5-sonnet-20241022' },
              { name: 'prompt', displayName: 'Prompt', type: 'string', required: true },
              { name: 'max_tokens', displayName: 'Max Tokens', type: 'number', default: 1024 }
            ],
            bodyParameters: {
              model: '$param:model',
              max_tokens: '$param:max_tokens',
              messages: [{ role: 'user', content: '$param:prompt' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'groq',
    name: 'Groq',
    description: 'Ultra-fast LPU inference for Llama 3, Mixtral, and Gemma models',
    category: 'ai',
    icon: 'zap',
    color: '#f55036',
    baseURL: 'https://api.groq.com/openai/v1',
    auth: {
      type: 'bearer',
      credentialType: 'groq_api_key'
    },
    resources: [
      {
        name: 'chat',
        displayName: 'Chat Completion',
        operations: [
          {
            name: 'complete',
            displayName: 'Generate Chat Completion',
            method: 'POST',
            path: '/chat/completions',
            properties: [
              { name: 'model', displayName: 'Model', type: 'string', default: 'llama-3.3-70b-versatile' },
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
    type: 'perplexity',
    name: 'Perplexity AI',
    description: 'Live web-connected AI search completions with citations',
    category: 'ai',
    icon: 'search',
    color: '#20808d',
    baseURL: 'https://api.perplexity.ai',
    auth: {
      type: 'bearer',
      credentialType: 'perplexity_api_key'
    },
    resources: [
      {
        name: 'chat',
        displayName: 'Search & Chat',
        operations: [
          {
            name: 'search',
            displayName: 'Query Perplexity Sonar',
            method: 'POST',
            path: '/chat/completions',
            properties: [
              { name: 'model', displayName: 'Model', type: 'string', default: 'sonar' },
              { name: 'prompt', displayName: 'Query / Prompt', type: 'string', required: true }
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
    type: 'pinecone',
    name: 'Pinecone',
    description: 'Managed vector database for semantic search and agentic AI RAG',
    category: 'ai',
    icon: 'database',
    color: '#000000',
    baseURL: 'https://api.pinecone.io',
    auth: {
      type: 'header',
      headerName: 'Api-Key',
      credentialType: 'pinecone_api_key'
    },
    resources: [
      {
        name: 'index',
        displayName: 'Index',
        operations: [
          {
            name: 'list',
            displayName: 'List Indexes',
            method: 'GET',
            path: '/indexes',
            itemsPath: 'indexes'
          }
        ]
      }
    ]
  },

  {
    type: 'qdrant',
    name: 'Qdrant',
    description: 'Vector similarity search engine with payload-based filtering',
    category: 'ai',
    icon: 'database',
    color: '#dc2626',
    baseURL: 'https://xyz.qdrant.tech',
    auth: {
      type: 'header',
      headerName: 'api-key',
      credentialType: 'qdrant_api_key'
    },
    resources: [
      {
        name: 'collections',
        displayName: 'Collections',
        operations: [
          {
            name: 'list',
            displayName: 'List Collections',
            method: 'GET',
            path: '/collections',
            itemsPath: 'result.collections'
          }
        ]
      }
    ]
  }
];
