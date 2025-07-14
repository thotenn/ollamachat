export const DEFAULTS = {
  ASSISTANT: {
    ID: 'default-assistant',
    NAME: 'Asistente General',
    DESCRIPTION: 'Asistente de propósito general para conversaciones',
    INSTRUCTIONS: 'Eres un asistente útil y amigable. Responde de manera clara y concisa a las preguntas del usuario.',
  },
  TIMEOUTS: {
    LONG: 120000, // 2 minutes for generation
    MEDIUM: 15000, // 15 seconds for model fetching
    SHORT: 8000, // 8 seconds for connection check
    DELAY: 50, // 50ms
    RETRY_DELAY: 2000, // 2 seconds between retries
  },
  LIMITS: {
    MAX_TOKENS: 4096,
    MESSAGE_INPUT_LENGTH: 1000,
  },
  TIME: {
    MS_IN_DAY: 1000 * 60 * 60 * 24,
  },
} as const;