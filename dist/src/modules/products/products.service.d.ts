import { Repository } from 'typeorm';
import { Product, ProductVariant, Inventory } from '../../database/entities';
import { CreateProductDto, UpdateProductDto, CreateProductVariantDto, ProductQueryDto } from './dto/product.dto';
export declare class ProductsService {
    private productRepository;
    private productVariantRepository;
    private inventoryRepository;
    constructor(productRepository: Repository<Product>, productVariantRepository: Repository<ProductVariant>, inventoryRepository: Repository<Inventory>);
    create(createProductDto: CreateProductDto): Promise<Product>;
    findAll(query: ProductQueryDto): Promise<{
        products: Product[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<Product>;
    findBySlug(slug: string): Promise<Product>;
    update(id: string, updateProductDto: UpdateProductDto): Promise<Product>;
    remove(id: string): Promise<void>;
    createVariant(createVariantDto: CreateProductVariantDto): Promise<ProductVariant>;
    getFeaturedProducts(limit?: number): Promise<Product[]>;
    getRelatedProducts(productId: string, limit?: number): Promise<Product[]>;
    getAllBrands(): Promise<string[]>;
}
