import { DeclarativeManifest } from '../declarative-node';

export const WAVE12_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // CLOUD PLATFORMS, DEVOPS & INFRASTRUCTURE
  // ==========================================
  {
    type: 'aws_ec2',
    name: 'AWS EC2',
    description: 'Describe and manage Amazon EC2 virtual compute instances and security groups',
    category: 'cloud',
    icon: 'server',
    color: '#ff9900',
    baseURL: 'https://ec2.{region}.amazonaws.com',
    auth: {
      type: 'bearer',
      credentialType: 'aws_credentials'
    },
    resources: [
      {
        name: 'instance',
        displayName: 'EC2 Instance',
        operations: [
          {
            name: 'describe',
            displayName: 'Describe Instances',
            method: 'GET',
            path: '/?Action=DescribeInstances&Version=2016-11-15',
            properties: [
              { name: 'region', displayName: 'AWS Region', type: 'string', default: 'us-east-1' }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'aws_cloudwatch',
    name: 'AWS CloudWatch',
    description: 'Put metric data, inspect alarms, and monitor cloud resources in Amazon CloudWatch',
    category: 'cloud',
    icon: 'activity',
    color: '#ff4f8b',
    baseURL: 'https://monitoring.{region}.amazonaws.com',
    auth: {
      type: 'bearer',
      credentialType: 'aws_credentials'
    },
    resources: [
      {
        name: 'alarm',
        displayName: 'Alarm',
        operations: [
          {
            name: 'describe',
            displayName: 'Describe Alarms',
            method: 'GET',
            path: '/?Action=DescribeAlarms&Version=2010-08-01',
            properties: [
              { name: 'region', displayName: 'AWS Region', type: 'string', default: 'us-east-1' }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'aws_eventbridge',
    name: 'AWS EventBridge',
    description: 'Put custom events into AWS EventBridge event buses to trigger cloud architectures',
    category: 'cloud',
    icon: 'shuffle',
    color: '#ff9900',
    baseURL: 'https://events.{region}.amazonaws.com',
    auth: {
      type: 'header',
      headerName: 'X-Amz-Target',
      credentialType: 'aws_credentials'
    },
    resources: [
      {
        name: 'event',
        displayName: 'Event',
        operations: [
          {
            name: 'putEvent',
            displayName: 'Put Event',
            method: 'POST',
            path: '/',
            headers: {
              'X-Amz-Target': 'AWSEvents.PutEvents',
              'Content-Type': 'application/x-amz-json-1.1'
            },
            properties: [
              { name: 'region', displayName: 'AWS Region', type: 'string', default: 'us-east-1' },
              { name: 'source', displayName: 'Event Source', type: 'string', required: true },
              { name: 'detailType', displayName: 'Detail Type', type: 'string', required: true },
              { name: 'detail', displayName: 'Detail JSON', type: 'json', required: true }
            ],
            bodyParameters: {
              Entries: [
                {
                  Source: '$param:source',
                  DetailType: '$param:detailType',
                  Detail: '$param:detail'
                }
              ]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'aws_secrets_manager',
    name: 'AWS Secrets Manager',
    description: 'Retrieve and rotate encrypted database credentials and API secrets in AWS',
    category: 'cloud',
    icon: 'lock',
    color: '#dd344c',
    baseURL: 'https://secretsmanager.{region}.amazonaws.com',
    auth: {
      type: 'header',
      headerName: 'X-Amz-Target',
      credentialType: 'aws_credentials'
    },
    resources: [
      {
        name: 'secret',
        displayName: 'Secret',
        operations: [
          {
            name: 'getSecretValue',
            displayName: 'Get Secret Value',
            method: 'POST',
            path: '/',
            headers: {
              'X-Amz-Target': 'secretsmanager.GetSecretValue',
              'Content-Type': 'application/x-amz-json-1.1'
            },
            properties: [
              { name: 'region', displayName: 'AWS Region', type: 'string', default: 'us-east-1' },
              { name: 'secretId', displayName: 'Secret ID / Name', type: 'string', required: true }
            ],
            bodyParameters: {
              SecretId: '$param:secretId'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'google_cloud_tasks',
    name: 'Google Cloud Tasks',
    description: 'Manage asynchronous task execution, queues, and rate-limited HTTP targets in GCP',
    category: 'cloud',
    icon: 'check-circle',
    color: '#4285f4',
    baseURL: 'https://cloudtasks.googleapis.com/v2',
    auth: {
      type: 'oauth2',
      credentialType: 'google'
    },
    resources: [
      {
        name: 'task',
        displayName: 'Task',
        operations: [
          {
            name: 'create',
            displayName: 'Create HTTP Task',
            method: 'POST',
            path: '/projects/{projectId}/locations/{location}/queues/{queue}/tasks',
            properties: [
              { name: 'projectId', displayName: 'GCP Project ID', type: 'string', required: true },
              { name: 'location', displayName: 'Location (e.g. us-central1)', type: 'string', required: true },
              { name: 'queue', displayName: 'Queue Name', type: 'string', required: true },
              { name: 'url', displayName: 'Target HTTP URL', type: 'string', required: true }
            ],
            bodyParameters: {
              task: {
                httpRequest: {
                  url: '$param:url',
                  httpMethod: 'POST'
                }
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'azure_devops',
    name: 'Azure DevOps',
    description: 'Trigger pipelines, manage work items, and inspect repositories in Azure DevOps',
    category: 'cloud',
    icon: 'git-pull-request',
    color: '#0078d7',
    baseURL: 'https://dev.azure.com/{organization}/{project}/_apis',
    auth: {
      type: 'basic',
      credentialType: 'azure_devops_pat'
    },
    resources: [
      {
        name: 'pipeline',
        displayName: 'Pipeline',
        operations: [
          {
            name: 'run',
            displayName: 'Run Pipeline',
            method: 'POST',
            path: '/pipelines/{pipelineId}/runs?api-version=7.0',
            properties: [
              { name: 'organization', displayName: 'DevOps Organization', type: 'string', required: true },
              { name: 'project', displayName: 'Project Name', type: 'string', required: true },
              { name: 'pipelineId', displayName: 'Pipeline ID', type: 'number', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'sonarqube',
    name: 'SonarQube',
    description: 'Inspect static code analysis, security vulnerabilities, and quality gates in SonarQube',
    category: 'cloud',
    icon: 'shield',
    color: '#4b9fd5',
    baseURL: 'https://{sonarHost}/api',
    auth: {
      type: 'basic',
      credentialType: 'sonarqube_token'
    },
    resources: [
      {
        name: 'qualityGate',
        displayName: 'Quality Gate',
        operations: [
          {
            name: 'projectStatus',
            displayName: 'Get Project Status',
            method: 'GET',
            path: '/qualitygates/project_status',
            properties: [
              { name: 'sonarHost', displayName: 'SonarQube Host', type: 'string', required: true },
              { name: 'projectKey', displayName: 'Project Key', type: 'string', required: true }
            ],
            queryParameters: {
              projectKey: '$param:projectKey'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'snyk',
    name: 'Snyk',
    description: 'Scan open-source packages, containers, and IaC for security vulnerabilities with Snyk',
    category: 'cloud',
    icon: 'shield-alert',
    color: '#4c4a73',
    baseURL: 'https://api.snyk.io/rest',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'token ',
      credentialType: 'snyk_token'
    },
    resources: [
      {
        name: 'issues',
        displayName: 'Issues',
        operations: [
          {
            name: 'list',
            displayName: 'List Organization Issues',
            method: 'GET',
            path: '/orgs/{orgId}/issues?version=2024-01-23',
            itemsPath: 'data',
            properties: [
              { name: 'orgId', displayName: 'Snyk Org ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'minio',
    name: 'MinIO',
    description: 'High-performance S3-compatible enterprise object storage for private clouds',
    category: 'cloud',
    icon: 'hard-drive',
    color: '#c72c48',
    baseURL: 'https://{minioHost}',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'minio_credentials'
    },
    resources: [
      {
        name: 'bucket',
        displayName: 'Bucket',
        operations: [
          {
            name: 'list',
            displayName: 'List Buckets',
            method: 'GET',
            path: '/',
            properties: [
              { name: 'minioHost', displayName: 'MinIO Server Host:Port', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'cloudflare_r2',
    name: 'Cloudflare R2',
    description: 'Manage zero-egress-fee S3-compatible cloud object storage on Cloudflare R2',
    category: 'cloud',
    icon: 'cloud',
    color: '#f38020',
    baseURL: 'https://api.cloudflare.com/client/v4/accounts/{accountId}/r2',
    auth: {
      type: 'bearer',
      credentialType: 'cloudflare_api_token'
    },
    resources: [
      {
        name: 'bucket',
        displayName: 'Bucket',
        operations: [
          {
            name: 'list',
            displayName: 'List Buckets',
            method: 'GET',
            path: '/buckets',
            itemsPath: 'result.buckets',
            properties: [
              { name: 'accountId', displayName: 'Cloudflare Account ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'cloudflare_workers',
    name: 'Cloudflare Workers',
    description: 'Deploy serverless edge compute scripts and inspect executions on Cloudflare',
    category: 'cloud',
    icon: 'zap',
    color: '#f38020',
    baseURL: 'https://api.cloudflare.com/client/v4/accounts/{accountId}/workers',
    auth: {
      type: 'bearer',
      credentialType: 'cloudflare_api_token'
    },
    resources: [
      {
        name: 'script',
        displayName: 'Script',
        operations: [
          {
            name: 'list',
            displayName: 'List Scripts',
            method: 'GET',
            path: '/scripts',
            itemsPath: 'result',
            properties: [
              { name: 'accountId', displayName: 'Cloudflare Account ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'fastly',
    name: 'Fastly CDN',
    description: 'Purge edge cache instantly and manage real-time CDN edge delivery with Fastly',
    category: 'cloud',
    icon: 'globe',
    color: '#ff282d',
    baseURL: 'https://api.fastly.com',
    auth: {
      type: 'header',
      headerName: 'Fastly-Key',
      credentialType: 'fastly_api_key'
    },
    resources: [
      {
        name: 'purge',
        displayName: 'Purge',
        operations: [
          {
            name: 'purgeAll',
            displayName: 'Purge Service Cache',
            method: 'POST',
            path: '/service/{serviceId}/purge_all',
            properties: [
              { name: 'serviceId', displayName: 'Fastly Service ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'bunny_cdn',
    name: 'Bunny.net',
    description: 'Manage edge storage zones, pull zones, and purge cache on Bunny.net CDN',
    category: 'cloud',
    icon: 'cloud-lightning',
    color: '#ff8a00',
    baseURL: 'https://api.bunny.net',
    auth: {
      type: 'header',
      headerName: 'AccessKey',
      credentialType: 'bunny_api_key'
    },
    resources: [
      {
        name: 'pullZone',
        displayName: 'Pull Zone',
        operations: [
          {
            name: 'list',
            displayName: 'List Pull Zones',
            method: 'GET',
            path: '/pullzone'
          },
          {
            name: 'purge',
            displayName: 'Purge Cache',
            method: 'POST',
            path: '/pullzone/{id}/purgeCache',
            properties: [
              { name: 'id', displayName: 'Pull Zone ID', type: 'number', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'scaleway',
    name: 'Scaleway',
    description: 'Manage virtual instances, serverless functions, and databases in Scaleway Cloud',
    category: 'cloud',
    icon: 'server',
    color: '#4f0599',
    baseURL: 'https://api.scaleway.com/instance/v1/zones/{zone}',
    auth: {
      type: 'header',
      headerName: 'X-Auth-Token',
      credentialType: 'scaleway_token'
    },
    resources: [
      {
        name: 'server',
        displayName: 'Server',
        operations: [
          {
            name: 'list',
            displayName: 'List Servers',
            method: 'GET',
            path: '/servers',
            itemsPath: 'servers',
            properties: [
              { name: 'zone', displayName: 'Zone (e.g. fr-par-1)', type: 'string', default: 'fr-par-1' }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'upcloud',
    name: 'UpCloud',
    description: 'Deploy enterprise high-performance cloud servers and block storage on UpCloud',
    category: 'cloud',
    icon: 'server',
    color: '#7b16ff',
    baseURL: 'https://api.upcloud.com/1.3',
    auth: {
      type: 'basic',
      credentialType: 'upcloud_auth'
    },
    resources: [
      {
        name: 'server',
        displayName: 'Server',
        operations: [
          {
            name: 'list',
            displayName: 'List Servers',
            method: 'GET',
            path: '/server',
            itemsPath: 'servers.server'
          }
        ]
      }
    ]
  },

  {
    type: 'travis_ci',
    name: 'Travis CI',
    description: 'Trigger continuous integration builds and inspect job matrices on Travis CI',
    category: 'app',
    icon: 'play-circle',
    color: '#cb3837',
    baseURL: 'https://api.travis-ci.com',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'token ',
      credentialType: 'travis_token'
    },
    resources: [
      {
        name: 'build',
        displayName: 'Build',
        operations: [
          {
            name: 'list',
            displayName: 'List Repository Builds',
            method: 'GET',
            path: '/repo/{repoId}/builds',
            headers: {
              'Travis-API-Version': '3'
            },
            itemsPath: 'builds',
            properties: [
              { name: 'repoId', displayName: 'Repository Slug or ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'buildkite',
    name: 'Buildkite',
    description: 'Trigger fast, secure CI/CD pipelines across hybrid cloud agents with Buildkite',
    category: 'app',
    icon: 'cpu',
    color: '#00d66f',
    baseURL: 'https://api.buildkite.com/v2',
    auth: {
      type: 'bearer',
      credentialType: 'buildkite_token'
    },
    resources: [
      {
        name: 'build',
        displayName: 'Build',
        operations: [
          {
            name: 'create',
            displayName: 'Create Build',
            method: 'POST',
            path: '/organizations/{org}/pipelines/{pipeline}/builds',
            properties: [
              { name: 'org', displayName: 'Organization Slug', type: 'string', required: true },
              { name: 'pipeline', displayName: 'Pipeline Slug', type: 'string', required: true },
              { name: 'commit', displayName: 'Commit SHA or HEAD', type: 'string', default: 'HEAD' },
              { name: 'branch', displayName: 'Branch', type: 'string', default: 'main' },
              { name: 'message', displayName: 'Message', type: 'string', default: 'Triggered by AutoFlow AI' }
            ],
            bodyParameters: {
              commit: '$param:commit',
              branch: '$param:branch',
              message: '$param:message'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'drone_ci',
    name: 'Drone CI (Harness)',
    description: 'Automate container-native CI/CD build execution using Drone CI / Harness',
    category: 'app',
    icon: 'anchor',
    color: '#152538',
    baseURL: 'https://{droneHost}/api',
    auth: {
      type: 'bearer',
      credentialType: 'drone_token'
    },
    resources: [
      {
        name: 'build',
        displayName: 'Build',
        operations: [
          {
            name: 'create',
            displayName: 'Trigger Build',
            method: 'POST',
            path: '/repos/{owner}/{repo}/builds',
            properties: [
              { name: 'droneHost', displayName: 'Drone Host Domain', type: 'string', required: true },
              { name: 'owner', displayName: 'Repository Owner', type: 'string', required: true },
              { name: 'repo', displayName: 'Repository Name', type: 'string', required: true },
              { name: 'branch', displayName: 'Branch', type: 'string', default: 'main' }
            ],
            queryParameters: {
              branch: '$param:branch'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'semaphore_ci',
    name: 'Semaphore CI',
    description: 'Run blazingly fast continuous integration and deployment workflows with Semaphore',
    category: 'app',
    icon: 'zap',
    color: '#00c58a',
    baseURL: 'https://{org}.semaphoreci.com/api/v1alpha',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'Token ',
      credentialType: 'semaphore_token'
    },
    resources: [
      {
        name: 'pipeline',
        displayName: 'Pipeline',
        operations: [
          {
            name: 'list',
            displayName: 'List Pipelines',
            method: 'GET',
            path: '/pipelines',
            properties: [
              { name: 'org', displayName: 'Semaphore Organization Name', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'harbor',
    name: 'Harbor Registry',
    description: 'Manage enterprise OCI container images, Helm charts, and security scans in Harbor',
    category: 'cloud',
    icon: 'box',
    color: '#00a3e0',
    baseURL: 'https://{harborHost}/api/v2.0',
    auth: {
      type: 'basic',
      credentialType: 'harbor_auth'
    },
    resources: [
      {
        name: 'project',
        displayName: 'Project',
        operations: [
          {
            name: 'list',
            displayName: 'List Projects',
            method: 'GET',
            path: '/projects',
            properties: [
              { name: 'harborHost', displayName: 'Harbor Host Domain', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  }
];
