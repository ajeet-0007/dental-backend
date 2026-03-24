import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, ILike } from "typeorm";
import { Product, ProductVariant, Inventory, Category } from "../../database/entities";
import {
  CreateProductDto,
  UpdateProductDto,
  CreateProductVariantDto,
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
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "category")
      .leftJoinAndSelect("product.variants", "variants")
      .leftJoinAndSelect("product.inventories", "inventories");

    if (search) {
      queryBuilder.andWhere(
        "(product.name LIKE :search OR product.description LIKE :search OR product.sku LIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (category) {
      queryBuilder.andWhere("category.slug = :category", { category });
    }

    if (brand) {
      queryBuilder.andWhere("product.brand = :brand", { brand });
    }

    if (minPrice) {
      queryBuilder.andWhere("product.sellingPrice >= :minPrice", { minPrice });
    }

    if (maxPrice) {
      queryBuilder.andWhere("product.sellingPrice <= :maxPrice", { maxPrice });
    }

    if (isFeatured !== undefined) {
      queryBuilder.andWhere("product.isFeatured = :isFeatured", { isFeatured });
    }

    queryBuilder
      .orderBy(`product.${orderField}`, orderDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

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
    const product = await this.findOne(createVariantDto.productId);

    const sku = createVariantDto.sku || generateSKU("VAR");

    const variant = this.productVariantRepository.create({
      ...createVariantDto,
      sku,
      sellingPrice: createVariantDto.sellingPrice || createVariantDto.price,
      mrp: createVariantDto.mrp || createVariantDto.price,
    });

    return this.productVariantRepository.save(variant);
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
