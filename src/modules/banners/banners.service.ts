import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThanOrEqual, MoreThanOrEqual, And } from "typeorm";
import { Banner } from "../../database/entities";
import { CreateBannerDto, UpdateBannerDto } from "./dto/banner.dto";
import { ImageKitService } from "../imagekit/imagekit.service";

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private bannerRepository: Repository<Banner>,
    private imageKitService: ImageKitService,
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

    const previousImage = banner.image;

    Object.assign(banner, updateBannerDto);
    const savedBanner = await this.bannerRepository.save(banner);

    if (previousImage && previousImage !== savedBanner.image) {
      await this.imageKitService.deleteFiles([previousImage]);
    }

    return savedBanner;
  }

  async remove(id: string): Promise<void> {
    const banner = await this.findOne(id);
    const image = banner.image;
    await this.bannerRepository.remove(banner);
    await this.imageKitService.deleteFiles([image]);
  }
}
