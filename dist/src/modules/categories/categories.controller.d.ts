import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(active?: string): Promise<import("../../database/entities").Category[]>;
    getTree(): Promise<import("../../database/entities").Category[]>;
    findOne(id: string): Promise<import("../../database/entities").Category>;
    findBySlug(slug: string): Promise<import("../../database/entities").Category>;
    create(createCategoryDto: CreateCategoryDto): Promise<import("../../database/entities").Category>;
    update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<import("../../database/entities").Category>;
    remove(id: string): Promise<void>;
}
