import { IsString, IsOptional, IsArray, ArrayMaxSize } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveLogDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkResolveLogsDto {
  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  ids: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
