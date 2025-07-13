import initSqlJs, { Database } from 'sql.js';
import { DatabaseAdapter, DatabaseRow } from './databaseAdapter';
import { ChatConversation, ChatMessageDB, ChatMessage, Provider, Assistant, AppSettings } from '../types';
import { ProviderType } from '../envs/providers';
import { URLS, DATABASE, STORAGE_KEYS, DEFAULTS, PROVIDERS } from '@env';

class WebDatabaseService implements DatabaseAdapter {
  private db: Database | null = null;
  private SQL: any = null;

  async initDatabase(): Promise<void> {
    try {
      if (this.db) {
        return;
      }
      
      // Initialize SQL.js
      this.SQL = await initSqlJs({
        locateFile: (file: string) => `${URLS.SQL_JS.CDN}/${file}`
      });

      // Try to load existing database from IndexedDB
      const savedData = await this.loadFromIndexedDB();
      
      if (savedData) {
        this.db = new this.SQL.Database(savedData);
      } else {
        this.db = new this.SQL.Database();
        await this.createTables();
      }
    } catch (error) {
      this.db = null;
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.exec(`
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

    this.db.exec(`
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

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${DATABASE.TABLES.SETTINGS} (
        id TEXT PRIMARY KEY DEFAULT 'default',
        selected_provider_id TEXT NOT NULL,
        selected_model TEXT NOT NULL,
        selected_assistant_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.db.exec(`
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

    this.db.exec(`
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

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_order 
      ON ${DATABASE.TABLES.MESSAGES} (conversation_id, message_order);
    `);

    // Initialize default data
    await this.initializeDefaultData();

    // Save the database after creating tables
    await this.saveToIndexedDB();
  }

  private getProviderBaseUrl(type: string): string {
    // For web development, use CORS proxy
    switch (type) {
      case PROVIDERS.TYPES.OLLAMA:
        return URLS.OLLAMA.DEFAULT;
      case PROVIDERS.TYPES.ANTHROPIC:
        return URLS.ANTHROPIC.CORS_PROXY;
      case PROVIDERS.TYPES.OPENAI:
        return URLS.OPENAI.CORS_PROXY;
      case PROVIDERS.TYPES.GEMINI:
        return URLS.GEMINI.CORS_PROXY;
      default:
        return URLS.OLLAMA.DEFAULT;
    }
  }

  private async initializeDefaultData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    // Check if we already have providers
    const existingProviders = this.db.exec(`SELECT COUNT(*) as count FROM ${DATABASE.TABLES.PROVIDERS}`);
    
    if (existingProviders[0]?.values[0]?.[0] === 0) {
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
        this.db.exec(
          `INSERT INTO ${DATABASE.TABLES.PROVIDERS} (id, name, type, base_url, api_key, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [provider.id, provider.name, provider.type, provider.baseUrl, null, provider.isDefault ? 1 : 0, now, now]
        );
      }
    }

    // Check if we already have assistants
    const existingAssistants = this.db.exec(`SELECT COUNT(*) as count FROM ${DATABASE.TABLES.ASSISTANTS}`);
    
    if (existingAssistants[0]?.values[0]?.[0] === 0) {
      // Create default assistant
      const defaultAssistant = {
        id: DEFAULTS.ASSISTANT.ID,
        name: DEFAULTS.ASSISTANT.NAME,
        description: DEFAULTS.ASSISTANT.DESCRIPTION,
        instructions: DEFAULTS.ASSISTANT.INSTRUCTIONS,
        isDefault: true,
      };

      this.db.exec(
        `INSERT INTO ${DATABASE.TABLES.ASSISTANTS} (id, name, description, instructions, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [defaultAssistant.id, defaultAssistant.name, defaultAssistant.description, defaultAssistant.instructions, 1, now, now]
      );
    }
  }

  private async saveToIndexedDB(): Promise<void> {
    if (!this.db) return;

    try {
      const data = this.db.export();
      const request = indexedDB.open(DATABASE.INDEXEDDB.NAME, 1);
      
      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction([DATABASE.TABLES.DATABASE], 'readwrite');
          const store = transaction.objectStore(DATABASE.TABLES.DATABASE);
          store.put(data, 'sqlitedb');
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        };
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(DATABASE.TABLES.DATABASE || 'database')) {
            db.createObjectStore(DATABASE.TABLES.DATABASE || 'database');
          }
        };
      });
    } catch (error) {
      // Error saving to IndexedDB
    }
  }

  private async loadFromIndexedDB(): Promise<Uint8Array | null> {
    try {
      const request = indexedDB.open(DATABASE.INDEXEDDB.NAME, 1);
      
      return new Promise((resolve, reject) => {
        request.onerror = () => resolve(null); // Return null if DB doesn't exist
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(DATABASE.TABLES.DATABASE)) {
            resolve(null);
            return;
          }
          
          const transaction = db.transaction([DATABASE.TABLES.DATABASE], 'readonly');
          const store = transaction.objectStore(DATABASE.TABLES.DATABASE);
          const getRequest = store.get('sqlitedb');
          
          getRequest.onsuccess = () => {
            resolve(getRequest.result || null);
          };
          getRequest.onerror = () => resolve(null);
        };
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(DATABASE.TABLES.DATABASE)) {
            db.createObjectStore(DATABASE.TABLES.DATABASE);
          }
          resolve(null);
        };
      });
    } catch (error) {
      return null;
    }
  }

  async createConversation(conversation: Omit<ChatConversation, 'id'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    this.db.run(
      `INSERT INTO ${DATABASE.TABLES.CONVERSATIONS} (id, title, created_at, updated_at, model, provider_id, assistant_id, context) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, conversation.title, conversation.createdAt, conversation.updatedAt, conversation.model, conversation.providerId, conversation.assistantId, conversation.context || null]
    );

    await this.saveToIndexedDB();
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
    
    this.db.run(
      `UPDATE ${DATABASE.TABLES.CONVERSATIONS} SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    await this.saveToIndexedDB();
  }

  async saveMessage(message: ChatMessageDB): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      `INSERT INTO ${DATABASE.TABLES.MESSAGES} (id, conversation_id, text, is_user, timestamp, message_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [message.id, message.conversationId, message.text, message.isUser ? 1 : 0, message.timestamp, message.order]
    );

    await this.saveToIndexedDB();
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
      const stmt = this.db!.prepare(`SELECT * FROM ${DATABASE.TABLES.CONVERSATIONS} ORDER BY updated_at DESC`);
      const result: DatabaseRow[] = [];
      
      while (stmt.step()) {
        const row = stmt.getAsObject();
        result.push(row);
      }
      stmt.free();

      return result.map(row => ({
        id: row.id as string,
        title: row.title as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        model: row.model as string,
        providerId: row.provider_id as string,
        assistantId: row.assistant_id as string,
        context: row.context as string,
      }));
    } catch (error) {
      return [];
    }
  }

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(`SELECT * FROM ${DATABASE.TABLES.MESSAGES} WHERE conversation_id = ? ORDER BY message_order DESC`);
      stmt.bind([conversationId]);
      
      const result: DatabaseRow[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        result.push(row);
      }
      stmt.free();

      return result.map(row => ({
        id: row.id as string,
        text: row.text as string,
        timestamp: new Date(row.timestamp as string),
        isUser: (row.is_user as number) === 1,
      }));
    } catch (error) {
      return [];
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(`DELETE FROM ${DATABASE.TABLES.MESSAGES} WHERE conversation_id = ?`, [conversationId]);
    this.db.run(`DELETE FROM ${DATABASE.TABLES.CONVERSATIONS} WHERE id = ?`, [conversationId]);
    
    await this.saveToIndexedDB();
  }

  async getConversationById(conversationId: string): Promise<ChatConversation | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(`SELECT * FROM ${DATABASE.TABLES.CONVERSATIONS} WHERE id = ?`);
      stmt.bind([conversationId]);
      
      if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        
        return {
          id: result.id as string,
          title: result.title as string,
          createdAt: result.created_at as string,
          updatedAt: result.updated_at as string,
          model: result.model as string,
          providerId: result.provider_id as string,
          assistantId: result.assistant_id as string,
          context: result.context as string,
        };
      }
      
      stmt.free();
      return null;
    } catch (error) {
      return null;
    }
  }

  async getMessageCount(conversationId: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${DATABASE.TABLES.MESSAGES} WHERE conversation_id = ?`);
      stmt.bind([conversationId]);
      
      if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        return result.count as number || 0;
      }
      
      stmt.free();
      return 0;
    } catch (error) {
      return 0;
    }
  }

  async getUserMessages(conversationId: string, limit: number = 3): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(`SELECT text FROM ${DATABASE.TABLES.MESSAGES} WHERE conversation_id = ? AND is_user = 1 ORDER BY message_order ASC LIMIT ?`);
      stmt.bind([conversationId, limit]);
      
      const result: string[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        result.push(row.text as string);
      }
      stmt.free();

      return result;
    } catch (error) {
      return [];
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(`DELETE FROM ${DATABASE.TABLES.MESSAGES}`);
    this.db.run(`DELETE FROM ${DATABASE.TABLES.CONVERSATIONS}`);
    
    await this.saveToIndexedDB();
  }

  // Provider methods
  async getProviders(): Promise<Provider[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec(`SELECT * FROM ${DATABASE.TABLES.PROVIDERS} ORDER BY is_default DESC, name ASC`);
      
      if (!result || result.length === 0) return [];

      const columns = result[0].columns;
      const values = result[0].values;

      return values.map((row: any[]) => {
        const provider: any = {};
        columns.forEach((col: string, index: number) => {
          provider[col] = row[index];
        });

        return {
          id: provider.id,
          name: provider.name,
          type: provider.type as ProviderType,
          baseUrl: provider.base_url,
          apiKey: provider.api_key,
          isDefault: provider.is_default === 1,
          createdAt: provider.created_at,
          updatedAt: provider.updated_at,
        };
      });
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
        this.db.run(`UPDATE ${DATABASE.TABLES.PROVIDERS} SET is_default = 0`);
      }
      fields.push('is_default = ?');
      values.push(updates.isDefault ? 1 : 0);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    this.db.run(
      `UPDATE ${DATABASE.TABLES.PROVIDERS} SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    await this.saveToIndexedDB();
  }

  // Assistant methods
  async getAssistants(): Promise<Assistant[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec(`SELECT * FROM ${DATABASE.TABLES.ASSISTANTS} ORDER BY is_default DESC, name ASC`);
      
      if (!result || result.length === 0) return [];

      const columns = result[0].columns;
      const values = result[0].values;

      return values.map((row: any[]) => {
        const assistant: any = {};
        columns.forEach((col: string, index: number) => {
          assistant[col] = row[index];
        });

        return {
          id: assistant.id,
          name: assistant.name,
          description: assistant.description,
          instructions: assistant.instructions,
          isDefault: assistant.is_default === 1,
          createdAt: assistant.created_at,
          updatedAt: assistant.updated_at,
        };
      });
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
      this.db.run(`UPDATE ${DATABASE.TABLES.ASSISTANTS} SET is_default = 0`);
    }
    
    this.db.run(
      `INSERT INTO ${DATABASE.TABLES.ASSISTANTS} (id, name, description, instructions, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, assistant.name, assistant.description, assistant.instructions, assistant.isDefault ? 1 : 0, now, now]
    );

    await this.saveToIndexedDB();
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
        this.db.run(`UPDATE ${DATABASE.TABLES.ASSISTANTS} SET is_default = 0`);
      }
      fields.push('is_default = ?');
      values.push(updates.isDefault ? 1 : 0);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    this.db.run(
      `UPDATE ${DATABASE.TABLES.ASSISTANTS} SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    await this.saveToIndexedDB();
  }

  async deleteAssistant(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(`DELETE FROM ${DATABASE.TABLES.ASSISTANTS} WHERE id = ?`, [id]);
    await this.saveToIndexedDB();
  }

  async getSettings(): Promise<AppSettings | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec(
        `SELECT * FROM ${DATABASE.TABLES.SETTINGS} WHERE id = 'default'`
      );

      if (!result[0] || !result[0].values[0]) {
        return null;
      }

      const row = result[0].values[0];
      const columns = result[0].columns;

      // Map the row values to column names
      const settings: any = {};
      columns.forEach((col, index) => {
        settings[col] = row[index];
      });

      return {
        selectedProviderId: settings.selected_provider_id,
        selectedModel: settings.selected_model,
        selectedAssistantId: settings.selected_assistant_id,
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
      const existing = this.db.exec(
        `SELECT id FROM ${DATABASE.TABLES.SETTINGS} WHERE id = 'default'`
      );

      if (existing[0] && existing[0].values.length > 0) {
        this.db.run(
          `UPDATE ${DATABASE.TABLES.SETTINGS} SET selected_provider_id = ?, selected_model = ?, selected_assistant_id = ?, updated_at = ? WHERE id = 'default'`,
          [settings.selectedProviderId, settings.selectedModel, settings.selectedAssistantId, now]
        );
      } else {
        this.db.run(
          `INSERT INTO ${DATABASE.TABLES.SETTINGS} (id, selected_provider_id, selected_model, selected_assistant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
          ['default', settings.selectedProviderId, settings.selectedModel, settings.selectedAssistantId, now, now]
        );
      }

      await this.saveToIndexedDB();
    } catch (error) {
      throw error;
    }
  }
}

export default new WebDatabaseService();