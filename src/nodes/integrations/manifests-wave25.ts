import { DeclarativeManifest } from '../declarative-node';

export const WAVE25_INTEGRATION_MANIFESTS: DeclarativeManifest[] = [
  // ==========================================
  // REAL-TIME APIS, CRYPTO, WEB & SCRAPING
  // ==========================================
  {
    type: 'openweathermap',
    name: 'OpenWeatherMap',
    description: 'Fetch current weather observations, wind speed, temperature, and forecasts worldwide',
    category: 'app',
    icon: 'sun',
    color: '#eb6e4b',
    baseURL: 'https://api.openweathermap.org/data/2.5',
    auth: {
      type: 'apiKey',
      queryParamName: 'appid',
      credentialType: 'openweather_api_key'
    },
    resources: [
      {
        name: 'weather',
        displayName: 'Weather',
        operations: [
          {
            name: 'current',
            displayName: 'Current Weather by City',
            method: 'GET',
            path: '/weather',
            properties: [
              { name: 'q', displayName: 'City Name', type: 'string', required: true },
              { name: 'units', displayName: 'Units', type: 'options', options: [{ name: 'Metric (Celsius)', value: 'metric' }, { name: 'Imperial (Fahrenheit)', value: 'imperial' }, { name: 'Standard (Kelvin)', value: 'standard' }], default: 'metric' }
            ],
            queryParameters: {
              q: '$param:q',
              units: '$param:units'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'weather_api',
    name: 'WeatherAPI',
    description: 'Accurate global weather forecasts, air quality index, and astronomy data',
    category: 'app',
    icon: 'cloud-rain',
    color: '#3498db',
    baseURL: 'https://api.weatherapi.com/v1',
    auth: {
      type: 'apiKey',
      queryParamName: 'key',
      credentialType: 'weatherapi_key'
    },
    resources: [
      {
        name: 'forecast',
        displayName: 'Forecast',
        operations: [
          {
            name: 'forecast',
            displayName: 'Get Weather Forecast',
            method: 'GET',
            path: '/forecast.json',
            properties: [
              { name: 'q', displayName: 'City or Coordinates', type: 'string', required: true },
              { name: 'days', displayName: 'Number of Days', type: 'number', default: 3 }
            ],
            queryParameters: {
              q: '$param:q',
              days: '$param:days'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'coingecko',
    name: 'CoinGecko',
    description: 'Fetch live cryptocurrency prices, trading volumes, and market caps across 10,000+ coins',
    category: 'app',
    icon: 'dollar-sign',
    color: '#8dc63f',
    baseURL: 'https://api.coingecko.com/api/v3',
    auth: {
      type: 'header',
      headerName: 'x-cg-demo-api-key',
      credentialType: 'coingecko_api_key'
    },
    resources: [
      {
        name: 'price',
        displayName: 'Simple Price',
        operations: [
          {
            name: 'getPrice',
            displayName: 'Get Simple Price',
            method: 'GET',
            path: '/simple/price',
            properties: [
              { name: 'ids', displayName: 'Crypto IDs (comma separated, e.g. bitcoin,ethereum)', type: 'string', required: true, default: 'bitcoin,ethereum' },
              { name: 'vs_currencies', displayName: 'Target Currencies (e.g. usd,eur)', type: 'string', required: true, default: 'usd' }
            ],
            queryParameters: {
              ids: '$param:ids',
              vs_currencies: '$param:vs_currencies'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'coinmarketcap',
    name: 'CoinMarketCap',
    description: 'Official CoinMarketCap professional cryptocurrency market quotes and rankings API',
    category: 'app',
    icon: 'trending-up',
    color: '#1751d0',
    baseURL: 'https://pro-api.coinmarketcap.com/v1',
    auth: {
      type: 'header',
      headerName: 'X-CMC_PRO_API_KEY',
      credentialType: 'cmc_api_key'
    },
    resources: [
      {
        name: 'quotes',
        displayName: 'Quotes',
        operations: [
          {
            name: 'latest',
            displayName: 'Get Latest Quotes',
            method: 'GET',
            path: '/cryptocurrency/quotes/latest',
            itemsPath: 'data',
            properties: [
              { name: 'symbol', displayName: 'Crypto Symbols (e.g. BTC,ETH,SOL)', type: 'string', required: true, default: 'BTC,ETH' }
            ],
            queryParameters: {
              symbol: '$param:symbol'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'serpapi',
    name: 'SerpAPI',
    description: 'Scrape Google, Bing, YouTube, and Baidu search results in clean structured JSON',
    category: 'app',
    icon: 'search',
    color: '#4285f4',
    baseURL: 'https://serpapi.com',
    auth: {
      type: 'apiKey',
      queryParamName: 'api_key',
      credentialType: 'serpapi_key'
    },
    resources: [
      {
        name: 'search',
        displayName: 'Google Search',
        operations: [
          {
            name: 'search',
            displayName: 'Search Google',
            method: 'GET',
            path: '/search',
            itemsPath: 'organic_results',
            properties: [
              { name: 'q', displayName: 'Search Query', type: 'string', required: true },
              { name: 'location', displayName: 'Location', type: 'string', default: 'United States' }
            ],
            queryParameters: {
              q: '$param:q',
              location: '$param:location',
              engine: 'google'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'scrapingbee',
    name: 'ScrapingBee',
    description: 'Render headless browser JavaScript, bypass anti-bot captchas, and scrape web data',
    category: 'app',
    icon: 'globe',
    color: '#fdbd39',
    baseURL: 'https://app.scrapingbee.com/api/v1',
    auth: {
      type: 'apiKey',
      queryParamName: 'api_key',
      credentialType: 'scrapingbee_key'
    },
    resources: [
      {
        name: 'scrape',
        displayName: 'Scrape',
        operations: [
          {
            name: 'extract',
            displayName: 'Scrape Webpage HTML',
            method: 'GET',
            path: '/',
            properties: [
              { name: 'url', displayName: 'Target Webpage URL', type: 'string', required: true },
              { name: 'render_js', displayName: 'Render JavaScript', type: 'boolean', default: true }
            ],
            queryParameters: {
              url: '$param:url',
              render_js: '$param:render_js'
            }
          }
        ]
      }
    ]
  },

  {
    type: 'formspree',
    name: 'Formspree',
    description: 'Receive HTML form submissions, trigger email notifications, and download submissions',
    category: 'app',
    icon: 'inbox',
    color: '#e53935',
    baseURL: 'https://formspree.io/api/v1',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      tokenPrefix: 'Bearer ',
      credentialType: 'formspree_api_key'
    },
    resources: [
      {
        name: 'submissions',
        displayName: 'Submissions',
        operations: [
          {
            name: 'list',
            displayName: 'List Form Submissions',
            method: 'GET',
            path: '/forms/{formId}/submissions',
            itemsPath: 'submissions',
            properties: [
              { name: 'formId', displayName: 'Form ID', type: 'string', required: true }
            ]
          }
        ]
      }
    ]
  },

  {
    type: 'pusher',
    name: 'Pusher Channels',
    description: 'Trigger real-time WebSockets events to web and mobile apps with Pusher Channels',
    category: 'communication',
    icon: 'radio',
    color: '#7b16ff',
    baseURL: 'https://api-{cluster}.pusher.com/apps/{appId}',
    auth: {
      type: 'header',
      headerName: 'Authorization',
      credentialType: 'pusher_auth'
    },
    resources: [
      {
        name: 'event',
        displayName: 'Event',
        operations: [
          {
            name: 'trigger',
            displayName: 'Trigger Event',
            method: 'POST',
            path: '/events',
            properties: [
              { name: 'cluster', displayName: 'Cluster (e.g. us2, eu)', type: 'string', default: 'us2' },
              { name: 'appId', displayName: 'Pusher App ID', type: 'string', required: true },
              { name: 'channel', displayName: 'Channel Name', type: 'string', required: true },
              { name: 'name', displayName: 'Event Name', type: 'string', required: true },
              { name: 'data', displayName: 'Event Payload JSON', type: 'string', required: true }
            ],
            bodyParameters: {
              name: '$param:name',
              channel: '$param:channel',
              data: '$param:data'
            }
          }
        ]
      }
    ]
  }
];
