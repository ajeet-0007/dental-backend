import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WishlistService } from "./wishlist.service";
import { WishlistController } from "./wishlist.controller";
import { Wishlist } from "../../database/entities";

@Module({
  imports: [TypeOrmModule.forFeature([Wishlist])],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
