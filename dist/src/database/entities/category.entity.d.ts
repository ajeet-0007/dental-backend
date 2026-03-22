import { Product } from './product.entity';
export declare class Category {
    id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
    isActive: boolean;
    sortOrder: number;
    parentId: string;
    parent: Category;
    children: Category[];
    products: Product[];
    createdAt: Date;
    updatedAt: Date;
}
