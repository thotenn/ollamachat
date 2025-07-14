import axios from 'axios';
import { OllamaResponse, OllamaGenerateRequest, OllamaModel, Provider } from '../types';
import { URLS, MODELS, PROVIDERS, DEFAULTS, MODEL_LISTS } from '../envs';

export interface GenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  context?: number[];
  instructions?: string;
  messageHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
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

      const response = await axios.post(`${this.provider.baseUrl}${URLS.OLLAMA.API.GENERATE}`, {
        model: request.model,
        prompt,
        stream: false,
        context: request.context,
        options: request.options,
      }, {
        timeout: DEFAULTS.TIMEOUTS.LONG,
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
      throw error;
    }
  }

  async streamResponse(
    request: GenerateRequest,
    onChunk: (chunk: string) => void,
    onComplete: (context?: number[]) => void
  ): Promise<void> {
    console.log('OllamaProviderService: Starting streaming request...');
    
    try {
      // Try real streaming first
      const prompt = request.instructions 
        ? `${request.instructions}\n\nUser: ${request.prompt}\nAssistant:`
        : request.prompt;

      // Use XMLHttpRequest for better React Native compatibility
      const xhr = new XMLHttpRequest();
      let responseBuffer = '';
      let finalContext: number[] | undefined;
      
      xhr.open('POST', `${this.provider.baseUrl}${URLS.OLLAMA.API.GENERATE}`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      // Handle progress events for streaming
      xhr.onprogress = () => {
        const newText = xhr.responseText.substring(responseBuffer.length);
        responseBuffer = xhr.responseText;
        
        if (newText) {
          const lines = newText.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              
              if (data.response) {
                console.log('Ollama streaming chunk:', data.response);
                onChunk(data.response);
              }
              
              if (data.done) {
                finalContext = data.context;
              }
              
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              console.warn('Failed to parse Ollama streaming line:', line);
            }
          }
        }
      };
      
      xhr.onload = () => {
        console.log('Ollama streaming request completed');
        onComplete(finalContext);
      };
      
      xhr.onerror = () => {
        throw new Error('Network error during Ollama streaming');
      };
      
      xhr.ontimeout = () => {
        throw new Error('Ollama streaming request timed out');
      };
      
      xhr.timeout = DEFAULTS.TIMEOUTS.LONG;
      
      // Send the request
      xhr.send(JSON.stringify({
        model: request.model,
        prompt,
        stream: true,
        context: request.context,
        options: request.options,
      }));
      
    } catch (error) {
      console.error('Ollama streaming failed, falling back to simulated streaming:', error);
      
      // Fallback to simulated streaming
      try {
        const response = await this.generateResponse(request);
        
        // Fast character-by-character streaming for better UX
        const characters = response.response.split('');
        let currentIndex = 0;
        
        const processChar = () => {
          if (currentIndex >= characters.length) {
            onComplete(response.context);
            return;
          }
          
          onChunk(characters[currentIndex]);
          currentIndex++;
          
          // Very fast character streaming
          setTimeout(processChar, 15);
        };
        
        processChar();
        
      } catch (fallbackError) {
        onComplete();
        throw fallbackError;
      }
    }
  }

  async getModels(): Promise<AIModel[]> {
    try {
      const response = await axios.get(`${this.provider.baseUrl}${URLS.OLLAMA.API.TAGS}`, {
        timeout: DEFAULTS.TIMEOUTS.MEDIUM,
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
      return [];
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.provider.baseUrl}${URLS.OLLAMA.API.TAGS}`, {
        timeout: DEFAULTS.TIMEOUTS.MEDIUM,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

class AnthropicProviderService extends BaseProviderService {
  private getApiUrl(endpoint: string): string {
    // If using CORS proxy (localhost), use /proxy prefix
    if (this.provider.baseUrl.includes('localhost')) {
      return `${this.provider.baseUrl}${URLS.PROXY_PREFIX}${endpoint}`;
    }
    // If using direct API, add /v1 prefix
    return `${this.provider.baseUrl}/v1${endpoint}`;
  }

  async generateResponse(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      if (!this.provider.apiKey) {
        throw new Error('API Key is required for Anthropic');
      }

      const messages = [];
      
      // Add system message with instructions if provided
      if (request.instructions) {
        messages.push({ role: 'system', content: request.instructions });
      }

      // Add message history to maintain context
      if (request.messageHistory && request.messageHistory.length > 0) {
        messages.push(...request.messageHistory);
      }

      // Add the current user message
      messages.push({ role: 'user', content: request.prompt });

      const response = await axios.post(this.getApiUrl('/messages'), {
        model: request.model,
        max_tokens: DEFAULTS.LIMITS.MAX_TOKENS,
        messages,
        temperature: request.options?.temperature || 0.7,
      }, {
        timeout: DEFAULTS.TIMEOUTS.LONG,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.provider.apiKey,
          'anthropic-version': URLS.ANTHROPIC.API_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      });

      return {
        response: response.data.content[0].text,
        model: response.data.model,
        done: true,
      };
    } catch (error) {
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
          setTimeout(callback, DEFAULTS.TIMEOUTS.DELAY);
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
      onComplete();
      throw error;
    }
  }

  async getModels(): Promise<AIModel[]> {
    try {
      if (!this.provider.apiKey) {
        return this.getExtendedDefaultModels();
      }

      // Test API key validity by making a small request
      await axios.post(this.getApiUrl('/messages'), {
        model: MODELS.ANTHROPIC.CLAUDE_3_HAIKU,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      }, {
        timeout: DEFAULTS.TIMEOUTS.SHORT,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.provider.apiKey,
          'anthropic-version': URLS.ANTHROPIC.API_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      });

      // If API key is valid, return extended model list
      return this.getExtendedDefaultModels();
    } catch (error: any) {
      // If it's an auth error, return basic models with a note
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return this.getBasicDefaultModels();
      }

      // For other errors (like rate limits), still return extended models
      return this.getExtendedDefaultModels();
    }
  }

private getBasicDefaultModels(): AIModel[] {
    return [
      // Latest and most capable models for basic usage
      { name: MODELS.ANTHROPIC.CLAUDE_SONNET_4, displayName: 'Claude 4 Sonnet (Latest)' },
      { name: MODELS.ANTHROPIC.CLAUDE_3_7_SONNET, displayName: 'Claude 3.7 Sonnet' },
      { name: MODELS.ANTHROPIC.CLAUDE_3_5_SONNET, displayName: 'Claude 3.5 Sonnet' },
      { name: MODELS.ANTHROPIC.CLAUDE_3_5_HAIKU, displayName: 'Claude 3.5 Haiku' },
      { name: MODELS.ANTHROPIC.CLAUDE_3_HAIKU, displayName: 'Claude 3 Haiku' },
    ];
  }

  private getExtendedDefaultModels(): AIModel[] {
    return [
      // Claude 4 Models (Most Advanced - May 2025)
      { name: MODELS.ANTHROPIC.CLAUDE_OPUS_4, displayName: 'Claude 4 Opus (Most Powerful)' },
      { name: MODELS.ANTHROPIC.CLAUDE_SONNET_4, displayName: 'Claude 4 Sonnet (Balanced)' },
      
      // Claude 3.7 Models (Advanced Reasoning - Feb 2025)
      { name: MODELS.ANTHROPIC.CLAUDE_3_7_SONNET, displayName: 'Claude 3.7 Sonnet (Extended Thinking)' },
      
      // Claude 3.5 Models (Oct 2024)
      { name: MODELS.ANTHROPIC.CLAUDE_3_5_SONNET, displayName: 'Claude 3.5 Sonnet (Latest)' },
      { name: MODELS.ANTHROPIC.CLAUDE_3_5_HAIKU, displayName: 'Claude 3.5 Haiku (Fast & Smart)' },
      { name: MODELS.ANTHROPIC.CLAUDE_3_5_SONNET_JUNE, displayName: 'Claude 3.5 Sonnet (June)' },
      
      // Claude 3 Models (Mar 2024)
      { name: MODELS.ANTHROPIC.CLAUDE_3_OPUS, displayName: 'Claude 3 Opus (Most Capable)' },
      { name: MODELS.ANTHROPIC.CLAUDE_3_SONNET, displayName: 'Claude 3 Sonnet (Balanced)' },
      { name: MODELS.ANTHROPIC.CLAUDE_3_HAIKU, displayName: 'Claude 3 Haiku (Fast)' },
      
      // Legacy Models (For compatibility)
      { name: MODELS.ANTHROPIC.CLAUDE_INSTANT_1_2, displayName: 'Claude Instant 1.2 (Legacy)' },
      { name: MODELS.ANTHROPIC.CLAUDE_2_1, displayName: 'Claude 2.1 (Legacy)' },
      { name: MODELS.ANTHROPIC.CLAUDE_2_0, displayName: 'Claude 2.0 (Legacy)' },
    ];
  }

  async checkConnection(): Promise<boolean> {
    try {
      if (!this.provider.apiKey) {
        return false;
      }

      // Test with a simple request
      await axios.post(this.getApiUrl('/messages'), {
        model: MODELS.ANTHROPIC.CLAUDE_3_HAIKU,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      }, {
        timeout: DEFAULTS.TIMEOUTS.MEDIUM,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.provider.apiKey,
          'anthropic-version': URLS.ANTHROPIC.API_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }
}

class OpenAIProviderService extends BaseProviderService {
  private getApiUrl(endpoint: string): string {
    // If using CORS proxy (localhost), use /proxy prefix
    if (this.provider.baseUrl.includes('localhost')) {
      return `${this.provider.baseUrl}${URLS.PROXY_PREFIX}${endpoint}`;
    }
    // If using direct API, add /v1 prefix
    return `${this.provider.baseUrl}/v1${endpoint}`;
  }

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

      const response = await axios.post(this.getApiUrl('/chat/completions'), {
        model: request.model,
        messages,
        temperature: request.options?.temperature || 0.7,
        max_tokens: DEFAULTS.LIMITS.MAX_TOKENS,
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
          setTimeout(callback, DEFAULTS.TIMEOUTS.DELAY);
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
      onComplete();
      throw error;
    }
  }

  async getModels(): Promise<AIModel[]> {
    try {
      if (!this.provider.apiKey) {
        return [];
      }

      const response = await axios.get(this.getApiUrl('/models'), {
        timeout: DEFAULTS.TIMEOUTS.MEDIUM,
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
      return MODEL_LISTS.OPENAI.map(model => ({
        name: model.id,
        displayName: model.name
      }));
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      if (!this.provider.apiKey) {
        return false;
      }

      await axios.get(this.getApiUrl('/models'), {
        timeout: DEFAULTS.TIMEOUTS.MEDIUM,
        headers: {
          'Authorization': `Bearer ${this.provider.apiKey}`,
        },
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }
}

class GeminiProviderService extends BaseProviderService {
  private getApiUrl(endpoint: string): string {
    // If using CORS proxy (localhost), don't add /v1beta prefix
    if (this.provider.baseUrl.includes('localhost')) {
      return `${this.provider.baseUrl}${endpoint}`;
    }
    // If using direct API, add /v1beta prefix
    return `${this.provider.baseUrl}${URLS.GEMINI.API_PREFIX}${endpoint}`;
  }

  async generateResponse(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      if (!this.provider.apiKey) {
        throw new Error('API Key is required for Gemini');
      }

      const prompt = request.instructions 
        ? `${request.instructions}\n\nUser: ${request.prompt}\nAssistant:`
        : request.prompt;

      const response = await axios.post(
        `${this.getApiUrl(`/models/${request.model}:generateContent`)}?key=${this.provider.apiKey}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: request.options?.temperature || 0.7,
            maxOutputTokens: DEFAULTS.LIMITS.MAX_TOKENS,
          }
        },
        {
          timeout: DEFAULTS.TIMEOUTS.LONG,
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
          setTimeout(callback, DEFAULTS.TIMEOUTS.DELAY);
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
      onComplete();
      throw error;
    }
  }

  async getModels(): Promise<AIModel[]> {
    // Gemini models are static for now
    return [
      { name: MODELS.GEMINI.PRO, displayName: 'Gemini Pro' },
      { name: MODELS.GEMINI.PRO_VISION, displayName: 'Gemini Pro Vision' },
      { name: MODELS.GEMINI.PRO_1_5, displayName: 'Gemini 1.5 Pro' },
      { name: MODELS.GEMINI.FLASH_1_5, displayName: 'Gemini 1.5 Flash' },
    ];
  }

  async checkConnection(): Promise<boolean> {
    try {
      if (!this.provider.apiKey) {
        return false;
      }

      // Test with a simple request
      await axios.post(
        `${this.getApiUrl(`/models/${MODELS.GEMINI.PRO}:generateContent`)}?key=${this.provider.apiKey}`,
        {
          contents: [{
            parts: [{ text: 'Hello' }]
          }],
          generationConfig: {
            maxOutputTokens: 10,
          }
        },
        {
          timeout: DEFAULTS.TIMEOUTS.MEDIUM,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      return true;
    } catch (error) {
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
      case PROVIDERS.TYPES.OLLAMA:
        service = new OllamaProviderService(provider);
        break;
      case PROVIDERS.TYPES.ANTHROPIC:
        service = new AnthropicProviderService(provider);
        break;
      case PROVIDERS.TYPES.OPENAI:
        service = new OpenAIProviderService(provider);
        break;
      case PROVIDERS.TYPES.GEMINI:
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
      // Fallback: use first few words of the context
      const firstWords = conversationContext.split(' ').slice(0, 4).join(' ');
      return firstWords.length > 30 ? firstWords.substring(0, 27) + '...' : firstWords;
    }
  }
}

export default ProviderService.getInstance();