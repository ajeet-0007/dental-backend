export declare class CreateProductDto {
    name: string;
    slug?: string;
    description?: string;
    shortDescription?: string;
    sku?: string;
    price: number;
    sellingPrice?: number;
    mrp?: number;
    brand?: string;
    unit?: string;
    minOrderQuantity?: number;
    images?: string[];
    isFeatured?: boolean;
    isReturnable?: boolean;
    returnDays?: number;
    categoryId?: string;
}
export declare class UpdateProductDto {
    name?: string;
    slug?: string;
    description?: string;
    shortDescription?: string;
    sku?: string;
    price?: number;
    sellingPrice?: number;
    mrp?: number;
    brand?: string;
    unit?: string;
    minOrderQuantity?: number;
    images?: string[];
    isActive?: boolean;
    isFeatured?: boolean;
    isReturnable?: boolean;
    returnDays?: number;
    categoryId?: string;
}
export declare class CreateProductVariantDto {
    productId: string;
    name?: string;
    sku?: string;
    price: number;
    sellingPrice?: number;
    mrp?: number;
    weight?: number;
    weightUnit?: string;
    image?: string;
    images?: string[];
}
export declare class ProductQueryDto {
    search?: string;
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    isFeatured?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}
