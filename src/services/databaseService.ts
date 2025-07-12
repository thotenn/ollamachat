import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { DatabaseAdapter } from './databaseAdapter';
import { ChatConversation, ChatMessageDB, ChatMessage, Provider, Assistant } from '../types';
import webDatabaseService from './webDatabaseService.web';

class NativeDatabaseService implements DatabaseAdapter {
  private db: SQLite.SQLiteDatabase | null = null;

  async initDatabase(): Promise<void> {
    try {
      if (this.db) {
        console.log('Native database already initialized');
        return;
      }
      
      console.log('Initializing native database...');
      this.db = await SQLite.openDatabaseAsync('ollamachat.db');
      console.log('Native database opened successfully');
      await this.createTables();
      console.log('Native tables created successfully');
    } catch (error) {
      console.error('Error initializing native database:', error);
      this.db = null;
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

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
  }

  private async initializeDefaultData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

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
          baseUrl: 'http://localhost:11434',
          isDefault: true,
        },
        {
          id: 'anthropic-default',
          name: 'Anthropic',
          type: 'anthropic',
          baseUrl: 'https://api.anthropic.com',
          isDefault: false,
        },
        {
          id: 'openai-default',
          name: 'OpenAI',
          type: 'openai',
          baseUrl: 'https://api.openai.com',
          isDefault: false,
        },
        {
          id: 'gemini-default',
          name: 'Google Gemini',
          type: 'gemini',
          baseUrl: 'https://generativelanguage.googleapis.com',
          isDefault: false,
        },
      ];

      for (const provider of defaultProviders) {
        await this.db.runAsync(
          'INSERT INTO providers (id, name, type, base_url, api_key, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [provider.id, provider.name, provider.type, provider.baseUrl, null, provider.isDefault ? 1 : 0, now, now]
        );
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

      await this.db.runAsync(
        'INSERT INTO assistants (id, name, description, instructions, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [defaultAssistant.id, defaultAssistant.name, defaultAssistant.description, defaultAssistant.instructions, 1, now, now]
      );
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
}

// Platform-specific database service factory
class DatabaseServiceFactory {
  private static instance: DatabaseAdapter | null = null;

  static getInstance(): DatabaseAdapter {
    if (!this.instance) {
      if (Platform.OS === 'web') {
        console.log('Using WebDatabaseService for web platform');
        this.instance = webDatabaseService;
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

export default DatabaseServiceFactory.getInstance();