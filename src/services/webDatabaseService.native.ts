import { DatabaseAdapter } from './databaseAdapter';
import { ChatConversation, ChatMessageDB, ChatMessage } from '../types';

// Stub implementation for native platforms - should never be used
class WebDatabaseServiceStub implements DatabaseAdapter {
  async initDatabase(): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async createConversation(conversation: Omit<ChatConversation, 'id'>): Promise<string> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async updateConversation(id: string, updates: Partial<ChatConversation>): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async saveMessage(message: ChatMessageDB): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async getConversations(): Promise<ChatConversation[]> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async deleteConversation(conversationId: string): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async getConversationById(conversationId: string): Promise<ChatConversation | null> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async getMessageCount(conversationId: string): Promise<number> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async getUserMessages(conversationId: string, limit?: number): Promise<string[]> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async clearAllData(): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }
}

export default new WebDatabaseServiceStub();