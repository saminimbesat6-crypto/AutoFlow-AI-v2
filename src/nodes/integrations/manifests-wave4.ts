import { DeclarativeManifest } from '../declarative-node';

export const WAVE4_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // DATABASES & CLOUD DATA PLATFORMS
  // ==========================================
  {
    type: 'clickhouse',
    name: 'ClickHouse',
    description: 'Execute analytical queries and ingest rows into ClickHouse column-oriented database',
    category: 'database',
    icon: 'database',
    color: '#faad14',
    baseURL: 'https://{host}:{port}',
    auth: {
      type: 'basic',
      credentialType: 'clickhouse_auth'
    },
    resources: [
      {
        name: 'query',
        displayName: 'Query',
        operations: [
          {
            name: 'execute',
            displayName: 'Execute SQL Query',
            method: 'POST',
            path: '/',
            properties: [
              { name: 'host', displayName: 'Host Domain/IP', type: 'string', required: true, default: 'localhost' },
              { name: 'port', displayName: 'Port', type: 'number', required: true, default: 8123 },
              { name: 'query', displayName: 'SQL Query', type: 'string', required: true, default: 'SELECT 1 FORMAT JSON' }
            ],
            queryParameters: {
              query: '$param:query'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'couchdb',
    name: 'Apache CouchDB',
    description: 'Manage JSON documents, views, and attachments in Apache CouchDB',
    category: 'database',
    icon: 'database',
    color: '#e42528',
    baseURL: 'https://{host}:{port}',
    auth: {
      type: 'basic',
      credentialType: 'couchdb_auth'
    },
    resources: [
      {
        name: 'document',
        displayName: 'Document',
        operations: [
          {
            name: 'get',
            displayName: 'Get Document',
            method: 'GET',
            path: '/{database}/{docId}',
            properties: [
              { name: 'host', displayName: 'CouchDB Host', type: 'string', required: true, default: 'localhost' },
              { name: 'port', displayName: 'Port', type: 'number', required: true, default: 5984 },
              { name: 'database', displayName: 'Database Name', type: 'string', required: true },
              { name: 'docId', displayName: 'Document ID', type: 'string', required: true }
            ]
          },
          {
            name: 'create',
            displayName: 'Create Document',
            method: 'POST',
            path: '/{database}',
            properties: [
              { name: 'host', displayName: 'CouchDB Host', type: 'string', required: true, default: 'localhost' },
              { name: 'port', displayName: 'Port', type: 'number', required: true, default: 5984 },
              { name: 'database', displayName: 'Database Name', type: 'string', required: true },
              { name: 'data', displayName: 'Document JSON', type: 'json', required: true }
            ],
            bodyParameters: {
              data: '$param:data'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'dynamodb',
    name: 'Amazon DynamoDB',
    description: 'Query, insert, and manage NoSQL key-value items in Amazon DynamoDB',
    category: 'database',
    icon: 'database',
    color: '#4053d6',
    baseURL: 'https://dynamodb.{region}.amazonaws.com',
    auth: {
      type: 'header',
      headerName: 'X-Amz-Target',
      credentialType: 'aws_credentials'
    },
    resources: [
      {
        name: 'item',
        displayName: 'Item',
        operations: [
          {
            name: 'getItem',
            displayName: 'Get Item',
            method: 'POST',
            path: '/',
            headers: {
              'X-Amz-Target': 'DynamoDB_20120810.GetItem',
              'Content-Type': 'application/x-amz-json-1.0'
            },
            properties: [
              { name: 'region', displayName: 'AWS Region', type: 'string', default: 'us-east-1' },
              { name: 'tableName', displayName: 'Table Name', type: 'string', required: true },
              { name: 'key', displayName: 'Key JSON', type: 'json', required: true }
            ],
            bodyParameters: {
              TableName: '$param:tableName',
              Key: '$param:key'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'snowflake',
    name: 'Snowflake',
    description: 'Execute analytical queries and manage data warehouses via Snowflake SQL REST API',
    category: 'database',
    icon: 'database',
    color: '#29b5e8',
    baseURL: 'https://{accountIdentifier}.snowflakecomputing.com/api/v2',
    auth: {
      type: 'bearer',
      credentialType: 'snowflake_token'
    },
    resources: [
      {
        name: 'statement',
        displayName: 'SQL Statement',
        operations: [
          {
            name: 'execute',
            displayName: 'Execute Statement',
            method: 'POST',
            path: '/statements',
            properties: [
              { name: 'accountIdentifier', displayName: 'Snowflake Account Identifier', type: 'string', required: true },
              { name: 'statement', displayName: 'SQL Statement', type: 'string', required: true },
              { name: 'database', displayName: 'Database', type: 'string' },
              { name: 'schema', displayName: 'Schema', type: 'string' },
              { name: 'warehouse', displayName: 'Warehouse', type: 'string' }
            ],
            bodyParameters: {
              statement: '$param:statement',
              database: '$param:database',
              schema: '$param:schema',
              warehouse: '$param:warehouse'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'google_bigquery',
    name: 'Google BigQuery',
    description: 'Query massive enterprise datasets and manage jobs in Google Cloud BigQuery',
    category: 'database',
    icon: 'database',
    color: '#4285f4',
    baseURL: 'https://bigquery.googleapis.com/bigquery/v2',
    auth: {
      type: 'oauth2',
      credentialType: 'google'
    },
    resources: [
      {
        name: 'job',
        displayName: 'Query Job',
        operations: [
          {
            name: 'query',
            displayName: 'Run SQL Query',
            method: 'POST',
            path: '/projects/{projectId}/queries',
            properties: [
              { name: 'projectId', displayName: 'GCP Project ID', type: 'string', required: true },
              { name: 'query', displayName: 'SQL Query', type: 'string', required: true },
              { name: 'useLegacySql', displayName: 'Use Legacy SQL', type: 'boolean', default: false }
            ],
            bodyParameters: {
              query: '$param:query',
              useLegacySql: '$param:useLegacySql'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'neo4j',
    name: 'Neo4j',
    description: 'Execute Cypher graph queries and traverse nodes & edges in Neo4j',
    category: 'database',
    icon: 'share-2',
    color: '#018bff',
    baseURL: 'https://{host}:{port}/db/{database}/tx/commit',
    auth: {
      type: 'basic',
      credentialType: 'neo4j_auth'
    },
    resources: [
      {
        name: 'cypher',
        displayName: 'Cypher Query',
        operations: [
          {
            name: 'execute',
            displayName: 'Execute Cypher',
            method: 'POST',
            path: '/',
            properties: [
              { name: 'host', displayName: 'Neo4j Host', type: 'string', required: true, default: 'localhost' },
              { name: 'port', displayName: 'Port', type: 'number', required: true, default: 7474 },
              { name: 'database', displayName: 'Database Name', type: 'string', required: true, default: 'neo4j' },
              { name: 'statement', displayName: 'Cypher Statement', type: 'string', required: true, default: 'MATCH (n) RETURN count(n)' }
            ],
            bodyParameters: {
              statements: [
                { statement: '$param:statement' }
              ]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'elasticsearch',
    name: 'Elasticsearch',
    description: 'Search, index, and aggregate structured and unstructured JSON documents in Elasticsearch',
    category: 'database',
    icon: 'search',
    color: '#fed10a',
    baseURL: 'https://{host}:{port}',
    auth: {
      type: 'apiKey',
      headerName: 'Authorization',
      credentialType: 'elastic_api_key'
    },
    resources: [
      {
        name: 'document',
        displayName: 'Document',
        operations: [
          {
            name: 'search',
            displayName: 'Search Index',
            method: 'POST',
            path: '/{index}/_search',
            itemsPath: 'hits.hits',
            properties: [
              { name: 'host', displayName: 'Host', type: 'string', required: true },
              { name: 'port', displayName: 'Port', type: 'number', default: 9200 },
              { name: 'index', displayName: 'Index Name', type: 'string', required: true },
              { name: 'query', displayName: 'Query JSON', type: 'json' }
            ],
            bodyParameters: {
              query: '$param:query'
            }
          },
          {
            name: 'index',
            displayName: 'Index Document',
            method: 'POST',
            path: '/{index}/_doc/{id}',
            properties: [
              { name: 'host', displayName: 'Host', type: 'string', required: true },
              { name: 'port', displayName: 'Port', type: 'number', default: 9200 },
              { name: 'index', displayName: 'Index Name', type: 'string', required: true },
              { name: 'id', displayName: 'Document ID', type: 'string', required: true },
              { name: 'document', displayName: 'Document JSON Payload', type: 'json', required: true }
            ],
            bodyParameters: {
              doc: '$param:document'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'influxdb',
    name: 'InfluxDB',
    description: 'Write and query time-series metrics, telemetry, and IoT points in InfluxDB v2',
    category: 'database',
    icon: 'activity',
    color: '#22adfb',
    baseURL: 'https://{host}/api/v2',
    auth: {
      type: 'bearer',
      tokenPrefix: 'Token ',
      credentialType: 'influxdb_token'
    },
    resources: [
      {
        name: 'query',
        displayName: 'Flux Query',
        operations: [
          {
            name: 'query',
            displayName: 'Execute Flux Query',
            method: 'POST',
            path: '/query',
            properties: [
              { name: 'host', displayName: 'Host Domain/URL', type: 'string', required: true },
              { name: 'org', displayName: 'Organization Name', type: 'string', required: true },
              { name: 'query', displayName: 'Flux Query Script', type: 'string', required: true }
            ],
            queryParameters: {
              org: '$param:org'
            },
            bodyParameters: {
              query: '$param:query'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'cockroachdb',
    name: 'CockroachDB Cloud',
    description: 'Manage distributed SQL database clusters and inspect health via CockroachDB Cloud API',
    category: 'database',
    icon: 'database',
    color: '#6933ff',
    baseURL: 'https://cockroachlabs.cloud/api/v1',
    auth: {
      type: 'bearer',
      credentialType: 'cockroach_token'
    },
    resources: [
      {
        name: 'cluster',
        displayName: 'Cluster',
        operations: [
          {
            name: 'list',
            displayName: 'List Clusters',
            method: 'GET',
            path: '/clusters',
            itemsPath: 'clusters'
          }
        ]
      }
    ]
  },

  {
    type: 'mongodb_atlas',
    name: 'MongoDB Atlas',
    description: 'Manage NoSQL database deployments, clusters, and users via MongoDB Atlas Admin API',
    category: 'database',
    icon: 'database',
    color: '#13aa52',
    baseURL: 'https://cloud.mongodb.com/api/atlas/v1.0',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'mongodb_atlas_auth'
    },
    resources: [
      {
        name: 'cluster',
        displayName: 'Cluster',
        operations: [
          {
            name: 'list',
            displayName: 'List Clusters',
            method: 'GET',
            path: '/groups/{groupId}/clusters',
            itemsPath: 'results',
            properties: [
              { name: 'groupId', displayName: 'Project / Group ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'planetscale',
    name: 'PlanetScale',
    description: 'Manage serverless MySQL databases, branches, and deploy requests on PlanetScale',
    category: 'database',
    icon: 'database',
    color: '#000000',
    baseURL: 'https://api.planetscale.com/v1',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'planetscale_service_token'
    },
    resources: [
      {
        name: 'database',
        displayName: 'Database',
        operations: [
          {
            name: 'list',
            displayName: 'List Databases',
            method: 'GET',
            path: '/organizations/{org}/databases',
            itemsPath: 'data',
            properties: [
              { name: 'org', displayName: 'Organization Slug', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'neon',
    name: 'Neon Postgres',
    description: 'Manage serverless Postgres databases, instant branching, and endpoints on Neon',
    category: 'database',
    icon: 'database',
    color: '#00e599',
    baseURL: 'https://console.neon.tech/api/v2',
    auth: {
      type: 'bearer',
      credentialType: 'neon_api_key'
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
            itemsPath: 'projects'
          },
          {
            name: 'branches',
            displayName: 'List Branches',
            method: 'GET',
            path: '/projects/{projectId}/branches',
            itemsPath: 'branches',
            properties: [
              { name: 'projectId', displayName: 'Project ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'upstash_redis',
    name: 'Upstash Redis',
    description: 'Execute serverless Redis commands over high-performance low-latency REST API',
    category: 'database',
    icon: 'zap',
    color: '#00e9a3',
    baseURL: 'https://{endpoint}.upstash.io',
    auth: {
      type: 'bearer',
      credentialType: 'upstash_token'
    },
    resources: [
      {
        name: 'command',
        displayName: 'Command',
        operations: [
          {
            name: 'get',
            displayName: 'Get Key',
            method: 'GET',
            path: '/get/{key}',
            properties: [
              { name: 'endpoint', displayName: 'Upstash Endpoint Name', type: 'string', required: true },
              { name: 'key', displayName: 'Key Name', type: 'string', required: true }
            ]
          },
          {
            name: 'set',
            displayName: 'Set Key',
            method: 'POST',
            path: '/set/{key}/{value}',
            properties: [
              { name: 'endpoint', displayName: 'Upstash Endpoint Name', type: 'string', required: true },
              { name: 'key', displayName: 'Key Name', type: 'string', required: true },
              { name: 'value', displayName: 'Value', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'upstash_qstash',
    name: 'Upstash QStash',
    description: 'Publish message events and schedule webhooks with serverless message queue QStash',
    category: 'database',
    icon: 'send',
    color: '#00e9a3',
    baseURL: 'https://qstash.upstash.io/v2',
    auth: {
      type: 'bearer',
      credentialType: 'qstash_token'
    },
    resources: [
      {
        name: 'message',
        displayName: 'Message',
        operations: [
          {
            name: 'publish',
            displayName: 'Publish to URL',
            method: 'POST',
            path: '/publish/{destinationUrl}',
            properties: [
              { name: 'destinationUrl', displayName: 'Destination Webhook URL', type: 'string', required: true },
              { name: 'payload', displayName: 'JSON Body Payload', type: 'json' }
            ],
            bodyParameters: {
              payload: '$param:payload'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'hasura',
    name: 'Hasura GraphQL',
    description: 'Execute GraphQL queries and mutations against Hasura Instant GraphQL Engine',
    category: 'database',
    icon: 'code',
    color: '#1eb4d4',
    baseURL: 'https://{endpoint}/v1/graphql',
    auth: {
      type: 'header',
      headerName: 'x-hasura-admin-secret',
      credentialType: 'hasura_admin_secret'
    },
    resources: [
      {
        name: 'graphql',
        displayName: 'GraphQL',
        operations: [
          {
            name: 'query',
            displayName: 'Execute Query / Mutation',
            method: 'POST',
            path: '/',
            properties: [
              { name: 'endpoint', displayName: 'Hasura GraphQL Endpoint', type: 'string', required: true },
              { name: 'query', displayName: 'GraphQL Query', type: 'string', required: true },
              { name: 'variables', displayName: 'Variables JSON', type: 'json' }
            ],
            bodyParameters: {
              query: '$param:query',
              variables: '$param:variables'
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // CLOUD SERVICES & INFRASTRUCTURE
  // ==========================================
  {
    type: 'aws_ses',
    name: 'AWS SES',
    description: 'Send high-volume transactional emails and verify identities via Amazon SES',
    category: 'cloud',
    icon: 'mail',
    color: '#dd344c',
    baseURL: 'https://email.{region}.amazonaws.com/v2',
    auth: {
      type: 'bearer',
      credentialType: 'aws_credentials'
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
            path: '/email/outbound-emails',
            properties: [
              { name: 'region', displayName: 'AWS Region', type: 'string', default: 'us-east-1' },
              { name: 'from', displayName: 'From Email', type: 'string', required: true },
              { name: 'to', displayName: 'To Email', type: 'string', required: true },
              { name: 'subject', displayName: 'Subject', type: 'string', required: true },
              { name: 'body', displayName: 'HTML Body', type: 'string', required: true }
            ],
            bodyParameters: {
              FromEmailAddress: '$param:from',
              Destination: { ToAddresses: ['$param:to'] },
              Content: {
                Simple: {
                  Subject: { Data: '$param:subject' },
                  Body: { Html: { Data: '$param:body' } }
                }
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'google_cloud_storage',
    name: 'Google Cloud Storage',
    description: 'Manage buckets and upload or retrieve objects in Google Cloud Storage',
    category: 'cloud',
    icon: 'hard-drive',
    color: '#4285f4',
    baseURL: 'https://storage.googleapis.com/storage/v1',
    auth: {
      type: 'oauth2',
      credentialType: 'google'
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
            path: '/b',
            itemsPath: 'items',
            properties: [
              { name: 'project', displayName: 'GCP Project ID', type: 'string', required: true }
            ],
            queryParameters: {
              project: '$param:project'
            }
          }
        ]
      },
      {
        name: 'object',
        displayName: 'Object',
        operations: [
          {
            name: 'list',
            displayName: 'List Objects',
            method: 'GET',
            path: '/b/{bucket}/o',
            itemsPath: 'items',
            properties: [
              { name: 'bucket', displayName: 'Bucket Name', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'google_pubsub',
    name: 'Google Cloud Pub/Sub',
    description: 'Ingest and publish event streams with Google Cloud Pub/Sub messaging',
    category: 'cloud',
    icon: 'radio',
    color: '#ea4335',
    baseURL: 'https://pubsub.googleapis.com/v1',
    auth: {
      type: 'oauth2',
      credentialType: 'google'
    },
    resources: [
      {
        name: 'topic',
        displayName: 'Topic',
        operations: [
          {
            name: 'publish',
            displayName: 'Publish Message',
            method: 'POST',
            path: '/projects/{project}/topics/{topic}:publish',
            properties: [
              { name: 'project', displayName: 'GCP Project ID', type: 'string', required: true },
              { name: 'topic', displayName: 'Topic Name', type: 'string', required: true },
              { name: 'data', displayName: 'Base64 Encoded Message Data', type: 'string', required: true }
            ],
            bodyParameters: {
              messages: [{ data: '$param:data' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'azure_blob_storage',
    name: 'Azure Blob Storage',
    description: 'Store and retrieve unstructured binary blobs and files in Microsoft Azure Storage',
    category: 'cloud',
    icon: 'cloud',
    color: '#0078d4',
    baseURL: 'https://{accountName}.blob.core.windows.net',
    auth: {
      type: 'header',
      headerName: 'x-ms-version',
      credentialType: 'azure_storage_key'
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
            path: '/?comp=list',
            properties: [
              { name: 'accountName', displayName: 'Storage Account Name', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'azure_event_hubs',
    name: 'Azure Event Hubs',
    description: 'Stream millions of events per second with Microsoft Azure Event Hubs',
    category: 'cloud',
    icon: 'activity',
    color: '#0078d4',
    baseURL: 'https://{namespace}.servicebus.windows.net',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'azure_sas_token'
    },
    resources: [
      {
        name: 'event',
        displayName: 'Event',
        operations: [
          {
            name: 'send',
            displayName: 'Send Event',
            method: 'POST',
            path: '/{hubName}/messages',
            properties: [
              { name: 'namespace', displayName: 'Event Hubs Namespace', type: 'string', required: true },
              { name: 'hubName', displayName: 'Event Hub Name', type: 'string', required: true },
              { name: 'payload', displayName: 'Message Payload', type: 'json', required: true }
            ],
            bodyParameters: {
              message: '$param:payload'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'linode',
    name: 'Linode / Akamai',
    description: 'Manage virtual servers, block storage, and networking on Linode/Akamai Cloud',
    category: 'cloud',
    icon: 'server',
    color: '#00a95c',
    baseURL: 'https://api.linode.com/v4',
    auth: {
      type: 'bearer',
      credentialType: 'linode_token'
    },
    resources: [
      {
        name: 'instance',
        displayName: 'Linode Instance',
        operations: [
          {
            name: 'list',
            displayName: 'List Instances',
            method: 'GET',
            path: '/linode/instances',
            itemsPath: 'data'
          }
        ]
      }
    ]
  },

  {
    type: 'heroku',
    name: 'Heroku',
    description: 'Manage dynos, apps, and deployments on Heroku cloud platform',
    category: 'cloud',
    icon: 'cpu',
    color: '#430098',
    baseURL: 'https://api.heroku.com',
    auth: {
      type: 'bearer',
      credentialType: 'heroku_api_key'
    },
    resources: [
      {
        name: 'app',
        displayName: 'Application',
        operations: [
          {
            name: 'list',
            displayName: 'List Apps',
            method: 'GET',
            path: '/apps',
            headers: {
              'Accept': 'application/vnd.heroku+json; version=3'
            }
          },
          {
            name: 'restart',
            displayName: 'Restart Dynos',
            method: 'DELETE',
            path: '/apps/{appId}/dynos',
            headers: {
              'Accept': 'application/vnd.heroku+json; version=3'
            },
            properties: [
              { name: 'appId', displayName: 'App Name or UUID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'render',
    name: 'Render',
    description: 'Trigger deploys and manage web services and background workers on Render',
    category: 'cloud',
    icon: 'cloud-lightning',
    color: '#46e3b7',
    baseURL: 'https://api.render.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'render_api_key'
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
            itemsPath: 'items'
          },
          {
            name: 'deploy',
            displayName: 'Trigger Deploy',
            method: 'POST',
            path: '/services/{serviceId}/deploys',
            properties: [
              { name: 'serviceId', displayName: 'Service ID', type: 'string', required: true },
              { name: 'clearCache', displayName: 'Clear Build Cache', type: 'options', options: [{ name: 'Do Not Clear', value: 'do_not_clear' }, { name: 'Clear Cache', value: 'clear' }], default: 'do_not_clear' }
            ],
            bodyParameters: {
              clearCache: '$param:clearCache'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'fly_io',
    name: 'Fly.io',
    description: 'Manage global edge apps, machines, and regions on Fly.io',
    category: 'cloud',
    icon: 'navigation',
    color: '#24185b',
    baseURL: 'https://api.machines.dev/v1',
    auth: {
      type: 'bearer',
      credentialType: 'fly_api_token'
    },
    resources: [
      {
        name: 'machine',
        displayName: 'Machine',
        operations: [
          {
            name: 'list',
            displayName: 'List Machines',
            method: 'GET',
            path: '/apps/{appName}/machines',
            properties: [
              { name: 'appName', displayName: 'App Name', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'hetzner',
    name: 'Hetzner Cloud',
    description: 'Manage virtual servers, firewalls, and networks on Hetzner Cloud infrastructure',
    category: 'cloud',
    icon: 'server',
    color: '#d50c2d',
    baseURL: 'https://api.hetzner.cloud/v1',
    auth: {
      type: 'bearer',
      credentialType: 'hetzner_token'
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
            itemsPath: 'servers'
          }
        ]
      }
    ]
  },

  {
    type: 'vultr',
    name: 'Vultr',
    description: 'Provision compute instances, block storage, and DNS records on Vultr Cloud',
    category: 'cloud',
    icon: 'server',
    color: '#007bfc',
    baseURL: 'https://api.vultr.com/v2',
    auth: {
      type: 'bearer',
      credentialType: 'vultr_api_key'
    },
    resources: [
      {
        name: 'instance',
        displayName: 'Instance',
        operations: [
          {
            name: 'list',
            displayName: 'List Instances',
            method: 'GET',
            path: '/instances',
            itemsPath: 'instances'
          }
        ]
      }
    ]
  },

  {
    type: 'terraform_cloud',
    name: 'Terraform Cloud',
    description: 'Trigger infrastructure runs and inspect workspace state in HashiCorp Terraform Cloud',
    category: 'cloud',
    icon: 'layers',
    color: '#5c4ee5',
    baseURL: 'https://app.terraform.io/api/v2',
    auth: {
      type: 'bearer',
      credentialType: 'terraform_token'
    },
    resources: [
      {
        name: 'run',
        displayName: 'Run',
        operations: [
          {
            name: 'create',
            displayName: 'Create Run',
            method: 'POST',
            path: '/runs',
            headers: {
              'Content-Type': 'application/vnd.api+json'
            },
            properties: [
              { name: 'workspaceId', displayName: 'Workspace ID', type: 'string', required: true },
              { name: 'message', displayName: 'Run Message', type: 'string', default: 'Triggered from AutoFlow AI' }
            ],
            bodyParameters: {
              data: {
                type: 'runs',
                relationships: {
                  workspace: {
                    data: {
                      type: 'workspaces',
                      id: '$param:workspaceId'
                    }
                  }
                }
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'argocd',
    name: 'ArgoCD',
    description: 'Manage declarative GitOps Kubernetes continuous delivery with ArgoCD',
    category: 'cloud',
    icon: 'git-merge',
    color: '#ef7b4d',
    baseURL: 'https://{argoHost}/api/v1',
    auth: {
      type: 'bearer',
      credentialType: 'argocd_token'
    },
    resources: [
      {
        name: 'application',
        displayName: 'Application',
        operations: [
          {
            name: 'sync',
            displayName: 'Sync Application',
            method: 'POST',
            path: '/applications/{appName}/sync',
            properties: [
              { name: 'argoHost', displayName: 'ArgoCD Server Host', type: 'string', required: true },
              { name: 'appName', displayName: 'Application Name', type: 'string', required: true },
              { name: 'prune', displayName: 'Prune Resources', type: 'boolean', default: false }
            ],
            bodyParameters: {
              prune: '$param:prune'
            }
          },
          {
            name: 'get',
            displayName: 'Get Application Status',
            method: 'GET',
            path: '/applications/{appName}',
            properties: [
              { name: 'argoHost', displayName: 'ArgoCD Server Host', type: 'string', required: true },
              { name: 'appName', displayName: 'Application Name', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  }
];
