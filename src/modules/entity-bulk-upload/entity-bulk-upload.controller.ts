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
import { DepartmentsBulkService } from './services/departments-bulk.service';
import { BrandsBulkService } from './services/brands-bulk.service';
import { CategoriesBulkService } from './services/categories-bulk.service';

@ApiTags('Entity Bulk Upload')
@Controller('entity-bulk-upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class EntityBulkUploadController {
  constructor(
    private readonly departmentsBulkService: DepartmentsBulkService,
    private readonly brandsBulkService: BrandsBulkService,
    private readonly categoriesBulkService: CategoriesBulkService,
  ) {}

  @Get('departments/template')
  @ApiOperation({ summary: 'Download CSV template for bulk department upload' })
  @ApiBearerAuth()
  downloadDepartmentsTemplate(@Res() res: Response) {
    const csv = this.departmentsBulkService.generateTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=departments-bulk-upload-template.csv');
    res.send(csv);
  }

  @Post('departments')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload CSV file for bulk department creation' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'CSV file containing department data' },
      },
    },
  })
  async uploadDepartmentsCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (!file.originalname.endsWith('.csv')) throw new BadRequestException('Only CSV files are accepted');
    return this.departmentsBulkService.processBulkUpload(file);
  }

  @Get('brands/template')
  @ApiOperation({ summary: 'Download CSV template for bulk brand upload' })
  @ApiBearerAuth()
  downloadBrandsTemplate(@Res() res: Response) {
    const csv = this.brandsBulkService.generateTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=brands-bulk-upload-template.csv');
    res.send(csv);
  }

  @Post('brands')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload CSV file for bulk brand creation' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'CSV file containing brand data' },
      },
    },
  })
  async uploadBrandsCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (!file.originalname.endsWith('.csv')) throw new BadRequestException('Only CSV files are accepted');
    return this.brandsBulkService.processBulkUpload(file);
  }

  @Get('categories/template')
  @ApiOperation({ summary: 'Download CSV template for bulk category upload' })
  @ApiBearerAuth()
  downloadCategoriesTemplate(@Res() res: Response) {
    const csv = this.categoriesBulkService.generateTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=categories-bulk-upload-template.csv');
    res.send(csv);
  }

  @Post('categories')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload CSV file for bulk category creation' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'CSV file containing category data' },
      },
    },
  })
  async uploadCategoriesCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (!file.originalname.endsWith('.csv')) throw new BadRequestException('Only CSV files are accepted');
    return this.categoriesBulkService.processBulkUpload(file);
  }
}