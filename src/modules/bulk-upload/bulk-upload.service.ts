import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { parseString } from '@fast-csv/parse';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Product } from '../../database/entities/product.entity';
import { ProductVariant } from '../../database/entities/product-variant.entity';
import { ProductOption } from '../../database/entities/product-option.entity';
import { ProductOptionValue } from '../../database/entities/product-option-value.entity';
import { VariantOption } from '../../database/entities/variant-option.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { Category } from '../../database/entities/category.entity';
import { Brand } from '../../database/entities/brand.entity';
import { Department } from '../../database/entities/department.entity';
import { BulkUploadResultDto } from './dto/bulk-upload.dto';
import { slugify, generateSKU } from '../../common/utils/slugify';

interface ParsedRow {
  product_name: string;
  product_slug: string;
  product_sku: string;
  description: string;
  short_description: string;
  selling_price: string;
  mrp: string;
  category: string;
  brand: string;
  departments: string;
  images: string;
  is_active: string;
  is_featured: string;
  expires_at: string;
  features: string;
  key_specifications: string;
  packaging: string;
  warranty: string;
  direction_to_use: string;
  additional_info: string;
  weight: string;
  weight_unit: string;
  stock: string;
  variant_name: string;
  variant_sku: string;
  variant_selling_price: string;
  variant_mrp: string;
  variant_weight: string;
  variant_image: string;
  variant_stock: string;
  option_1_name: string;
  option_1_value: string;
  option_2_name: string;
  option_2_value: string;
  option_3_name: string;
  option_3_value: string;
}

interface ProductGroup {
  productData: {
    name: string;
    slug: string;
    sku: string;
    description: string;
    shortDescription: string;
    sellingPrice: number;
    mrp: number;
    category: string;
    brand: string;
    departments: string;
    images: string;
    isActive: boolean;
    isFeatured: boolean;
    expiresAt: string;
    features: string;
    keySpecifications: string;
    packaging: string;
    warranty: string;
    directionToUse: string;
    additionalInfo: string;
    weight: number;
    weightUnit: string;
    stock: number;
  };
  variants: {
    name: string;
    sku: string;
    sellingPrice: number;
    mrp: number;
    weight: number;
    image: string;
    stock: number;
    options: { optionName: string; optionValue: string }[];
  }[];
}

@Injectable()
export class BulkUploadService {
  private imageUploadCache = new Map<string, string>();

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(ProductOption)
    private productOptionRepository: Repository<ProductOption>,
    @InjectRepository(ProductOptionValue)
    private productOptionValueRepository: Repository<ProductOptionValue>,
    @InjectRepository(VariantOption)
    private variantOptionRepository: Repository<VariantOption>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  generateTemplate(): string {
    const headers = [
      'product_name',
      'product_slug',
      'product_sku',
      'description',
      'short_description',
      'selling_price',
      'mrp',
      'category',
      'brand',
      'departments',
      'images',
      'is_active',
      'is_featured',
      'expires_at',
      'features',
      'key_specifications',
      'packaging',
      'warranty',
      'direction_to_use',
      'additional_info',
      'weight',
      'weight_unit',
      'stock',
      'variant_name',
      'variant_sku',
      'variant_selling_price',
      'variant_mrp',
      'variant_weight',
      'variant_image',
      'variant_stock',
      'option_1_name',
      'option_1_value',
      'option_2_name',
      'option_2_value',
      'option_3_name',
      'option_3_value',
    ];

    const exampleRows = [
      [
        'Colgate Total Toothpaste',
        'colgate-total-toothpaste',
        'COLGATE-001',
        '<p>Complete oral care toothpaste</p>',
        'Advanced protection toothpaste',
        '150',
        '200',
        'Toothpaste',
        'Colgate',
        'Oral Care,Personal Care',
        'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400',
        'true',
        'false',
        '',
        '<ul><li>Whitens teeth</li><li>Fresh breath</li></ul>',
        '<ul><li>Fluoride formula</li></ul>',
        'Tube packaging',
        '6 months manufacturing warranty',
        '<p>Brush twice daily</p>',
        '<p>Not suitable for children under 6</p>',
        '100',
        'g',
        '50',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
      [
        'Sensodyne Toothpaste',
        'sensodyne-toothpaste',
        'SENSODYNE-001',
        '<p>Sensitivity relief toothpaste</p>',
        'For sensitive teeth',
        '250',
        '350',
        'Toothpaste',
        'Sensodyne',
        'Oral Care',
        '',
        'true',
        'true',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '150',
        'g',
        '30',
        '100g Pack',
        'SENSODYNE-001-100',
        '200',
        '280',
        '100',
        '',
        '20',
        'Size',
        '100g',
        '',
        '',
        '',
        '',
      ],
      [
        'Sensodyne Toothpaste',
        'sensodyne-toothpaste',
        'SENSODYNE-001',
        '<p>Sensitivity relief toothpaste</p>',
        'For sensitive teeth',
        '250',
        '350',
        'Toothpaste',
        'Sensodyne',
        'Oral Care',
        '',
        'true',
        'true',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '150',
        'g',
        '30',
        '200g Pack',
        'SENSODYNE-001-200',
        '350',
        '450',
        '200',
        '',
        '30',
        'Size',
        '200g',
        '',
        '',
        '',
        '',
      ],
    ];

    const csvLines = [headers.join(',')];
    for (const row of exampleRows) {
      csvLines.push(row.map((v) => `"${v}"`).join(','));
    }

    return csvLines.join('\n');
  }

  async parseCSV(file: Express.Multer.File): Promise<ParsedRow[]> {
    const content = file.buffer.toString('utf-8');

    return new Promise((resolve, reject) => {
      const rows: ParsedRow[] = [];

      parseString(content, { headers: true, trim: true })
        .on('data', (row: ParsedRow) => {
          rows.push(row);
        })
        .on('end', () => {
          resolve(rows);
        })
        .on('error', (error) => {
          reject(new BadRequestException(`CSV parsing failed: ${error.message}`));
        });
    });
  }

  groupRowsByProduct(rows: ParsedRow[]): ProductGroup[] {
    const groups = new Map<string, ProductGroup>();

    for (const row of rows) {
      const productKey = `${row.product_name.trim()}_${row.product_sku.trim()}`;

      if (!groups.has(productKey)) {
        groups.set(productKey, {
          productData: {
            name: row.product_name,
            slug: row.product_slug,
            sku: row.product_sku,
            description: row.description,
            shortDescription: row.short_description,
            sellingPrice: parseFloat(row.selling_price) || 0,
            mrp: parseFloat(row.mrp) || 0,
            category: row.category,
            brand: row.brand,
            departments: row.departments,
            images: row.images,
            isActive: row.is_active.toLowerCase() !== 'false',
            isFeatured: row.is_featured.toLowerCase() === 'true',
            expiresAt: row.expires_at,
            features: row.features,
            keySpecifications: row.key_specifications,
            packaging: row.packaging,
            warranty: row.warranty,
            directionToUse: row.direction_to_use,
            additionalInfo: row.additional_info,
            weight: parseFloat(row.weight) || 0,
            weightUnit: row.weight_unit || 'g',
            stock: parseInt(row.stock) || 0,
          },
          variants: [],
        });
      }

      const group = groups.get(productKey)!;

      if (row.variant_name?.trim()) {
        const options: { optionName: string; optionValue: string }[] = [];
        if (row.option_1_name?.trim() && row.option_1_value?.trim()) {
          options.push({ optionName: row.option_1_name.trim(), optionValue: row.option_1_value.trim() });
        }
        if (row.option_2_name?.trim() && row.option_2_value?.trim()) {
          options.push({ optionName: row.option_2_name.trim(), optionValue: row.option_2_value.trim() });
        }
        if (row.option_3_name?.trim() && row.option_3_value?.trim()) {
          options.push({ optionName: row.option_3_name.trim(), optionValue: row.option_3_value.trim() });
        }

        group.variants.push({
          name: row.variant_name.trim(),
          sku: row.variant_sku,
          sellingPrice: parseFloat(row.variant_selling_price) || group.productData.sellingPrice,
          mrp: parseFloat(row.variant_mrp) || group.productData.mrp,
          weight: parseFloat(row.variant_weight) || group.productData.weight,
          image: row.variant_image,
          stock: parseInt(row.variant_stock) || group.productData.stock,
          options,
        });
      }
    }

    return Array.from(groups.values());
  }

  validateGroup(group: ProductGroup, categoriesByName: Map<string, number>, brandsByName: Map<string, number>, departmentsByName: Map<string, number>): string[] {
    const errors: string[] = [];
    const { productData, variants } = group;

    if (!productData.name?.trim()) {
      errors.push('Product name is required');
    }
    if (!productData.category?.trim()) {
      errors.push('Category is required');
    } else if (!categoriesByName.has(productData.category.trim().toLowerCase())) {
      errors.push(`Category "${productData.category}" not found`);
    }
    if (!productData.brand?.trim()) {
      errors.push('Brand is required');
    } else if (!brandsByName.has(productData.brand.trim().toLowerCase())) {
      errors.push(`Brand "${productData.brand}" not found`);
    }

    if (variants.length === 0) {
      if (!productData.sellingPrice || productData.sellingPrice <= 0) {
        errors.push('Selling price is required for products without variants');
      }
    } else {
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        if (!variant.name?.trim()) {
          errors.push(`Variant row ${i + 1}: variant name is required`);
        }
        if (!variant.sellingPrice || variant.sellingPrice <= 0) {
          errors.push(`Variant row ${i + 1}: selling price is required`);
        }
        if (variant.options.length === 0) {
          errors.push(`Variant row ${i + 1}: at least one option (option_1_name/value) is required`);
        }
      }

      const optionKeys = new Set<string>();
      for (const variant of variants) {
        for (const opt of variant.options) {
          optionKeys.add(`${opt.optionName}_${opt.optionValue}`);
        }
      }
    }

    const imagePathFields = [productData.images, ...variants.map((v) => v.image)];
    for (const imgField of imagePathFields) {
      if (imgField?.trim()) {
        const paths = imgField.split(',').map((p) => p.trim()).filter(Boolean);
        for (const imgPath of paths) {
          if (!imgPath.startsWith('http://') && !imgPath.startsWith('https://')) {
            if (!fs.existsSync(imgPath)) {
              errors.push(`Image file not found: ${imgPath}`);
            }
          }
        }
      }
    }

    if (productData.expiresAt?.trim()) {
      const date = new Date(productData.expiresAt);
      if (isNaN(date.getTime())) {
        errors.push('Invalid expiry date format (use YYYY-MM-DD)');
      }
    }

    return errors;
  }

  async resolveImagePaths(imageField: string | null | undefined): Promise<string[]> {
    if (!imageField?.trim()) return [];

    const paths = imageField.split(',').map((p) => p.trim()).filter(Boolean);
    const urls: string[] = [];

    for (const imgPath of paths) {
      if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
        urls.push(imgPath);
        continue;
      }

      if (this.imageUploadCache.has(imgPath)) {
        urls.push(this.imageUploadCache.get(imgPath)!);
        continue;
      }

      try {
        const fileBuffer = fs.readFileSync(imgPath);
        const fileName = path.basename(imgPath);
        const imageUrl = await this.uploadToImageKit(fileBuffer, fileName);
        this.imageUploadCache.set(imgPath, imageUrl);
        urls.push(imageUrl);
      } catch (error) {
        console.error(`Failed to upload image ${imgPath}:`, error);
      }
    }

    return urls;
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
    formData.append('folder', '/dentalkart');

    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'ImageKit upload failed');
    }

    return result.url;
  }

  async processBulkUpload(file: Express.Multer.File): Promise<{ results: BulkUploadResultDto[] }> {
    const rows = await this.parseCSV(file);

    if (rows.length === 0) {
      throw new BadRequestException('CSV file is empty or has no data rows');
    }

    const categories = await this.categoryRepository.find();
    const brands = await this.brandRepository.find();
    const departments = await this.departmentRepository.find();

    const categoriesByName = new Map<string, number>();
    for (const cat of categories) {
      categoriesByName.set(cat.name.toLowerCase(), cat.id);
    }

    const brandsByName = new Map<string, number>();
    for (const brand of brands) {
      brandsByName.set(brand.name.toLowerCase(), brand.id);
    }

    const departmentsByName = new Map<string, number>();
    for (const dept of departments) {
      departmentsByName.set(dept.name.toLowerCase(), dept.id);
    }

    const groups = this.groupRowsByProduct(rows);
    const results: BulkUploadResultDto[] = [];
    let rowCounter = 1;

    for (const group of groups) {
      const variantRows = group.variants.length > 0 ? group.variants.length : 1;
      const validationErrors = this.validateGroup(group, categoriesByName, brandsByName, departmentsByName);

      if (validationErrors.length > 0) {
        for (let i = 0; i < variantRows; i++) {
          results.push({
            row: rowCounter + i,
            productName: group.productData.name,
            status: 'failed',
            error: validationErrors.join('; '),
          });
        }
        rowCounter += variantRows;
        continue;
      }

      try {
        const productImages = await this.resolveImagePaths(group.productData.images);

        const categoryId = categoriesByName.get(group.productData.category.toLowerCase())!;
        const brandId = brandsByName.get(group.productData.brand.toLowerCase())!;

        const brand = brands.find((b) => b.id === brandId);

        const departmentIds: number[] = [];
        if (group.productData.departments?.trim()) {
          const deptNames = group.productData.departments.split(',').map((d) => d.trim().toLowerCase());
          for (const deptName of deptNames) {
            const deptId = departmentsByName.get(deptName);
            if (deptId) departmentIds.push(deptId);
          }
        }

        const productSlug = group.productData.slug?.trim() || slugify(group.productData.name);
        const existingSlug = await this.productRepository.findOne({ where: { slug: productSlug } });
        let finalSlug = productSlug;
        if (existingSlug) {
          let counter = 1;
          while (await this.productRepository.findOne({ where: { slug: `${productSlug}-${counter}` } })) {
            counter++;
          }
          finalSlug = `${productSlug}-${counter}`;
        }

        const productSku = group.productData.sku?.trim() || generateSKU('PROD');

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const product = queryRunner.manager.create(Product, {
            name: group.productData.name,
            slug: finalSlug,
            sku: productSku,
            description: group.productData.description,
            shortDescription: group.productData.shortDescription,
            sellingPrice: group.productData.sellingPrice,
            mrp: group.productData.mrp,
            brand: group.productData.brand,
            brandId: brandId,
            unit: 'unit',
            images: productImages.length > 0 ? productImages : [],
            isActive: group.productData.isActive,
            isFeatured: group.productData.isFeatured,
            ...(group.productData.expiresAt ? { expiresAt: new Date(group.productData.expiresAt) } : {}),
            features: group.productData.features ? [group.productData.features] : [],
            keySpecifications: group.productData.keySpecifications,
            packaging: group.productData.packaging,
            directionToUse: group.productData.directionToUse,
            additionalInfo: group.productData.additionalInfo,
            warranty: group.productData.warranty,
            weight: group.productData.weight,
            weightUnit: group.productData.weightUnit,
            categoryId: String(categoryId),
            hasVariants: group.variants.length > 0,
          });

          const savedProduct = await queryRunner.manager.save(Product, product);

          if (departmentIds.length > 0) {
            const deptEntities = await queryRunner.manager.find(Department, { where: departmentIds.map((id) => ({ id })) });
            savedProduct.departments = deptEntities;
            await queryRunner.manager.save(Product, savedProduct);
          }

          await queryRunner.manager.save(Inventory, {
            productId: savedProduct.id,
            quantity: group.productData.stock,
            warehouseLocation: 'default',
          });

          if (group.variants.length > 0) {
            const optionNames = new Set<string>();
            for (const variant of group.variants) {
              for (const opt of variant.options) {
                optionNames.add(opt.optionName);
              }
            }

            const optionNameArray = Array.from(optionNames);
            const createdOptions: { id: number; name: string; values: Map<string, number> }[] = [];

            for (let i = 0; i < optionNameArray.length; i++) {
              const optionName = optionNameArray[i];

              const option = queryRunner.manager.create(ProductOption, {
                productId: savedProduct.id,
                name: optionName,
                position: i,
              });
              const savedOption = await queryRunner.manager.save(ProductOption, option);

              const valuesMap = new Map<string, number>();
              createdOptions.push({ id: savedOption.id, name: optionName, values: valuesMap });
            }

            for (const variant of group.variants) {
              const variantImageUrls = await this.resolveImagePaths(variant.image);

              const variantEntity = queryRunner.manager.create(ProductVariant, {
                productId: String(savedProduct.id),
                name: variant.name,
                sku: variant.sku?.trim() || generateSKU('VAR'),
                sellingPrice: variant.sellingPrice,
                mrp: variant.mrp,
                weight: variant.weight,
                weightUnit: group.productData.weightUnit,
                image: variantImageUrls[0] || null,
                images: variantImageUrls.length > 1 ? variantImageUrls : null,
                isActive: true,
              } as any);
              const savedVariant = await queryRunner.manager.save(ProductVariant, variantEntity) as ProductVariant;

              await queryRunner.manager.save(Inventory, {
                productId: savedProduct.id,
                productVariantId: savedVariant.id,
                quantity: variant.stock,
                warehouseLocation: 'default',
              });

              for (const opt of variant.options) {
                const createdOption = createdOptions.find((o) => o.name === opt.optionName);
                if (!createdOption) continue;

                let optionValueId = createdOption.values.get(opt.optionValue);

                if (!optionValueId) {
                  const optionValue = queryRunner.manager.create(ProductOptionValue, {
                    optionId: createdOption.id,
                    value: opt.optionValue,
                    position: createdOption.values.size,
                  });
                  const savedValue = await queryRunner.manager.save(ProductOptionValue, optionValue);
                  optionValueId = savedValue.id;
                  createdOption.values.set(opt.optionValue, optionValueId!);
                }

                if (optionValueId) {
                  await queryRunner.manager.save(VariantOption, {
                    variantId: savedVariant.id,
                    optionId: createdOption.id,
                    optionValueId,
                  });
                }
              }
            }
          }

          await queryRunner.commitTransaction();

          results.push({
            row: rowCounter,
            productName: group.productData.name,
            status: 'success',
            productId: savedProduct.id,
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
          productName: group.productData.name,
          status: 'failed',
          error: error.message || 'Unknown error during product creation',
        });
      }

      rowCounter += group.variants.length > 0 ? group.variants.length : 1;
    }

    return { results };
  }
}
