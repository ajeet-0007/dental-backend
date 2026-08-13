import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HomepageCategory, Category, Product } from "../../database/entities";
import { CreateHomepageCategoryDto, UpdateHomepageCategoryDto } from "./dto/homepage-category.dto";

const PRODUCTS_PER_CATEGORY = 10;

@Injectable()
export class HomepageCategoriesService {
  constructor(
    @InjectRepository(HomepageCategory)
    private homepageCategoryRepository: Repository<HomepageCategory>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async findAllForHome(): Promise<{ category: Category; products: Product[]; count: number }[]> {
    const sections = await this.homepageCategoryRepository.find({
      where: { isActive: true },
      relations: ["category"],
      order: { sortOrder: "ASC", id: "ASC" },
    });

    const result: { category: Category; products: Product[]; count: number }[] = [];

    for (const section of sections) {
      if (!section.category || !section.category.isActive) continue;

      const products = await this.productRepository.find({
        where: { categoryId: String(section.categoryId), isActive: true },
        relations: ["category", "brandEntity", "inventories"],
        order: { isFeatured: "DESC", createdAt: "DESC" },
        take: PRODUCTS_PER_CATEGORY,
      });

      const count = await this.productRepository.count({
        where: { categoryId: String(section.categoryId), isActive: true },
      });

      result.push({ category: section.category, products, count });
    }

    return result;
  }

  async findAllForAdmin(): Promise<HomepageCategory[]> {
    return this.homepageCategoryRepository.find({
      relations: ["category"],
      order: { sortOrder: "ASC", id: "ASC" },
    });
  }

  async create(createHomepageCategoryDto: CreateHomepageCategoryDto): Promise<HomepageCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id: createHomepageCategoryDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    const existing = await this.homepageCategoryRepository.findOne({
      where: { categoryId: createHomepageCategoryDto.categoryId },
    });

    if (existing) {
      throw new ConflictException("This category is already configured on the homepage");
    }

    const section = this.homepageCategoryRepository.create(createHomepageCategoryDto);
    return this.homepageCategoryRepository.save(section);
  }

  async update(
    id: string,
    updateHomepageCategoryDto: UpdateHomepageCategoryDto,
  ): Promise<HomepageCategory> {
    const section = await this.homepageCategoryRepository.findOne({
      where: { id: parseInt(id, 10) },
      relations: ["category"],
    });

    if (!section) {
      throw new NotFoundException("Homepage category not found");
    }

    if (updateHomepageCategoryDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateHomepageCategoryDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException("Category not found");
      }

      if (updateHomepageCategoryDto.categoryId !== section.categoryId) {
        const existing = await this.homepageCategoryRepository.findOne({
          where: { categoryId: updateHomepageCategoryDto.categoryId },
        });

        if (existing) {
          throw new ConflictException("This category is already configured on the homepage");
        }
      }
    }

    Object.assign(section, updateHomepageCategoryDto);
    return this.homepageCategoryRepository.save(section);
  }

  async remove(id: string): Promise<void> {
    const section = await this.homepageCategoryRepository.findOne({
      where: { id: parseInt(id, 10) },
    });

    if (!section) {
      throw new NotFoundException("Homepage category not found");
    }

    await this.homepageCategoryRepository.remove(section);
  }
}
