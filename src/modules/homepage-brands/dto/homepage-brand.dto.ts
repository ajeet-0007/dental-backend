import { IsNotEmpty, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHomepageBrandDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  brandId: number;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateHomepageBrandDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  brandId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
