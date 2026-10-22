import { Module, Global } from "@nestjs/common";
import { ImageKitService } from "./imagekit.service";
import { ImageProcessingService } from "./image-processing.service";
import { ImageKitController } from "./imagekit.controller";

@Global()
@Module({
  controllers: [ImageKitController],
  providers: [ImageKitService, ImageProcessingService],
  exports: [ImageKitService, ImageProcessingService],
})
export class ImageKitModule {}
