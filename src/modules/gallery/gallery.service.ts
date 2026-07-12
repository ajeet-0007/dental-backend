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

@Injectable()
export class GalleryService {
  constructor(
    @InjectRepository(GalleryAlbum)
    private albumRepository: Repository<GalleryAlbum>,
    @InjectRepository(GalleryImage)
    private imageRepository: Repository<GalleryImage>,
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
    Object.assign(album, dto);
    return this.albumRepository.save(album);
  }

  async removeAlbum(id: string): Promise<void> {
    const album = await this.findAlbumById(id);
    await this.albumRepository.remove(album);
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
    Object.assign(image, dto);
    return this.imageRepository.save(image);
  }

  async removeImage(id: string): Promise<void> {
    const image = await this.findImageById(id);
    await this.imageRepository.remove(image);
  }
}
