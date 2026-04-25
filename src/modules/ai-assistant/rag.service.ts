import { Injectable } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { VectorService, ProductChunk } from './vector.service';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatResponse {
  message: string;
  products?: Array<{
    id: number;
    name: string;
    slug: string;
    price: number;
    category: string;
    brand: string;
  }>;
}

@Injectable()
export class RagService {
  private systemPrompt: string;

  constructor(
    private ollamaService: OllamaService,
    private vectorService: VectorService,
    private configService: ConfigService,
  ) {
    this.systemPrompt = `You are a helpful dental products assistant for Dentalkart, an online dental supplies store. 
Your role is to help customers find the right products, answer questions about dental supplies, and provide helpful recommendations.
You have access to product information retrieved from our database.

Guidelines:
- Be friendly and professional
- Only recommend products that exist in the provided product data
- If you don't know something, say so honestly
- Focus on dental products like instruments, materials, equipment, and consumables
- Prices are in Indian Rupees (₹)
- Do NOT include URLs in your response - product links are shown separately in the UI
- Provide concise, helpful answers
- If a product is recommended, mention its name and price only`;
  }

  async chat(userMessage: string, chatHistory: ChatMessage[] = []): Promise<ChatResponse> {
    const relevantProducts = await this.vectorService.search(userMessage, 5);
    
    console.log('[RAG] Search results:', JSON.stringify(relevantProducts, null, 2));

    const context = this.buildContext(relevantProducts);
    const messages = this.buildMessages(userMessage, chatHistory, context);

    try {
      const response = await this.ollamaService.chat(messages);

      const assistantMessage = typeof response === 'object' && 'message' in response
        ? response.message.content
        : String(response);

      const products = relevantProducts.map(p => ({
        id: p.productId,
        name: p.metadata?.name || 'Unknown Product',
        slug: p.metadata?.slug || '',
        price: p.metadata?.price || 0,
        category: p.metadata?.category || 'General',
        brand: p.metadata?.brand || 'Unknown',
      }));
      
      console.log('[RAG] Returning products:', JSON.stringify(products, null, 2));

      return {
        message: assistantMessage,
        products,
      };
    } catch (error) {
      console.error('RAG chat error:', error);
      return {
        message: 'I apologize, but I encountered an error processing your request. Please try again.',
      };
    }
  }

  async *chatStream(userMessage: string, chatHistory: ChatMessage[] = []): AsyncGenerator<string> {
    const relevantProducts = await this.vectorService.search(userMessage, 5);

    const context = this.buildContext(relevantProducts);
    const messages = this.buildMessages(userMessage, chatHistory, context);

    const response = await this.ollamaService.chat(messages, true);

    if (Symbol.asyncIterator in response) {
      for await (const chunk of response as AsyncIterable<any>) {
        yield chunk.message?.content || '';
      }
    } else {
      yield String(response);
    }
  }

  private buildContext(products: ProductChunk[]): string {
    if (products.length === 0) {
      return 'No relevant products found in the database.';
    }

    const productContexts = products.map((p, index) => {
      return `[${index + 1}] ${p.chunkText}`;
    }).join('\n\n');

    return `Here are some relevant products from our database:\n\n${productContexts}`;
  }

  private buildMessages(
    userMessage: string,
    chatHistory: ChatMessage[],
    context: string,
  ): { role: string; content: string }[] {
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: `${this.systemPrompt}\n\n${context}` },
    ];

    for (const msg of chatHistory.slice(-10)) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    messages.push({ role: 'user', content: userMessage });

    return messages;
  }
}