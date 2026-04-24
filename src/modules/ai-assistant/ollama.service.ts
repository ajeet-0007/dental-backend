import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class OllamaService {
  private baseURL = 'https://integrate.api.nvidia.com/v1';
  private chatModel = 'meta/llama-3.3-70b-instruct';
  private embedModel = 'nvidia/llama-nemotron-embed-1b-v2';
  private apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get('NVIDIA_API_KEY', '');
  }

  async chat(messages: { role: string; content: string }[], stream = false) {
    try {
      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: this.chatModel,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        stream,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        message: {
          content: response.data.choices[0]?.message?.content || '',
        },
      };
    } catch (error: any) {
      console.error('NVIDIA Chat Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async chatStream(messages: { role: string; content: string }[]): Promise<AsyncIterable<string>> {
    const response = await axios.post(`${this.baseURL}/chat/completions`, {
      model: this.chatModel,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      responseType: 'stream',
    });

    const stream = response.data;

    return {
      async *[Symbol.asyncIterator]() {
        let buffer = '';
        for await (const chunk of stream) {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim() && line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.choices?.[0]?.delta?.content) {
                  yield data.choices[0].delta.content;
                }
              } catch {}
            }
          }
        }
      },
    };
  }

  async generate(prompt: string, stream = false) {
    const response = await axios.post(`${this.baseURL}/chat/completions`, {
      model: this.chatModel,
      messages: [{ role: 'user', content: prompt }],
      stream,
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      response: response.data.choices[0]?.message?.content || '',
    };
  }

  async embed(text: string): Promise<number[]> {
    const response = await axios.post(`${this.baseURL}/embeddings`, {
      model: this.embedModel,
      input: text,
      input_type: 'query',
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data.data[0]?.embedding || [];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await axios.post(`${this.baseURL}/embeddings`, {
      model: this.embedModel,
      input: texts,
      input_type: 'query',
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data.data.map((d: any) => d.embedding);
  }
}