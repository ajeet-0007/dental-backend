import {
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LogLevel } from '../../../database/entities/log.entity';

export class CreateClientLogDto {
  @ApiProperty({ enum: LogLevel })
  @IsEnum(LogLevel)
  level: LogLevel;

  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  stackTrace?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(45)
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @MaxLength(50, { each: true })
  tags?: string[];
}

export class BatchClientLogDto {
  @ApiProperty({ type: [CreateClientLogDto] })
  @IsArray()
  @ArrayMaxSize(20)
  logs: CreateClientLogDto[];
}
