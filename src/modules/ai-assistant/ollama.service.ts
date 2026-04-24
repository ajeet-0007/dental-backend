import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OllamaService {
  private client: OpenAI;

  constructor(private configService: ConfigService) {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: this.configService.get('OPENROUTER_API_KEY'),
    });
  }

  async chat(messages: { role: string; content: string }[], stream = false) {
    const response = await this.client.chat.completions.create({
      model: 'openrouter/free',
      messages: messages as any,
      stream,
    });

    if (stream) {
      return response;
    }

    return {
      message: {
        content: (response as any).choices[0]?.message?.content || '',
      },
    };
  }

  async generate(prompt: string, stream = false) {
    const response = await this.client.chat.completions.create({
      model: 'openrouter/free',
      messages: [{ role: 'user', content: prompt }] as any,
      stream,
    });

    if (stream) {
      return response;
    }

    return {
      response: (response as any).choices[0]?.message?.content || '',
    };
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'openai/text-embedding-3-small',
      input: text,
    });

    return response.data[0]?.embedding || [];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: 'openai/text-embedding-3-small',
      input: texts,
    });

    return response.data.map((d) => d.embedding);
  }
}