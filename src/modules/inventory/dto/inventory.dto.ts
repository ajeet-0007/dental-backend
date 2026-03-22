import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInventoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productVariantId?: string;

  @ApiProperty({ default: 'default' })
  @IsOptional()
  @IsString()
  warehouseLocation?: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  lowStockThreshold?: number;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;
}

export class UpdateInventoryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  reservedQuantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  lowStockThreshold?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  warehouseLocation?: string;
}
