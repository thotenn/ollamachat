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
    onComplete: (context?: number[]) => void
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
          // Pass the context from the response to maintain conversation continuity
          onComplete(response.context);
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

  async generateChatTitle(firstMessage: string, model: string): Promise<string> {
    try {
      const prompt = `Based on this user question: "${firstMessage}"

Generate a short, descriptive title for this conversation (maximum 6 words). The title should be clear and concise, capturing the main topic or intent. Do not use quotes or special characters. Only respond with the title, nothing else.

Examples:
- User: "How do I learn Python?" → Title: "Learning Python Programming"
- User: "What's the weather like?" → Title: "Weather Information Request"
- User: "Help me with math homework" → Title: "Math Homework Help"

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
        const firstWords = firstMessage.split(' ').slice(0, 4).join(' ');
        title = firstWords.length > 30 ? firstWords.substring(0, 27) + '...' : firstWords;
      }

      return title;
    } catch (error) {
      console.error('Error generating chat title:', error);
      // Fallback: use first few words of the message
      const firstWords = firstMessage.split(' ').slice(0, 4).join(' ');
      return firstWords.length > 30 ? firstWords.substring(0, 27) + '...' : firstWords;
    }
  }
}

export default new OllamaService();