import { ChatConversation, ChatMessageDB, ChatMessage, Provider, Assistant } from '../types';

export interface DatabaseAdapter {
  initDatabase(): Promise<void>;
  createConversation(conversation: Omit<ChatConversation, 'id'>): Promise<string>;
  updateConversation(id: string, updates: Partial<ChatConversation>): Promise<void>;
  saveMessage(message: ChatMessageDB): Promise<void>;
  getConversations(): Promise<ChatConversation[]>;
  getConversationMessages(conversationId: string): Promise<ChatMessage[]>;
  deleteConversation(conversationId: string): Promise<void>;
  getConversationById(conversationId: string): Promise<ChatConversation | null>;
  getMessageCount(conversationId: string): Promise<number>;
  getUserMessages(conversationId: string, limit?: number): Promise<string[]>;
  clearAllData(): Promise<void>;
  
  // Provider methods
  getProviders(): Promise<Provider[]>;
  updateProvider(id: string, updates: Partial<Provider>): Promise<void>;
  
  // Assistant methods
  getAssistants(): Promise<Assistant[]>;
  createAssistant(assistant: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  updateAssistant(id: string, updates: Partial<Assistant>): Promise<void>;
  deleteAssistant(id: string): Promise<void>;
}

export interface DatabaseRow {
  [key: string]: any;
}

export interface DatabaseResult {
  rows: DatabaseRow[];
}

// Common database operations interface
export interface DatabaseOperations {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: any[]): Promise<void>;
  getAllAsync(sql: string, params?: any[]): Promise<DatabaseRow[]>;
  getFirstAsync(sql: string, params?: any[]): Promise<DatabaseRow | null>;
}