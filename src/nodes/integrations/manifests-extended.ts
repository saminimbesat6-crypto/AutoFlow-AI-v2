import { DeclarativeManifest } from '../declarative-node';

export const EXTENDED_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // DEVOPS, CLOUD & CONTAINERS
  // ==========================================
  {
    type: 'gitlab',
    name: 'GitLab',
    description: 'Manage issues, merge requests, pipelines, and projects on GitLab',
    category: 'app',
    icon: 'git-pull-request',
    color: '#fc6d26',
    baseURL: 'https://gitlab.com/api/v4',
    auth: {
      type: 'header',
      headerName: 'PRIVATE-TOKEN',
      credentialType: 'gitlab_token'
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
            path: '/projects/{projectId}/issues',
            properties: [
              { name: 'projectId', displayName: 'Project ID', type: 'string', required: true },
              { name: 'title', displayName: 'Issue Title', type: 'string', required: true },
              { name: 'description', displayName: 'Description', type: 'string' }
            ]
          },
          {
            name: 'getAll',
            displayName: 'Get Issues',
            method: 'GET',
            path: '/projects/{projectId}/issues',
            properties: [
              { name: 'projectId', displayName: 'Project ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'docker',
    name: 'Docker',
    description: 'Inspect and manage containers, images, and services via Docker daemon API',
    category: 'app',
    icon: 'box',
    color: '#2496ed',
    baseURL: 'http://localhost:2375/v1.41',
    auth: {
      type: 'apiKey',
      credentialType: 'docker_auth'
    },
    resources: [
      {
        name: 'container',
        displayName: 'Container',
        operations: [
          {
            name: 'list',
            displayName: 'List Containers',
            method: 'GET',
            path: '/containers/json',
            properties: [
              { name: 'all', displayName: 'Show All (incl. stopped)', type: 'boolean', default: true }
            ],
            queryParameters: { all: '$param:all' }
          }
        ]
      }
    ]
  },

  {
    type: 'kubernetes',
    name: 'Kubernetes',
    description: 'Query pods, deployments, and cluster status via Kubernetes API',
    category: 'app',
    icon: 'anchor',
    color: '#326ce5',
    baseURL: 'https://kubernetes.default.svc',
    auth: {
      type: 'bearer',
      credentialType: 'k8s_token'
    },
    resources: [
      {
        name: 'pod',
        displayName: 'Pod',
        operations: [
          {
            name: 'list',
            displayName: 'List Pods',
            method: 'GET',
            path: '/api/v1/namespaces/{namespace}/pods',
            itemsPath: 'items',
            properties: [
              { name: 'namespace', displayName: 'Namespace', type: 'string', default: 'default' }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'vercel',
    name: 'Vercel',
    description: 'Trigger deployments and manage web projects and domains on Vercel',
    category: 'app',
    icon: 'triangle',
    color: '#000000',
    baseURL: 'https://api.vercel.com',
    auth: {
      type: 'bearer',
      credentialType: 'vercel_token'
    },
    resources: [
      {
        name: 'deployment',
        displayName: 'Deployment',
        operations: [
          {
            name: 'list',
            displayName: 'List Deployments',
            method: 'GET',
            path: '/v6/deployments',
            itemsPath: 'deployments'
          }
        ]
      }
    ]
  },

  {
    type: 'netlify',
    name: 'Netlify',
    description: 'Trigger deploys and manage sites and form submissions on Netlify',
    category: 'app',
    icon: 'globe',
    color: '#00c7b7',
    baseURL: 'https://api.netlify.com/api/v1',
    auth: {
      type: 'bearer',
      credentialType: 'netlify_token'
    },
    resources: [
      {
        name: 'site',
        displayName: 'Site',
        operations: [
          {
            name: 'list',
            displayName: 'List Sites',
            method: 'GET',
            path: '/sites'
          }
        ]
      }
    ]
  },

  {
    type: 'aws-lambda',
    name: 'AWS Lambda',
    description: 'Invoke serverless functions and process executions with AWS Lambda',
    category: 'app',
    icon: 'zap',
    color: '#ff9900',
    baseURL: 'https://lambda.us-east-1.amazonaws.com/2015-03-31',
    auth: {
      type: 'bearer',
      credentialType: 'aws_lambda_auth'
    },
    resources: [
      {
        name: 'function',
        displayName: 'Function',
        operations: [
          {
            name: 'invoke',
            displayName: 'Invoke Function',
            method: 'POST',
            path: '/functions/{functionName}/invocations',
            properties: [
              { name: 'functionName', displayName: 'Function Name', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'aws-sqs',
    name: 'AWS SQS',
    description: 'Send and receive messages in Amazon Simple Queue Service',
    category: 'app',
    icon: 'layers',
    color: '#ff9900',
    baseURL: 'https://sqs.us-east-1.amazonaws.com',
    auth: {
      type: 'bearer',
      credentialType: 'aws_sqs_auth'
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
            path: '/{queueName}',
            properties: [
              { name: 'queueName', displayName: 'Queue Name', type: 'string', required: true },
              { name: 'messageBody', displayName: 'Message Body', type: 'string', required: true }
            ],
            queryParameters: {
              Action: 'SendMessage',
              MessageBody: '$param:messageBody'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'aws-sns',
    name: 'AWS SNS',
    description: 'Publish notifications to Amazon Simple Notification Service topics',
    category: 'app',
    icon: 'bell',
    color: '#ff9900',
    baseURL: 'https://sns.us-east-1.amazonaws.com',
    auth: {
      type: 'bearer',
      credentialType: 'aws_sns_auth'
    },
    resources: [
      {
        name: 'topic',
        displayName: 'Topic',
        operations: [
          {
            name: 'publish',
            displayName: 'Publish Notification',
            method: 'POST',
            path: '/',
            properties: [
              { name: 'topicArn', displayName: 'Topic ARN', type: 'string', required: true },
              { name: 'message', displayName: 'Message Text', type: 'string', required: true }
            ],
            queryParameters: {
              Action: 'Publish',
              TopicArn: '$param:topicArn',
              Message: '$param:message'
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // CLOUD STORAGE & WORKSPACES
  // ==========================================
  {
    type: 'google-drive',
    name: 'Google Drive',
    description: 'Upload, search, and manage files and folders in Google Drive',
    category: 'app',
    icon: 'folder',
    color: '#4285f4',
    baseURL: 'https://www.googleapis.com/drive/v3',
    auth: {
      type: 'oauth2',
      credentialType: 'google_oauth2'
    },
    resources: [
      {
        name: 'file',
        displayName: 'File',
        operations: [
          {
            name: 'list',
            displayName: 'List / Search Files',
            method: 'GET',
            path: '/files',
            itemsPath: 'files',
            properties: [
              { name: 'pageSize', displayName: 'Max Files', type: 'number', default: 20 },
              { name: 'q', displayName: 'Query Expression', type: 'string' }
            ],
            queryParameters: { pageSize: '$param:pageSize', q: '$param:q' }
          },
          {
            name: 'get',
            displayName: 'Get File Metadata',
            method: 'GET',
            path: '/files/{fileId}',
            properties: [
              { name: 'fileId', displayName: 'File ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'dropbox',
    name: 'Dropbox',
    description: 'Upload files and automate cloud file sharing with Dropbox',
    category: 'app',
    icon: 'box',
    color: '#0061ff',
    baseURL: 'https://api.dropboxapi.com/2',
    auth: {
      type: 'bearer',
      credentialType: 'dropbox_token'
    },
    resources: [
      {
        name: 'folder',
        displayName: 'Folder',
        operations: [
          {
            name: 'list',
            displayName: 'List Folder Contents',
            method: 'POST',
            path: '/files/list_folder',
            itemsPath: 'entries',
            properties: [
              { name: 'path', displayName: 'Folder Path', type: 'string', default: '' }
            ],
            bodyParameters: { path: '$param:path' }
          }
        ]
      }
    ]
  },

  {
    type: 'box',
    name: 'Box',
    description: 'Enterprise cloud content management and file collaboration',
    category: 'app',
    icon: 'archive',
    color: '#0061d5',
    baseURL: 'https://api.box.com/2.0',
    auth: {
      type: 'bearer',
      credentialType: 'box_token'
    },
    resources: [
      {
        name: 'file',
        displayName: 'File',
        operations: [
          {
            name: 'get',
            displayName: 'Get File Info',
            method: 'GET',
            path: '/files/{fileId}',
            properties: [
              { name: 'fileId', displayName: 'File ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'coda',
    name: 'Coda',
    description: 'Automate docs, tables, rows, and buttons in Coda',
    category: 'app',
    icon: 'file-text',
    color: '#f36e53',
    baseURL: 'https://coda.io/apis/v1',
    auth: {
      type: 'bearer',
      credentialType: 'coda_api_token'
    },
    resources: [
      {
        name: 'doc',
        displayName: 'Document',
        operations: [
          {
            name: 'list',
            displayName: 'List Documents',
            method: 'GET',
            path: '/docs',
            itemsPath: 'items'
          }
        ]
      }
    ]
  },

  // ==========================================
  // FINANCE & ACCOUNTING
  // ==========================================
  {
    type: 'quickbooks',
    name: 'QuickBooks Online',
    description: 'Manage customers, invoices, and accounting records in Intuit QuickBooks',
    category: 'app',
    icon: 'dollar-sign',
    color: '#2ca01c',
    baseURL: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
    auth: {
      type: 'oauth2',
      credentialType: 'quickbooks_oauth2'
    },
    resources: [
      {
        name: 'customer',
        displayName: 'Customer',
        operations: [
          {
            name: 'create',
            displayName: 'Create Customer',
            method: 'POST',
            path: '/customer',
            properties: [
              { name: 'DisplayName', displayName: 'Display Name', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'xero',
    name: 'Xero',
    description: 'Create and retrieve invoices, contacts, and bank transactions in Xero',
    category: 'app',
    icon: 'file-text',
    color: '#13b5ea',
    baseURL: 'https://api.xero.com/api.xro/2.0',
    auth: {
      type: 'oauth2',
      credentialType: 'xero_oauth2'
    },
    resources: [
      {
        name: 'invoice',
        displayName: 'Invoice',
        operations: [
          {
            name: 'getAll',
            displayName: 'Get Invoices',
            method: 'GET',
            path: '/Invoices',
            itemsPath: 'Invoices'
          }
        ]
      }
    ]
  },

  {
    type: 'bamboohr',
    name: 'BambooHR',
    description: 'Retrieve employee directory records and HR information in BambooHR',
    category: 'app',
    icon: 'users',
    color: '#739600',
    baseURL: 'https://api.bamboohr.com/api/gateway.php/{companyDomain}/v1',
    auth: {
      type: 'basic',
      credentialType: 'bamboohr_api'
    },
    resources: [
      {
        name: 'employee',
        displayName: 'Employee',
        operations: [
          {
            name: 'directory',
            displayName: 'Get Directory',
            method: 'GET',
            path: '/employees/directory',
            itemsPath: 'employees'
          }
        ]
      }
    ]
  },

  // ==========================================
  // FORMS & SURVEYS
  // ==========================================
  {
    type: 'typeform',
    name: 'Typeform',
    description: 'Retrieve responses and form submissions from Typeform',
    category: 'app',
    icon: 'check-circle',
    color: '#262627',
    baseURL: 'https://api.typeform.com',
    auth: {
      type: 'bearer',
      credentialType: 'typeform_token'
    },
    resources: [
      {
        name: 'response',
        displayName: 'Form Response',
        operations: [
          {
            name: 'getAll',
            displayName: 'Get Responses',
            method: 'GET',
            path: '/forms/{formId}/responses',
            itemsPath: 'items',
            properties: [
              { name: 'formId', displayName: 'Form ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'jotform',
    name: 'Jotform',
    description: 'Access forms and submissions collected via Jotform',
    category: 'app',
    icon: 'edit-3',
    color: '#ff6100',
    baseURL: 'https://api.jotform.com',
    auth: {
      type: 'apiKey',
      queryParamName: 'apiKey',
      credentialType: 'jotform_api_key'
    },
    resources: [
      {
        name: 'submission',
        displayName: 'Submission',
        operations: [
          {
            name: 'getAll',
            displayName: 'Get Submissions',
            method: 'GET',
            path: '/form/{formId}/submissions',
            itemsPath: 'content',
            properties: [
              { name: 'formId', displayName: 'Form ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  // ==========================================
  // SOCIAL MEDIA & CONTENT PUBLISHING
  // ==========================================
  {
    type: 'twitter',
    name: 'Twitter / X',
    description: 'Post tweets, search hashtags, and fetch user data via Twitter API v2',
    category: 'app',
    icon: 'twitter',
    color: '#1da1f2',
    baseURL: 'https://api.twitter.com/2',
    auth: {
      type: 'oauth2',
      credentialType: 'twitter_oauth2'
    },
    resources: [
      {
        name: 'tweet',
        displayName: 'Tweet / Post',
        operations: [
          {
            name: 'create',
            displayName: 'Create Tweet',
            method: 'POST',
            path: '/tweets',
            properties: [
              { name: 'text', displayName: 'Tweet Text', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'linkedin',
    name: 'LinkedIn',
    description: 'Share updates, articles, and posts to LinkedIn profiles and pages',
    category: 'app',
    icon: 'linkedin',
    color: '#0a66c2',
    baseURL: 'https://api.linkedin.com/v2',
    auth: {
      type: 'oauth2',
      credentialType: 'linkedin_oauth2'
    },
    resources: [
      {
        name: 'post',
        displayName: 'Share / Post',
        operations: [
          {
            name: 'create',
            displayName: 'Share Text Update',
            method: 'POST',
            path: '/ugcPosts',
            properties: [
              { name: 'authorUrn', displayName: 'Author URN (e.g. urn:li:person:xyz)', type: 'string', required: true },
              { name: 'commentary', displayName: 'Post Commentary', type: 'string', required: true }
            ],
            bodyParameters: {
              author: '$param:authorUrn',
              lifecycleState: 'PUBLISHED',
              specificContent: {
                'com.linkedin.ugc.ShareContent': {
                  shareCommentary: { text: '$param:commentary' },
                  shareMediaCategory: 'NONE'
                }
              },
              visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'youtube',
    name: 'YouTube',
    description: 'Search videos, retrieve channel statistics and manage playlists',
    category: 'app',
    icon: 'video',
    color: '#ff0000',
    baseURL: 'https://www.googleapis.com/youtube/v3',
    auth: {
      type: 'apiKey',
      queryParamName: 'key',
      credentialType: 'youtube_api_key'
    },
    resources: [
      {
        name: 'search',
        displayName: 'Search',
        operations: [
          {
            name: 'query',
            displayName: 'Search Videos',
            method: 'GET',
            path: '/search',
            itemsPath: 'items',
            properties: [
              { name: 'q', displayName: 'Search Query', type: 'string', required: true },
              { name: 'part', displayName: 'Part', type: 'string', default: 'snippet' }
            ],
            queryParameters: { q: '$param:q', part: '$param:part' }
          }
        ]
      }
    ]
  },

  {
    type: 'reddit',
    name: 'Reddit',
    description: 'Submit posts, fetch subreddits, and automate Reddit community workflows',
    category: 'app',
    icon: 'message-circle',
    color: '#ff4500',
    baseURL: 'https://oauth.reddit.com',
    auth: {
      type: 'oauth2',
      credentialType: 'reddit_oauth2'
    },
    resources: [
      {
        name: 'post',
        displayName: 'Submission',
        operations: [
          {
            name: 'submit',
            displayName: 'Submit Link or Text',
            method: 'POST',
            path: '/api/submit',
            properties: [
              { name: 'sr', displayName: 'Subreddit Name', type: 'string', required: true },
              { name: 'title', displayName: 'Post Title', type: 'string', required: true },
              { name: 'text', displayName: 'Selftext / Body', type: 'string' },
              { name: 'kind', displayName: 'Kind (self, link)', type: 'string', default: 'self' }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'wordpress',
    name: 'WordPress',
    description: 'Publish and update blog posts, pages, and categories in WordPress',
    category: 'app',
    icon: 'book-open',
    color: '#21759b',
    baseURL: 'https://example.com/wp-json/wp/v2',
    auth: {
      type: 'basic',
      credentialType: 'wordpress_app_password'
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
            path: '/posts',
            properties: [
              { name: 'title', displayName: 'Title', type: 'string', required: true },
              { name: 'content', displayName: 'Content (HTML)', type: 'string', required: true },
              { name: 'status', displayName: 'Status (publish, draft)', type: 'string', default: 'publish' }
            ]
          },
          {
            name: 'getAll',
            displayName: 'Get Posts',
            method: 'GET',
            path: '/posts'
          }
        ]
      }
    ]
  },

  // ==========================================
  // ANALYTICS & MONITORING
  // ==========================================
  {
    type: 'mixpanel',
    name: 'Mixpanel',
    description: 'Track user product events, analyze funnels, and update user profiles',
    category: 'app',
    icon: 'bar-chart-2',
    color: '#7856ff',
    baseURL: 'https://api.mixpanel.com',
    auth: {
      type: 'basic',
      credentialType: 'mixpanel_auth'
    },
    resources: [
      {
        name: 'track',
        displayName: 'Event Tracking',
        operations: [
          {
            name: 'event',
            displayName: 'Track Event',
            method: 'POST',
            path: '/track',
            properties: [
              { name: 'event', displayName: 'Event Name', type: 'string', required: true },
              { name: 'distinct_id', displayName: 'User Distinct ID', type: 'string', required: true }
            ],
            bodyParameters: {
              event: '$param:event',
              properties: {
                distinct_id: '$param:distinct_id',
                time: '{{ Math.floor(Date.now() / 1000) }}'
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'segment',
    name: 'Segment',
    description: 'Customer data platform: track user events and identify profiles',
    category: 'app',
    icon: 'activity',
    color: '#52bd95',
    baseURL: 'https://api.segment.io/v1',
    auth: {
      type: 'basic',
      credentialType: 'segment_write_key'
    },
    resources: [
      {
        name: 'track',
        displayName: 'Track Event',
        operations: [
          {
            name: 'event',
            displayName: 'Record Event',
            method: 'POST',
            path: '/track',
            properties: [
              { name: 'userId', displayName: 'User ID', type: 'string', required: true },
              { name: 'event', displayName: 'Event Name', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'datadog',
    name: 'Datadog',
    description: 'Send custom metrics, events, and log records to Datadog Observability',
    category: 'app',
    icon: 'shield',
    color: '#632ca6',
    baseURL: 'https://api.datadoghq.com/api/v1',
    auth: {
      type: 'header',
      headerName: 'DD-API-KEY',
      credentialType: 'datadog_api_key'
    },
    resources: [
      {
        name: 'event',
        displayName: 'Event',
        operations: [
          {
            name: 'post',
            displayName: 'Post Event',
            method: 'POST',
            path: '/events',
            properties: [
              { name: 'title', displayName: 'Event Title', type: 'string', required: true },
              { name: 'text', displayName: 'Event Description', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'posthog',
    name: 'PostHog',
    description: 'Capture events, manage feature flags, and update profiles in PostHog',
    category: 'app',
    icon: 'pie-chart',
    color: '#f97316',
    baseURL: 'https://app.posthog.com',
    auth: {
      type: 'bearer',
      credentialType: 'posthog_api_key'
    },
    resources: [
      {
        name: 'capture',
        displayName: 'Event Capture',
        operations: [
          {
            name: 'event',
            displayName: 'Capture Event',
            method: 'POST',
            path: '/capture/',
            properties: [
              { name: 'distinct_id', displayName: 'Distinct ID', type: 'string', required: true },
              { name: 'event', displayName: 'Event Name', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  // ==========================================
  // MORE AI & LLM PROVIDERS
  // ==========================================
  {
    type: 'mistral',
    name: 'Mistral AI',
    description: 'High-performance European open and commercial LLM reasoning with Mistral',
    category: 'ai',
    icon: 'cpu',
    color: '#ff7000',
    baseURL: 'https://api.mistral.ai/v1',
    auth: {
      type: 'bearer',
      credentialType: 'mistral_api_key'
    },
    resources: [
      {
        name: 'chat',
        displayName: 'Chat Completion',
        operations: [
          {
            name: 'complete',
            displayName: 'Generate Chat',
            method: 'POST',
            path: '/chat/completions',
            properties: [
              { name: 'model', displayName: 'Model', type: 'string', default: 'mistral-large-latest' },
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
    type: 'cohere',
    name: 'Cohere',
    description: 'Enterprise natural language generation, semantic search embeddings, and reranking',
    category: 'ai',
    icon: 'cpu',
    color: '#39594d',
    baseURL: 'https://api.cohere.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'cohere_api_key'
    },
    resources: [
      {
        name: 'chat',
        displayName: 'Chat',
        operations: [
          {
            name: 'message',
            displayName: 'Chat with Command R+',
            method: 'POST',
            path: '/chat',
            properties: [
              { name: 'message', displayName: 'Message', type: 'string', required: true },
              { name: 'model', displayName: 'Model', type: 'string', default: 'command-r-plus' }
            ]
          }
        ]
      }
    ]
  },

  // ==========================================
  // NOTIFICATIONS & MESSAGING
  // ==========================================
  {
    type: 'pushover',
    name: 'Pushover',
    description: 'Instant real-time push notifications to Android, iOS, and desktop devices',
    category: 'app',
    icon: 'bell',
    color: '#0066cc',
    baseURL: 'https://api.pushover.net/1',
    auth: {
      type: 'apiKey',
      credentialType: 'pushover_token'
    },
    resources: [
      {
        name: 'message',
        displayName: 'Notification',
        operations: [
          {
            name: 'send',
            displayName: 'Send Push Notification',
            method: 'POST',
            path: '/messages.json',
            properties: [
              { name: 'token', displayName: 'Application Token', type: 'string', required: true },
              { name: 'user', displayName: 'User / Group Key', type: 'string', required: true },
              { name: 'message', displayName: 'Message Body', type: 'string', required: true },
              { name: 'title', displayName: 'Title', type: 'string' }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'mattermost',
    name: 'Mattermost',
    description: 'Open-source self-hosted team collaboration, channel posts, and webhooks',
    category: 'app',
    icon: 'message-circle',
    color: '#0058cc',
    baseURL: 'https://mattermost.example.com/api/v4',
    auth: {
      type: 'bearer',
      credentialType: 'mattermost_token'
    },
    resources: [
      {
        name: 'post',
        displayName: 'Channel Post',
        operations: [
          {
            name: 'create',
            displayName: 'Create Post',
            method: 'POST',
            path: '/posts',
            properties: [
              { name: 'channel_id', displayName: 'Channel ID', type: 'string', required: true },
              { name: 'message', displayName: 'Message Text', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  }
];
