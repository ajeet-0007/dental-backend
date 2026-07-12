import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { GalleryService } from "./gallery.service";
import {
  CreateAlbumDto,
  UpdateAlbumDto,
  CreateGalleryImageDto,
  UpdateGalleryImageDto,
} from "./dto/gallery.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../database/entities";

@ApiTags("Gallery")
@Controller("gallery")
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  // Album endpoints
  @Get("albums")
  @ApiOperation({ summary: "Get all gallery albums" })
  async findAlbums(@Query("active") active = "true") {
    return this.galleryService.findAllAlbums(active === "true");
  }

  @Get("albums/:slug")
  @ApiOperation({ summary: "Get album by slug with images" })
  async findAlbumBySlug(@Param("slug") slug: string) {
    return this.galleryService.findAlbumBySlug(slug);
  }

  @Post("albums")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create gallery album (Admin only)" })
  async createAlbum(@Body() dto: CreateAlbumDto) {
    return this.galleryService.createAlbum(dto);
  }

  @Put("albums/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update gallery album (Admin only)" })
  async updateAlbum(@Param("id") id: string, @Body() dto: UpdateAlbumDto) {
    return this.galleryService.updateAlbum(id, dto);
  }

  @Delete("albums/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete gallery album (Admin only)" })
  async removeAlbum(@Param("id") id: string) {
    await this.galleryService.removeAlbum(id);
    return { message: "Album deleted successfully" };
  }

  // Image endpoints
  @Get("images")
  @ApiOperation({ summary: "Get all gallery images" })
  async findImages(@Query("active") active = "true") {
    return this.galleryService.findAllImages(active === "true");
  }

  @Post("images")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Add image to gallery (Admin only)" })
  async addImage(@Body() dto: CreateGalleryImageDto) {
    return this.galleryService.addImage(dto);
  }

  @Put("images/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update gallery image (Admin only)" })
  async updateImage(@Param("id") id: string, @Body() dto: UpdateGalleryImageDto) {
    return this.galleryService.updateImage(id, dto);
  }

  @Delete("images/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete gallery image (Admin only)" })
  async removeImage(@Param("id") id: string) {
    await this.galleryService.removeImage(id);
    return { message: "Image deleted successfully" };
  }
}
