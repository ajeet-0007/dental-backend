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
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../database/entities/user.entity";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller("imagekit")
export class ImageKitController {
  constructor(private readonly imageKitService: ImageKitService) {}

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const authParams = this.imageKitService.getAuthParams();
    const formData = new FormData();
    formData.append("file", file.buffer.toString("base64"));
    formData.append("fileName", file.originalname);
    formData.append("publicKey", this.imageKitService.getPublicKey());
    formData.append("token", authParams.token);
    formData.append("expire", authParams.expire.toString());
    formData.append("signature", authParams.signature);
    formData.append("folder", "/dentalkart");

    const response = await fetch(
      "https://upload.imagekit.io/api/v1/files/upload",
      {
        method: "POST",
        body: formData,
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new BadRequestException(result.message || "Upload failed");
    }

    return {
      url: result.url,
      fileId: result.fileId,
      name: result.name,
    };
  }
}
