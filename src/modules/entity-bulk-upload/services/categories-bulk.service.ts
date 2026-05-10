import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { parseString } from '@fast-csv/parse';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Category } from '../../../database/entities/category.entity';
import { CategoryBulkUploadResultDto, CategoryBulkUploadResponseDto } from '../dto/category-bulk-upload.dto';
import { slugify } from '../../../common/utils/slugify';

interface CategoryParsedRow {
  name: string;
  description?: string;
  image_url?: string;
  is_active?: string;
  sort_order?: string;
}

@Injectable()
export class CategoriesBulkService {
  private imageUploadCache = new Map<string, string>();

  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  generateTemplate(): string {
    const headers = ['name', 'description', 'image_url', 'is_active', 'sort_order'];
    const exampleRows = [
      ['Toothpaste', 'All types of toothpaste', '', 'true', '1'],
      ['Toothbrushes', 'Manual and electric toothbrushes', '', 'true', '2'],
    ];
    const csvLines = [headers.join(',')];
    for (const row of exampleRows) {
      csvLines.push(row.map((v) => `"${v}"`).join(','));
    }
    return csvLines.join('\n');
  }

  private async parseCSV(file: Express.Multer.File): Promise<CategoryParsedRow[]> {
    const content = file.buffer.toString('utf-8');
    return new Promise((resolve, reject) => {
      const rows: CategoryParsedRow[] = [];
      parseString(content, { headers: true, trim: true })
        .on('data', (row: CategoryParsedRow) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', (error) => reject(new BadRequestException(`CSV parsing failed: ${error.message}`)));
    });
  }

  private async uploadToImageKit(fileBuffer: Buffer, fileName: string): Promise<string> {
    const publicKey = this.configService.get<string>('IMAGEKIT_PUBLIC_KEY') || '';
    const privateKey = this.configService.get<string>('IMAGEKIT_PRIVATE_KEY') || '';

    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 3500;
    const signature = crypto
      .createHmac('sha1', privateKey)
      .update(token + expire)
      .digest('hex');

    const formData = new FormData();
    formData.append('file', fileBuffer.toString('base64'));
    formData.append('fileName', fileName);
    formData.append('publicKey', publicKey);
    formData.append('token', token);
    formData.append('expire', expire.toString());
    formData.append('signature', signature);
    formData.append('folder', '/dentalkart/categories');

    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'ImageKit upload failed');
    return result.url;
  }

  private async resolveImagePath(imagePath: string | undefined): Promise<string | null> {
    if (!imagePath?.trim()) return null;

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    if (this.imageUploadCache.has(imagePath)) {
      return this.imageUploadCache.get(imagePath)!;
    }

    try {
      const fileBuffer = fs.readFileSync(imagePath);
      const fileName = path.basename(imagePath);
      const imageUrl = await this.uploadToImageKit(fileBuffer, fileName);
      this.imageUploadCache.set(imagePath, imageUrl);
      return imageUrl;
    } catch (error) {
      console.error(`Failed to upload image ${imagePath}:`, error);
      return null;
    }
  }

  async processBulkUpload(file: Express.Multer.File): Promise<CategoryBulkUploadResponseDto> {
    const rows = await this.parseCSV(file);

    if (rows.length === 0) {
      throw new BadRequestException('CSV file is empty or has no data rows');
    }

    const existingCategories = await this.categoryRepository.find();
    const existingNames = new Set(existingCategories.map((c) => c.name.toLowerCase()));

    const results: CategoryBulkUploadResultDto[] = [];
    const seenNames = new Set<string>();
    let rowCounter = 1;

    for (const row of rows) {
      const name = row.name?.trim();

      if (!name) {
        results.push({
          row: rowCounter,
          name: row.name || '',
          status: 'failed',
          error: 'Name is required',
        });
        rowCounter++;
        continue;
      }

      const nameLower = name.toLowerCase();

      if (seenNames.has(nameLower)) {
        results.push({
          row: rowCounter,
          name,
          status: 'skipped',
          reason: 'Duplicate name in CSV',
        });
        rowCounter++;
        continue;
      }

      if (existingNames.has(nameLower)) {
        results.push({
          row: rowCounter,
          name,
          status: 'skipped',
          reason: 'Already exists in database',
        });
        rowCounter++;
        continue;
      }

      seenNames.add(nameLower);

      try {
        const imageUrl = await this.resolveImagePath(row.image_url);

        const baseSlug = slugify(name);
        let finalSlug = baseSlug;
        let counter = 1;
        while (await this.categoryRepository.findOne({ where: { slug: finalSlug } })) {
          finalSlug = `${baseSlug}-${counter}`;
          counter++;
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const category = queryRunner.manager.create(Category, {
            name,
            slug: finalSlug,
            description: row.description?.trim() || null,
            image: imageUrl,
            isActive: row.is_active?.toLowerCase() !== 'false',
            sortOrder: parseInt(row.sort_order || '0') || 0,
          } as any);

          const savedCategory = await queryRunner.manager.save(Category, category);
          await queryRunner.commitTransaction();

          results.push({
            row: rowCounter,
            name,
            status: 'success',
            categoryId: savedCategory.id,
          });
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
      } catch (error) {
        results.push({
          row: rowCounter,
          name,
          status: 'failed',
          error: error.message || 'Unknown error during creation',
        });
      }

      rowCounter++;
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const skippedCount = results.filter((r) => r.status === 'skipped').length;
    const failureCount = results.filter((r) => r.status === 'failed').length;

    return {
      totalRows: rows.length,
      successCount,
      skippedCount,
      failureCount,
      results,
    };
  }
}