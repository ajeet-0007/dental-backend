import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThanOrEqual, MoreThanOrEqual, And } from "typeorm";
import { Banner } from "../../database/entities";
import { CreateBannerDto, UpdateBannerDto } from "./dto/banner.dto";

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private bannerRepository: Repository<Banner>,
  ) {}

  async create(createBannerDto: CreateBannerDto): Promise<Banner> {
    const banner = this.bannerRepository.create(createBannerDto);
    return this.bannerRepository.save(banner);
  }

  async findAll(activeOnly = true): Promise<Banner[]> {
    const query = this.bannerRepository
      .createQueryBuilder("banner")
      .orderBy("banner.sortOrder", "ASC");

    if (activeOnly) {
      const now = new Date();
      query.andWhere(
        "(banner.startDate IS NULL OR banner.startDate <= :now)",
        { now },
      );
      query.andWhere(
        "(banner.endDate IS NULL OR banner.endDate >= :now)",
        { now },
      );
      query.andWhere("banner.isActive = :isActive", { isActive: true });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Banner> {
    const banner = await this.bannerRepository.findOne({
      where: { id: parseInt(id, 10) },
    });

    if (!banner) {
      throw new NotFoundException("Banner not found");
    }

    return banner;
  }

  async update(
    id: string,
    updateBannerDto: UpdateBannerDto,
  ): Promise<Banner> {
    const banner = await this.findOne(id);

    Object.assign(banner, updateBannerDto);
    return this.bannerRepository.save(banner);
  }

  async remove(id: string): Promise<void> {
    const banner = await this.findOne(id);
    await this.bannerRepository.remove(banner);
  }
}
