import {
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';
import { BulkUploadService } from './bulk-upload.service';

@ApiTags('Bulk Upload')
@Controller('bulk-upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class BulkUploadController {
  constructor(private readonly bulkUploadService: BulkUploadService) {}

  @Get('template')
  @ApiOperation({ summary: 'Download CSV template for bulk product upload' })
  @ApiBearerAuth()
  downloadTemplate(@Res() res: Response) {
    const csv = this.bulkUploadService.generateTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=product-bulk-upload-template.csv');
    res.send(csv);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload CSV file for bulk product creation' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file containing product data',
        },
      },
    },
  })
  async uploadCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are accepted');
    }

    const { results } = await this.bulkUploadService.processBulkUpload(file);

    const totalRows = results.length;
    const successCount = results.filter((r) => r.status === 'success').length;
    const failureCount = results.filter((r) => r.status === 'failed').length;

    const totalProducts = new Set(
      results.filter((r) => r.status === 'success').map((r) => r.productName)
    ).size;

    return {
      totalRows,
      totalProducts,
      successCount,
      failureCount,
      results,
    };
  }
}
