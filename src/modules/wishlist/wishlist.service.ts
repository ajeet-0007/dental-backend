import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Wishlist } from "../../database/entities";
import { AddToWishlistDto } from "./dto/wishlist.dto";

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private wishlistRepository: Repository<Wishlist>,
  ) {}

  async findAll(userId: string) {
    return this.wishlistRepository.find({
      where: { userId },
      relations: ["product", "product.category"],
      order: { createdAt: "DESC" },
    });
  }

  async add(userId: string, dto: AddToWishlistDto) {
    const existing = await this.wishlistRepository.findOne({
      where: { userId, productId: dto.productId },
    });

    if (existing) {
      throw new ConflictException("Product already in wishlist");
    }

    const wishlist = this.wishlistRepository.create({
      userId,
      productId: dto.productId,
    });

    return this.wishlistRepository.save(wishlist);
  }

  async remove(userId: string, productId: number) {
    const wishlist = await this.wishlistRepository.findOne({
      where: { userId, productId },
    });

    if (!wishlist) {
      throw new NotFoundException("Product not in wishlist");
    }

    await this.wishlistRepository.remove(wishlist);
    return { message: "Removed from wishlist" };
  }

  async check(userId: string, productId: number) {
    const wishlist = await this.wishlistRepository.findOne({
      where: { userId, productId },
    });

    return { inWishlist: !!wishlist };
  }

  async checkMany(userId: string, productIds: number[]) {
    const wishlists = await this.wishlistRepository
      .createQueryBuilder("wishlist")
      .where("wishlist.userId = :userId", { userId })
      .andWhere("wishlist.productId IN (:...productIds)", { productIds })
      .getMany();

    const inWishlistIds = wishlists.map((w) => w.productId);
    
    return productIds.map((id) => ({
      productId: id,
      inWishlist: inWishlistIds.includes(id),
    }));
  }
}
