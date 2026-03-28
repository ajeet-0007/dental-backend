import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Brand } from "../../database/entities";
import { CreateBrandDto, UpdateBrandDto } from "./dto/brand.dto";
import { slugify } from "../../common/utils/slugify";

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
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

  async update(
    id: string,
    updateBrandDto: UpdateBrandDto,
  ): Promise<Brand> {
    const brand = await this.findOne(id);

    if (updateBrandDto.name && updateBrandDto.name !== brand.name) {
      updateBrandDto.slug =
        updateBrandDto.slug || slugify(updateBrandDto.name);
    }

    Object.assign(brand, updateBrandDto);
    return this.brandRepository.save(brand);
  }

  async remove(id: string): Promise<void> {
    const brand = await this.findOne(id);
    await this.brandRepository.remove(brand);
  }
}
