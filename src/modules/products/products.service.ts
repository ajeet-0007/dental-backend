import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, ILike, MoreThanOrEqual, LessThanOrEqual, In, DataSource } from "typeorm";
import { Product, ProductVariant, Inventory, Category } from "../../database/entities";
import {
  CreateProductDto,
  UpdateProductDto,
  CreateProductVariantDto,
  UpdateProductVariantDto,
  ProductQueryDto,
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

    const product = this.productRepository.create({
      ...createProductDto,
      slug,
      sku,
      sellingPrice: createProductDto.sellingPrice || createProductDto.price,
      mrp: createProductDto.mrp || createProductDto.price,
    });

    const savedProduct = await this.productRepository.save(product);

    await this.inventoryRepository.save({
      productId: savedProduct.id.toString(),
      quantity: 0,
      warehouseLocation: "default",
    });

    return savedProduct;
  }

  async findAll(query: ProductQueryDto) {
    const {
      search,
      category,
      categories,
      brand,
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
      orderDirection = sortOrder || 'DESC';
    }

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
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
      queryBuilder.andWhere('product.brand = :brand', { brand });
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

      const [variants, inventories] = await Promise.all([
        this.productVariantRepository.find({
          where: { productId: In(productIdsAsStrings), isActive: true },
        }),
        this.inventoryRepository.find({
          where: { productId: In(productIdsAsStrings) },
        }),
      ]);

      const variantsMap = new Map<string, ProductVariant[]>();
      variants.forEach((v) => {
        const key = String(v.productId);
        const existing = variantsMap.get(key) || [];
        existing.push(v);
        variantsMap.set(key, existing);
      });

      const inventoriesMap = new Map<string, Inventory[]>();
      inventories.forEach((i) => {
        const existing = inventoriesMap.get(i.productId) || [];
        existing.push(i);
        inventoriesMap.set(i.productId, existing);
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
      totalQueryBuilder.andWhere('product.brand = :brand', { brand });
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

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: +id },
      relations: ["category", "variants", "inventories", "reviews"],
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { slug },
      relations: [
        "category",
        "variants",
        "inventories",
        "reviews",
        "reviews.user",
      ],
    });

    if (!product) {
      throw new NotFoundException("Product not found");
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

    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
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

    const query = `
      INSERT INTO product_variants 
      (productId, name, sku, price, sellingPrice, mrp, weight, weightUnit, color, size, flavor, packQuantity, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await this.dataSource.query(query, [
      createVariantDto.productId,
      createVariantDto.name || '',
      sku,
      createVariantDto.price,
      createVariantDto.sellingPrice || createVariantDto.price,
      createVariantDto.mrp || createVariantDto.price,
      createVariantDto.weight || 0,
      createVariantDto.weightUnit || '',
      createVariantDto.color || '',
      createVariantDto.size || '',
      createVariantDto.flavor || '',
      createVariantDto.packQuantity || 1,
      createVariantDto.isActive ?? true,
    ]);

    const variants = await this.productVariantRepository.find({
      where: { productId: createVariantDto.productId },
      order: { createdAt: 'DESC' },
      take: 1,
    });

    return variants[0];
  }

  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    return this.productVariantRepository.find({
      where: { productId, isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async updateVariant(
    id: string,
    updateVariantDto: UpdateProductVariantDto,
  ): Promise<ProductVariant> {
    const variant = await this.productVariantRepository.findOne({ where: { id } });
    
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    Object.assign(variant, updateVariantDto);
    return this.productVariantRepository.save(variant);
  }

  async removeVariant(id: string): Promise<void> {
    const variant = await this.productVariantRepository.findOne({ where: { id } });
    
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    await this.productVariantRepository.remove(variant);
  }

  async getFeaturedProducts(limit = 10): Promise<Product[]> {
    return this.productRepository.find({
      where: { isFeatured: true, isActive: true },
      relations: ["category", "inventories"],
      take: limit,
      order: { createdAt: "DESC" },
    });
  }

  async getRelatedProducts(productId: string, limit = 10): Promise<Product[]> {
    const product = await this.findOne(productId);

    return this.productRepository.find({
      where: {
        categoryId: product.categoryId,
        isActive: true,
      },
      relations: ["category", "inventories"],
      take: limit,
      order: { createdAt: "DESC" },
    });
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

    return { products, categories };
  }
}
