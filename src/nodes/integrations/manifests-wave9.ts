import { DeclarativeManifest } from '../declarative-node';

export const WAVE9_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // INCIDENT MANAGEMENT & MONITORING
  // ==========================================
  {
    type: 'opsgenie',
    name: 'Opsgenie',
    description: 'Dispatch alerts, notify on-call schedules, and escalate incidents in Atlassian Opsgenie',
    category: 'cloud',
    icon: 'bell',
    color: '#0052cc',
    baseURL: 'https://api.opsgenie.com/v2',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'GenieKey ',
      credentialType: 'opsgenie_api_key'
    },
    resources: [
      {
        name: 'alert',
        displayName: 'Alert',
        operations: [
          {
            name: 'create',
            displayName: 'Create Alert',
            method: 'POST',
            path: '/alerts',
            properties: [
              { name: 'message', displayName: 'Alert Message', type: 'string', required: true },
              { name: 'priority', displayName: 'Priority (P1-P5)', type: 'options', options: [{ name: 'P1 - Critical', value: 'P1' }, { name: 'P2 - High', value: 'P2' }, { name: 'P3 - Moderate', value: 'P3' }, { name: 'P4 - Low', value: 'P4' }, { name: 'P5 - Informational', value: 'P5' }], default: 'P3' },
              { name: 'description', displayName: 'Description', type: 'string' }
            ],
            bodyParameters: {
              message: '$param:message',
              priority: '$param:priority',
              description: '$param:description'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'better_uptime',
    name: 'Better Uptime (Better Stack)',
    description: 'Trigger incidents, log heartbeats, and inspect monitor statuses on Better Stack',
    category: 'cloud',
    icon: 'activity',
    color: '#000000',
    baseURL: 'https://uptime.betterstack.com/api/v2',
    auth: {
      type: 'bearer',
      credentialType: 'better_uptime_token'
    },
    resources: [
      {
        name: 'monitor',
        displayName: 'Monitor',
        operations: [
          {
            name: 'list',
            displayName: 'List Monitors',
            method: 'GET',
            path: '/monitors',
            itemsPath: 'data'
          }
        ]
      },
      {
        name: 'heartbeat',
        displayName: 'Heartbeat',
        operations: [
          {
            name: 'ping',
            displayName: 'Send Heartbeat Ping',
            method: 'POST',
            path: '/heartbeats/{token}',
            properties: [
              { name: 'token', displayName: 'Heartbeat Token', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'uptimerobot',
    name: 'UptimeRobot',
    description: 'Monitor website uptime, API endpoints, SSL certificates, and ping response times',
    category: 'cloud',
    icon: 'activity',
    color: '#3bd671',
    baseURL: 'https://api.uptimerobot.com/v2',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'uptimerobot_api_key'
    },
    resources: [
      {
        name: 'monitor',
        displayName: 'Monitor',
        operations: [
          {
            name: 'getMonitors',
            displayName: 'Get Monitors',
            method: 'POST',
            path: '/getMonitors',
            itemsPath: 'monitors',
            properties: [
              { name: 'apiKey', displayName: 'API Key', type: 'string', required: true }
            ],
            bodyParameters: {
              api_key: '$param:apiKey',
              format: 'json'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'grafana',
    name: 'Grafana',
    description: 'Create event annotations, query data sources, and manage dashboards in Grafana',
    category: 'cloud',
    icon: 'bar-chart-2',
    color: '#f46800',
    baseURL: 'https://{grafanaHost}/api',
    auth: {
      type: 'bearer',
      credentialType: 'grafana_token'
    },
    resources: [
      {
        name: 'annotation',
        displayName: 'Annotation',
        operations: [
          {
            name: 'create',
            displayName: 'Create Annotation',
            method: 'POST',
            path: '/annotations',
            properties: [
              { name: 'grafanaHost', displayName: 'Grafana Host Domain', type: 'string', required: true },
              { name: 'text', displayName: 'Annotation Text', type: 'string', required: true },
              { name: 'tags', displayName: 'Tags (comma separated)', type: 'string' }
            ],
            bodyParameters: {
              text: '$param:text'
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // PRODUCT & WEB ANALYTICS
  // ==========================================
  {
    type: 'amplitude',
    name: 'Amplitude',
    description: 'Send custom event tracking telemetry, user properties, and funnel analytics to Amplitude',
    category: 'app',
    icon: 'trending-up',
    color: '#1e61f2',
    baseURL: 'https://api2.amplitude.com/2',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'amplitude_api_key'
    },
    resources: [
      {
        name: 'event',
        displayName: 'Event',
        operations: [
          {
            name: 'track',
            displayName: 'Track Event',
            method: 'POST',
            path: '/httpapi',
            properties: [
              { name: 'apiKey', displayName: 'API Key', type: 'string', required: true },
              { name: 'userId', displayName: 'User ID', type: 'string', required: true },
              { name: 'eventType', displayName: 'Event Type', type: 'string', required: true },
              { name: 'eventProperties', displayName: 'Event Properties JSON', type: 'json' }
            ],
            bodyParameters: {
              api_key: '$param:apiKey',
              events: [
                {
                  user_id: '$param:userId',
                  event_type: '$param:eventType',
                  event_properties: '$param:eventProperties'
                }
              ]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'google_analytics',
    name: 'Google Analytics 4',
    description: 'Send server-side events and conversions via Google Analytics 4 Measurement Protocol',
    category: 'app',
    icon: 'bar-chart',
    color: '#e37400',
    baseURL: 'https://www.google-analytics.com',
    auth: {
      type: 'apiKey',
      queryParamName: 'api_secret',
      credentialType: 'ga4_api_secret'
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
            path: '/mp/collect',
            properties: [
              { name: 'measurement_id', displayName: 'Measurement ID (G-XXXXX)', type: 'string', required: true },
              { name: 'client_id', displayName: 'Client ID', type: 'string', required: true },
              { name: 'name', displayName: 'Event Name', type: 'string', required: true },
              { name: 'params', displayName: 'Event Parameters JSON', type: 'json' }
            ],
            queryParameters: {
              measurement_id: '$param:measurement_id'
            },
            bodyParameters: {
              client_id: '$param:client_id',
              events: [
                {
                  name: '$param:name',
                  params: '$param:params'
                }
              ]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'plausible',
    name: 'Plausible Analytics',
    description: 'Query privacy-focused real-time stats and pageview aggregates with Plausible API',
    category: 'app',
    icon: 'eye',
    color: '#5850ec',
    baseURL: 'https://plausible.io/api/v1',
    auth: {
      type: 'bearer',
      credentialType: 'plausible_token'
    },
    resources: [
      {
        name: 'stats',
        displayName: 'Stats',
        operations: [
          {
            name: 'realtime',
            displayName: 'Realtime Visitors',
            method: 'GET',
            path: '/stats/realtime/visitors',
            properties: [
              { name: 'site_id', displayName: 'Site Domain / ID', type: 'string', required: true }
            ],
            queryParameters: {
              site_id: '$param:site_id'
            }
          },
          {
            name: 'aggregate',
            displayName: 'Aggregate Stats',
            method: 'GET',
            path: '/stats/aggregate',
            properties: [
              { name: 'site_id', displayName: 'Site Domain / ID', type: 'string', required: true },
              { name: 'period', displayName: 'Period', type: 'options', options: [{ name: '30 Days', value: '30d' }, { name: '7 Days', value: '7d' }, { name: 'Today', value: 'day' }], default: '30d' }
            ],
            queryParameters: {
              site_id: '$param:site_id',
              period: '$param:period'
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // SECURITY & THREAT INTELLIGENCE
  // ==========================================
  {
    type: 'virustotal',
    name: 'VirusTotal',
    description: 'Analyze suspicious URLs, files, domain names, and IP addresses via VirusTotal v3',
    category: 'cloud',
    icon: 'shield',
    color: '#3949ab',
    baseURL: 'https://www.virustotal.com/api/v3',
    auth: {
      type: 'header',
      headerName: 'x-apikey',
      credentialType: 'virustotal_api_key'
    },
    resources: [
      {
        name: 'ip',
        displayName: 'IP Address',
        operations: [
          {
            name: 'report',
            displayName: 'Get IP Report',
            method: 'GET',
            path: '/ip_addresses/{ip}',
            properties: [
              { name: 'ip', displayName: 'IP Address', type: 'string', required: true }
            ]
          }
        ]
      },
      {
        name: 'domain',
        displayName: 'Domain',
        operations: [
          {
            name: 'report',
            displayName: 'Get Domain Report',
            method: 'GET',
            path: '/domains/{domain}',
            properties: [
              { name: 'domain', displayName: 'Domain Name', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'shodan',
    name: 'Shodan',
    description: 'Search Internet-connected devices, open ports, banners, and vulnerabilities on Shodan',
    category: 'cloud',
    icon: 'search',
    color: '#b00000',
    baseURL: 'https://api.shodan.io',
    auth: {
      type: 'apiKey',
      queryParamName: 'key',
      credentialType: 'shodan_api_key'
    },
    resources: [
      {
        name: 'host',
        displayName: 'Host',
        operations: [
          {
            name: 'lookup',
            displayName: 'Lookup IP',
            method: 'GET',
            path: '/shodan/host/{ip}',
            properties: [
              { name: 'ip', displayName: 'IP Address', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'haveibeenpwned',
    name: 'Have I Been Pwned',
    description: 'Check if email addresses or accounts have appeared in known corporate data breaches',
    category: 'cloud',
    icon: 'alert-triangle',
    color: '#0084ff',
    baseURL: 'https://haveibeenpwned.com/api/v3',
    auth: {
      type: 'header',
      headerName: 'hibp-api-key',
      credentialType: 'hibp_api_key'
    },
    resources: [
      {
        name: 'breach',
        displayName: 'Breach Check',
        operations: [
          {
            name: 'account',
            displayName: 'Check Account',
            method: 'GET',
            path: '/breachedaccount/{account}',
            properties: [
              { name: 'account', displayName: 'Email Address or Username', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'ipinfo',
    name: 'IPinfo',
    description: 'Lookup geolocation, ASN network provider, carrier, and company data for IP addresses',
    category: 'cloud',
    icon: 'map-pin',
    color: '#004fe8',
    baseURL: 'https://ipinfo.io',
    auth: {
      type: 'bearer',
      credentialType: 'ipinfo_token'
    },
    resources: [
      {
        name: 'ip',
        displayName: 'IP Address',
        operations: [
          {
            name: 'lookup',
            displayName: 'Lookup IP Details',
            method: 'GET',
            path: '/{ip}/json',
            properties: [
              { name: 'ip', displayName: 'IP Address (leave empty for current)', type: 'string' }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'abuseipdb',
    name: 'AbuseIPDB',
    description: 'Check reputation scores and report malicious IP addresses engaged in cyber attacks',
    category: 'cloud',
    icon: 'shield-off',
    color: '#282b30',
    baseURL: 'https://api.abuseipdb.com/api/v2',
    auth: {
      type: 'header',
      headerName: 'Key',
      credentialType: 'abuseipdb_key'
    },
    resources: [
      {
        name: 'check',
        displayName: 'Check IP',
        operations: [
          {
            name: 'check',
            displayName: 'Check IP Abuse Score',
            method: 'GET',
            path: '/check',
            properties: [
              { name: 'ipAddress', displayName: 'IP Address', type: 'string', required: true }
            ],
            queryParameters: {
              ipAddress: '$param:ipAddress'
            }
          }
        ]
      }
    ]
  }
];
