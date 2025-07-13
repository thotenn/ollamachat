import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { DatabaseAdapter } from './databaseAdapter';
import { ChatConversation, ChatMessageDB, ChatMessage, Provider, Assistant } from '../types';

class NativeDatabaseService implements DatabaseAdapter {
  private db: SQLite.SQLiteDatabase | null = null;
  private pendingMigrationData: any[] | null = null;

  async initDatabase(): Promise<void> {
    try {
      if (this.db) {
        console.log('Native database already initialized');
        return;
      }
      
      console.log('Initializing native database...');
      this.db = await SQLite.openDatabaseAsync('ollamachat.db');
      console.log('Native database opened successfully');
      
      // Create tables if they don't exist
      await this.createTables();
      console.log('Native tables created successfully');
    } catch (error) {
      console.error('Error initializing native database:', error);
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
          console.log('Migrating database: Adding provider_id and assistant_id columns');
          
          // Get existing conversations data
          const existingConversations = await this.db.getAllAsync(
            'SELECT * FROM conversations'
          ) as any[];
          
          console.log(`Found ${existingConversations.length} conversations to migrate`);
          
          // Drop old tables
          await this.db.execAsync(`
            DROP TABLE IF EXISTS messages;
            DROP TABLE IF EXISTS conversations;
          `);

          console.log('Old tables dropped, creating new schema...');
          
          // Tables will be recreated with new schema by createTables
          // After tables are created, restore data
          this.pendingMigrationData = existingConversations;
        }
      }
    } catch (error) {
      console.error('Error during migration check:', error);
      // Continue with table creation
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if we need to migrate the database
    await this.migrateDatabase();

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS providers (
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
      CREATE TABLE IF NOT EXISTS assistants (
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
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        model TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        assistant_id TEXT NOT NULL,
        context TEXT,
        FOREIGN KEY (provider_id) REFERENCES providers (id),
        FOREIGN KEY (assistant_id) REFERENCES assistants (id)
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        text TEXT NOT NULL,
        is_user INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        message_order INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
      );
    `);

    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_order 
      ON messages (conversation_id, message_order);
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
      case 'ollama':
        return 'http://localhost:11434';
      case 'anthropic':
        return isWeb ? 'http://localhost:8010' : 'https://api.anthropic.com';
      case 'openai':
        return isWeb ? 'http://localhost:8011' : 'https://api.openai.com';
      case 'gemini':
        return isWeb ? 'http://localhost:8012' : 'https://generativelanguage.googleapis.com';
      default:
        return 'http://localhost:11434';
    }
  }

  private async initializeDefaultData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();

      // Check if we already have providers
    const existingProviders = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM providers') as any;
    
    if (existingProviders.count === 0) {
      // Create default providers
      const defaultProviders = [
        {
          id: 'ollama-default',
          name: 'Ollama',
          type: 'ollama',
          baseUrl: this.getProviderBaseUrl('ollama'),
          isDefault: true,
        },
        {
          id: 'anthropic-default',
          name: 'Anthropic',
          type: 'anthropic',
          baseUrl: this.getProviderBaseUrl('anthropic'),
          isDefault: false,
        },
        {
          id: 'openai-default',
          name: 'OpenAI',
          type: 'openai',
          baseUrl: this.getProviderBaseUrl('openai'),
          isDefault: false,
        },
        {
          id: 'gemini-default',
          name: 'Google Gemini',
          type: 'gemini',
          baseUrl: this.getProviderBaseUrl('gemini'),
          isDefault: false,
        },
      ];

      for (const provider of defaultProviders) {
        try {
          await this.db.runAsync(
            'INSERT OR IGNORE INTO providers (id, name, type, base_url, api_key, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [provider.id, provider.name, provider.type, provider.baseUrl, null, provider.isDefault ? 1 : 0, now, now]
          );
        } catch (insertError) {
          console.log(`Provider ${provider.name} already exists, skipping`);
        }
      }
    }

    // Check if we already have assistants
    const existingAssistants = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM assistants') as any;
    
    if (existingAssistants.count === 0) {
      // Create default assistant
      const defaultAssistant = {
        id: 'default-assistant',
        name: 'Asistente General',
        description: 'Asistente de propósito general para conversaciones',
        instructions: 'Eres un asistente útil y amigable. Responde de manera clara y concisa a las preguntas del usuario.',
        isDefault: true,
      };

      try {
        await this.db.runAsync(
          'INSERT OR IGNORE INTO assistants (id, name, description, instructions, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [defaultAssistant.id, defaultAssistant.name, defaultAssistant.description, defaultAssistant.instructions, 1, now, now]
        );
      } catch (insertError) {
        console.log('Default assistant already exists, skipping');
      }
    }
    } catch (error) {
      console.error('Error in initializeDefaultData:', error);
      // Don't throw error, just log it - the database is still usable
    }
  }

  async createConversation(conversation: Omit<ChatConversation, 'id'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    await this.db.runAsync(
      'INSERT INTO conversations (id, title, created_at, updated_at, model, provider_id, assistant_id, context) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
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
      `UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async saveMessage(message: ChatMessageDB): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'INSERT INTO messages (id, conversation_id, text, is_user, timestamp, message_order) VALUES (?, ?, ?, ?, ?, ?)',
      [message.id, message.conversationId, message.text, message.isUser ? 1 : 0, message.timestamp, message.order]
    );
  }

  async getConversations(): Promise<ChatConversation[]> {
    if (!this.db) {
      console.log('Native database not initialized, attempting to reinitialize...');
      try {
        await this.initDatabase();
      } catch (error) {
        console.error('Failed to reinitialize native database:', error);
        return [];
      }
    }

    try {
      const result = await this.db!.getAllAsync(
        'SELECT * FROM conversations ORDER BY updated_at DESC'
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
      console.error('Error in native getConversations:', error);
      // Try to reinitialize on error
      this.db = null;
      return [];
    }
  }

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY message_order DESC',
        [conversationId]
      ) as any[];

      return result.map(row => ({
        id: row.id,
        text: row.text,
        timestamp: new Date(row.timestamp),
        isUser: row.is_user === 1,
      }));
    } catch (error) {
      console.error('Error in getConversationMessages:', error);
      return [];
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
    await this.db.runAsync('DELETE FROM conversations WHERE id = ?', [conversationId]);
  }

  async getConversationById(conversationId: string): Promise<ChatConversation | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync(
        'SELECT * FROM conversations WHERE id = ?',
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
      console.error('Error in getConversationById:', error);
      return null;
    }
  }

  async getMessageCount(conversationId: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?',
      [conversationId]
    ) as any;

    return result?.count || 0;
  }

  async getUserMessages(conversationId: string, limit: number = 3): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync(
        'SELECT text FROM messages WHERE conversation_id = ? AND is_user = 1 ORDER BY message_order ASC LIMIT ?',
        [conversationId, limit]
      ) as any[];

      return result.map(row => row.text);
    } catch (error) {
      console.error('Error in getUserMessages:', error);
      return [];
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM messages');
    await this.db.runAsync('DELETE FROM conversations');
  }

  // Provider methods
  async getProviders(): Promise<Provider[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync(
        'SELECT * FROM providers ORDER BY is_default DESC, name ASC'
      ) as any[];

      return result.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type as 'ollama' | 'anthropic' | 'openai' | 'gemini',
        baseUrl: row.base_url,
        apiKey: row.api_key,
        isDefault: row.is_default === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error('Error in getProviders:', error);
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
        await this.db.runAsync('UPDATE providers SET is_default = 0');
      }
      fields.push('is_default = ?');
      values.push(updates.isDefault ? 1 : 0);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    await this.db.runAsync(
      `UPDATE providers SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Assistant methods
  async getAssistants(): Promise<Assistant[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync(
        'SELECT * FROM assistants ORDER BY is_default DESC, name ASC'
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
      console.error('Error in getAssistants:', error);
      return [];
    }
  }

  async createAssistant(assistant: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    // If setting as default, remove default from all others
    if (assistant.isDefault) {
      await this.db.runAsync('UPDATE assistants SET is_default = 0');
    }
    
    await this.db.runAsync(
      'INSERT INTO assistants (id, name, description, instructions, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
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
        await this.db.runAsync('UPDATE assistants SET is_default = 0');
      }
      fields.push('is_default = ?');
      values.push(updates.isDefault ? 1 : 0);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    await this.db.runAsync(
      `UPDATE assistants SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteAssistant(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM assistants WHERE id = ?', [id]);
  }

  private async restoreMigratedData(): Promise<void> {
    if (!this.db || !this.pendingMigrationData) return;

    console.log('Restoring migrated conversations...');
    
    try {
      // Get default provider and assistant
      const defaultProvider = await this.db.getFirstAsync(
        'SELECT id FROM providers WHERE is_default = 1'
      ) as any;
      
      const defaultAssistant = await this.db.getFirstAsync(
        'SELECT id FROM assistants WHERE is_default = 1'
      ) as any;
      
      const providerId = defaultProvider?.id || 'ollama-default';
      const assistantId = defaultAssistant?.id || 'default-assistant';
      
      // Restore each conversation with new fields
      for (const conv of this.pendingMigrationData) {
        await this.db.runAsync(
          'INSERT INTO conversations (id, title, created_at, updated_at, model, provider_id, assistant_id, context) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
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
      
      console.log(`Restored ${this.pendingMigrationData.length} conversations`);
      this.pendingMigrationData = null;
    } catch (error) {
      console.error('Error restoring migrated data:', error);
      this.pendingMigrationData = null;
    }
  }
}

// Platform-specific database service factory
class DatabaseServiceFactory {
  private static instance: DatabaseAdapter | null = null;

  static getInstance(): DatabaseAdapter {
    if (!this.instance) {
      if (Platform.OS === 'web') {
        console.log('Using WebDatabaseService for web platform');
        // Use the stub service which will be replaced by the real one on web
        const WebDatabaseService = require('./webDatabaseService').default;
        this.instance = WebDatabaseService;
      } else {
        console.log('Using NativeDatabaseService for native platform');
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