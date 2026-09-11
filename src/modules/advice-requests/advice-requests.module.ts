import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdviceRequest } from "../../database/entities";
import { AdviceRequestsController } from "./advice-requests.controller";
import { AdviceRequestsService } from "./advice-requests.service";

@Module({
  imports: [TypeOrmModule.forFeature([AdviceRequest])],
  controllers: [AdviceRequestsController],
  providers: [AdviceRequestsService],
  exports: [AdviceRequestsService],
})
export class AdviceRequestsModule {}