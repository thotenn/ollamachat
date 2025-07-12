import { DatabaseAdapter } from './databaseAdapter';
import { ChatConversation, ChatMessageDB, ChatMessage, Provider, Assistant } from '../types';

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

  // Provider methods
  async getProviders(): Promise<Provider[]> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async updateProvider(id: string, updates: Partial<Provider>): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  // Assistant methods
  async getAssistants(): Promise<Assistant[]> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async createAssistant(assistant: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async updateAssistant(id: string, updates: Partial<Assistant>): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async deleteAssistant(id: string): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }
}

export default new WebDatabaseServiceStub();