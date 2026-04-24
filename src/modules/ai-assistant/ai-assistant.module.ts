import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { OllamaService } from './ollama.service';
import { VectorService } from './vector.service';
import { RagService } from './rag.service';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ProductsModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    OllamaService,
    VectorService,
    RagService,
  ],
  exports: [ChatService],
})
export class AiAssistantModule {}