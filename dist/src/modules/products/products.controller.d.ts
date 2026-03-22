import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, CreateProductVariantDto, ProductQueryDto } from './dto/product.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(query: ProductQueryDto): Promise<{
        products: import("../../database/entities").Product[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getFeatured(limit?: number): Promise<import("../../database/entities").Product[]>;
    getBrands(): Promise<string[]>;
    findOne(id: string): Promise<import("../../database/entities").Product>;
    findBySlug(slug: string): Promise<import("../../database/entities").Product>;
    getRelated(id: string, limit?: number): Promise<import("../../database/entities").Product[]>;
    create(createProductDto: CreateProductDto): Promise<import("../../database/entities").Product>;
    createVariant(createVariantDto: CreateProductVariantDto): Promise<import("../../database/entities").ProductVariant>;
    update(id: string, updateProductDto: UpdateProductDto): Promise<import("../../database/entities").Product>;
    remove(id: string): Promise<void>;
}
