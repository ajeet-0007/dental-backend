import { Repository } from "typeorm";
import { Category } from "../../database/entities";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";
export declare class CategoriesService {
    private categoryRepository;
    constructor(categoryRepository: Repository<Category>);
    create(createCategoryDto: CreateCategoryDto): Promise<Category>;
    findAll(activeOnly?: boolean): Promise<Category[]>;
    findOne(id: string): Promise<Category>;
    findBySlug(slug: string): Promise<Category>;
    update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category>;
    remove(id: string): Promise<void>;
    getTree(): Promise<Category[]>;
}
