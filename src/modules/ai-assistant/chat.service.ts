import { Injectable } from '@nestjs/common';
import { SendMessageDto, EmbedProductsDto, ChatMessageResponse, EmbedProductsResponse } from './dto/chat.dto';
import { RagService } from './rag.service';
import { VectorService } from './vector.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class ChatService {
  constructor(
    private ragService: RagService,
    private vectorService: VectorService,
    private productsService: ProductsService,
  ) {}

  async sendMessage(dto: SendMessageDto): Promise<ChatMessageResponse> {
    const history = (dto.history || []).map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined,
    }));
    const response = await this.ragService.chat(dto.message, history);

    return {
      message: response.message,
      products: response.products,
      timestamp: new Date(),
    };
  }

  async embedProducts(dto: EmbedProductsDto): Promise<EmbedProductsResponse> {
    try {
      if (dto.productId) {
        const product = await this.productsService.findOne(String(dto.productId));
        if (!product) {
          return {
            success: false,
            embeddedCount: 0,
            message: 'Product not found',
          };
        }

        await this.vectorService.embedProduct({
          id: product.id,
          name: product.name,
          description: product.description || '',
          shortDescription: product.shortDescription || '',
          category: product.category?.name || 'General',
          brand: product.brand || product.brandEntity?.name || '',
          sellingPrice: product.sellingPrice,
          slug: product.slug,
        });

        return {
          success: true,
          embeddedCount: 1,
          message: 'Product embedded successfully',
        };
      }

      if (dto.productIds && dto.productIds.length > 0) {
        const products = await Promise.all(
          dto.productIds.map(id => this.productsService.findOne(String(id))),
        );

        const validProducts = products.filter(p => p && !('message' in p));

        await this.vectorService.embedProducts(
          validProducts.map((product: any) => ({
            id: product.id,
            name: product.name,
            description: product.description || '',
            shortDescription: product.shortDescription || '',
            category: product.category?.name || 'General',
            brand: product.brand || product.brandEntity?.name || '',
            sellingPrice: product.sellingPrice,
            slug: product.slug,
          })),
        );

        return {
          success: true,
          embeddedCount: validProducts.length,
          message: `${validProducts.length} products embedded successfully`,
        };
      }

      const { products: allProducts } = await this.productsService.findAll({
        page: 1,
        limit: 1000,
      });

      await this.vectorService.embedProducts(
        allProducts.map((product: any) => ({
          id: product.id,
          name: product.name,
          description: product.description || '',
          shortDescription: product.shortDescription || '',
          category: product.category?.name || 'General',
          brand: product.brand || product.brandEntity?.name || '',
          sellingPrice: product.sellingPrice,
          slug: product.slug,
        })),
      );

      return {
        success: true,
        embeddedCount: allProducts.length,
        message: `${allProducts.length} products embedded successfully`,
      };
    } catch (error) {
      console.error('Embed products error:', error);
      return {
        success: false,
        embeddedCount: 0,
        message: `Error embedding products: ${error.message}`,
      };
    }
  }

  async getEmbeddingStats(): Promise<{ count: number; status: string }> {
    try {
      const count = await this.vectorService.getEmbeddingCount();
      return {
        count,
        status: 'healthy',
      };
    } catch (error) {
      return {
        count: 0,
        status: 'error',
      };
    }
  }

  async clearEmbeddings(): Promise<{ success: boolean; message: string }> {
    try {
      await this.vectorService.clearAllEmbeddings();
      return {
        success: true,
        message: 'All embeddings cleared successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error clearing embeddings: ${error.message}`,
      };
    }
  }
}