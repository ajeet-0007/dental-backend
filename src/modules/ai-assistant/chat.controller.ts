import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto, EmbedProductsDto, ChatMessageResponse, EmbedProductsResponse } from './dto/chat.dto';

@ApiTags('AI Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a chat message and get AI response' })
  @ApiResponse({ status: 200, description: 'Chat response returned successfully' })
  async sendMessage(@Body() dto: SendMessageDto): Promise<ChatMessageResponse> {
    return this.chatService.sendMessage(dto);
  }

  @Post('embed-products')
  @ApiOperation({ summary: 'Embed products into the vector database' })
  @ApiResponse({ status: 200, description: 'Products embedded successfully' })
  async embedProducts(@Body() dto: EmbedProductsDto): Promise<EmbedProductsResponse> {
    return this.chatService.embedProducts(dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get embedding statistics' })
  @ApiResponse({ status: 200, description: 'Returns embedding count and status' })
  async getStats(): Promise<{ count: number; status: string }> {
    return this.chatService.getEmbeddingStats();
  }

  @Get('clear')
  @ApiOperation({ summary: 'Clear all embeddings from the vector database' })
  @ApiResponse({ status: 200, description: 'Embeddings cleared successfully' })
  async clearEmbeddings(): Promise<{ success: boolean; message: string }> {
    return this.chatService.clearEmbeddings();
  }
}