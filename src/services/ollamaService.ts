import axios from 'axios';
import { OllamaResponse, OllamaGenerateRequest, OllamaModel } from '../types';

class OllamaService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  async generateResponse(request: OllamaGenerateRequest): Promise<OllamaResponse> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        ...request,
        stream: false,
      });
      return response.data;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  async streamResponse(
    request: OllamaGenerateRequest,
    onChunk: (chunk: string) => void,
    onComplete: () => void
  ): Promise<void> {
    try {
      // React Native doesn't support streaming in the same way, so we'll use a non-streaming approach
      const response = await this.generateResponse(request);
      
      // Simulate streaming by chunking the response
      const words = response.response.split(' ');
      let currentIndex = 0;
      
      // Use requestAnimationFrame for web or setTimeout for native
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
      console.error('Error generating response:', error);
      onComplete();
      throw error;
    }
  }

  async getModels(): Promise<OllamaModel[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new OllamaService();