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
    console.log('Starting streaming request...');
    
    try {
      // Use XMLHttpRequest for better React Native compatibility
      const xhr = new XMLHttpRequest();
      let responseBuffer = '';
      let finalContext: number[] | undefined;
      
      xhr.open('POST', `${this.baseUrl}${URLS.OLLAMA.API.GENERATE}`, true);
      xhr.setRequestHeader(API_HEADERS.CONTENT_TYPE, 'application/json');
      
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
                console.log('Streaming chunk received:', data.response);
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
              console.warn('Failed to parse streaming line:', line);
            }
          }
        }
      };
      
      xhr.onload = () => {
        console.log('Streaming request completed');
        onComplete(finalContext);
      };
      
      xhr.onerror = () => {
        throw new Error('Network error during streaming');
      };
      
      xhr.ontimeout = () => {
        throw new Error('Streaming request timed out');
      };
      
      xhr.timeout = DEFAULTS.TIMEOUTS.LONG;
      
      // Send the request
      xhr.send(JSON.stringify({
        ...request,
        stream: true,
      }));
      
    } catch (error) {
      console.error('XMLHttpRequest streaming failed, falling back to fetch-based streaming:', error);
      
      // Try fetch as secondary option
      try {
        const response = await fetch(`${this.baseUrl}${URLS.OLLAMA.API.GENERATE}`, {
          method: 'POST',
          headers: {
            [API_HEADERS.CONTENT_TYPE]: 'application/json',
          },
          body: JSON.stringify({
            ...request,
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get response reader');
        }

        const decoder = new TextDecoder();
        let finalContext: number[] | undefined;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                
                if (data.response) {
                  console.log('Fetch streaming chunk:', data.response);
                  onChunk(data.response);
                }
                
                if (data.done) {
                  finalContext = data.context;
                  onComplete(finalContext);
                  return;
                }
              } catch (parseError) {
                console.warn('Failed to parse fetch streaming line:', line);
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        onComplete(finalContext);
        
      } catch (fetchError) {
        console.error('Both streaming methods failed, falling back to simulated streaming:', fetchError);
        
        // Final fallback: simulated streaming with immediate response
        const response = await this.generateResponse(request);
        
        // Very fast simulated streaming for better UX
        const characters = response.response.split('');
        let currentIndex = 0;
        
        const processChar = () => {
          if (currentIndex >= characters.length) {
            onComplete(response.context);
            return;
          }
          
          onChunk(characters[currentIndex]);
          currentIndex++;
          
          // Very fast character-by-character streaming
          setTimeout(processChar, 10);
        };
        
        processChar();
      }
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