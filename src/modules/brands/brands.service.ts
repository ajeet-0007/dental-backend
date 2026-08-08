import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Brand, Product } from "../../database/entities";
import { CreateBrandDto, UpdateBrandDto } from "./dto/brand.dto";
import { slugify } from "../../common/utils/slugify";
import { ImageKitService } from "../imagekit/imagekit.service";

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
    private imageKitService: ImageKitService,
  ) {}

  async create(createBrandDto: CreateBrandDto): Promise<Brand> {
    const slug = createBrandDto.slug || slugify(createBrandDto.name);

    const existingBrand = await this.brandRepository.findOne({
      where: { slug },
    });

    if (existingBrand) {
      throw new ConflictException("Brand with this slug already exists");
    }

    const brand = this.brandRepository.create({
      ...createBrandDto,
      slug,
    });

    return this.brandRepository.save(brand);
  }

  async findAll(activeOnly = true): Promise<Brand[]> {
    const queryBuilder = this.brandRepository.createQueryBuilder("brand");

    if (activeOnly) {
      queryBuilder.where("brand.isActive = :isActive", { isActive: true });
    }

    queryBuilder.orderBy("brand.sortOrder", "ASC");

    return queryBuilder.getMany();
  }

  async findAllForAdmin(): Promise<any[]> {
    const brands = await this.brandRepository
      .createQueryBuilder("brand")
      .orderBy("brand.sortOrder", "ASC")
      .getMany();

    const result = await Promise.all(
      brands.map(async (brand) => {
        const countResult = await this.brandRepository.manager.query(
          `SELECT COUNT(*) as count FROM products WHERE brandId = ?`,
          [brand.id]
        );
        return {
          ...brand,
          productCount: parseInt(countResult[0].count, 10) || 0,
        };
      })
    );

    return result;
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandRepository.findOne({
      where: { id: parseInt(id, 10) },
    });

    if (!brand) {
      throw new NotFoundException("Brand not found");
    }

    return brand;
  }

  async findBySlug(slug: string): Promise<Brand> {
    const brand = await this.brandRepository.findOne({
      where: { slug },
    });

    if (!brand) {
      throw new NotFoundException("Brand not found");
    }

    return brand;
  }

  async getBrandDetails(slug: string): Promise<any> {
    const brand = await this.findBySlug(slug);
    const productRepository = this.brandRepository.manager.getRepository(Product);

    const stats = await productRepository
      .createQueryBuilder("product")
      .select("COUNT(product.id)", "productCount")
      .addSelect("COUNT(DISTINCT product.categoryId)", "categoryCount")
      .addSelect("MIN(product.sellingPrice)", "minPrice")
      .addSelect("MAX(product.sellingPrice)", "maxPrice")
      .addSelect(
        "SUM(CASE WHEN product.isFeatured = 1 THEN 1 ELSE 0 END)",
        "featuredProductCount"
      )
      .where("product.brandId = :brandId", { brandId: brand.id })
      .andWhere("product.isActive = 1")
      .getRawOne();

    const categories = await productRepository
      .createQueryBuilder("product")
      .innerJoin("product.category", "category")
      .select("category.id", "id")
      .addSelect("category.slug", "slug")
      .addSelect("category.name", "name")
      .addSelect("COUNT(product.id)", "count")
      .where("product.brandId = :brandId", { brandId: brand.id })
      .andWhere("product.isActive = 1")
      .groupBy("category.id")
      .addGroupBy("category.slug")
      .addGroupBy("category.name")
      .orderBy("count", "DESC")
      .getRawMany();

    return {
      ...brand,
      productCount: parseInt(stats?.productCount || 0, 10),
      categoryCount: parseInt(stats?.categoryCount || 0, 10),
      minPrice: stats?.minPrice == null ? null : Number(stats.minPrice),
      maxPrice: stats?.maxPrice == null ? null : Number(stats.maxPrice),
      featuredProductCount: parseInt(stats?.featuredProductCount || 0, 10),
      categories,
    };
  }

  async update(
    id: string,
    updateBrandDto: UpdateBrandDto,
  ): Promise<Brand> {
    const brand = await this.findOne(id);

    if (updateBrandDto.name && updateBrandDto.name !== brand.name) {
      updateBrandDto.slug =
        updateBrandDto.slug || slugify(updateBrandDto.name);
    }

    const previousLogo = brand.logo;

    Object.assign(brand, updateBrandDto);
    const savedBrand = await this.brandRepository.save(brand);

    if (previousLogo && previousLogo !== savedBrand.logo) {
      await this.imageKitService.deleteFiles([previousLogo]);
    }

    return savedBrand;
  }

  async remove(id: string): Promise<void> {
    const brand = await this.findOne(id);
    const logo = brand.logo;
    await this.brandRepository.remove(brand);
    await this.imageKitService.deleteFiles([logo]);
  }
}
