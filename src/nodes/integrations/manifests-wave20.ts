import { DeclarativeManifest } from '../declarative-node';

export const WAVE20_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // MULTI-PROVIDER AI & VECTOR RETRIEVAL
  // ==========================================
  {
    type: 'anthropic_claude',
    name: 'Anthropic Claude',
    description: 'Invoke Claude 3.5 Sonnet, Claude 3 Opus, and Claude 3 Haiku reasoning models',
    category: 'ai',
    icon: 'cpu',
    color: '#d97757',
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
            headers: {
              'anthropic-version': '2023-06-01'
            },
            properties: [
              { name: 'model', displayName: 'Model', type: 'string', required: true, default: 'claude-3-5-sonnet-20241022' },
              { name: 'prompt', displayName: 'User Message', type: 'string', required: true },
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
    type: 'groq_ai',
    name: 'Groq Cloud',
    description: 'Run blazing fast inference at 500+ tokens/sec on Groq LPU hardware',
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
            name: 'create',
            displayName: 'Create Chat',
            method: 'POST',
            path: '/chat/completions',
            properties: [
              { name: 'model', displayName: 'Model', type: 'string', required: true, default: 'llama-3.1-70b-versatile' },
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
    type: 'mistral_ai',
    name: 'Mistral AI',
    description: 'Generate responses with Mistral Large, Codestral, and Pixtral vision models',
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
            name: 'create',
            displayName: 'Create Chat',
            method: 'POST',
            path: '/chat/completions',
            properties: [
              { name: 'model', displayName: 'Model', type: 'string', required: true, default: 'mistral-large-latest' },
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
    type: 'cohere_rerank',
    name: 'Cohere Rerank',
    description: 'Rerank search results and retrieved documents with Cohere state-of-the-art reranker',
    category: 'ai',
    icon: 'sliders',
    color: '#395949',
    baseURL: 'https://api.cohere.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'cohere_api_key'
    },
    resources: [
      {
        name: 'rerank',
        displayName: 'Rerank',
        operations: [
          {
            name: 'rerank',
            displayName: 'Rerank Documents',
            method: 'POST',
            path: '/rerank',
            properties: [
              { name: 'query', displayName: 'Search Query', type: 'string', required: true },
              { name: 'documents', displayName: 'Documents Array', type: 'json', required: true },
              { name: 'model', displayName: 'Model', type: 'string', default: 'rerank-english-v3.0' }
            ],
            bodyParameters: {
              query: '$param:query',
              documents: '$param:documents',
              model: '$param:model'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'deepseek_coder',
    name: 'DeepSeek Coder',
    description: 'AI code generation, infilling, and software refactoring via DeepSeek Coder API',
    category: 'ai',
    icon: 'code',
    color: '#0066cc',
    baseURL: 'https://api.deepseek.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'deepseek_api_key'
    },
    resources: [
      {
        name: 'chat',
        displayName: 'Chat',
        operations: [
          {
            name: 'create',
            displayName: 'Create Chat',
            method: 'POST',
            path: '/chat/completions',
            properties: [
              { name: 'prompt', displayName: 'Prompt', type: 'string', required: true },
              { name: 'model', displayName: 'Model', type: 'string', default: 'deepseek-chat' }
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
    type: 'elevenlabs_voice',
    name: 'ElevenLabs Voice',
    description: 'Synthesize emotional, hyper-realistic multilingual voice audio with ElevenLabs',
    category: 'ai',
    icon: 'volume-2',
    color: '#000000',
    baseURL: 'https://api.elevenlabs.io/v1',
    auth: {
      type: 'header',
      headerName: 'xi-api-key',
      credentialType: 'elevenlabs_api_key'
    },
    resources: [
      {
        name: 'textToSpeech',
        displayName: 'Text to Speech',
        operations: [
          {
            name: 'convert',
            displayName: 'Convert Text to Speech',
            method: 'POST',
            path: '/text-to-speech/{voiceId}',
            properties: [
              { name: 'voiceId', displayName: 'Voice ID', type: 'string', required: true, default: '21m00Tcm4TlvDq8ikWAM' },
              { name: 'text', displayName: 'Text to Speak', type: 'string', required: true }
            ],
            bodyParameters: {
              text: '$param:text',
              model_id: 'eleven_multilingual_v2'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'perplexity_search',
    name: 'Perplexity Sonar',
    description: 'Live web intelligence and real-time grounded search with citations via Perplexity AI',
    category: 'ai',
    icon: 'search',
    color: '#1fb5a2',
    baseURL: 'https://api.perplexity.ai',
    auth: {
      type: 'bearer',
      credentialType: 'perplexity_api_key'
    },
    resources: [
      {
        name: 'sonar',
        displayName: 'Sonar Search',
        operations: [
          {
            name: 'query',
            displayName: 'Ask Sonar',
            method: 'POST',
            path: '/chat/completions',
            properties: [
              { name: 'query', displayName: 'Search Query / Question', type: 'string', required: true },
              { name: 'model', displayName: 'Model', type: 'string', default: 'sonar-pro' }
            ],
            bodyParameters: {
              model: '$param:model',
              messages: [{ role: 'user', content: '$param:query' }]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'pinecone_index',
    name: 'Pinecone Vectors',
    description: 'Upsert vectors and perform millisecond nearest neighbor retrieval in Pinecone index',
    category: 'database',
    icon: 'database',
    color: '#000000',
    baseURL: 'https://{indexHost}',
    auth: {
      type: 'header',
      headerName: 'Api-Key',
      credentialType: 'pinecone_api_key'
    },
    resources: [
      {
        name: 'vectors',
        displayName: 'Vectors',
        operations: [
          {
            name: 'upsert',
            displayName: 'Upsert Vectors',
            method: 'POST',
            path: '/vectors/upsert',
            properties: [
              { name: 'indexHost', displayName: 'Pinecone Index Host URL', type: 'string', required: true },
              { name: 'vectors', displayName: 'Vectors Array JSON', type: 'json', required: true },
              { name: 'namespace', displayName: 'Namespace', type: 'string', default: '' }
            ],
            bodyParameters: {
              vectors: '$param:vectors',
              namespace: '$param:namespace'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'qdrant_search',
    name: 'Qdrant Vectors',
    description: 'Perform payload filtering and vector similarity search in Qdrant cluster',
    category: 'database',
    icon: 'search',
    color: '#dc2626',
    baseURL: 'https://{qdrantHost}',
    auth: {
      type: 'header',
      headerName: 'api-key',
      credentialType: 'qdrant_api_key'
    },
    resources: [
      {
        name: 'points',
        displayName: 'Points',
        operations: [
          {
            name: 'search',
            displayName: 'Search Points',
            method: 'POST',
            path: '/collections/{collectionName}/points/search',
            properties: [
              { name: 'qdrantHost', displayName: 'Qdrant Server Host URL', type: 'string', required: true },
              { name: 'collectionName', displayName: 'Collection Name', type: 'string', required: true },
              { name: 'vector', displayName: 'Query Vector Array', type: 'json', required: true },
              { name: 'limit', displayName: 'Result Limit', type: 'number', default: 10 }
            ],
            bodyParameters: {
              vector: '$param:vector',
              limit: '$param:limit'
            }
          }
        ]
      }
    ]
  }
];
