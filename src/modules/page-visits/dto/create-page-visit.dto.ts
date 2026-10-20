import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePageVisitDto {
  @ApiProperty({ example: '/products/dental-handpiece' })
  @IsString()
  @MaxLength(500)
  path: string;

  @ApiPropertyOptional({ example: 'Dental Handpiece — Dentzoo' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pageTitle?: string;

  @ApiPropertyOptional({ example: 'https://www.google.com/' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  referrer?: string;
}
