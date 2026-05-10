import { ApiProperty } from '@nestjs/swagger';

export class BulkUploadResultDto {
  @ApiProperty()
  row: number;

  @ApiProperty()
  productName: string;

  @ApiProperty({ enum: ['success', 'failed'] })
  status: 'success' | 'failed';

  @ApiProperty({ nullable: true })
  productId?: number;

  @ApiProperty({ nullable: true })
  error?: string;
}

export class BulkUploadResponseDto {
  @ApiProperty()
  totalRows: number;

  @ApiProperty()
  totalProducts: number;

  @ApiProperty()
  successCount: number;

  @ApiProperty()
  failureCount: number;

  @ApiProperty({ type: [BulkUploadResultDto] })
  results: BulkUploadResultDto[];
}
