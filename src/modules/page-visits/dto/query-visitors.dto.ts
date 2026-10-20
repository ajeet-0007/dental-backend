import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryVisitorsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ description: 'Matches visitor id or user email' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class PurgePageVisitsDto {
  @ApiPropertyOptional({ example: '2026-01-01', description: 'Delete visits created before this ISO date' })
  @IsOptional()
  @IsString()
  olderThan?: string;
}
