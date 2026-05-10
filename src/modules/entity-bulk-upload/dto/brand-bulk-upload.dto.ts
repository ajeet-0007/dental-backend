export class BrandBulkUploadResultDto {
  row: number;
  name: string;
  status: 'success' | 'skipped' | 'failed';
  brandId?: number;
  reason?: string;
  error?: string;
}

export class BrandBulkUploadResponseDto {
  totalRows: number;
  successCount: number;
  skippedCount: number;
  failureCount: number;
  results: BrandBulkUploadResultDto[];
}