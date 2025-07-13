export interface Message {
  _id: string | number;
  text: string;
  createdAt: Date;
  user: {
    _id: string | number;
    name?: string;
    avatar?: string;
  };
  pending?: boolean;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  context?: number[];
  options?: {
    temperature?: number;
    top_p?: number;
    seed?: number;
  };
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

import { ProviderType } from '../envs/providers';

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Assistant {
  id: string;
  name: string;
  description: string;
  instructions: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  selectedProviderId: string;
  selectedModel: string;
  selectedAssistantId: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  model: string;
  providerId: string;
  assistantId: string;
  context?: string; // JSON stringified context array
}

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
}

export interface ChatMessageDB {
  id: string;
  conversationId: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  order: number;
}