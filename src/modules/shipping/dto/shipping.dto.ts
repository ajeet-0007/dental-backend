import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShippingMethodDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  baseCost: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  costPerKg?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  freeShippingMinAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  estimatedDays?: number;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateShippingMethodDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  baseCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  costPerKg?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  freeShippingMinAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  estimatedDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateShipmentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  trackingUrl?: string;
}
