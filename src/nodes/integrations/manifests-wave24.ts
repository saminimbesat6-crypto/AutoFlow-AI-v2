import { DeclarativeManifest } from '../declarative-node';

export const WAVE24_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // MEDIA, VIDEO & CREATIVE DESIGN
  // ==========================================
  {
    type: 'cloudinary',
    name: 'Cloudinary',
    description: 'Transform, optimize, and upload images and videos dynamically to Cloudinary',
    category: 'app',
    icon: 'image',
    color: '#3448c5',
    baseURL: 'https://api.cloudinary.com/v1_1/{cloudName}',
    auth: {
      type: 'apiKey',
      queryParamName: 'api_key',
      credentialType: 'cloudinary_auth'
    },
    resources: [
      {
        name: 'image',
        displayName: 'Image',
        operations: [
          {
            name: 'upload',
            displayName: 'Upload from URL',
            method: 'POST',
            path: '/image/upload',
            properties: [
              { name: 'cloudName', displayName: 'Cloud Name', type: 'string', required: true },
              { name: 'file', displayName: 'Image URL or Data URI', type: 'string', required: true },
              { name: 'upload_preset', displayName: 'Upload Preset', type: 'string' }
            ],
            bodyParameters: {
              file: '$param:file',
              upload_preset: '$param:upload_preset'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'bannerbear',
    name: 'Bannerbear',
    description: 'Auto-generate dynamic marketing images, banners, and social share cards from templates',
    category: 'app',
    icon: 'layout',
    color: '#304ffe',
    baseURL: 'https://api.bannerbear.com/v2',
    auth: {
      type: 'bearer',
      credentialType: 'bannerbear_api_key'
    },
    resources: [
      {
        name: 'image',
        displayName: 'Image',
        operations: [
          {
            name: 'create',
            displayName: 'Create Image from Template',
            method: 'POST',
            path: '/images',
            properties: [
              { name: 'template', displayName: 'Template UID', type: 'string', required: true },
              { name: 'modifications', displayName: 'Modifications Array JSON', type: 'json', required: true }
            ],
            bodyParameters: {
              template: '$param:template',
              modifications: '$param:modifications'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'shotstack',
    name: 'Shotstack Video',
    description: 'Cloud video editing API to programmatically composite, cut, and render MP4 videos',
    category: 'app',
    icon: 'video',
    color: '#0052cc',
    baseURL: 'https://api.shotstack.io/v1',
    auth: {
      type: 'header',
      headerName: 'x-api-key',
      credentialType: 'shotstack_api_key'
    },
    resources: [
      {
        name: 'render',
        displayName: 'Render',
        operations: [
          {
            name: 'renderVideo',
            displayName: 'Render Video Timeline',
            method: 'POST',
            path: '/render',
            properties: [
              { name: 'timeline', displayName: 'Timeline JSON', type: 'json', required: true },
              { name: 'output', displayName: 'Output Config JSON', type: 'json', required: true }
            ],
            bodyParameters: {
              timeline: '$param:timeline',
              output: '$param:output'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'creatomate',
    name: 'Creatomate Video',
    description: 'Automate social video production, motion graphics, and subtitles with Creatomate',
    category: 'app',
    icon: 'film',
    color: '#ff2d55',
    baseURL: 'https://api.creatomate.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'creatomate_api_key'
    },
    resources: [
      {
        name: 'render',
        displayName: 'Render',
        operations: [
          {
            name: 'create',
            displayName: 'Render Video from Template',
            method: 'POST',
            path: '/renders',
            properties: [
              { name: 'template_id', displayName: 'Template ID', type: 'string', required: true },
              { name: 'modifications', displayName: 'Modifications JSON', type: 'json' }
            ],
            bodyParameters: {
              template_id: '$param:template_id',
              modifications: '$param:modifications'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'figma',
    name: 'Figma',
    description: 'Inspect design components, styles, comments, and export frames via Figma REST API',
    category: 'app',
    icon: 'figma',
    color: '#f24e1e',
    baseURL: 'https://api.figma.com/v1',
    auth: {
      type: 'header',
      headerName: 'X-Figma-Token',
      credentialType: 'figma_token'
    },
    resources: [
      {
        name: 'file',
        displayName: 'Design File',
        operations: [
          {
            name: 'get',
            displayName: 'Get File Metadata',
            method: 'GET',
            path: '/files/{fileKey}',
            properties: [
              { name: 'fileKey', displayName: 'Figma File Key', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'vimeo',
    name: 'Vimeo',
    description: 'Manage video showcase albums, upload video assets, and query analytics on Vimeo',
    category: 'app',
    icon: 'video',
    color: '#1ab7ea',
    baseURL: 'https://api.vimeo.com',
    auth: {
      type: 'bearer',
      credentialType: 'vimeo_token'
    },
    resources: [
      {
        name: 'video',
        displayName: 'Video',
        operations: [
          {
            name: 'list',
            displayName: 'List My Videos',
            method: 'GET',
            path: '/me/videos',
            itemsPath: 'data'
          }
        ]
      }
    ]
  },

  {
    type: 'transistor_fm',
    name: 'Transistor.fm Podcasts',
    description: 'Publish podcast episodes, inspect audio analytics, and manage feeds on Transistor.fm',
    category: 'app',
    icon: 'mic',
    color: '#fdb714',
    baseURL: 'https://api.transistor.fm/v1',
    auth: {
      type: 'header',
      headerName: 'x-api-key',
      credentialType: 'transistor_api_key'
    },
    resources: [
      {
        name: 'shows',
        displayName: 'Shows',
        operations: [
          {
            name: 'list',
            displayName: 'List Shows',
            method: 'GET',
            path: '/shows',
            itemsPath: 'data'
          }
        ]
      }
    ]
  }
];
