import axios from 'axios';
import { OllamaResponse, OllamaGenerateRequest, OllamaModel, Provider } from '../types';

export interface GenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  context?: number[];
  instructions?: string;
  options?: {
    temperature?: number;
    top_p?: number;
    seed?: number;
  };
}

export interface GenerateResponse {
  response: string;
  context?: number[];
  model: string;
  done: boolean;
}

export interface AIModel {
  name: string;
  displayName?: string;
  size?: number;
  modified_at?: string;
}

abstract class BaseProviderService {
  protected provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  abstract generateResponse(request: GenerateRequest): Promise<GenerateResponse>;
  abstract getModels(): Promise<AIModel[]>;
  abstract checkConnection(): Promise<boolean>;
  abstract streamResponse(
    request: GenerateRequest,
    onChunk: (chunk: string) => void,
    onComplete: (context?: number[]) => void
  ): Promise<void>;
}

class OllamaProviderService extends BaseProviderService {
  async generateResponse(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      const prompt = request.instructions 
        ? `${request.instructions}\n\nUser: ${request.prompt}\nAssistant:`
        : request.prompt;

      const response = await axios.post(`${this.provider.baseUrl}/api/generate`, {
        model: request.model,
        prompt,
        stream: false,
        context: request.context,
        options: request.options,
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return {
        response: response.data.response,
        context: response.data.context,
        model: response.data.model,
        done: response.data.done,
      };
    } catch (error) {
      console.error('Error generating response from Ollama:', error);
      throw error;
    }
  }

  async streamResponse(
    request: GenerateRequest,
    onChunk: (chunk: string) => void,
    onComplete: (context?: number[]) => void
  ): Promise<void> {
    try {
      const response = await this.generateResponse(request);
      
      // Simulate streaming by chunking the response
      const words = response.response.split(' ');
      let currentIndex = 0;
      
      const scheduleNext = (callback: () => void) => {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(callback);
        } else {
          setTimeout(callback, 50);
        }
      };
      
      const processChunk = () => {
        if (currentIndex < words.length) {
          const chunk = words.slice(currentIndex, Math.min(currentIndex + 3, words.length)).join(' ');
          if (currentIndex + 3 < words.length) {
            onChunk(chunk + ' ');
          } else {
            onChunk(chunk);
          }
          currentIndex += 3;
          scheduleNext(processChunk);
        } else {
          onComplete(response.context);
        }
      };
      
      scheduleNext(processChunk);
      
    } catch (error) {
      console.error('Error streaming response from Ollama:', error);
      onComplete();
      throw error;
    }
  }

  async getModels(): Promise<AIModel[]> {
    try {
      const response = await axios.get(`${this.provider.baseUrl}/api/tags`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return (response.data.models || []).map((model: OllamaModel) => ({
        name: model.name,
        displayName: model.name,
        size: model.size,
        modified_at: model.modified_at,
      }));
    } catch (error) {
      console.error('Error fetching models from Ollama:', error);
      return [];
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.provider.baseUrl}/api/tags`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return true;
    } catch (error) {
      console.error('Ollama connection error:', error);
      return false;
    }
  }
}

class AnthropicProviderService extends BaseProviderService {
  async generateResponse(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      if (!this.provider.apiKey) {
        throw new Error('API Key is required for Anthropic');
      }

      const messages = [];
      if (request.instructions) {
        messages.push({ role: 'system', content: request.instructions });
      }
      messages.push({ role: 'user', content: request.prompt });

      const response = await axios.post(`${this.provider.baseUrl}/v1/messages`, {
        model: request.model,
        max_tokens: 4096,
        messages,
        temperature: request.options?.temperature || 0.7,
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.provider.apiKey,
          'anthropic-version': '2023-06-01',
        },
      });

      return {
        response: response.data.content[0].text,
        model: response.data.model,
        done: true,
      };
    } catch (error) {
      console.error('Error generating response from Anthropic:', error);
      throw error;
    }
  }

  async streamResponse(
    request: GenerateRequest,
    onChunk: (chunk: string) => void,
    onComplete: (context?: number[]) => void
  ): Promise<void> {
    try {
      const response = await this.generateResponse(request);
      
      // Simulate streaming
      const words = response.response.split(' ');
      let currentIndex = 0;
      
      const scheduleNext = (callback: () => void) => {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(callback);
        } else {
          setTimeout(callback, 50);
        }
      };
      
      const processChunk = () => {
        if (currentIndex < words.length) {
          const chunk = words.slice(currentIndex, Math.min(currentIndex + 3, words.length)).join(' ');
          if (currentIndex + 3 < words.length) {
            onChunk(chunk + ' ');
          } else {
            onChunk(chunk);
          }
          currentIndex += 3;
          scheduleNext(processChunk);
        } else {
          onComplete();
        }
      };
      
      scheduleNext(processChunk);
      
    } catch (error) {
      console.error('Error streaming response from Anthropic:', error);
      onComplete();
      throw error;
    }
  }

  async getModels(): Promise<AIModel[]> {
    // Anthropic models are static
    return [
      { name: 'claude-3-haiku-20240307', displayName: 'Claude 3 Haiku' },
      { name: 'claude-3-sonnet-20240229', displayName: 'Claude 3 Sonnet' },
      { name: 'claude-3-opus-20240229', displayName: 'Claude 3 Opus' },
      { name: 'claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet' },
    ];
  }

  async checkConnection(): Promise<boolean> {
    try {
      if (!this.provider.apiKey) {
        return false;
      }

      // Test with a simple request
      await axios.post(`${this.provider.baseUrl}/v1/messages`, {
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.provider.apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      
      return true;
    } catch (error) {
      console.error('Anthropic connection error:', error);
      return false;
    }
  }
}

class OpenAIProviderService extends BaseProviderService {
  async generateResponse(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      if (!this.provider.apiKey) {
        throw new Error('API Key is required for OpenAI');
      }

      const messages = [];
      if (request.instructions) {
        messages.push({ role: 'system', content: request.instructions });
      }
      messages.push({ role: 'user', content: request.prompt });

      const response = await axios.post(`${this.provider.baseUrl}/v1/chat/completions`, {
        model: request.model,
        messages,
        temperature: request.options?.temperature || 0.7,
        max_tokens: 4096,
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.provider.apiKey}`,
        },
      });

      return {
        response: response.data.choices[0].message.content,
        model: response.data.model,
        done: true,
      };
    } catch (error) {
      console.error('Error generating response from OpenAI:', error);
      throw error;
    }
  }

  async streamResponse(
    request: GenerateRequest,
    onChunk: (chunk: string) => void,
    onComplete: (context?: number[]) => void
  ): Promise<void> {
    try {
      const response = await this.generateResponse(request);
      
      // Simulate streaming
      const words = response.response.split(' ');
      let currentIndex = 0;
      
      const scheduleNext = (callback: () => void) => {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(callback);
        } else {
          setTimeout(callback, 50);
        }
      };
      
      const processChunk = () => {
        if (currentIndex < words.length) {
          const chunk = words.slice(currentIndex, Math.min(currentIndex + 3, words.length)).join(' ');
          if (currentIndex + 3 < words.length) {
            onChunk(chunk + ' ');
          } else {
            onChunk(chunk);
          }
          currentIndex += 3;
          scheduleNext(processChunk);
        } else {
          onComplete();
        }
      };
      
      scheduleNext(processChunk);
      
    } catch (error) {
      console.error('Error streaming response from OpenAI:', error);
      onComplete();
      throw error;
    }
  }

  async getModels(): Promise<AIModel[]> {
    try {
      if (!this.provider.apiKey) {
        return [];
      }

      const response = await axios.get(`${this.provider.baseUrl}/v1/models`, {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${this.provider.apiKey}`,
        },
      });

      return response.data.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => ({
          name: model.id,
          displayName: model.id,
        }));
    } catch (error) {
      console.error('Error fetching models from OpenAI:', error);
      return [
        { name: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo' },
        { name: 'gpt-4', displayName: 'GPT-4' },
        { name: 'gpt-4-turbo', displayName: 'GPT-4 Turbo' },
      ];
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      if (!this.provider.apiKey) {
        return false;
      }

      await axios.get(`${this.provider.baseUrl}/v1/models`, {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${this.provider.apiKey}`,
        },
      });
      
      return true;
    } catch (error) {
      console.error('OpenAI connection error:', error);
      return false;
    }
  }
}

class GeminiProviderService extends BaseProviderService {
  async generateResponse(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      if (!this.provider.apiKey) {
        throw new Error('API Key is required for Gemini');
      }

      const prompt = request.instructions 
        ? `${request.instructions}\n\nUser: ${request.prompt}\nAssistant:`
        : request.prompt;

      const response = await axios.post(
        `${this.provider.baseUrl}/v1beta/models/${request.model}:generateContent?key=${this.provider.apiKey}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: request.options?.temperature || 0.7,
            maxOutputTokens: 4096,
          }
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        response: response.data.candidates[0].content.parts[0].text,
        model: request.model,
        done: true,
      };
    } catch (error) {
      console.error('Error generating response from Gemini:', error);
      throw error;
    }
  }

  async streamResponse(
    request: GenerateRequest,
    onChunk: (chunk: string) => void,
    onComplete: (context?: number[]) => void
  ): Promise<void> {
    try {
      const response = await this.generateResponse(request);
      
      // Simulate streaming
      const words = response.response.split(' ');
      let currentIndex = 0;
      
      const scheduleNext = (callback: () => void) => {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(callback);
        } else {
          setTimeout(callback, 50);
        }
      };
      
      const processChunk = () => {
        if (currentIndex < words.length) {
          const chunk = words.slice(currentIndex, Math.min(currentIndex + 3, words.length)).join(' ');
          if (currentIndex + 3 < words.length) {
            onChunk(chunk + ' ');
          } else {
            onChunk(chunk);
          }
          currentIndex += 3;
          scheduleNext(processChunk);
        } else {
          onComplete();
        }
      };
      
      scheduleNext(processChunk);
      
    } catch (error) {
      console.error('Error streaming response from Gemini:', error);
      onComplete();
      throw error;
    }
  }

  async getModels(): Promise<AIModel[]> {
    // Gemini models are static for now
    return [
      { name: 'gemini-pro', displayName: 'Gemini Pro' },
      { name: 'gemini-pro-vision', displayName: 'Gemini Pro Vision' },
      { name: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
      { name: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' },
    ];
  }

  async checkConnection(): Promise<boolean> {
    try {
      if (!this.provider.apiKey) {
        return false;
      }

      // Test with a simple request
      await axios.post(
        `${this.provider.baseUrl}/v1beta/models/gemini-pro:generateContent?key=${this.provider.apiKey}`,
        {
          contents: [{
            parts: [{ text: 'Hello' }]
          }],
          generationConfig: {
            maxOutputTokens: 10,
          }
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      return true;
    } catch (error) {
      console.error('Gemini connection error:', error);
      return false;
    }
  }
}

export class ProviderService {
  private static instance: ProviderService | null = null;
  private providers: Map<string, BaseProviderService> = new Map();

  static getInstance(): ProviderService {
    if (!this.instance) {
      this.instance = new ProviderService();
    }
    return this.instance;
  }

  setProvider(provider: Provider): void {
    let service: BaseProviderService;

    switch (provider.type) {
      case 'ollama':
        service = new OllamaProviderService(provider);
        break;
      case 'anthropic':
        service = new AnthropicProviderService(provider);
        break;
      case 'openai':
        service = new OpenAIProviderService(provider);
        break;
      case 'gemini':
        service = new GeminiProviderService(provider);
        break;
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }

    this.providers.set(provider.id, service);
  }

  getProvider(providerId: string): BaseProviderService | null {
    return this.providers.get(providerId) || null;
  }

  async generateResponse(providerId: string, request: GenerateRequest): Promise<GenerateResponse> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    return provider.generateResponse(request);
  }

  async streamResponse(
    providerId: string,
    request: GenerateRequest,
    onChunk: (chunk: string) => void,
    onComplete: (context?: number[]) => void
  ): Promise<void> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    return provider.streamResponse(request, onChunk, onComplete);
  }

  async getModels(providerId: string): Promise<AIModel[]> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    return provider.getModels();
  }

  async checkConnection(providerId: string): Promise<boolean> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      return false;
    }
    return provider.checkConnection();
  }

  async generateChatTitle(providerId: string, conversationContext: string, model: string): Promise<string> {
    try {
      const prompt = `Based on this conversation context: "${conversationContext}"

Generate a short, descriptive title for this conversation (maximum 6 words). The title should be clear and concise, capturing the main topic or intent of the entire conversation. Do not use quotes or special characters. Only respond with the title, nothing else.

Examples:
- Context: "How do I learn Python? What are the best resources? Should I start with basics?" → Title: "Python Learning Resources Guide"
- Context: "What's the weather like? Will it rain tomorrow? Should I bring umbrella?" → Title: "Weather Forecast and Planning"
- Context: "Help me with math homework. How do I solve equations? What about quadratic formulas?" → Title: "Math Homework Help Session"

Title:`;

      const response = await this.generateResponse(providerId, {
        model,
        prompt,
        stream: false,
      });

      let title = response.response.trim();
      
      // Clean up the title
      title = title.replace(/^["']|["']$/g, ''); // Remove quotes
      title = title.replace(/^Title:\s*/i, ''); // Remove "Title:" prefix
      title = title.substring(0, 50); // Limit length
      
      // Fallback if title is empty or too short
      if (title.length < 3) {
        const firstWords = conversationContext.split(' ').slice(0, 4).join(' ');
        title = firstWords.length > 30 ? firstWords.substring(0, 27) + '...' : firstWords;
      }

      return title;
    } catch (error) {
      console.error('Error generating chat title:', error);
      // Fallback: use first few words of the context
      const firstWords = conversationContext.split(' ').slice(0, 4).join(' ');
      return firstWords.length > 30 ? firstWords.substring(0, 27) + '...' : firstWords;
    }
  }
}

export default ProviderService.getInstance();