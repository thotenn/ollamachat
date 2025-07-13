export const MODELS = {
  OLLAMA: {
    DEFAULT: 'llama2',
  },
  ANTHROPIC: {
    CLAUDE_OPUS_4: 'claude-opus-4-20250514',
    CLAUDE_SONNET_4: 'claude-sonnet-4-20250514',
    CLAUDE_3_7_SONNET: 'claude-3-7-sonnet-20250219',
    CLAUDE_3_5_SONNET: 'claude-3-5-sonnet-20241022',
    CLAUDE_3_5_SONNET_JUNE: 'claude-3-5-sonnet-20240620',
    CLAUDE_3_5_HAIKU: 'claude-3-5-haiku-20241022',
    CLAUDE_3_OPUS: 'claude-3-opus-20240229',
    CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
    CLAUDE_3_HAIKU: 'claude-3-haiku-20240307',
    CLAUDE_2_1: 'claude-2.1',
    CLAUDE_2_0: 'claude-2.0',
    CLAUDE_INSTANT_1_2: 'claude-instant-1.2',
  },
  OPENAI: {
    GPT_3_5_TURBO: 'gpt-3.5-turbo',
    GPT_4: 'gpt-4',
    GPT_4_TURBO: 'gpt-4-turbo',
  },
  GEMINI: {
    PRO: 'gemini-pro',
    PRO_VISION: 'gemini-pro-vision',
    PRO_1_5: 'gemini-1.5-pro',
    FLASH_1_5: 'gemini-1.5-flash',
  },
} as const;

export const MODEL_LISTS = {
  ANTHROPIC: [
    { id: MODELS.ANTHROPIC.CLAUDE_SONNET_4, name: 'Claude Sonnet 4' },
    { id: MODELS.ANTHROPIC.CLAUDE_3_5_SONNET, name: 'Claude 3.5 Sonnet' },
    { id: MODELS.ANTHROPIC.CLAUDE_3_5_HAIKU, name: 'Claude 3.5 Haiku' },
    { id: MODELS.ANTHROPIC.CLAUDE_3_OPUS, name: 'Claude 3 Opus' },
    { id: MODELS.ANTHROPIC.CLAUDE_3_SONNET, name: 'Claude 3 Sonnet' },
    { id: MODELS.ANTHROPIC.CLAUDE_3_HAIKU, name: 'Claude 3 Haiku' },
    { id: MODELS.ANTHROPIC.CLAUDE_2_1, name: 'Claude 2.1' },
    { id: MODELS.ANTHROPIC.CLAUDE_2_0, name: 'Claude 2.0' },
    { id: MODELS.ANTHROPIC.CLAUDE_INSTANT_1_2, name: 'Claude Instant 1.2' },
  ],
  OPENAI: [
    { id: MODELS.OPENAI.GPT_3_5_TURBO, name: 'GPT-3.5 Turbo' },
    { id: MODELS.OPENAI.GPT_4, name: 'GPT-4' },
    { id: MODELS.OPENAI.GPT_4_TURBO, name: 'GPT-4 Turbo' },
  ],
  GEMINI: [
    { id: MODELS.GEMINI.PRO, name: 'Gemini Pro' },
    { id: MODELS.GEMINI.PRO_VISION, name: 'Gemini Pro Vision' },
    { id: MODELS.GEMINI.PRO_1_5, name: 'Gemini 1.5 Pro' },
    { id: MODELS.GEMINI.FLASH_1_5, name: 'Gemini 1.5 Flash' },
  ],
} as const;