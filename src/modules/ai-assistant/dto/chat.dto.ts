import { IsString, IsOptional, IsArray, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SendMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  history?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
  }>;
}

export class EmbedProductsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  productId?: number;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  productIds?: number[];
}

export class ChatMessageResponse {
  message: string;
  products?: Array<{
    id: number;
    name: string;
    slug: string;
    price: number;
    category: string;
    brand: string;
  }>;
  timestamp: Date;
}

export class EmbedProductsResponse {
  success: boolean;
  embeddedCount: number;
  message: string;
}