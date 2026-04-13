import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, ILike, MoreThanOrEqual, LessThanOrEqual, In, DataSource } from "typeorm";
import { Product, ProductVariant, Inventory, Category, Brand } from "../../database/entities";
import { ProductOption } from "../../database/entities/product-option.entity";
import { ProductOptionValue } from "../../database/entities/product-option-value.entity";
import { VariantOption } from "../../database/entities/variant-option.entity";
import {
  CreateProductDto,
  UpdateProductDto,
  CreateProductVariantDto,
  UpdateProductVariantDto,
  ProductQueryDto,
  CreateProductWithVariantsDto,
  CreateVariantDto,
  ProductOptionDto,
  ProductOptionValueDto,
} from "./dto/product.dto";
import { slugify, generateSKU } from "../../common/utils/slugify";

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
    @InjectRepository(ProductOption)
    private productOptionRepository: Repository<ProductOption>,
    @InjectRepository(ProductOptionValue)
    private productOptionValueRepository: Repository<ProductOptionValue>,
    @InjectRepository(VariantOption)
    private variantOptionRepository: Repository<VariantOption>,
    private dataSource: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const slug = createProductDto.slug || slugify(createProductDto.name);

    const existingProduct = await this.productRepository.findOne({
      where: { slug },
    });

    if (existingProduct) {
      throw new ConflictException("Product with this slug already exists");
    }

    const sku = createProductDto.sku || generateSKU("PROD");

    const { department, departments, ...restDto } = createProductDto;

    const product = this.productRepository.create({
      ...restDto,
      slug,
      sku,
      sellingPrice: createProductDto.sellingPrice || createProductDto.price,
      mrp: createProductDto.mrp || createProductDto.price,
    });

    const savedProduct = await this.productRepository.save(product);

    await this.inventoryRepository.save({
      productId: savedProduct.id,
      quantity: 0,
      warehouseLocation: "default",
    });

    return savedProduct;
  }

  async createWithVariants(
    dto: CreateProductWithVariantsDto,
  ): Promise<any> {
    const slug = dto.slug || slugify(dto.name);

    const existingProduct = await this.productRepository.findOne({
      where: { slug },
    });

    if (existingProduct) {
      throw new ConflictException("Product with this slug already exists");
    }

    const hasVariants = dto.options && dto.options.length > 0 && dto.variants && dto.variants.length > 0;
    const sku = dto.sku || generateSKU("PROD");

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = queryRunner.manager.create(Product, {
        name: dto.name,
        slug,
        sku,
        description: dto.description,
        shortDescription: dto.shortDescription,
        price: dto.price || 0,
        sellingPrice: dto.sellingPrice || dto.price || 0,
        mrp: dto.mrp || dto.price || 0,
        brand: dto.brand,
        unit: dto.unit || 'unit',
        images: dto.images,
        isFeatured: dto.isFeatured || false,
        categoryId: dto.categoryId,
        hasVariants,
      });

      const savedProduct = await queryRunner.manager.save(Product, product);

      await queryRunner.manager.save(Inventory, {
        productId: savedProduct.id,
        quantity: 0,
        warehouseLocation: "default",
      });

      const createdOptions: any[] = [];

      if (dto.options && dto.options.length > 0) {
        for (let i = 0; i < dto.options.length; i++) {
          const opt = dto.options[i];
          const option = queryRunner.manager.create(ProductOption, {
            productId: savedProduct.id,
            name: opt.name,
            position: i,
          });
          const savedOption = await queryRunner.manager.save(ProductOption, option);

          const optionValues: any[] = [];
          if (opt.values && opt.values.length > 0) {
            for (let j = 0; j < opt.values.length; j++) {
              const val = opt.values[j];
              const optionValue = queryRunner.manager.create(ProductOptionValue, {
                optionId: savedOption.id,
                value: typeof val === 'string' ? val : val.value,
                position: j,
                hexCode: typeof val === 'object' ? val.hexCode : null,
                swatchUrl: typeof val === 'object' ? val.swatchUrl : null,
              });
              const savedValue = await queryRunner.manager.save(ProductOptionValue, optionValue);
              optionValues.push(savedValue);
            }
          }

          createdOptions.push({
            ...savedOption,
            values: optionValues,
          });
        }
      }

      const createdVariants: any[] = [];

      if (dto.variants && dto.variants.length > 0) {
        for (const variantDto of dto.variants) {
          const variantSku = variantDto.sku || generateSKU("VAR");

          const variant = queryRunner.manager.create(ProductVariant, {
            productId: String(savedProduct.id),
            name: variantDto.name || '',
            sku: variantSku,
            price: variantDto.price,
            sellingPrice: variantDto.sellingPrice || variantDto.price,
            mrp: variantDto.mrp || variantDto.price,
            weight: variantDto.weight || 0,
            weightUnit: variantDto.weightUnit || '',
            image: variantDto.image,
            images: variantDto.images,
            packQuantity: variantDto.packQuantity || 1,
            isActive: variantDto.isActive ?? true,
            expiresAt: variantDto.expiresAt ? new Date(variantDto.expiresAt) : null,
          });

          const savedVariant = await queryRunner.manager.save(ProductVariant, variant) as ProductVariant;

          await queryRunner.manager.save(Inventory, {
            productId: savedProduct.id,
            productVariantId: savedVariant.id,
            quantity: 0,
            warehouseLocation: "default",
          });

          if (variantDto.options && variantDto.options.length > 0) {
            const variantOptions: any[] = [];
            for (const opt of variantDto.options) {
              const option = createdOptions.find(o => o.name === opt.optionName);
              if (option) {
                const optValue = option.values.find((v: ProductOptionValue) => v.value === opt.optionValue);
                if (optValue) {
                  const variantOption = queryRunner.manager.create(VariantOption, {
                    variantId: savedVariant.id,
                    optionId: option.id,
                    optionValueId: optValue.id,
                  });
                  await queryRunner.manager.save(VariantOption, variantOption);
                  variantOptions.push({
                    optionId: option.id,
                    optionName: option.name,
                    optionValueId: optValue.id,
                    optionValue: optValue.value,
                  });
                }
              }
            }
          }

          createdVariants.push({
            ...savedVariant,
            options: variantDto.options || [],
          });
        }
      }

      await queryRunner.commitTransaction();

      return {
        ...savedProduct,
        options: createdOptions,
        variants: createdVariants,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(query: ProductQueryDto) {
    const {
      search,
      category,
      categories,
      brand,
      brandId,
      department,
      departments,
      minPrice,
      maxPrice,
      isFeatured,
      page = 1,
      limit = 10,
      sortBy,
      sortOrder,
    } = query;

    const sortMapping: Record<string, { field: string; order: 'ASC' | 'DESC' }> = {
      newest: { field: 'createdAt', order: 'DESC' },
      oldest: { field: 'createdAt', order: 'ASC' },
      'price-asc': { field: 'sellingPrice', order: 'ASC' },
      'price-desc': { field: 'sellingPrice', order: 'DESC' },
      'name-asc': { field: 'name', order: 'ASC' },
      'name-desc': { field: 'name', order: 'DESC' },
    };

    let orderField = 'createdAt';
    let orderDirection: 'ASC' | 'DESC' = 'DESC';

    if (sortBy && sortMapping[sortBy]) {
      orderField = sortMapping[sortBy].field;
      orderDirection = sortMapping[sortBy].order;
    } else if (sortBy) {
      orderField = sortBy;
      orderDirection = (sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
    }

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brandEntity', 'brandEntity')
      .leftJoinAndSelect('product.departments', 'departments')
      .where('product.isActive = :isActive', { isActive: true });

    if (search) {
      queryBuilder.andWhere(
        '(product.name LIKE :search OR product.description LIKE :search OR product.sku LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (category) {
      queryBuilder.andWhere('category.slug = :category', { category });
    }

    if (categories) {
      const categoryList = categories.split(',').map((c) => c.trim());
      queryBuilder.andWhere('category.slug IN (:...categories)', { categories: categoryList });
    }

    if (brand) {
      const brandList = brand.split(',').map((b) => b.trim());
      queryBuilder.andWhere('brandEntity.slug IN (:...brands)', { brands: brandList });
    }

    if (brandId) {
      queryBuilder.andWhere('product.brandId = :brandId', { brandId });
    }

    if (department) {
      queryBuilder.andWhere('departments.slug = :department', { department });
    }

    if (departments) {
      const departmentList = departments.split(',').map((d) => d.trim());
      queryBuilder.andWhere('departments.slug IN (:...departments)', { departments: departmentList });
    }

    if (minPrice) {
      queryBuilder.andWhere('product.sellingPrice >= :minPrice', { minPrice });
    }

    if (maxPrice) {
      queryBuilder.andWhere('product.sellingPrice <= :maxPrice', { maxPrice });
    }

    if (isFeatured !== undefined) {
      queryBuilder.andWhere('product.isFeatured = :isFeatured', { isFeatured });
    }

    queryBuilder.orderBy(`product.${orderField}`, orderDirection);
    queryBuilder.skip((page - 1) * limit).take(limit);

    const products = await queryBuilder.getMany();
    const productIds = products.map((p) => p.id);

    if (productIds.length > 0) {
      const productIdsAsStrings = productIds.map((id) => String(id));

      console.log('Product IDs:', productIdsAsStrings);

      const [variants, inventories] = await Promise.all([
        this.productVariantRepository.find({
          where: { productId: In(productIdsAsStrings), isActive: true },
        }),
        this.inventoryRepository
          .createQueryBuilder("inventory")
          .where("inventory.productId IN (:...productIds)", { productIds: productIdsAsStrings })
          .getMany(),
      ]);

      console.log('Found inventories:', inventories.length, inventories.map(i => i.productId));

      const variantsMap = new Map<string, ProductVariant[]>();
      variants.forEach((v) => {
        const key = String(v.productId);
        const existing = variantsMap.get(key) || [];
        existing.push(v);
        variantsMap.set(key, existing);
      });

      const inventoriesMap = new Map<string, Inventory[]>();
      inventories.forEach((i) => {
        const key = String(i.productId);
        const existing = inventoriesMap.get(key) || [];
        existing.push(i);
        inventoriesMap.set(key, existing);
      });

      products.forEach((p) => {
        const key = String(p.id);
        p.variants = variantsMap.get(key) || [];
        p.inventories = inventoriesMap.get(key) || [];
      });
    } else {
      products.forEach((p) => {
        p.variants = [];
        p.inventories = [];
      });
    }

    const totalQueryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .leftJoin('product.brandEntity', 'brandEntity')
      .leftJoin('product.departments', 'departments')
      .where('product.isActive = :isActive', { isActive: true });

    if (search) {
      totalQueryBuilder.andWhere(
        '(product.name LIKE :search OR product.description LIKE :search OR product.sku LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (category) {
      totalQueryBuilder.andWhere('category.slug = :category', { category });
    }

    if (categories) {
      const categoryList = categories.split(',').map((c) => c.trim());
      totalQueryBuilder.andWhere('category.slug IN (:...categories)', { categories: categoryList });
    }

    if (brand) {
      const brandList = brand.split(',').map((b) => b.trim());
      totalQueryBuilder.andWhere('brandEntity.slug IN (:...brands)', { brands: brandList });
    }

    if (brandId) {
      totalQueryBuilder.andWhere('product.brandId = :brandId', { brandId });
    }

    if (department) {
      totalQueryBuilder.andWhere('departments.slug = :department', { department });
    }

    if (departments) {
      const departmentList = departments.split(',').map((d) => d.trim());
      totalQueryBuilder.andWhere('departments.slug IN (:...departments)', { departments: departmentList });
    }

    if (minPrice) {
      totalQueryBuilder.andWhere('product.sellingPrice >= :minPrice', { minPrice });
    }

    if (maxPrice) {
      totalQueryBuilder.andWhere('product.sellingPrice <= :maxPrice', { maxPrice });
    }

    if (isFeatured !== undefined) {
      totalQueryBuilder.andWhere('product.isFeatured = :isFeatured', { isFeatured });
    }

    const total = await totalQueryBuilder.getCount();

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async enrichVariantsWithOptions(variants: any[]): Promise<any[]> {
    if (!variants || variants.length === 0) {
      return variants;
    }

    const variantIds = variants.map(v => String(v.id));
    const variantOptions = await this.variantOptionRepository.find({
      where: { variantId: In(variantIds) },
      relations: ["option", "optionValue"],
    });

    const variantOptionsMap = new Map<string, any[]>();
    variantOptions.forEach(vo => {
      if (!variantOptionsMap.has(vo.variantId)) {
        variantOptionsMap.set(vo.variantId, []);
      }
      variantOptionsMap.get(vo.variantId)!.push({
        optionId: vo.optionId,
        optionName: vo.option?.name,
        optionValueId: vo.optionValueId,
        optionValue: vo.optionValue?.value,
        hexCode: vo.optionValue?.hexCode,
      });
    });

    return variants.map(variant => ({
      ...variant,
      options: variantOptionsMap.get(String(variant.id)) || [],
    }));
  }

  private addAvailableOptionsToVariants(variants: any[], options: any[]): any[] {
    if (!variants || variants.length === 0 || !options || options.length === 0) {
      return variants;
    }
    
    return variants.map(variant => ({
      ...variant,
      availableOptions: options,
    }));
  }

  async findOne(id: string): Promise<any> {
    const product = await this.productRepository.findOne({
      where: { id: +id },
      relations: ["category", "brandEntity", "departments", "variants", "inventories", "reviews", "options", "options.values"],
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    product.variants = await this.enrichVariantsWithOptions(product.variants);
    
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      product.variants = this.addAvailableOptionsToVariants(product.variants, product.options || []);
    }
    
    return product;
  }

  async findBySlug(slug: string): Promise<any> {
    const product = await this.productRepository.findOne({
      where: { slug },
      relations: [
        "category",
        "brandEntity",
        "departments",
        "variants",
        "inventories",
        "reviews",
        "reviews.user",
        "options",
        "options.values",
      ],
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    product.variants = await this.enrichVariantsWithOptions(product.variants);
    
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      product.variants = this.addAvailableOptionsToVariants(product.variants, product.options || []);
    }
    
    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);

    if (updateProductDto.name && updateProductDto.name !== product.name) {
      updateProductDto.slug =
        updateProductDto.slug || slugify(updateProductDto.name);
    }

    if (updateProductDto.options !== undefined) {
      await this.updateProductOptions(product.id, updateProductDto.options);
      updateProductDto.hasVariants = updateProductDto.options.length > 0;
    }

    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  private async updateProductOptions(productId: number, options: any[]): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingOptions = await this.productOptionRepository.find({
        where: { productId },
        relations: ['values'],
      });

      for (const existingOpt of existingOptions) {
        if (existingOpt.values) {
          await queryRunner.manager.remove(existingOpt.values);
        }
        await queryRunner.manager.remove(existingOpt);
      }

      for (let i = 0; i < options.length; i++) {
        const optData = options[i];
        const option = queryRunner.manager.create(ProductOption, {
          productId,
          name: optData.name,
          position: i,
        });
        const savedOption = await queryRunner.manager.save(option);

        if (optData.values && optData.values.length > 0) {
          for (let j = 0; j < optData.values.length; j++) {
            const valData = optData.values[j];
            const optionValue = queryRunner.manager.create(ProductOptionValue, {
              optionId: savedOption.id,
              value: valData.value,
              hexCode: valData.hexCode || null,
              swatchUrl: valData.swatchUrl || null,
              position: j,
            });
            await queryRunner.manager.save(optionValue);
          }
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  async createVariant(
    createVariantDto: CreateProductVariantDto,
  ): Promise<ProductVariant> {
    const product = await this.productRepository.findOne({
      where: { id: +createVariantDto.productId },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const sku = createVariantDto.sku || generateSKU("VAR");
    const price = Number(createVariantDto.price) || 0;

    const variant = this.productVariantRepository.create({
      productId: String(product.id),
      name: createVariantDto.name || '',
      sku,
      price,
      sellingPrice: Number(createVariantDto.sellingPrice) || price,
      mrp: Number(createVariantDto.mrp) || price,
      weight: Number(createVariantDto.weight) || 0,
      weightUnit: createVariantDto.weightUnit || '',
      color: createVariantDto.color || '',
      size: createVariantDto.size || '',
      flavor: createVariantDto.flavor || '',
      packQuantity: Number(createVariantDto.packQuantity) || 1,
      isActive: createVariantDto.isActive ?? true,
      expiresAt: createVariantDto.expiresAt ? new Date(createVariantDto.expiresAt) : null,
    });

    const savedVariant = await this.productVariantRepository.save(variant);

    const variantOptions: any[] = [];

    if (createVariantDto.options && createVariantDto.options.length > 0) {
      const productOptions = await this.productOptionRepository.find({
        where: { productId: product.id },
        relations: ['values'],
      });

      for (const optInput of createVariantDto.options) {
        const option = productOptions.find(o => o.name.toLowerCase() === optInput.optionName.toLowerCase());
        if (option) {
          const optValue = option.values?.find(v => v.value === optInput.optionValue);
          if (optValue) {
            const variantOption = this.variantOptionRepository.create({
              variantId: savedVariant.id,
              optionId: option.id,
              optionValueId: optValue.id,
            });
            await this.variantOptionRepository.save(variantOption);
            variantOptions.push({
              optionId: option.id,
              optionName: option.name,
              optionValueId: optValue.id,
              optionValue: optValue.value,
            });
          }
        }
      }
    }

    product.hasVariants = true;
    await this.productRepository.save(product);

    await this.inventoryRepository.save({
      productId: product.id,
      productVariantId: savedVariant.id,
      quantity: 0,
      warehouseLocation: "default",
    });

    return {
      ...savedVariant,
      options: variantOptions,
    } as ProductVariant;
  }

  async createVariantsBulk(
    variantDtos: CreateProductVariantDto[],
  ): Promise<ProductVariant[]> {
    if (variantDtos.length === 0) {
      return [];
    }

    const productId = variantDtos[0].productId;
    const product = await this.productRepository.findOne({
      where: { id: +productId },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const savedVariants: ProductVariant[] = [];

      const productOptions = await this.productOptionRepository.find({
        where: { productId: product.id },
        relations: ['values'],
      });

      for (const dto of variantDtos) {
        const sku = dto.sku || generateSKU("VAR");
        const price = Number(dto.price) || 0;

        const variant = queryRunner.manager.create(ProductVariant, {
          productId: String(product.id),
          name: dto.name || '',
          sku,
          price,
          sellingPrice: Number(dto.sellingPrice) || price,
          mrp: Number(dto.mrp) || price,
          weight: Number(dto.weight) || 0,
          weightUnit: dto.weightUnit || '',
          color: dto.color || '',
          size: dto.size || '',
          flavor: dto.flavor || '',
          packQuantity: Number(dto.packQuantity) || 1,
          isActive: dto.isActive ?? true,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        });

        const savedVariant = await queryRunner.manager.save(ProductVariant, variant) as ProductVariant;

        await queryRunner.manager.save(Inventory, {
          productId: product.id,
          productVariantId: savedVariant.id,
          quantity: 0,
          warehouseLocation: "default",
        });

        const variantOptions: any[] = [];

        if (dto.options && dto.options.length > 0) {
          for (const optInput of dto.options) {
            const option = productOptions.find(o => o.name.toLowerCase() === optInput.optionName.toLowerCase());
            if (option) {
              const optValue = option.values?.find(v => v.value === optInput.optionValue);
              if (optValue) {
                const variantOption = queryRunner.manager.create(VariantOption, {
                  variantId: savedVariant.id,
                  optionId: option.id,
                  optionValueId: optValue.id,
                });
                await queryRunner.manager.save(VariantOption, variantOption);
                variantOptions.push({
                  optionId: option.id,
                  optionName: option.name,
                  optionValueId: optValue.id,
                  optionValue: optValue.value,
                });
              }
            }
          }
        } else if ((dto as any).attributes) {
          const attrs = (dto as any).attributes as Record<string, string>;
          for (const [attrType, value] of Object.entries(attrs)) {
            const option = productOptions.find(o => o.name.toLowerCase() === attrType.toLowerCase());
            if (option) {
              const optValue = option.values?.find(v => v.value === value);
              if (optValue) {
                const variantOption = queryRunner.manager.create(VariantOption, {
                  variantId: savedVariant.id,
                  optionId: option.id,
                  optionValueId: optValue.id,
                });
                await queryRunner.manager.save(VariantOption, variantOption);
              }
            }
          }
        }

        savedVariants.push({
          ...savedVariant,
          options: variantOptions,
        } as any);
      }

      product.hasVariants = true;
      await queryRunner.manager.save(Product, product);

      await queryRunner.commitTransaction();
      return savedVariants;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getProductVariants(productId: string): Promise<any[]> {
    const product = await this.productRepository.findOne({
      where: { id: +productId },
      relations: ["options", "options.values"],
    });

    if (!product) {
      return [];
    }

    const variants = await this.productVariantRepository.find({
      where: { productId, isActive: true },
      order: { createdAt: 'ASC' },
    });

    if (variants.length === 0) {
      return [];
    }

    const enrichedVariants = await this.enrichVariantsWithOptions(variants);
    
    if (product.hasVariants && product.options && product.options.length > 0) {
      return this.addAvailableOptionsToVariants(enrichedVariants, product.options);
    }

    return enrichedVariants;
  }

  async updateVariant(
    id: string,
    updateVariantDto: UpdateProductVariantDto,
  ): Promise<ProductVariant> {
    const variant = await this.productVariantRepository.findOne({ where: { id } });
    
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (updateVariantDto.expiresAt === '') {
      updateVariantDto.expiresAt = undefined;
    }

    const sanitizedDto: any = { ...updateVariantDto };
    if (sanitizedDto.price !== undefined) sanitizedDto.price = Number(sanitizedDto.price) || 0;
    if (sanitizedDto.sellingPrice !== undefined) sanitizedDto.sellingPrice = Number(sanitizedDto.sellingPrice) || 0;
    if (sanitizedDto.mrp !== undefined) sanitizedDto.mrp = Number(sanitizedDto.mrp) || 0;
    if (sanitizedDto.weight !== undefined) sanitizedDto.weight = Number(sanitizedDto.weight) || 0;
    if (sanitizedDto.packQuantity !== undefined) sanitizedDto.packQuantity = Number(sanitizedDto.packQuantity) || 1;

    Object.assign(variant, sanitizedDto);
    return this.productVariantRepository.save(variant);
  }

  async removeVariant(id: string): Promise<void> {
    const variant = await this.productVariantRepository.findOne({ where: { id } });
    
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const productId = variant.productId;
    await this.productVariantRepository.remove(variant);

    const remainingVariants = await this.productVariantRepository.find({
      where: { productId },
    });

    if (remainingVariants.length === 0) {
      await this.productRepository.update(productId, { hasVariants: false });
    }
  }

  async updateVariantInventory(variantId: string, quantity: number): Promise<Inventory> {
    const inventory = await this.inventoryRepository.findOne({
      where: { productVariantId: variantId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found for this variant');
    }

    inventory.quantity = quantity;
    return this.inventoryRepository.save(inventory);
  }

  async getFeaturedProducts(limit = 10): Promise<Product[]> {
    // First, get all featured products with their relations
    const products = await this.productRepository.find({
      where: { isFeatured: true, isActive: true },
      relations: ["category", "brandEntity", "departments", "inventories", "variants"],
      take: limit,
      order: { createdAt: "DESC" },
    });

    if (!products || products.length === 0) {
      return products;
    }

    // For products WITH variants, we need to fetch variant inventory separately
    const productsWithVariants = products.filter(
      (p) => p.hasVariants && p.variants && p.variants.length > 0,
    );

    if (productsWithVariants.length > 0) {
      // Get all variant IDs
      const variantIds: string[] = [];
      productsWithVariants.forEach((p) => {
        p.variants.forEach((v) => {
          variantIds.push(v.id);
        });
      });

      // Fetch variant-level inventory
      const variantInventories = await this.inventoryRepository.find({
        where: { productVariantId: In(variantIds) },
      });

      // Create a map for quick lookup
      const variantInventoryMap = new Map<string, Inventory[]>();
      variantInventories.forEach((inv) => {
        const list = variantInventoryMap.get(inv.productVariantId!) || [];
        list.push(inv);
        variantInventoryMap.set(inv.productVariantId!, list);
      });

      // Add variant inventory to each product
      products.forEach((p) => {
        if (p.hasVariants && p.variants && p.variants.length > 0) {
          const varInv: Inventory[] = [];
          p.variants.forEach((v) => {
            const inv = variantInventoryMap.get(v.id);
            if (inv) {
              varInv.push(...inv);
            }
          });
          // Add variant inventory to the product's inventory array
          p.inventories = [...(p.inventories || []), ...varInv];
        }
      });
    }

    console.log('[DEBUG] getFeaturedProducts - Final inventory:');
    products.forEach((p) => {
      const totalStock = (p.inventories || []).reduce(
        (sum: number, inv: any) => sum + (inv.quantity - inv.reservedQuantity),
        0,
      );
      console.log(`  ${p.name}: hasVariants=${p.hasVariants}, variantCount=${p.variants?.length}, inventoryCount=${p.inventories?.length}, totalStock=${totalStock}`);
      
      // Debug specific products that might be showing out of stock
      if (p.name && p.name.toLowerCase().includes('oro')) {
        console.log(`  [DEBUG] ORO PRODUCT DETAILS:`, {
          id: p.id,
          name: p.name,
          hasVariants: p.hasVariants,
          variants: p.variants?.map(v => ({ id: v.id, name: v.name })),
          inventories: p.inventories?.map(inv => ({
            id: inv.id,
            productId: inv.productId,
            productVariantId: inv.productVariantId,
            quantity: inv.quantity,
            reservedQuantity: inv.reservedQuantity,
            trackInventory: inv.trackInventory
          }))
        });
      }
    });

    return products;
  }

  async getRelatedProducts(productId: string, limit = 10): Promise<Product[]> {
    const product = await this.findOne(productId);

    const products = await this.productRepository.find({
      where: {
        categoryId: product.categoryId,
        isActive: true,
      },
      relations: ["category", "brandEntity", "departments", "inventories", "variants"],
      take: limit,
      order: { createdAt: "DESC" },
    });

    if (!products || products.length === 0) {
      return products;
    }

    // Same fix for related products - add variant inventory
    const productsWithVariants = products.filter(
      (p) => p.hasVariants && p.variants && p.variants.length > 0,
    );

    if (productsWithVariants.length > 0) {
      const variantIds: string[] = [];
      productsWithVariants.forEach((p) => {
        p.variants.forEach((v) => {
          variantIds.push(v.id);
        });
      });

      const variantInventories = await this.inventoryRepository.find({
        where: { productVariantId: In(variantIds) },
      });

      const variantInventoryMap = new Map<string, Inventory[]>();
      variantInventories.forEach((inv) => {
        const list = variantInventoryMap.get(inv.productVariantId!) || [];
        list.push(inv);
        variantInventoryMap.set(inv.productVariantId!, list);
      });

      products.forEach((p) => {
        if (p.hasVariants && p.variants && p.variants.length > 0) {
          const varInv: Inventory[] = [];
          p.variants.forEach((v) => {
            const inv = variantInventoryMap.get(v.id);
            if (inv) {
              varInv.push(...inv);
            }
          });
          p.inventories = [...(p.inventories || []), ...varInv];
        }
      });
    }

    return products;
  }

  async getAllBrands(): Promise<string[]> {
    const result = await this.productRepository
      .createQueryBuilder("product")
      .select("DISTINCT product.brand", "brand")
      .where("product.brand IS NOT NULL")
      .getRawMany();

    return result.map((r) => r.brand).filter(Boolean);
  }

  async globalSearch(query: string) {
    const products = await this.productRepository
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "category")
      .leftJoinAndSelect("product.brandEntity", "brandEntity")
      .where("(product.name LIKE :query OR product.description LIKE :query)", {
        query: `%${query}%`,
      })
      .andWhere("product.isActive = :isActive", { isActive: true })
      .orderBy("product.name", "ASC")
      .take(8)
      .getMany();

    const categories = await this.categoryRepository
      .createQueryBuilder("category")
      .where("category.name LIKE :query", { query: `%${query}%` })
      .andWhere("category.isActive = :isActive", { isActive: true })
      .orderBy("category.name", "ASC")
      .take(5)
      .getMany();

    const brands = await this.brandRepository
      .createQueryBuilder("brand")
      .where("brand.name LIKE :query", { query: `%${query}%` })
      .andWhere("brand.isActive = :isActive", { isActive: true })
      .orderBy("brand.name", "ASC")
      .take(5)
      .getMany();

    return { products, categories, brands };
  }

  async getRecommendedByCategories(categorySlugs: string[], excludeProductIds: number[], limit = 8) {
    try {
      console.log('[getRecommendedByCategories] Input:', { categorySlugs, excludeProductIds, limit });
      
      const queryBuilder = this.productRepository
        .createQueryBuilder("product")
        .leftJoinAndSelect("product.category", "category")
        .leftJoinAndSelect("product.brandEntity", "brandEntity")
        .where("product.isActive = :isActive", { isActive: true });

      if (categorySlugs.length > 0) {
        queryBuilder.andWhere("category.slug IN (:...categorySlugs)", { categorySlugs });
      }

      if (excludeProductIds.length > 0) {
        queryBuilder.andWhere("product.id NOT IN (:...excludeProductIds)", { excludeProductIds });
      }

      queryBuilder
        .orderBy("product.isFeatured", "DESC")
        .addOrderBy("product.createdAt", "DESC")
        .take(limit);

      let products = await queryBuilder.getMany();
      console.log('[getRecommendedByCategories] Products found:', products.length);

      if (products.length === 0) {
        products = await this.getFeaturedProducts(limit);
      }

      // Add inventories to each product
      const productIds = products.map(p => String(p.id));
      const inventories = await this.inventoryRepository
        .createQueryBuilder("inventory")
        .where("inventory.productId IN (:...productIds)", { productIds })
        .getMany();

      const inventoriesMap = new Map<string, Inventory[]>();
      inventories.forEach((i) => {
        const key = String(i.productId);
        const existing = inventoriesMap.get(key) || [];
        existing.push(i);
        inventoriesMap.set(key, existing);
      });

      products = products.map(p => ({
        ...p,
        inventories: inventoriesMap.get(String(p.id)) || [],
      }));

      return products;
    } catch (error) {
      console.error('[getRecommendedByCategories] Error:', error);
      return [];
    }
  }

  async getRecommendedForCart(categorySlugs: string[], brandIds: number[], excludeProductIds: number[], limit = 8) {
    try {
      const queryBuilder = this.productRepository
        .createQueryBuilder("product")
        .leftJoinAndSelect("product.category", "category")
        .leftJoinAndSelect("product.brandEntity", "brandEntity")
        .where("product.isActive = :isActive", { isActive: true });

      const conditions: string[] = [];
      
      if (categorySlugs.length > 0) {
        conditions.push("category.slug IN (:...categorySlugs)");
      }
      
      if (brandIds.length > 0) {
        conditions.push("product.brandId IN (:...brandIds)");
      }
      
      if (conditions.length > 0) {
        queryBuilder.andWhere(`(${conditions.join(" OR ")})`, { 
          categorySlugs,
          brandIds 
        });
      }

      if (excludeProductIds.length > 0) {
        queryBuilder.andWhere("product.id NOT IN (:...excludeProductIds)", { excludeProductIds });
      }

      queryBuilder
        .orderBy("product.isFeatured", "DESC")
        .addOrderBy("product.createdAt", "DESC")
        .take(limit);

      let products = await queryBuilder.getMany();

      if (products.length === 0) {
        products = await this.getFeaturedProducts(limit);
      }

      // Add inventories to each product
      const productIds = products.map(p => String(p.id));
      const inventories = await this.inventoryRepository
        .createQueryBuilder("inventory")
        .where("inventory.productId IN (:...productIds)", { productIds })
        .getMany();

      const inventoriesMap = new Map<string, Inventory[]>();
      inventories.forEach((i) => {
        const key = String(i.productId);
        const existing = inventoriesMap.get(key) || [];
        existing.push(i);
        inventoriesMap.set(key, existing);
      });

      products = products.map(p => ({
        ...p,
        inventories: inventoriesMap.get(String(p.id)) || [],
      }));

      return products;
    } catch (error) {
      console.error('[getRecommendedForCart] Error:', error);
      return [];
    }
  }
}
