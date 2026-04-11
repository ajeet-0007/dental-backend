import { IsNumber, IsString, IsOptional, IsArray, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateReviewDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  @IsNumber()
  productId: number;

  @ApiProperty({ example: 5, description: 'Rating (1-5)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Great product!', description: 'Review title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'This product exceeded my expectations...', description: 'Review comment' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ example: ['https://imagekit.io/img1.jpg'], description: 'Image URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ example: 'order-uuid-here', description: 'Order ID for verification' })
  @IsOptional()
  @IsString()
  orderId?: string;
}

export class UpdateReviewDto {
  @ApiPropertyOptional({ example: 4, description: 'Rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: 'Updated title', description: 'Review title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated comment', description: 'Review comment' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ example: ['https://imagekit.io/img1.jpg'], description: 'Image URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class ReviewQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: ['newest', 'oldest', 'highest', 'lowest', 'most_helpful'] })
  @IsOptional()
  @IsString()
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'most_helpful';
}

export class ReviewStatsDto {
  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  totalReviews: number;

  @ApiProperty()
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };

  @ApiProperty()
  verifiedCount: number;
}