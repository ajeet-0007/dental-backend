import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HomepageBrand, Brand, Product } from "../../database/entities";
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

    const result: { brand: Brand; products: Product[]; count: number }[] = [];

    for (const section of sections) {
      if (!section.brand || !section.brand.isActive) continue;

      const products = await this.productRepository.find({
        where: { brandId: section.brandId, isActive: true },
        relations: ["category", "brandEntity", "inventories"],
        order: { isFeatured: "DESC", createdAt: "DESC" },
        take: PRODUCTS_PER_BRAND,
      });

      const count = await this.productRepository.count({
        where: { brandId: section.brandId, isActive: true },
      });

      result.push({ brand: section.brand, products, count });
    }

    return result;
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
