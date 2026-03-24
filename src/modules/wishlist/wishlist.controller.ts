import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { WishlistService } from "./wishlist.service";
import { AddToWishlistDto } from "./dto/wishlist.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Wishlist")
@Controller("wishlist")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: "Get user's wishlist" })
  async findAll(@CurrentUser() user: any) {
    return this.wishlistService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: "Add product to wishlist" })
  async add(@CurrentUser() user: any, @Body() dto: AddToWishlistDto) {
    return this.wishlistService.add(user.id, dto);
  }

  @Delete(":productId")
  @ApiOperation({ summary: "Remove product from wishlist" })
  async remove(
    @CurrentUser() user: any,
    @Param("productId") productId: string,
  ) {
    return this.wishlistService.remove(user.id, parseInt(productId, 10));
  }

  @Get("check/:productId")
  @ApiOperation({ summary: "Check if product is in wishlist" })
  async check(
    @CurrentUser() user: any,
    @Param("productId") productId: string,
  ) {
    return this.wishlistService.check(user.id, parseInt(productId, 10));
  }

  @Post("check-many")
  @ApiOperation({ summary: "Check multiple products in wishlist" })
  async checkMany(@CurrentUser() user: any, @Body() body: { productIds: number[] }) {
    return this.wishlistService.checkMany(user.id, body.productIds);
  }
}
