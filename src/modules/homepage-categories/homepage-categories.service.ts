import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HomepageCategory, Category, Product } from "../../database/entities";
import { leanProductQuery } from "../../common/utils/lean-product";
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

    const activeSections = sections.filter(
      (section) => section.category && section.category.isActive,
    );

    const categoryIds = activeSections.map((section) => String(section.categoryId));

    const productsByCategory = new Map<string, Product[]>();
    const countsByCategory = new Map<string, number>();

    if (categoryIds.length > 0) {
      const products = await leanProductQuery(
        this.productRepository
          .createQueryBuilder("product")
          .where("product.categoryId IN (:...categoryIds)", { categoryIds })
          .andWhere("product.isActive = :isActive", { isActive: true })
          .orderBy("product.isFeatured", "DESC")
          .addOrderBy("product.createdAt", "DESC"),
      )
        .addSelect("product.categoryId")
        .getMany();

      for (const product of products) {
        const key = String(product.categoryId);
        const list = productsByCategory.get(key) || [];
        list.push(product);
        productsByCategory.set(key, list);
      }

      const countRows: { categoryId: string; count: string }[] =
        await this.productRepository
          .createQueryBuilder("product")
          .select("product.categoryId", "categoryId")
          .addSelect("COUNT(*)", "count")
          .where("product.categoryId IN (:...categoryIds)", { categoryIds })
          .andWhere("product.isActive = :isActive", { isActive: true })
          .groupBy("product.categoryId")
          .getRawMany();

      for (const row of countRows) {
        countsByCategory.set(
          String(row.categoryId),
          parseInt(String(row.count), 10) || 0,
        );
      }
    }

    return activeSections.map((section) => ({
      category: section.category,
      products:
        (productsByCategory.get(String(section.categoryId)) || []).slice(0, PRODUCTS_PER_CATEGORY),
      count: countsByCategory.get(String(section.categoryId)) || 0,
    }));
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
