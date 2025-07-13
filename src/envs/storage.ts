export const STORAGE_KEYS = {
  SETTINGS: '@ollamachat:settings',
} as const;

export const DATABASE = {
  SQLITE: {
    NAME: 'ollamachat.db',
  },
  INDEXEDDB: {
    NAME: 'ollamachat_db',
  },
  TABLES: {
    PROVIDERS: 'providers',
    ASSISTANTS: 'assistants',
    CONVERSATIONS: 'conversations',
    MESSAGES: 'messages',
    SETTINGS: 'settings',
    DATABASE: 'database',
  },
} as const;