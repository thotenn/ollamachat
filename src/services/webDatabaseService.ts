// Stub file for native platforms
// This file is used when webDatabaseService.web.ts is not available

import { DatabaseAdapter } from './databaseAdapter';
import { ChatConversation, ChatMessageDB, ChatMessage, Provider, Assistant } from '../types';

class WebDatabaseServiceStub implements DatabaseAdapter {
  async initDatabase(): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async createConversation(conversation: any): Promise<string> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async getConversations(): Promise<any[]> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async getConversationById(id: string): Promise<any | null> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async updateConversation(id: string, updates: any): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async deleteConversation(id: string): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async saveMessage(message: any): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async getConversationMessages(conversationId: string): Promise<any[]> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async getUserMessages(conversationId: string, limit?: number): Promise<string[]> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async deleteConversationMessages(conversationId: string): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async getProviders(): Promise<any[]> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async getProviderById(id: string): Promise<any | null> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async updateProvider(id: string, updates: any): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async deleteProvider(id: string): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async createAssistant(assistant: any): Promise<string> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async getAssistants(): Promise<any[]> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async getAssistantById(id: string): Promise<any | null> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async updateAssistant(id: string, updates: any): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async deleteAssistant(id: string): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async initializeDefaultData(): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async getMessageCount(conversationId: string): Promise<number> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }

  async clearAllData(): Promise<void> {
    throw new Error('WebDatabaseService should not be used on native platforms');
  }
}

export default new WebDatabaseServiceStub();