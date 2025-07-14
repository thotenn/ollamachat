import axios from 'axios';
import { OllamaResponse, OllamaGenerateRequest, OllamaModel } from '../types';
import { URLS, DEFAULTS, API_HEADERS } from '@env';

class OllamaService {
  private baseUrl: string;

  constructor(baseUrl: string = URLS.OLLAMA.DEFAULT) {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  async generateResponse(request: OllamaGenerateRequest, retryCount = 0): Promise<OllamaResponse> {
    const maxRetries = 2;
    
    try {
      const response = await axios.post(`${this.baseUrl}${URLS.OLLAMA.API.GENERATE}`, {
        ...request,
        stream: false,
      }, {
        timeout: DEFAULTS.TIMEOUTS.LONG,
        headers: {
          [API_HEADERS.CONTENT_TYPE]: 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Generate response attempt ${retryCount + 1} failed:`, error);
      
      // Check if it's a network error and we can retry
      const isNetworkError = error.code === 'NETWORK_ERROR' || 
                            error.code === 'ECONNRESET' || 
                            error.code === 'ECONNREFUSED' ||
                            error.message?.includes('Network Error');
      
      if (isNetworkError && retryCount < maxRetries) {
        console.log(`Retrying request in ${DEFAULTS.TIMEOUTS.RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, DEFAULTS.TIMEOUTS.RETRY_DELAY));
        return this.generateResponse(request, retryCount + 1);
      }
      
      throw error;
    }
  }

  async streamResponse(
    request: OllamaGenerateRequest,
    onChunk: (chunk: string) => void,
    onComplete: (context?: number[]) => void
  ): Promise<void> {
    try {
      // React Native doesn't support streaming in the same way, so we'll use a non-streaming approach
      const response = await this.generateResponse(request);
      
      // Check response length and limit if necessary
      const MAX_RESPONSE_LENGTH = 50000; // Characters limit to prevent memory issues
      let responseText = response.response;
      if (responseText.length > MAX_RESPONSE_LENGTH) {
        responseText = responseText.substring(0, MAX_RESPONSE_LENGTH) + '... [Respuesta truncada por seguridad]';
      }
      
      // For very long responses, reduce chunking frequency to prevent performance issues
      const words = responseText.split(' ');
      const isLongResponse = words.length > 500;
      const chunkSize = isLongResponse ? 8 : 3; // Larger chunks for long responses
      const delay = isLongResponse ? DEFAULTS.TIMEOUTS.DELAY * 2 : DEFAULTS.TIMEOUTS.DELAY;
      
      let currentIndex = 0;
      let isProcessing = true;
      
      // Use requestAnimationFrame for web or setTimeout for native
      const scheduleNext = (callback: () => void) => {
        if (!isProcessing) return; // Safety check
        
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(callback);
        } else {
          setTimeout(callback, delay);
        }
      };
      
      const processChunk = () => {
        if (!isProcessing || currentIndex >= words.length) {
          isProcessing = false;
          // Pass the context from the response to maintain conversation continuity
          onComplete(response.context);
          return;
        }
        
        try {
          const chunk = words.slice(currentIndex, Math.min(currentIndex + chunkSize, words.length)).join(' ');
          if (currentIndex + chunkSize < words.length) {
            onChunk(chunk + ' ');
          } else {
            onChunk(chunk);
          }
          currentIndex += chunkSize;
          scheduleNext(processChunk);
        } catch (chunkError) {
          isProcessing = false;
          onComplete(response.context);
        }
      };
      
      scheduleNext(processChunk);
      
      // Safety timeout for very long responses
      setTimeout(() => {
        if (isProcessing && currentIndex < words.length) {
          isProcessing = false;
          onChunk(words.slice(currentIndex).join(' '));
          onComplete(response.context);
        }
      }, 30000); // 30 seconds max processing time
      
    } catch (error) {
      onComplete();
      throw error;
    }
  }

  async getModels(): Promise<OllamaModel[]> {
    try {
      const response = await axios.get(`${this.baseUrl}${URLS.OLLAMA.API.TAGS}`, {
        timeout: DEFAULTS.TIMEOUTS.MEDIUM,
        headers: {
          [API_HEADERS.CONTENT_TYPE]: 'application/json',
        },
      });
      return response.data.models || [];
    } catch (error) {
      return [];
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: DEFAULTS.TIMEOUTS.SHORT,
        headers: {
          [API_HEADERS.CONTENT_TYPE]: 'application/json',
        },
      });
      return true;
    } catch (error) {
      console.error('Connection check failed:', error);
      return false;
    }
  }

  async generateChatTitle(conversationContext: string, model: string): Promise<string> {
    try {
      const prompt = `Based on this conversation context: "${conversationContext}"

Generate a short, descriptive title for this conversation (maximum 6 words). The title should be clear and concise, capturing the main topic or intent of the entire conversation. Do not use quotes or special characters. Only respond with the title, nothing else.

Examples:
- Context: "How do I learn Python? What are the best resources? Should I start with basics?" → Title: "Python Learning Resources Guide"
- Context: "What's the weather like? Will it rain tomorrow? Should I bring umbrella?" → Title: "Weather Forecast and Planning"
- Context: "Help me with math homework. How do I solve equations? What about quadratic formulas?" → Title: "Math Homework Help Session"

Title:`;

      const response = await this.generateResponse({
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

export default new OllamaService();