import { DeclarativeManifest } from '../declarative-node';

export const WAVE10_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // AI, LLM & MACHINE LEARNING INFERENCE
  // ==========================================
  {
    type: 'fireworks_ai',
    name: 'Fireworks AI',
    description: 'Ultra high-speed open-source LLM inference and function calling via Fireworks AI',
    category: 'ai',
    icon: 'zap',
    color: '#ff4d4f',
    baseURL: 'https://api.fireworks.ai/inference/v1',
    auth: {
      type: 'bearer',
      credentialType: 'fireworks_api_key'
    },
    resources: [
      {
        name: 'chat',
        displayName: 'Chat Completion',
        operations: [
          {
            name: 'create',
            displayName: 'Generate Chat',
            method: 'POST',
            path: '/chat/completions',
            properties: [
              { name: 'model', displayName: 'Model', type: 'string', required: true, default: 'accounts/fireworks/models/llama-v3p1-70b-instruct' },
              { name: 'prompt', displayName: 'User Message', type: 'string', required: true },
              { name: 'temperature', displayName: 'Temperature', type: 'number', default: 0.7 }
            ],
            bodyParameters: {
              model: '$param:model',
              messages: [{ role: 'user', content: '$param:prompt' }],
              temperature: '$param:temperature'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'stability_ai',
    name: 'Stability AI',
    description: 'Generate photorealistic images and art using Stable Diffusion 3 and SDXL',
    category: 'ai',
    icon: 'image',
    color: '#7b16ff',
    baseURL: 'https://api.stability.ai/v1',
    auth: {
      type: 'bearer',
      credentialType: 'stability_key'
    },
    resources: [
      {
        name: 'image',
        displayName: 'Image',
        operations: [
          {
            name: 'generate',
            displayName: 'Text to Image',
            method: 'POST',
            path: '/generation/{engineId}/text-to-image',
            properties: [
              { name: 'engineId', displayName: 'Engine ID', type: 'string', default: 'stable-diffusion-xl-1024-v1-0' },
              { name: 'prompt', displayName: 'Text Prompt', type: 'string', required: true },
              { name: 'samples', displayName: 'Number of Images', type: 'number', default: 1 }
            ],
            bodyParameters: {
              text_prompts: [{ text: '$param:prompt' }],
              samples: '$param:samples'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'huggingface',
    name: 'Hugging Face',
    description: 'Execute inference across 100,000+ open-source AI models via Hugging Face Serverless API',
    category: 'ai',
    icon: 'smile',
    color: '#ffcc00',
    baseURL: 'https://api-inference.huggingface.co/models',
    auth: {
      type: 'bearer',
      credentialType: 'huggingface_token'
    },
    resources: [
      {
        name: 'model',
        displayName: 'Model',
        operations: [
          {
            name: 'predict',
            displayName: 'Run Inference',
            method: 'POST',
            path: '/{modelId}',
            properties: [
              { name: 'modelId', displayName: 'Model ID (e.g. meta-llama/Llama-3-8B)', type: 'string', required: true },
              { name: 'inputs', displayName: 'Input Text / Payload', type: 'string', required: true }
            ],
            bodyParameters: {
              inputs: '$param:inputs'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'voyage_ai',
    name: 'Voyage AI',
    description: 'Generate state-of-the-art dense semantic text embeddings optimized for retrieval & RAG',
    category: 'ai',
    icon: 'compass',
    color: '#2a5ee8',
    baseURL: 'https://api.voyageai.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'voyage_api_key'
    },
    resources: [
      {
        name: 'embeddings',
        displayName: 'Embeddings',
        operations: [
          {
            name: 'create',
            displayName: 'Create Embeddings',
            method: 'POST',
            path: '/embeddings',
            properties: [
              { name: 'input', displayName: 'Input Text', type: 'string', required: true },
              { name: 'model', displayName: 'Model', type: 'string', default: 'voyage-3' }
            ],
            bodyParameters: {
              input: ['$param:input'],
              model: '$param:model'
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // SPEECH, AUDIO & VOICE
  // ==========================================
  {
    type: 'deepgram',
    name: 'Deepgram',
    description: 'Transcribe spoken audio with lightning-fast Nova-2 speech-to-text models',
    category: 'ai',
    icon: 'mic',
    color: '#13ef95',
    baseURL: 'https://api.deepgram.com/v1',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'Token ',
      credentialType: 'deepgram_api_key'
    },
    resources: [
      {
        name: 'listen',
        displayName: 'Speech to Text',
        operations: [
          {
            name: 'transcribeUrl',
            displayName: 'Transcribe Audio URL',
            method: 'POST',
            path: '/listen',
            properties: [
              { name: 'url', displayName: 'Audio File URL', type: 'string', required: true },
              { name: 'model', displayName: 'Model', type: 'string', default: 'nova-2' },
              { name: 'smart_format', displayName: 'Smart Formatting', type: 'boolean', default: true }
            ],
            queryParameters: {
              model: '$param:model',
              smart_format: '$param:smart_format'
            },
            bodyParameters: {
              url: '$param:url'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'assemblyai',
    name: 'AssemblyAI',
    description: 'Transcribe audio files, detect speakers, and extract AI summaries with AssemblyAI',
    category: 'ai',
    icon: 'volume-2',
    color: '#1451f5',
    baseURL: 'https://api.assemblyai.com/v2',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'assemblyai_key'
    },
    resources: [
      {
        name: 'transcript',
        displayName: 'Transcript',
        operations: [
          {
            name: 'submit',
            displayName: 'Submit Audio',
            method: 'POST',
            path: '/transcript',
            properties: [
              { name: 'audio_url', displayName: 'Audio File URL', type: 'string', required: true },
              { name: 'speaker_labels', displayName: 'Speaker Diarization', type: 'boolean', default: true }
            ],
            bodyParameters: {
              audio_url: '$param:audio_url',
              speaker_labels: '$param:speaker_labels'
            }
          },
          {
            name: 'get',
            displayName: 'Get Transcript Status',
            method: 'GET',
            path: '/transcript/{transcriptId}',
            properties: [
              { name: 'transcriptId', displayName: 'Transcript ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'speechify',
    name: 'Speechify',
    description: 'Synthesize natural, human-like voice audio from text with Speechify Voice API',
    category: 'ai',
    icon: 'volume-up',
    color: '#3483fa',
    baseURL: 'https://api.sws.speechify.com/v1',
    auth: {
      type: 'bearer',
      credentialType: 'speechify_token'
    },
    resources: [
      {
        name: 'voice',
        displayName: 'Voice Synthesis',
        operations: [
          {
            name: 'synthesize',
            displayName: 'Convert Text to Speech',
            method: 'POST',
            path: '/audio/speech',
            properties: [
              { name: 'input', displayName: 'Input Text', type: 'string', required: true },
              { name: 'voice_id', displayName: 'Voice ID', type: 'string', default: 'george' }
            ],
            bodyParameters: {
              input: '$param:input',
              voice_id: '$param:voice_id'
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // VECTOR DATABASES & SEMANTIC RETRIEVAL
  // ==========================================
  {
    type: 'weaviate',
    name: 'Weaviate',
    description: 'Query vector objects and semantic hybrid search in Weaviate Cloud Vector Database',
    category: 'database',
    icon: 'database',
    color: '#00d284',
    baseURL: 'https://{clusterEndpoint}/v1',
    auth: {
      type: 'bearer',
      credentialType: 'weaviate_api_key'
    },
    resources: [
      {
        name: 'objects',
        displayName: 'Objects',
        operations: [
          {
            name: 'create',
            displayName: 'Insert Object',
            method: 'POST',
            path: '/objects',
            properties: [
              { name: 'clusterEndpoint', displayName: 'Weaviate Cluster Host', type: 'string', required: true },
              { name: 'class', displayName: 'Class Name', type: 'string', required: true },
              { name: 'properties', displayName: 'Properties JSON', type: 'json', required: true }
            ],
            bodyParameters: {
              class: '$param:class',
              properties: '$param:properties'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'chroma',
    name: 'Chroma Vector DB',
    description: 'Store embeddings, documents, and query nearest neighbor vectors with Chroma',
    category: 'database',
    icon: 'layers',
    color: '#ff4f00',
    baseURL: 'https://{chromaHost}/api/v1',
    auth: {
      type: 'bearer',
      credentialType: 'chroma_token'
    },
    resources: [
      {
        name: 'collection',
        displayName: 'Collection',
        operations: [
          {
            name: 'add',
            displayName: 'Add Items to Collection',
            method: 'POST',
            path: '/collections/{collectionId}/add',
            properties: [
              { name: 'chromaHost', displayName: 'Chroma Server Host', type: 'string', required: true },
              { name: 'collectionId', displayName: 'Collection ID', type: 'string', required: true },
              { name: 'documents', displayName: 'Documents Array', type: 'json', required: true },
              { name: 'ids', displayName: 'IDs Array', type: 'json', required: true }
            ],
            bodyParameters: {
              documents: '$param:documents',
              ids: '$param:ids'
            }
          }
        ]
      }
    ]
  },

  // ==========================================
  // COMPUTER VISION & OBJECT RECOGNITION
  // ==========================================
  {
    type: 'clarifai',
    name: 'Clarifai',
    description: 'Recognize objects, concepts, faces, and moderate images via Clarifai Vision AI',
    category: 'ai',
    icon: 'camera',
    color: '#181b20',
    baseURL: 'https://api.clarifai.com/v2',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'Key ',
      credentialType: 'clarifai_key'
    },
    resources: [
      {
        name: 'model',
        displayName: 'Model Prediction',
        operations: [
          {
            name: 'predictUrl',
            displayName: 'Predict from Image URL',
            method: 'POST',
            path: '/models/{modelId}/outputs',
            properties: [
              { name: 'modelId', displayName: 'Model ID (e.g. general-image-recognition)', type: 'string', default: 'general-image-recognition' },
              { name: 'imageUrl', displayName: 'Image URL', type: 'string', required: true }
            ],
            bodyParameters: {
              inputs: [
                {
                  data: {
                    image: { url: '$param:imageUrl' }
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  },

  {
    type: 'roboflow',
    name: 'Roboflow',
    description: 'Run custom computer vision object detection and classification models with Roboflow',
    category: 'ai',
    icon: 'eye',
    color: '#6706ce',
    baseURL: 'https://detect.roboflow.com',
    auth: {
      type: 'apiKey',
      queryParamName: 'api_key',
      credentialType: 'roboflow_api_key'
    },
    resources: [
      {
        name: 'inference',
        displayName: 'Inference',
        operations: [
          {
            name: 'detect',
            displayName: 'Detect Objects from Image URL',
            method: 'POST',
            path: '/{modelEndpoint}',
            properties: [
              { name: 'modelEndpoint', displayName: 'Model Endpoint / Version', type: 'string', required: true },
              { name: 'image', displayName: 'Image URL', type: 'string', required: true }
            ],
            queryParameters: {
              image: '$param:image'
            }
          }
        ]
      }
    ]
  }
];
