import { DeclarativeManifest } from '../declarative-node';

export const WAVE21_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // CLOUD SECURITY, SECRETS & FEATURE FLAGS
  // ==========================================
  {
    type: 'hashicorp_vault',
    name: 'HashiCorp Vault',
    description: 'Read and write encrypted dynamic secrets, tokens, and encryption keys in HashiCorp Vault',
    category: 'cloud',
    icon: 'lock',
    color: '#000000',
    baseURL: 'https://{vaultHost}/v1',
    auth: {
      type: 'header',
      headerName: 'X-Vault-Token',
      credentialType: 'vault_token'
    },
    resources: [
      {
        name: 'secret',
        displayName: 'Secret',
        operations: [
          {
            name: 'read',
            displayName: 'Read Secret',
            method: 'GET',
            path: '/secret/data/{secretPath}',
            itemsPath: 'data.data',
            properties: [
              { name: 'vaultHost', displayName: 'Vault Host', type: 'string', required: true },
              { name: 'secretPath', displayName: 'Secret Path', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'doppler',
    name: 'Doppler Secret Ops',
    description: 'Sync and manage environment variables, encryption keys, and secrets with Doppler',
    category: 'cloud',
    icon: 'key',
    color: '#ea3556',
    baseURL: 'https://api.doppler.com/v3',
    auth: {
      type: 'bearer',
      credentialType: 'doppler_service_token'
    },
    resources: [
      {
        name: 'secrets',
        displayName: 'Secrets',
        operations: [
          {
            name: 'list',
            displayName: 'List Secrets',
            method: 'GET',
            path: '/configs/config/secrets',
            itemsPath: 'secrets',
            properties: [
              { name: 'project', displayName: 'Project Name', type: 'string', required: true },
              { name: 'config', displayName: 'Config (e.g. prd, dev)', type: 'string', required: true }
            ],
            queryParameters: {
              project: '$param:project',
              config: '$param:config'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'infisical',
    name: 'Infisical Secrets',
    description: 'End-to-end encrypted secret management and developer config platform Infisical',
    category: 'cloud',
    icon: 'shield',
    color: '#000000',
    baseURL: 'https://app.infisical.com/api/v3',
    auth: {
      type: 'bearer',
      credentialType: 'infisical_token'
    },
    resources: [
      {
        name: 'secrets',
        displayName: 'Secrets',
        operations: [
          {
            name: 'list',
            displayName: 'List Raw Secrets',
            method: 'GET',
            path: '/secrets/raw',
            itemsPath: 'secrets',
            properties: [
              { name: 'workspaceId', displayName: 'Project ID', type: 'string', required: true },
              { name: 'environment', displayName: 'Environment (e.g. dev, prod)', type: 'string', default: 'prod' }
            ],
            queryParameters: {
              workspaceId: '$param:workspaceId',
              environment: '$param:environment'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'launchdarkly',
    name: 'LaunchDarkly',
    description: 'Control feature rollouts, toggle feature flags, and target user segments in LaunchDarkly',
    category: 'cloud',
    icon: 'toggle-right',
    color: '#405bff',
    baseURL: 'https://app.launchdarkly.com/api/v2',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'launchdarkly_api_key'
    },
    resources: [
      {
        name: 'flag',
        displayName: 'Feature Flag',
        operations: [
          {
            name: 'get',
            displayName: 'Get Feature Flag',
            method: 'GET',
            path: '/flags/{projectKey}/{featureFlagKey}',
            properties: [
              { name: 'projectKey', displayName: 'Project Key', type: 'string', required: true },
              { name: 'featureFlagKey', displayName: 'Feature Flag Key', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'unleash',
    name: 'Unleash Feature Flags',
    description: 'Enterprise open-source feature management and gradual canary releases with Unleash',
    category: 'cloud',
    icon: 'sliders',
    color: '#6c5ce7',
    baseURL: 'https://{unleashHost}/api/admin',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'unleash_api_token'
    },
    resources: [
      {
        name: 'feature',
        displayName: 'Feature Toggle',
        operations: [
          {
            name: 'list',
            displayName: 'List Feature Toggles',
            method: 'GET',
            path: '/projects/{projectId}/features',
            itemsPath: 'features',
            properties: [
              { name: 'unleashHost', displayName: 'Unleash Server Host', type: 'string', required: true },
              { name: 'projectId', displayName: 'Project ID', type: 'string', default: 'default' }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'azure_key_vault',
    name: 'Azure Key Vault',
    description: 'Securely safeguard cryptographic keys, certificates, and app secrets in Microsoft Azure',
    category: 'cloud',
    icon: 'lock',
    color: '#0078d4',
    baseURL: 'https://{vaultName}.vault.azure.net',
    auth: {
      type: 'bearer',
      credentialType: 'azure_token'
    },
    resources: [
      {
        name: 'secret',
        displayName: 'Secret',
        operations: [
          {
            name: 'get',
            displayName: 'Get Secret',
            method: 'GET',
            path: '/secrets/{secretName}?api-version=7.4',
            properties: [
              { name: 'vaultName', displayName: 'Key Vault Name', type: 'string', required: true },
              { name: 'secretName', displayName: 'Secret Name', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'azure_service_bus',
    name: 'Azure Service Bus',
    description: 'Publish enterprise queue and topic messages through Microsoft Azure Service Bus',
    category: 'cloud',
    icon: 'shuffle',
    color: '#0078d4',
    baseURL: 'https://{namespace}.servicebus.windows.net',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'azure_service_bus_sas'
    },
    resources: [
      {
        name: 'queue',
        displayName: 'Queue',
        operations: [
          {
            name: 'sendMessage',
            displayName: 'Send Queue Message',
            method: 'POST',
            path: '/{queueName}/messages',
            properties: [
              { name: 'namespace', displayName: 'Service Bus Namespace', type: 'string', required: true },
              { name: 'queueName', displayName: 'Queue Name', type: 'string', required: true },
              { name: 'payload', displayName: 'Message Body', type: 'json', required: true }
            ],
            bodyParameters: {
              body: '$param:payload'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'google_cloud_run',
    name: 'Google Cloud Run',
    description: 'Inspect serverless container service revisions, traffic allocations, and deployments in GCP',
    category: 'cloud',
    icon: 'server',
    color: '#4285f4',
    baseURL: 'https://run.googleapis.com/v2',
    auth: {
      type: 'oauth2',
      credentialType: 'google'
    },
    resources: [
      {
        name: 'service',
        displayName: 'Service',
        operations: [
          {
            name: 'list',
            displayName: 'List Services',
            method: 'GET',
            path: '/projects/{project}/locations/{location}/services',
            itemsPath: 'services',
            properties: [
              { name: 'project', displayName: 'GCP Project ID', type: 'string', required: true },
              { name: 'location', displayName: 'Location (e.g. us-central1)', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'google_cloud_functions',
    name: 'Google Cloud Functions',
    description: 'Manage event-driven serverless functions, execution statuses, and triggers on GCP',
    category: 'cloud',
    icon: 'zap',
    color: '#4285f4',
    baseURL: 'https://cloudfunctions.googleapis.com/v2',
    auth: {
      type: 'oauth2',
      credentialType: 'google'
    },
    resources: [
      {
        name: 'function',
        displayName: 'Function',
        operations: [
          {
            name: 'list',
            displayName: 'List Functions',
            method: 'GET',
            path: '/projects/{project}/locations/{location}/functions',
            itemsPath: 'functions',
            properties: [
              { name: 'project', displayName: 'GCP Project ID', type: 'string', required: true },
              { name: 'location', displayName: 'Location (e.g. us-central1)', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'kong_gateway',
    name: 'Kong API Gateway',
    description: 'Configure routes, services, consumers, and upstream load balancers on Kong API Gateway',
    category: 'cloud',
    icon: 'shield',
    color: '#003366',
    baseURL: 'https://{kongAdminHost}',
    auth: {
      type: 'header',
      headerName: 'Kong-Admin-Token',
      credentialType: 'kong_admin_token'
    },
    resources: [
      {
        name: 'service',
        displayName: 'Service',
        operations: [
          {
            name: 'list',
            displayName: 'List Services',
            method: 'GET',
            path: '/services',
            itemsPath: 'data',
            properties: [
              { name: 'kongAdminHost', displayName: 'Kong Admin URL:Port', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'postman_api',
    name: 'Postman API',
    description: 'Trigger collection runs, update workspaces, and sync OpenAPI specs via Postman API',
    category: 'app',
    icon: 'send',
    color: '#ff6c37',
    baseURL: 'https://api.getpostman.com',
    auth: {
      type: 'header',
      headerName: 'X-Api-Key',
      credentialType: 'postman_api_key'
    },
    resources: [
      {
        name: 'collection',
        displayName: 'Collection',
        operations: [
          {
            name: 'list',
            displayName: 'List Collections',
            method: 'GET',
            path: '/collections',
            itemsPath: 'collections'
          }
        ]
      }
    ]
  },

  {
    type: 'github_release',
    name: 'GitHub Releases',
    description: 'Create production software releases, upload release assets, and draft tags on GitHub',
    category: 'app',
    icon: 'tag',
    color: '#181717',
    baseURL: 'https://api.github.com',
    auth: {
      type: 'bearer',
      credentialType: 'github_token'
    },
    resources: [
      {
        name: 'release',
        displayName: 'Release',
        operations: [
          {
            name: 'create',
            displayName: 'Create Release',
            method: 'POST',
            path: '/repos/{owner}/{repo}/releases',
            properties: [
              { name: 'owner', displayName: 'Owner / Org', type: 'string', required: true },
              { name: 'repo', displayName: 'Repository Name', type: 'string', required: true },
              { name: 'tag_name', displayName: 'Tag Name (e.g. v1.0.0)', type: 'string', required: true },
              { name: 'name', displayName: 'Release Title', type: 'string', required: true },
              { name: 'body', displayName: 'Release Notes Markdown', type: 'string' }
            ],
            bodyParameters: {
              tag_name: '$param:tag_name',
              name: '$param:name',
              body: '$param:body'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'github_gist',
    name: 'GitHub Gists',
    description: 'Publish and update public or secret code gists and snippets on GitHub',
    category: 'app',
    icon: 'code',
    color: '#181717',
    baseURL: 'https://api.github.com',
    auth: {
      type: 'bearer',
      credentialType: 'github_token'
    },
    resources: [
      {
        name: 'gist',
        displayName: 'Gist',
        operations: [
          {
            name: 'create',
            displayName: 'Create Gist',
            method: 'POST',
            path: '/gists',
            properties: [
              { name: 'description', displayName: 'Description', type: 'string' },
              { name: 'filename', displayName: 'Filename', type: 'string', required: true, default: 'snippet.txt' },
              { name: 'content', displayName: 'File Content', type: 'string', required: true },
              { name: 'public', displayName: 'Public', type: 'boolean', default: false }
            ],
            bodyParameters: {
              description: '$param:description',
              public: '$param:public',
              files: {
                '$param:filename': { content: '$param:content' }
              }
            }
          }
        ]
      }
    ]
  }
];
