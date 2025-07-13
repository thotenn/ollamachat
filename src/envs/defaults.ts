export const DEFAULTS = {
  ASSISTANT: {
    ID: 'default-assistant',
    NAME: 'Asistente General',
    DESCRIPTION: 'Asistente de propósito general para conversaciones',
    INSTRUCTIONS: 'Eres un asistente útil y amigable. Responde de manera clara y concisa a las preguntas del usuario.',
  },
  TIMEOUTS: {
    LONG: 30000, // 30 seconds
    MEDIUM: 10000, // 10 seconds
    SHORT: 5000, // 5 seconds
    DELAY: 50, // 50ms
  },
  LIMITS: {
    MAX_TOKENS: 4096,
    MESSAGE_INPUT_LENGTH: 1000,
  },
  TIME: {
    MS_IN_DAY: 1000 * 60 * 60 * 24,
  },
} as const;