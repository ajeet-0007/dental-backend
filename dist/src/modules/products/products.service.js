"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../../database/entities");
const slugify_1 = require("../../common/utils/slugify");
let ProductsService = class ProductsService {
    constructor(productRepository, productVariantRepository, inventoryRepository) {
        this.productRepository = productRepository;
        this.productVariantRepository = productVariantRepository;
        this.inventoryRepository = inventoryRepository;
    }
    async create(createProductDto) {
        const slug = createProductDto.slug || (0, slugify_1.slugify)(createProductDto.name);
        const existingProduct = await this.productRepository.findOne({
            where: { slug },
        });
        if (existingProduct) {
            throw new common_1.ConflictException('Product with this slug already exists');
        }
        const sku = createProductDto.sku || (0, slugify_1.generateSKU)('PROD');
        const product = this.productRepository.create({
            ...createProductDto,
            slug,
            sku,
            sellingPrice: createProductDto.sellingPrice || createProductDto.price,
            mrp: createProductDto.mrp || createProductDto.price,
        });
        const savedProduct = await this.productRepository.save(product);
        await this.inventoryRepository.save({
            productId: savedProduct.id,
            quantity: 0,
            warehouseLocation: 'default',
        });
        return savedProduct;
    }
    async findAll(query) {
        const { search, category, brand, minPrice, maxPrice, isFeatured, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC', } = query;
        const queryBuilder = this.productRepository
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.variants', 'variants')
            .leftJoinAndSelect('product.inventories', 'inventories');
        if (search) {
            queryBuilder.andWhere('(product.name LIKE :search OR product.description LIKE :search OR product.sku LIKE :search)', { search: `%${search}%` });
        }
        if (category) {
            queryBuilder.andWhere('category.slug = :category', { category });
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
        queryBuilder
            .orderBy(`product.${sortBy}`, sortOrder)
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
    async findOne(id) {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: ['category', 'variants', 'inventories', 'reviews'],
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return product;
    }
    async findBySlug(slug) {
        const product = await this.productRepository.findOne({
            where: { slug },
            relations: ['category', 'variants', 'inventories', 'reviews', 'reviews.user'],
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return product;
    }
    async update(id, updateProductDto) {
        const product = await this.findOne(id);
        if (updateProductDto.name && updateProductDto.name !== product.name) {
            updateProductDto.slug = updateProductDto.slug || (0, slugify_1.slugify)(updateProductDto.name);
        }
        Object.assign(product, updateProductDto);
        return this.productRepository.save(product);
    }
    async remove(id) {
        const product = await this.findOne(id);
        await this.productRepository.remove(product);
    }
    async createVariant(createVariantDto) {
        const product = await this.findOne(createVariantDto.productId);
        const sku = createVariantDto.sku || (0, slugify_1.generateSKU)('VAR');
        const variant = this.productVariantRepository.create({
            ...createVariantDto,
            sku,
            sellingPrice: createVariantDto.sellingPrice || createVariantDto.price,
            mrp: createVariantDto.mrp || createVariantDto.price,
        });
        return this.productVariantRepository.save(variant);
    }
    async getFeaturedProducts(limit = 10) {
        return this.productRepository.find({
            where: { isFeatured: true, isActive: true },
            relations: ['category', 'inventories'],
            take: limit,
            order: { createdAt: 'DESC' },
        });
    }
    async getRelatedProducts(productId, limit = 10) {
        const product = await this.findOne(productId);
        return this.productRepository.find({
            where: {
                categoryId: product.categoryId,
                isActive: true,
            },
            relations: ['category', 'inventories'],
            take: limit,
            order: { createdAt: 'DESC' },
        });
    }
    async getAllBrands() {
        const result = await this.productRepository
            .createQueryBuilder('product')
            .select('DISTINCT product.brand', 'brand')
            .where('product.brand IS NOT NULL')
            .getRawMany();
        return result.map((r) => r.brand).filter(Boolean);
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.ProductVariant)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.Inventory)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ProductsService);
//# sourceMappingURL=products.service.js.map