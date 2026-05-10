export class DepartmentBulkUploadResultDto {
  row: number;
  name: string;
  status: 'success' | 'skipped' | 'failed';
  departmentId?: number;
  reason?: string;
  error?: string;
}

export class DepartmentBulkUploadResponseDto {
  totalRows: number;
  successCount: number;
  skippedCount: number;
  failureCount: number;
  results: DepartmentBulkUploadResultDto[];
}