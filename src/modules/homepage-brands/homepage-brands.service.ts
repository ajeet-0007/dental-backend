import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HomepageBrand, Brand, Product } from "../../database/entities";
import { leanProductQuery } from "../../common/utils/lean-product";
import { CreateHomepageBrandDto, UpdateHomepageBrandDto } from "./dto/homepage-brand.dto";

const PRODUCTS_PER_BRAND = 10;

@Injectable()
export class HomepageBrandsService {
  constructor(
    @InjectRepository(HomepageBrand)
    private homepageBrandRepository: Repository<HomepageBrand>,
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async findAllForHome(): Promise<{ brand: Brand; products: Product[]; count: number }[]> {
    const sections = await this.homepageBrandRepository.find({
      where: { isActive: true },
      relations: ["brand"],
      order: { sortOrder: "ASC", id: "ASC" },
    });

    const activeSections = sections.filter(
      (section) => section.brand && section.brand.isActive,
    );

    const brandIds = activeSections.map((section) => section.brandId);

    const productsByBrand = new Map<number, Product[]>();
    const countsByBrand = new Map<number, number>();

    if (brandIds.length > 0) {
      const products = await leanProductQuery(
        this.productRepository
          .createQueryBuilder("product")
          .where("product.brandId IN (:...brandIds)", { brandIds })
          .andWhere("product.isActive = :isActive", { isActive: true })
          .orderBy("product.isFeatured", "DESC")
          .addOrderBy("product.createdAt", "DESC"),
      )
        .addSelect("product.brandId")
        .getMany();

      for (const product of products) {
        const list = productsByBrand.get(product.brandId) || [];
        list.push(product);
        productsByBrand.set(product.brandId, list);
      }

      const countRows: { brandId: number; count: string }[] =
        await this.productRepository
          .createQueryBuilder("product")
          .select("product.brandId", "brandId")
          .addSelect("COUNT(*)", "count")
          .where("product.brandId IN (:...brandIds)", { brandIds })
          .andWhere("product.isActive = :isActive", { isActive: true })
          .groupBy("product.brandId")
          .getRawMany();

      for (const row of countRows) {
        countsByBrand.set(
          Number(row.brandId),
          parseInt(String(row.count), 10) || 0,
        );
      }
    }

    return activeSections.map((section) => ({
      brand: section.brand,
      products:
        (productsByBrand.get(section.brandId) || []).slice(0, PRODUCTS_PER_BRAND),
      count: countsByBrand.get(section.brandId) || 0,
    }));
  }

  async findAllForAdmin(): Promise<HomepageBrand[]> {
    return this.homepageBrandRepository.find({
      relations: ["brand"],
      order: { sortOrder: "ASC", id: "ASC" },
    });
  }

  async create(createHomepageBrandDto: CreateHomepageBrandDto): Promise<HomepageBrand> {
    const brand = await this.brandRepository.findOne({
      where: { id: createHomepageBrandDto.brandId },
    });

    if (!brand) {
      throw new NotFoundException("Brand not found");
    }

    const existing = await this.homepageBrandRepository.findOne({
      where: { brandId: createHomepageBrandDto.brandId },
    });

    if (existing) {
      throw new ConflictException("This brand is already configured on the homepage");
    }

    const section = this.homepageBrandRepository.create(createHomepageBrandDto);
    return this.homepageBrandRepository.save(section);
  }

  async update(
    id: string,
    updateHomepageBrandDto: UpdateHomepageBrandDto,
  ): Promise<HomepageBrand> {
    const section = await this.homepageBrandRepository.findOne({
      where: { id: parseInt(id, 10) },
      relations: ["brand"],
    });

    if (!section) {
      throw new NotFoundException("Homepage brand not found");
    }

    if (updateHomepageBrandDto.brandId) {
      const brand = await this.brandRepository.findOne({
        where: { id: updateHomepageBrandDto.brandId },
      });

      if (!brand) {
        throw new NotFoundException("Brand not found");
      }

      if (updateHomepageBrandDto.brandId !== section.brandId) {
        const existing = await this.homepageBrandRepository.findOne({
          where: { brandId: updateHomepageBrandDto.brandId },
        });

        if (existing) {
          throw new ConflictException("This brand is already configured on the homepage");
        }
      }
    }

    Object.assign(section, updateHomepageBrandDto);
    return this.homepageBrandRepository.save(section);
  }

  async remove(id: string): Promise<void> {
    const section = await this.homepageBrandRepository.findOne({
      where: { id: parseInt(id, 10) },
    });

    if (!section) {
      throw new NotFoundException("Homepage brand not found");
    }

    await this.homepageBrandRepository.remove(section);
  }
}
