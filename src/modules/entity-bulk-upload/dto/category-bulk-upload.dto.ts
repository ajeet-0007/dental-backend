export class CategoryBulkUploadResultDto {
  row: number;
  name: string;
  status: 'success' | 'skipped' | 'failed';
  categoryId?: number;
  reason?: string;
  error?: string;
}

export class CategoryBulkUploadResponseDto {
  totalRows: number;
  successCount: number;
  skippedCount: number;
  failureCount: number;
  results: CategoryBulkUploadResultDto[];
}