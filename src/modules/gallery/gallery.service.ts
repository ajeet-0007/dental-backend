import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GalleryAlbum, GalleryImage } from "../../database/entities";
import {
  CreateAlbumDto,
  UpdateAlbumDto,
  CreateGalleryImageDto,
  UpdateGalleryImageDto,
} from "./dto/gallery.dto";
import { ImageKitService } from "../imagekit/imagekit.service";

@Injectable()
export class GalleryService {
  constructor(
    @InjectRepository(GalleryAlbum)
    private albumRepository: Repository<GalleryAlbum>,
    @InjectRepository(GalleryImage)
    private imageRepository: Repository<GalleryImage>,
    private imageKitService: ImageKitService,
  ) {}

  // Album methods
  async createAlbum(dto: CreateAlbumDto): Promise<GalleryAlbum> {
    const album = this.albumRepository.create(dto);
    return this.albumRepository.save(album);
  }

  async findAllAlbums(activeOnly = true): Promise<GalleryAlbum[]> {
    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
    }
    return this.albumRepository.find({
      where,
      order: { sortOrder: "ASC", createdAt: "DESC" },
      relations: ["images"],
    });
  }

  async findAlbumBySlug(slug: string): Promise<GalleryAlbum> {
    const album = await this.albumRepository.findOne({
      where: { slug },
      relations: ["images"],
    });
    if (!album) {
      throw new NotFoundException("Album not found");
    }
    // Sort images by sortOrder
    if (album.images) {
      album.images.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return album;
  }

  async findAlbumById(id: string): Promise<GalleryAlbum> {
    const album = await this.albumRepository.findOne({
      where: { id: parseInt(id, 10) },
      relations: ["images"],
    });
    if (!album) {
      throw new NotFoundException("Album not found");
    }
    return album;
  }

  async updateAlbum(id: string, dto: UpdateAlbumDto): Promise<GalleryAlbum> {
    const album = await this.findAlbumById(id);
    const previousCover = album.coverImage;
    Object.assign(album, dto);
    const savedAlbum = await this.albumRepository.save(album);

    if (previousCover && previousCover !== savedAlbum.coverImage) {
      await this.imageKitService.deleteFiles([previousCover]);
    }

    return savedAlbum;
  }

  async removeAlbum(id: string): Promise<void> {
    const album = await this.findAlbumById(id);

    const imageUrls = [
      album.coverImage,
      ...(album.images || []).map((image) => image.imageUrl),
    ];

    await this.albumRepository.remove(album);
    await this.imageKitService.deleteFiles(imageUrls);
  }

  // Image methods
  async addImage(dto: CreateGalleryImageDto): Promise<GalleryImage> {
    // Verify album exists
    await this.findAlbumById(String(dto.albumId));
    const image = this.imageRepository.create(dto);
    return this.imageRepository.save(image);
  }

  async findImagesByAlbum(albumId: number, activeOnly = true): Promise<GalleryImage[]> {
    const where: any = { albumId };
    if (activeOnly) {
      where.isActive = true;
    }
    return this.imageRepository.find({
      where,
      order: { sortOrder: "ASC", createdAt: "DESC" },
    });
  }

  async findAllImages(activeOnly = true): Promise<GalleryImage[]> {
    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
    }
    return this.imageRepository.find({
      where,
      order: { sortOrder: "ASC", createdAt: "DESC" },
      relations: ["album"],
    });
  }

  async findImageById(id: string): Promise<GalleryImage> {
    const image = await this.imageRepository.findOne({
      where: { id: parseInt(id, 10) },
      relations: ["album"],
    });
    if (!image) {
      throw new NotFoundException("Image not found");
    }
    return image;
  }

  async updateImage(id: string, dto: UpdateGalleryImageDto): Promise<GalleryImage> {
    const image = await this.findImageById(id);
    const previousUrl = image.imageUrl;
    Object.assign(image, dto);
    const savedImage = await this.imageRepository.save(image);

    if (previousUrl && previousUrl !== savedImage.imageUrl) {
      await this.imageKitService.deleteFiles([previousUrl]);
    }

    return savedImage;
  }

  async removeImage(id: string): Promise<void> {
    const image = await this.findImageById(id);
    const imageUrl = image.imageUrl;
    await this.imageRepository.remove(image);
    await this.imageKitService.deleteFiles([imageUrl]);
  }
}
