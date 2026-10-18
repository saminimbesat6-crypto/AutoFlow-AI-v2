import { DeclarativeManifest } from '../declarative-node';

export const WAVE23_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // IDENTITY, ACCESS MANAGEMENT & SECURITY
  // ==========================================
  {
    type: 'okta_users',
    name: 'Okta Users',
    description: 'Manage workforce identity, provision users, and assign enterprise groups in Okta',
    category: 'cloud',
    icon: 'user-check',
    color: '#007dc1',
    baseURL: 'https://{oktaDomain}/api/v1',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'SSWS ',
      credentialType: 'okta_api_token'
    },
    resources: [
      {
        name: 'user',
        displayName: 'User',
        operations: [
          {
            name: 'create',
            displayName: 'Create User',
            method: 'POST',
            path: '/users?activate=true',
            properties: [
              { name: 'oktaDomain', displayName: 'Okta Domain', type: 'string', required: true },
              { name: 'firstName', displayName: 'First Name', type: 'string', required: true },
              { name: 'lastName', displayName: 'Last Name', type: 'string', required: true },
              { name: 'email', displayName: 'Email', type: 'string', required: true }
            ],
            bodyParameters: {
              profile: {
                firstName: '$param:firstName',
                lastName: '$param:lastName',
                email: '$param:email',
                login: '$param:email'
              }
            }
          }
        ]
      }
    ]
  },

  {
    type: 'auth0_users',
    name: 'Auth0 Users',
    description: 'Create customer identities, reset passwords, and inspect user profiles in Auth0',
    category: 'cloud',
    icon: 'lock',
    color: '#eb5424',
    baseURL: 'https://{auth0Domain}/api/v2',
    auth: {
      type: 'bearer',
      credentialType: 'auth0_management_token'
    },
    resources: [
      {
        name: 'user',
        displayName: 'User',
        operations: [
          {
            name: 'create',
            displayName: 'Create User',
            method: 'POST',
            path: '/users',
            properties: [
              { name: 'auth0Domain', displayName: 'Auth0 Domain', type: 'string', required: true },
              { name: 'email', displayName: 'Email', type: 'string', required: true },
              { name: 'connection', displayName: 'Connection Name', type: 'string', default: 'Username-Password-Authentication' }
            ],
            bodyParameters: {
              email: '$param:email',
              connection: '$param:connection'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'tailscale',
    name: 'Tailscale VPN',
    description: 'Inspect devices, routes, and manage private WireGuard mesh networks in Tailscale',
    category: 'cloud',
    icon: 'shield',
    color: '#2d3748',
    baseURL: 'https://api.tailscale.com/api/v2',
    auth: {
      type: 'basic',
      credentialType: 'tailscale_api_key'
    },
    resources: [
      {
        name: 'devices',
        displayName: 'Devices',
        operations: [
          {
            name: 'list',
            displayName: 'List Tailnet Devices',
            method: 'GET',
            path: '/tailnet/{tailnet}/devices',
            itemsPath: 'devices',
            properties: [
              { name: 'tailnet', displayName: 'Tailnet Organization or "-"', type: 'string', default: '-' }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'urlscan_io',
    name: 'URLScan.io',
    description: 'Submit suspicious URLs for automated sandbox scanning, DOM analysis, and screenshots',
    category: 'cloud',
    icon: 'search',
    color: '#222222',
    baseURL: 'https://urlscan.io/api/v1',
    auth: {
      type: 'header',
      headerName: 'API-Key',
      credentialType: 'urlscan_api_key'
    },
    resources: [
      {
        name: 'scan',
        displayName: 'Scan',
        operations: [
          {
            name: 'submit',
            displayName: 'Submit URL to Scan',
            method: 'POST',
            path: '/scan',
            properties: [
              { name: 'url', displayName: 'Target URL', type: 'string', required: true },
              { name: 'visibility', displayName: 'Visibility', type: 'options', options: [{ name: 'Public', value: 'public' }, { name: 'Unlisted', value: 'unlisted' }, { name: 'Private', value: 'private' }], default: 'public' }
            ],
            bodyParameters: {
              url: '$param:url',
              visibility: '$param:visibility'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'securitytrails',
    name: 'SecurityTrails',
    description: 'Discover subdomains, historical DNS changes, and WHOIS intelligence with SecurityTrails',
    category: 'cloud',
    icon: 'globe',
    color: '#0052cc',
    baseURL: 'https://api.securitytrails.com/v1',
    auth: {
      type: 'header',
      headerName: 'APIKEY',
      credentialType: 'securitytrails_api_key'
    },
    resources: [
      {
        name: 'subdomains',
        displayName: 'Subdomains',
        operations: [
          {
            name: 'list',
            displayName: 'Get Subdomains',
            method: 'GET',
            path: '/domain/{hostname}/subdomains',
            itemsPath: 'subdomains',
            properties: [
              { name: 'hostname', displayName: 'Root Domain (e.g. example.com)', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  }
];
