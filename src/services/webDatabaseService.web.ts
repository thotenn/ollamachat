import initSqlJs, { Database } from 'sql.js';
import { DatabaseAdapter, DatabaseRow } from './databaseAdapter';
import { ChatConversation, ChatMessageDB, ChatMessage } from '../types';

class WebDatabaseService implements DatabaseAdapter {
  private db: Database | null = null;
  private SQL: any = null;

  async initDatabase(): Promise<void> {
    try {
      if (this.db) {
        console.log('Web database already initialized');
        return;
      }

      console.log('Initializing web database with SQL.js...');
      
      // Initialize SQL.js
      this.SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`
      });

      // Try to load existing database from IndexedDB
      const savedData = await this.loadFromIndexedDB();
      
      if (savedData) {
        console.log('Loading existing database from IndexedDB');
        this.db = new this.SQL.Database(savedData);
      } else {
        console.log('Creating new database');
        this.db = new this.SQL.Database();
        await this.createTables();
      }

      console.log('Web database initialized successfully');
    } catch (error) {
      console.error('Error initializing web database:', error);
      this.db = null;
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        model TEXT NOT NULL,
        context TEXT
      );
    `);

    this.db.exec(`
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

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_order 
      ON messages (conversation_id, message_order);
    `);

    // Save the database after creating tables
    await this.saveToIndexedDB();
  }

  private async saveToIndexedDB(): Promise<void> {
    if (!this.db) return;

    try {
      const data = this.db.export();
      const request = indexedDB.open('ollamachat_db', 1);
      
      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['database'], 'readwrite');
          const store = transaction.objectStore('database');
          store.put(data, 'sqlitedb');
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        };
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('database')) {
            db.createObjectStore('database');
          }
        };
      });
    } catch (error) {
      console.error('Error saving to IndexedDB:', error);
    }
  }

  private async loadFromIndexedDB(): Promise<Uint8Array | null> {
    try {
      const request = indexedDB.open('ollamachat_db', 1);
      
      return new Promise((resolve, reject) => {
        request.onerror = () => resolve(null); // Return null if DB doesn't exist
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('database')) {
            resolve(null);
            return;
          }
          
          const transaction = db.transaction(['database'], 'readonly');
          const store = transaction.objectStore('database');
          const getRequest = store.get('sqlitedb');
          
          getRequest.onsuccess = () => {
            resolve(getRequest.result || null);
          };
          getRequest.onerror = () => resolve(null);
        };
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('database')) {
            db.createObjectStore('database');
          }
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Error loading from IndexedDB:', error);
      return null;
    }
  }

  async createConversation(conversation: Omit<ChatConversation, 'id'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    this.db.run(
      'INSERT INTO conversations (id, title, created_at, updated_at, model, context) VALUES (?, ?, ?, ?, ?, ?)',
      [id, conversation.title, conversation.createdAt, conversation.updatedAt, conversation.model, conversation.context || null]
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
      `UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    await this.saveToIndexedDB();
  }

  async saveMessage(message: ChatMessageDB): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      'INSERT INTO messages (id, conversation_id, text, is_user, timestamp, message_order) VALUES (?, ?, ?, ?, ?, ?)',
      [message.id, message.conversationId, message.text, message.isUser ? 1 : 0, message.timestamp, message.order]
    );

    await this.saveToIndexedDB();
  }

  async getConversations(): Promise<ChatConversation[]> {
    if (!this.db) {
      console.log('Web database not initialized, attempting to reinitialize...');
      try {
        await this.initDatabase();
      } catch (error) {
        console.error('Failed to reinitialize web database:', error);
        return [];
      }
    }

    try {
      const stmt = this.db!.prepare('SELECT * FROM conversations ORDER BY updated_at DESC');
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
        context: row.context as string,
      }));
    } catch (error) {
      console.error('Error in web getConversations:', error);
      return [];
    }
  }

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY message_order DESC');
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
      console.error('Error in web getConversationMessages:', error);
      return [];
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
    this.db.run('DELETE FROM conversations WHERE id = ?', [conversationId]);
    
    await this.saveToIndexedDB();
  }

  async getConversationById(conversationId: string): Promise<ChatConversation | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare('SELECT * FROM conversations WHERE id = ?');
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
          context: result.context as string,
        };
      }
      
      stmt.free();
      return null;
    } catch (error) {
      console.error('Error in web getConversationById:', error);
      return null;
    }
  }

  async getMessageCount(conversationId: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?');
      stmt.bind([conversationId]);
      
      if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        return result.count as number || 0;
      }
      
      stmt.free();
      return 0;
    } catch (error) {
      console.error('Error in web getMessageCount:', error);
      return 0;
    }
  }

  async getUserMessages(conversationId: string, limit: number = 3): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare('SELECT text FROM messages WHERE conversation_id = ? AND is_user = 1 ORDER BY message_order ASC LIMIT ?');
      stmt.bind([conversationId, limit]);
      
      const result: string[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        result.push(row.text as string);
      }
      stmt.free();

      return result;
    } catch (error) {
      console.error('Error in web getUserMessages:', error);
      return [];
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run('DELETE FROM messages');
    this.db.run('DELETE FROM conversations');
    
    await this.saveToIndexedDB();
  }
}

export default new WebDatabaseService();