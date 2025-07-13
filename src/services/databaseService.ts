import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { DatabaseAdapter } from './databaseAdapter';
import { ChatConversation, ChatMessageDB, ChatMessage, Provider, Assistant, AppSettings } from '../types';
import { ProviderType } from '../envs/providers';
import { DATABASE, URLS, DEFAULTS, PROVIDERS } from '../envs';

class NativeDatabaseService implements DatabaseAdapter {
  private db: SQLite.SQLiteDatabase | null = null;
  private pendingMigrationData: any[] | null = null;

  async initDatabase(): Promise<void> {
    try {
      if (this.db) {
        return;
      }
      
      this.db = await SQLite.openDatabaseAsync(DATABASE.SQLITE.NAME);
      
      // Create tables if they don't exist
      await this.createTables();
    } catch (error) {
      this.db = null;
      throw error;
    }
  }

  private async migrateDatabase(): Promise<void> {
    if (!this.db) return;

    try {
      // Check if conversations table exists and has the old schema
      const tableInfo = await this.db.getAllAsync(
        "PRAGMA table_info(conversations)"
      ) as any[];

      if (tableInfo.length > 0) {
        // Check if provider_id column exists
        const hasProviderId = tableInfo.some((col: any) => col.name === 'provider_id');
        
        if (!hasProviderId) {
          // Get existing conversations data
          const existingConversations = await this.db.getAllAsync(
            `SELECT * FROM ${DATABASE.TABLES.CONVERSATIONS}`
          ) as any[];
          
          // Drop old tables
          await this.db.execAsync(`
            DROP TABLE IF EXISTS ${DATABASE.TABLES.MESSAGES};
            DROP TABLE IF EXISTS ${DATABASE.TABLES.CONVERSATIONS};
          `);
          
          // Tables will be recreated with new schema by createTables
          // After tables are created, restore data
          this.pendingMigrationData = existingConversations;
        }
      }
    } catch (error) {
      // Continue with table creation
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if we need to migrate the database
    await this.migrateDatabase();

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${DATABASE.TABLES.PROVIDERS} (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        base_url TEXT NOT NULL,
        api_key TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${DATABASE.TABLES.ASSISTANTS} (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        instructions TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${DATABASE.TABLES.SETTINGS} (
        id TEXT PRIMARY KEY DEFAULT 'default',
        selected_provider_id TEXT NOT NULL,
        selected_model TEXT NOT NULL,
        selected_assistant_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${DATABASE.TABLES.CONVERSATIONS} (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        model TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        assistant_id TEXT NOT NULL,
        context TEXT,
        FOREIGN KEY (provider_id) REFERENCES ${DATABASE.TABLES.PROVIDERS} (id),
        FOREIGN KEY (assistant_id) REFERENCES ${DATABASE.TABLES.ASSISTANTS} (id)
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${DATABASE.TABLES.MESSAGES} (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        text TEXT NOT NULL,
        is_user INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        message_order INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES ${DATABASE.TABLES.CONVERSATIONS} (id) ON DELETE CASCADE
      );
    `);

    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_order 
      ON ${DATABASE.TABLES.MESSAGES} (conversation_id, message_order);
    `);

    await this.initializeDefaultData();
    
    // If we have pending migration data, restore it
    if (this.pendingMigrationData && this.pendingMigrationData.length > 0) {
      await this.restoreMigratedData();
    }
  }

  private getProviderBaseUrl(type: string): string {
    // For web development, use CORS proxy or show warning
    const isWeb = Platform.OS === 'web';
    
    switch (type) {
      case PROVIDERS.TYPES.OLLAMA:
        return URLS.OLLAMA.DEFAULT;
      case PROVIDERS.TYPES.ANTHROPIC:
        return isWeb ? URLS.ANTHROPIC.CORS_PROXY : URLS.ANTHROPIC.API;
      case PROVIDERS.TYPES.OPENAI:
        return isWeb ? URLS.OPENAI.CORS_PROXY : URLS.OPENAI.API;
      case PROVIDERS.TYPES.GEMINI:
        return isWeb ? URLS.GEMINI.CORS_PROXY : URLS.GEMINI.API;
      default:
        return URLS.OLLAMA.DEFAULT;
    }
  }

  private async initializeDefaultData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();

      // Check if we already have providers
    const existingProviders = await this.db.getFirstAsync(`SELECT COUNT(*) as count FROM ${DATABASE.TABLES.PROVIDERS}`) as any;
    
    if (existingProviders.count === 0) {
      // Create default providers
      const defaultProviders = [
        {
          id: PROVIDERS.IDS.OLLAMA,
          name: PROVIDERS.NAMES.OLLAMA,
          type: PROVIDERS.TYPES.OLLAMA,
          baseUrl: this.getProviderBaseUrl(PROVIDERS.TYPES.OLLAMA),
          isDefault: true,
        },
        {
          id: PROVIDERS.IDS.ANTHROPIC,
          name: PROVIDERS.NAMES.ANTHROPIC,
          type: PROVIDERS.TYPES.ANTHROPIC,
          baseUrl: this.getProviderBaseUrl(PROVIDERS.TYPES.ANTHROPIC),
          isDefault: false,
        },
        {
          id: PROVIDERS.IDS.OPENAI,
          name: PROVIDERS.NAMES.OPENAI,
          type: PROVIDERS.TYPES.OPENAI,
          baseUrl: this.getProviderBaseUrl(PROVIDERS.TYPES.OPENAI),
          isDefault: false,
        },
        {
          id: PROVIDERS.IDS.GEMINI,
          name: PROVIDERS.NAMES.GEMINI,
          type: PROVIDERS.TYPES.GEMINI,
          baseUrl: this.getProviderBaseUrl(PROVIDERS.TYPES.GEMINI),
          isDefault: false,
        },
      ];

      for (const provider of defaultProviders) {
        try {
          await this.db.runAsync(
            `INSERT OR IGNORE INTO ${DATABASE.TABLES.PROVIDERS} (id, name, type, base_url, api_key, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [provider.id, provider.name, provider.type, provider.baseUrl, null, provider.isDefault ? 1 : 0, now, now]
          );
        } catch (insertError) {
          // Provider already exists, skip
        }
      }
    }

    // Check if we already have assistants
    const existingAssistants = await this.db.getFirstAsync(`SELECT COUNT(*) as count FROM ${DATABASE.TABLES.ASSISTANTS}`) as any;
    
    if (existingAssistants.count === 0) {
      // Create default assistant
      const defaultAssistant = {
        id: DEFAULTS.ASSISTANT.ID,
        name: DEFAULTS.ASSISTANT.NAME,
        description: DEFAULTS.ASSISTANT.DESCRIPTION,
        instructions: DEFAULTS.ASSISTANT.INSTRUCTIONS,
        isDefault: true,
      };

      try {
        await this.db.runAsync(
          `INSERT OR IGNORE INTO ${DATABASE.TABLES.ASSISTANTS} (id, name, description, instructions, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [defaultAssistant.id, defaultAssistant.name, defaultAssistant.description, defaultAssistant.instructions, 1, now, now]
        );
      } catch (insertError) {
        // Default assistant already exists, skip
      }
    }
    } catch (error) {
      // Don't throw error - the database is still usable
    }
  }

  async createConversation(conversation: Omit<ChatConversation, 'id'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    await this.db.runAsync(
      `INSERT INTO ${DATABASE.TABLES.CONVERSATIONS} (id, title, created_at, updated_at, model, provider_id, assistant_id, context) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, conversation.title, conversation.createdAt, conversation.updatedAt, conversation.model, conversation.providerId, conversation.assistantId, conversation.context || null]
    );

    return id;
  }

  async updateConversation(id: string, updates: Partial<ChatConversation>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields = [];
    const values = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }

    if (updates.updatedAt !== undefined) {
      fields.push('updated_at = ?');
      values.push(updates.updatedAt);
    }

    if (updates.context !== undefined) {
      fields.push('context = ?');
      values.push(updates.context);
    }

    if (fields.length === 0) return;

    values.push(id);
    
    await this.db.runAsync(
      `UPDATE ${DATABASE.TABLES.CONVERSATIONS} SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async saveMessage(message: ChatMessageDB): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT INTO ${DATABASE.TABLES.MESSAGES} (id, conversation_id, text, is_user, timestamp, message_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [message.id, message.conversationId, message.text, message.isUser ? 1 : 0, message.timestamp, message.order]
    );
  }

  async getConversations(): Promise<ChatConversation[]> {
    if (!this.db) {
      try {
        await this.initDatabase();
      } catch (error) {
        return [];
      }
    }

    try {
      const result = await this.db!.getAllAsync(
        `SELECT * FROM ${DATABASE.TABLES.CONVERSATIONS} ORDER BY updated_at DESC`
      ) as any[];

      return result.map(row => ({
        id: row.id,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        model: row.model,
        providerId: row.provider_id,
        assistantId: row.assistant_id,
        context: row.context,
      }));
    } catch (error) {
      // Try to reinitialize on error
      this.db = null;
      return [];
    }
  }

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync(
        `SELECT * FROM ${DATABASE.TABLES.MESSAGES} WHERE conversation_id = ? ORDER BY message_order DESC`,
        [conversationId]
      ) as any[];

      return result.map(row => ({
        id: row.id,
        text: row.text,
        timestamp: new Date(row.timestamp),
        isUser: row.is_user === 1,
      }));
    } catch (error) {
      return [];
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`DELETE FROM ${DATABASE.TABLES.MESSAGES} WHERE conversation_id = ?`, [conversationId]);
    await this.db.runAsync(`DELETE FROM ${DATABASE.TABLES.CONVERSATIONS} WHERE id = ?`, [conversationId]);
  }

  async getConversationById(conversationId: string): Promise<ChatConversation | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync(
        `SELECT * FROM ${DATABASE.TABLES.CONVERSATIONS} WHERE id = ?`,
        [conversationId]
      ) as any;

      if (!result) return null;

      return {
        id: result.id,
        title: result.title,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        model: result.model,
        providerId: result.provider_id,
        assistantId: result.assistant_id,
        context: result.context,
      };
    } catch (error) {
      return null;
    }
  }

  async getMessageCount(conversationId: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      `SELECT COUNT(*) as count FROM ${DATABASE.TABLES.MESSAGES} WHERE conversation_id = ?`,
      [conversationId]
    ) as any;

    return result?.count || 0;
  }

  async getUserMessages(conversationId: string, limit: number = 3): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync(
        `SELECT text FROM ${DATABASE.TABLES.MESSAGES} WHERE conversation_id = ? AND is_user = 1 ORDER BY message_order ASC LIMIT ?`,
        [conversationId, limit]
      ) as any[];

      return result.map(row => row.text);
    } catch (error) {
      return [];
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`DELETE FROM ${DATABASE.TABLES.MESSAGES}`);
    await this.db.runAsync(`DELETE FROM ${DATABASE.TABLES.CONVERSATIONS}`);
  }

  // Provider methods
  async getProviders(): Promise<Provider[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync(
        `SELECT * FROM ${DATABASE.TABLES.PROVIDERS} ORDER BY is_default DESC, name ASC`
      ) as any[];

      return result.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type as ProviderType,
        baseUrl: row.base_url,
        apiKey: row.api_key,
        isDefault: row.is_default === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      return [];
    }
  }

  async updateProvider(id: string, updates: Partial<Provider>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.baseUrl !== undefined) {
      fields.push('base_url = ?');
      values.push(updates.baseUrl);
    }

    if (updates.apiKey !== undefined) {
      fields.push('api_key = ?');
      values.push(updates.apiKey);
    }

    if (updates.isDefault !== undefined) {
      // First, remove default from all providers if setting a new default
      if (updates.isDefault) {
        await this.db.runAsync(`UPDATE ${DATABASE.TABLES.PROVIDERS} SET is_default = 0`);
      }
      fields.push('is_default = ?');
      values.push(updates.isDefault ? 1 : 0);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    await this.db.runAsync(
      `UPDATE ${DATABASE.TABLES.PROVIDERS} SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Assistant methods
  async getAssistants(): Promise<Assistant[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync(
        `SELECT * FROM ${DATABASE.TABLES.ASSISTANTS} ORDER BY is_default DESC, name ASC`
      ) as any[];

      return result.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        instructions: row.instructions,
        isDefault: row.is_default === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      return [];
    }
  }

  async createAssistant(assistant: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    // If setting as default, remove default from all others
    if (assistant.isDefault) {
      await this.db.runAsync(`UPDATE ${DATABASE.TABLES.ASSISTANTS} SET is_default = 0`);
    }
    
    await this.db.runAsync(
      `INSERT INTO ${DATABASE.TABLES.ASSISTANTS} (id, name, description, instructions, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, assistant.name, assistant.description, assistant.instructions, assistant.isDefault ? 1 : 0, now, now]
    );

    return id;
  }

  async updateAssistant(id: string, updates: Partial<Assistant>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }

    if (updates.instructions !== undefined) {
      fields.push('instructions = ?');
      values.push(updates.instructions);
    }

    if (updates.isDefault !== undefined) {
      // First, remove default from all assistants if setting a new default
      if (updates.isDefault) {
        await this.db.runAsync(`UPDATE ${DATABASE.TABLES.ASSISTANTS} SET is_default = 0`);
      }
      fields.push('is_default = ?');
      values.push(updates.isDefault ? 1 : 0);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    await this.db.runAsync(
      `UPDATE ${DATABASE.TABLES.ASSISTANTS} SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteAssistant(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`DELETE FROM ${DATABASE.TABLES.ASSISTANTS} WHERE id = ?`, [id]);
  }

  private async restoreMigratedData(): Promise<void> {
    if (!this.db || !this.pendingMigrationData) return;

    try {
      // Get default provider and assistant
      const defaultProvider = await this.db.getFirstAsync(
        `SELECT id FROM ${DATABASE.TABLES.PROVIDERS} WHERE is_default = 1`
      ) as any;
      
      const defaultAssistant = await this.db.getFirstAsync(
        `SELECT id FROM ${DATABASE.TABLES.ASSISTANTS} WHERE is_default = 1`
      ) as any;
      
      const providerId = defaultProvider?.id || PROVIDERS.IDS.OLLAMA;
      const assistantId = defaultAssistant?.id || DEFAULTS.ASSISTANT.ID;
      
      // Restore each conversation with new fields
      for (const conv of this.pendingMigrationData) {
        await this.db.runAsync(
          `INSERT INTO ${DATABASE.TABLES.CONVERSATIONS} (id, title, created_at, updated_at, model, provider_id, assistant_id, context) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            conv.id,
            conv.title,
            conv.created_at,
            conv.updated_at,
            conv.model,
            providerId, // Use default provider
            assistantId, // Use default assistant
            conv.context || null
          ]
        );
      }
      
      this.pendingMigrationData = null;
    } catch (error) {
      this.pendingMigrationData = null;
    }
  }

  async getSettings(): Promise<AppSettings | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync(
        `SELECT * FROM ${DATABASE.TABLES.SETTINGS} WHERE id = 'default'`
      ) as any;

      if (!result) {
        return null;
      }

      return {
        selectedProviderId: result.selected_provider_id,
        selectedModel: result.selected_model,
        selectedAssistantId: result.selected_assistant_id,
      };
    } catch (error) {
      return null;
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    try {
      // Try to update existing settings first
      const existing = await this.db.getFirstAsync(
        `SELECT id FROM ${DATABASE.TABLES.SETTINGS} WHERE id = 'default'`
      ) as any;

      if (existing) {
        await this.db.runAsync(
          `UPDATE ${DATABASE.TABLES.SETTINGS} SET selected_provider_id = ?, selected_model = ?, selected_assistant_id = ?, updated_at = ? WHERE id = 'default'`,
          [settings.selectedProviderId, settings.selectedModel, settings.selectedAssistantId, now]
        );
      } else {
        await this.db.runAsync(
          `INSERT INTO ${DATABASE.TABLES.SETTINGS} (id, selected_provider_id, selected_model, selected_assistant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
          ['default', settings.selectedProviderId, settings.selectedModel, settings.selectedAssistantId, now, now]
        );
      }
    } catch (error) {
      throw error;
    }
  }
}

// Platform-specific database service factory
class DatabaseServiceFactory {
  private static instance: DatabaseAdapter | null = null;

  static getInstance(): DatabaseAdapter {
    if (!this.instance) {
      if (Platform.OS === 'web') {
        // Use the stub service which will be replaced by the real one on web
        const WebDatabaseService = require('./webDatabaseService').default;
        this.instance = WebDatabaseService;
      } else {
        this.instance = new NativeDatabaseService();
      }
    }
    return this.instance!;
  }

  static resetInstance(): void {
    this.instance = null;
  }
}

// Export singleton instance
export default DatabaseServiceFactory.getInstance();