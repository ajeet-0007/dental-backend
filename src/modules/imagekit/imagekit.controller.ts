import {
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { ImageKitService } from "./imagekit.service";
import { ImageProcessingService } from "./image-processing.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../database/entities/user.entity";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller("imagekit")
export class ImageKitController {
  constructor(
    private readonly imageKitService: ImageKitService,
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  @Get("auth")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAuthParams() {
    const authParams = this.imageKitService.getAuthParams();
    return {
      publicKey: this.imageKitService.getPublicKey(),
      urlEndpoint: this.imageKitService.getUrlEndpoint(),
      ...authParams,
    };
  }

  @Post("upload")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const result = await this.imageProcessingService.processFile(
      file,
      "/dentalkart",
    );

    return {
      url: result.url,
      fileId: result.fileId,
      name: result.name,
    };
  }

  @Post("upload-review")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadReviewImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const result = await this.imageProcessingService.processFile(
      file,
      "/dentalkart/reviews",
      ["image/jpeg", "image/png", "image/webp", "image/gif"],
    );

    return {
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      fileId: result.fileId,
      name: result.name,
    };
  }
}
