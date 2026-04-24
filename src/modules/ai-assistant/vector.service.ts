import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { OllamaService } from './ollama.service';

export interface ProductChunk {
  productId: number;
  chunkText: string;
  metadata: {
    name: string;
    category: string;
    brand: string;
    price: number;
    slug: string;
  };
}

@Injectable()
export class VectorService {
  private supabase;
  private tableName = 'product_embeddings';

  constructor(
    private configService: ConfigService,
    private ollamaService: OllamaService,
  ) {
    this.supabase = createClient(
      this.configService.get('SUPABASE_URL', ''),
      this.configService.get('SUPABASE_SERVICE_KEY', ''),
    );
  }

  async createEmbeddingTable(): Promise<void> {
    const sql = `
      CREATE EXTENSION IF NOT EXISTS vector;

      CREATE TABLE IF NOT EXISTS product_embeddings (
        id BIGSERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding vector(1536),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_product_embeddings_product_id 
        ON product_embeddings(product_id);
      
      CREATE INDEX IF NOT EXISTS idx_product_embeddings_embedding 
        ON product_embeddings USING ivfflat (embedding vector_cosine_ops);
    `;

    const { error } = await this.supabase.rpc('exec', { query: sql });
    if (error) {
      console.log('Table creation response:', error);
    }
  }

  async embedProduct(product: {
    id: number;
    name: string;
    description: string;
    category: string;
    brand: string;
    price: number;
    slug: string;
    shortDescription?: string;
  }): Promise<void> {
    const chunkText = this.createProductChunk(product);
    const embedding = await this.ollamaService.embed(chunkText);

    await this.supabase.from(this.tableName).upsert(
      {
        product_id: product.id,
        content: chunkText,
        embedding: embedding,
        metadata: {
          name: product.name,
          category: product.category,
          brand: product.brand,
          price: product.price,
          slug: product.slug,
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'product_id',
      },
    );
  }

  async embedProducts(products: Array<{
    id: number;
    name: string;
    description: string;
    category: string;
    brand: string;
    price: number;
    slug: string;
    shortDescription?: string;
  }>): Promise<void> {
    for (const product of products) {
      await this.embedProduct(product);
    }
  }

  async search(query: string, topK = 5): Promise<ProductChunk[]> {
    const queryEmbedding = await this.ollamaService.embed(query);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .limit(100);

    if (error || !data || data.length === 0) {
      console.error('[Vector] Search error:', error);
      return this.fallbackSearch(query, topK);
    }

    const scored = (data as any[])
      .map(item => {
        const similarity = 1 - this.cosineDistance(queryEmbedding, item.embedding);
        return { ...item, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity);

    if (scored.length === 0 || scored[0].similarity < 0.3) {
      console.log('[Vector] Low similarity, using fallback text search');
      return this.fallbackSearch(query, topK);
    }

    const topResults = scored.slice(0, topK);

    console.log('[Vector] Filtered results:', topResults.length);

    return topResults.map(item => ({
      productId: item.product_id,
      chunkText: item.content,
      metadata: item.metadata,
    }));
  }

  private cosineDistance(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 1;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return 1 - (dot / (Math.sqrt(normA) * Math.sqrt(normB) + 0.0001));
  }

  private async fallbackSearch(query: string, limit: number): Promise<ProductChunk[]> {
    const allData = await this.supabase
      .from(this.tableName)
      .select('*')
      .limit(100);

    if (!allData.data || allData.data.length === 0) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const scored = allData.data
      .map((item) => {
        const textLower = (item.content || '').toLowerCase();
        const words = queryLower.split(' ').filter(w => w.length > 2);
        let score = 0;
        for (const word of words) {
          if (textLower.includes(word)) {
            score += 1;
          }
        }
        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(item => ({
      productId: item.product_id,
      chunkText: item.content,
      metadata: item.metadata,
    }));
  }

  async deleteProductEmbedding(productId: number): Promise<void> {
    await this.supabase
      .from(this.tableName)
      .delete()
      .eq('product_id', productId);
  }

  async clearAllEmbeddings(): Promise<void> {
    await this.supabase.from(this.tableName).delete().neq('id', 0);
  }

  private createProductChunk(product: {
    name: string;
    description: string;
    category: string;
    brand: string;
    price: number;
    shortDescription?: string;
  }): string {
    return `
Product Name: ${product.name}
Category: ${product.category || 'General'}
Brand: ${product.brand || 'Unknown'}
Price: ₹${product.price}
Short Description: ${product.shortDescription || 'N/A'}
Description: ${product.description || 'N/A'}
    `.trim();
  }

  async getEmbeddingCount(): Promise<number> {
    const { count } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });
    return count || 0;
  }
}