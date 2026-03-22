import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Category } from "../../database/entities";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";
import { slugify } from "../../common/utils/slugify";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const slug = createCategoryDto.slug || slugify(createCategoryDto.name);

    const existingCategory = await this.categoryRepository.findOne({
      where: { slug },
    });

    if (existingCategory) {
      throw new ConflictException("Category with this slug already exists");
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      slug,
    });

    return this.categoryRepository.save(category);
  }

  async findAll(activeOnly = true): Promise<Category[]> {
    const query = this.categoryRepository
      .createQueryBuilder("category")
      .leftJoinAndSelect("category.children", "children")
      .orderBy("category.sortOrder", "ASC");

    if (activeOnly) {
      query.where("category.isActive = :isActive", { isActive: true });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id: parseInt(id, 10) },
      relations: ["children", "products"],
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    return category;
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { slug },
      relations: ["children", "products"],
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);

    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      updateCategoryDto.slug =
        updateCategoryDto.slug || slugify(updateCategoryDto.name);
    }

    Object.assign(category, updateCategoryDto);
    return this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    const hasChildren = await this.categoryRepository.count({
      where: { parentId: id },
    });

    if (hasChildren > 0) {
      throw new ConflictException("Cannot delete category with children");
    }

    await this.categoryRepository.remove(category);
  }

  async getTree(): Promise<Category[]> {
    const rootCategories = await this.categoryRepository.find({
      where: { parentId: undefined as any },
      relations: ["children", "children.children"],
      order: { sortOrder: "ASC" },
    });

    return rootCategories;
  }
}
