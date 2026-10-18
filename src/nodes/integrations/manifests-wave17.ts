import { DeclarativeManifest } from '../declarative-node';

export const WAVE17_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // CLOUD NETWORKING, DNS & OBSERVABILITY
  // ==========================================
  {
    type: 'cloudflare_dns',
    name: 'Cloudflare DNS',
    description: 'Create and manage DNS records, proxying, and TTL settings on Cloudflare',
    category: 'cloud',
    icon: 'globe',
    color: '#f38020',
    baseURL: 'https://api.cloudflare.com/client/v4/zones/{zoneId}/dns_records',
    auth: {
      type: 'bearer',
      credentialType: 'cloudflare_api_token'
    },
    resources: [
      {
        name: 'record',
        displayName: 'DNS Record',
        operations: [
          {
            name: 'create',
            displayName: 'Create DNS Record',
            method: 'POST',
            path: '/',
            properties: [
              { name: 'zoneId', displayName: 'Zone ID', type: 'string', required: true },
              { name: 'type', displayName: 'Record Type', type: 'options', options: [{ name: 'A', value: 'A' }, { name: 'AAAA', value: 'AAAA' }, { name: 'CNAME', value: 'CNAME' }, { name: 'TXT', value: 'TXT' }], default: 'A' },
              { name: 'name', displayName: 'Name (subdomain)', type: 'string', required: true },
              { name: 'content', displayName: 'Target IP / Value', type: 'string', required: true },
              { name: 'proxied', displayName: 'Proxied through Cloudflare', type: 'boolean', default: false }
            ],
            bodyParameters: {
              type: '$param:type',
              name: '$param:name',
              content: '$param:content',
              proxied: '$param:proxied'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'aws_route53',
    name: 'AWS Route53',
    description: 'Inspect hosted zones, DNS health checks, and change resource record sets in Route 53',
    category: 'cloud',
    icon: 'map',
    color: '#ff9900',
    baseURL: 'https://route53.amazonaws.com/2013-04-01',
    auth: {
      type: 'bearer',
      credentialType: 'aws_credentials'
    },
    resources: [
      {
        name: 'hostedZone',
        displayName: 'Hosted Zone',
        operations: [
          {
            name: 'list',
            displayName: 'List Hosted Zones',
            method: 'GET',
            path: '/hostedzone',
            itemsPath: 'HostedZones'
          }
        ]
      }
    ]
  },

  {
    type: 'aws_step_functions',
    name: 'AWS Step Functions',
    description: 'Start execution of serverless distributed state machine workflows on AWS',
    category: 'cloud',
    icon: 'shuffle',
    color: '#ff9900',
    baseURL: 'https://states.{region}.amazonaws.com',
    auth: {
      type: 'header',
      headerName: 'X-Amz-Target',
      credentialType: 'aws_credentials'
    },
    resources: [
      {
        name: 'execution',
        displayName: 'Execution',
        operations: [
          {
            name: 'start',
            displayName: 'Start Execution',
            method: 'POST',
            path: '/',
            headers: {
              'X-Amz-Target': 'AWSStepFunctions.StartExecution',
              'Content-Type': 'application/x-amz-json-1.0'
            },
            properties: [
              { name: 'region', displayName: 'AWS Region', type: 'string', default: 'us-east-1' },
              { name: 'stateMachineArn', displayName: 'State Machine ARN', type: 'string', required: true },
              { name: 'input', displayName: 'Input JSON String', type: 'string', default: '{}' }
            ],
            bodyParameters: {
              stateMachineArn: '$param:stateMachineArn',
              input: '$param:input'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'datadog_metrics',
    name: 'Datadog Metrics',
    description: 'Submit custom timeseries metrics and telemetry points directly to Datadog',
    category: 'cloud',
    icon: 'activity',
    color: '#632ca6',
    baseURL: 'https://api.datadoghq.com/api/v2',
    auth: {
      type: 'header',
      headerName: 'DD-API-KEY',
      credentialType: 'datadog_api_key'
    },
    resources: [
      {
        name: 'series',
        displayName: 'Metric Series',
        operations: [
          {
            name: 'submit',
            displayName: 'Submit Metrics',
            method: 'POST',
            path: '/series',
            properties: [
              { name: 'metricName', displayName: 'Metric Name', type: 'string', required: true },
              { name: 'value', displayName: 'Metric Value', type: 'number', required: true },
              { name: 'type', displayName: 'Metric Type (0=unspecified, 1=count, 2=rate, 3=gauge)', type: 'number', default: 3 }
            ],
            bodyParameters: {
              series: [
                {
                  metric: '$param:metricName',
                  type: '$param:type',
                  points: [{ value: '$param:value' }]
                }
              ]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'honeycomb',
    name: 'Honeycomb.io',
    description: 'Send high-cardinality distributed tracing and observability events to Honeycomb',
    category: 'cloud',
    icon: 'activity',
    color: '#f5a623',
    baseURL: 'https://api.honeycomb.io/1',
    auth: {
      type: 'header',
      headerName: 'X-Honeycomb-Team',
      credentialType: 'honeycomb_api_key'
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
            path: '/events/{dataset}',
            properties: [
              { name: 'dataset', displayName: 'Dataset Name', type: 'string', required: true },
              { name: 'data', displayName: 'Event Data JSON', type: 'json', required: true }
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
    type: 'backblaze_b2',
    name: 'Backblaze B2',
    description: 'Cost-effective enterprise cloud object storage, buckets, and file management on Backblaze',
    category: 'cloud',
    icon: 'hard-drive',
    color: '#d6001c',
    baseURL: 'https://api.backblazeb2.com/b2api/v2',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'b2_auth_token'
    },
    resources: [
      {
        name: 'bucket',
        displayName: 'Bucket',
        operations: [
          {
            name: 'list',
            displayName: 'List Buckets',
            method: 'POST',
            path: '/b2_list_buckets',
            properties: [
              { name: 'accountId', displayName: 'Account ID', type: 'string', required: true }
            ],
            bodyParameters: {
              accountId: '$param:accountId'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'digitalocean_droplets',
    name: 'DigitalOcean Droplets',
    description: 'Provision compute droplets, power off/reboot servers, and manage snapshots on DigitalOcean',
    category: 'cloud',
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
            name: 'create',
            displayName: 'Create Droplet',
            method: 'POST',
            path: '/droplets',
            properties: [
              { name: 'name', displayName: 'Droplet Name', type: 'string', required: true },
              { name: 'region', displayName: 'Region', type: 'string', default: 'nyc3' },
              { name: 'size', displayName: 'Size Slug', type: 'string', default: 's-1vcpu-1gb' },
              { name: 'image', displayName: 'Image Slug', type: 'string', default: 'ubuntu-22-04-x64' }
            ],
            bodyParameters: {
              name: '$param:name',
              region: '$param:region',
              size: '$param:size',
              image: '$param:image'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'pagerduty_incident',
    name: 'PagerDuty Incidents',
    description: 'Trigger, acknowledge, and resolve enterprise on-call engineering incidents in PagerDuty',
    category: 'cloud',
    icon: 'alert-circle',
    color: '#00b050',
    baseURL: 'https://api.pagerduty.com',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'Token token=',
      credentialType: 'pagerduty_token'
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
            path: '/incidents',
            headers: {
              'From': 'autoflow@example.com'
            },
            properties: [
              { name: 'title', displayName: 'Incident Title', type: 'string', required: true },
              { name: 'serviceId', displayName: 'Service ID', type: 'string', required: true },
              { name: 'urgency', displayName: 'Urgency', type: 'options', options: [{ name: 'High', value: 'high' }, { name: 'Low', value: 'low' }], default: 'high' }
            ],
            bodyParameters: {
              incident: {
                type: 'incident',
                title: '$param:title',
                service: { id: '$param:serviceId', type: 'service_reference' },
                urgency: '$param:urgency'
              }
            }
          }
        ]
      }
    ]
  }
];
