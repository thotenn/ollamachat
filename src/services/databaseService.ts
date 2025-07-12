import * as SQLite from 'expo-sqlite';
import { ChatConversation, ChatMessageDB, ChatMessage } from '../types';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initDatabase(): Promise<void> {
    try {
      if (this.db) {
        console.log('Database already initialized');
        return;
      }
      
      console.log('Initializing database...');
      this.db = await SQLite.openDatabaseAsync('ollamachat.db');
      console.log('Database opened successfully');
      await this.createTables();
      console.log('Tables created successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      this.db = null;
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        model TEXT NOT NULL,
        context TEXT
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
  }

  async createConversation(conversation: Omit<ChatConversation, 'id'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    await this.db.runAsync(
      'INSERT INTO conversations (id, title, created_at, updated_at, model, context) VALUES (?, ?, ?, ?, ?, ?)',
      [id, conversation.title, conversation.createdAt, conversation.updatedAt, conversation.model, conversation.context || null]
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
      console.log('Database not initialized, attempting to reinitialize...');
      try {
        await this.initDatabase();
      } catch (error) {
        console.error('Failed to reinitialize database:', error);
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
        context: row.context,
      }));
    } catch (error) {
      console.error('Error in getConversations:', error);
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
}

export default new DatabaseService();