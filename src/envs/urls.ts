export const URLS = {
  OLLAMA: {
    DEFAULT: 'http://localhost:11434',
    API: {
      GENERATE: '/api/generate',
      TAGS: '/api/tags',
    },
  },
  ANTHROPIC: {
    API: 'https://api.anthropic.com',
    CORS_PROXY: 'http://localhost:8010',
    API_VERSION: '2023-06-01',
  },
  OPENAI: {
    API: 'https://api.openai.com',
    CORS_PROXY: 'http://localhost:8011',
  },
  GEMINI: {
    API: 'https://generativelanguage.googleapis.com',
    CORS_PROXY: 'http://localhost:8012',
    API_PREFIX: '/v1beta',
  },
  SQL_JS: {
    CDN: 'https://sql.js.org/dist',
  },
  PROXY_PREFIX: '/proxy',
} as const;

export const PORTS = {
  OLLAMA: 11434,
  CORS_PROXY: {
    ANTHROPIC: 8010,
    OPENAI: 8011,
    GEMINI: 8012,
  },
} as const;