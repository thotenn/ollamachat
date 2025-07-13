export const PROVIDERS = {
  IDS: {
    OLLAMA: 'ollama-default',
    ANTHROPIC: 'anthropic-default',
    OPENAI: 'openai-default',
    GEMINI: 'gemini-default',
  },
  TYPES: {
    OLLAMA: 'ollama',
    ANTHROPIC: 'anthropic',
    OPENAI: 'openai',
    GEMINI: 'gemini',
  },
  NAMES: {
    OLLAMA: 'Ollama',
    ANTHROPIC: 'Anthropic',
    OPENAI: 'OpenAI',
    GEMINI: 'Google Gemini',
  },
} as const;

export type ProviderType = typeof PROVIDERS.TYPES[keyof typeof PROVIDERS.TYPES];