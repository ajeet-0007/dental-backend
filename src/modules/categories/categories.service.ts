import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Category, Product } from "../../database/entities";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";
import { slugify } from "../../common/utils/slugify";
import { ImageKitService } from "../imagekit/imagekit.service";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private imageKitService: ImageKitService,
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

  async getCategoryDetails(slug: string): Promise<any> {
    const category = await this.findBySlug(slug);
    const productRepository =
      this.categoryRepository.manager.getRepository(Product);

    const stats = await productRepository
      .createQueryBuilder("product")
      .innerJoin("product.category", "category")
      .select("COUNT(product.id)", "productCount")
      .addSelect("COUNT(DISTINCT product.brandId)", "brandCount")
      .addSelect("MIN(product.sellingPrice)", "minPrice")
      .addSelect("MAX(product.sellingPrice)", "maxPrice")
      .addSelect(
        "SUM(CASE WHEN product.isFeatured = 1 THEN 1 ELSE 0 END)",
        "featuredProductCount"
      )
      .where("category.slug = :slug", { slug })
      .andWhere("product.isActive = 1")
      .getRawOne();

    return {
      ...category,
      productCount: parseInt(stats?.productCount || 0, 10),
      brandCount: parseInt(stats?.brandCount || 0, 10),
      minPrice: stats?.minPrice == null ? null : Number(stats.minPrice),
      maxPrice: stats?.maxPrice == null ? null : Number(stats.maxPrice),
      featuredProductCount: parseInt(stats?.featuredProductCount || 0, 10),
      subcategoryCount: (category.children || []).length,
    };
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

    const previousImage = category.image;

    Object.assign(category, updateCategoryDto);
    const savedCategory = await this.categoryRepository.save(category);

    if (previousImage && previousImage !== savedCategory.image) {
      await this.imageKitService.deleteFiles([previousImage]);
    }

    return savedCategory;
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    const hasChildren = await this.categoryRepository.count({
      where: { parentId: id },
    });

    if (hasChildren > 0) {
      throw new ConflictException("Cannot delete category with children");
    }

    const image = category.image;
    await this.categoryRepository.remove(category);
    await this.imageKitService.deleteFiles([image]);
  }

  async getTree(): Promise<Category[]> {
    const rootCategories = await this.categoryRepository.find({
      where: { parentId: undefined as any },
      relations: ["children", "children.children"],
      order: { sortOrder: "ASC" },
    });

    return rootCategories;
  }

  async search(query: string): Promise<Category[]> {
    return this.categoryRepository
      .createQueryBuilder("category")
      .where("category.name LIKE :query", { query: `%${query}%` })
      .andWhere("category.isActive = :isActive", { isActive: true })
      .orderBy("category.name", "ASC")
      .take(5)
      .getMany();
  }
}
