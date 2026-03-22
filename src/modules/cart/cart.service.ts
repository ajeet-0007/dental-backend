import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, Product, ProductVariant, Inventory } from '../../database/entities';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
  ) {}

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<Cart> {
    const { productId, productVariantId, quantity } = addToCartDto;

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is not available');
    }

    let price = product.sellingPrice;

    if (productVariantId) {
      const variant = await this.productVariantRepository.findOne({
        where: { id: productVariantId, productId },
      });

      if (!variant) {
        throw new NotFoundException('Product variant not found');
      }

      price = variant.sellingPrice;
    }

    const inventory = await this.inventoryRepository.findOne({
      where: { productId, productVariantId: productVariantId || undefined },
    });

    if (inventory && inventory.trackInventory) {
      const available = inventory.quantity - inventory.reservedQuantity;
      if (available < quantity) {
        throw new BadRequestException(`Only ${available} items available in stock`);
      }
    }

    let cartItem = await this.cartRepository.findOne({
      where: { userId, productId, productVariantId: productVariantId || undefined },
    });

    if (cartItem) {
      const newQuantity = cartItem.quantity + quantity;
      
      if (inventory && inventory.trackInventory) {
        const available = inventory.quantity - inventory.reservedQuantity;
        if (available < newQuantity) {
          throw new BadRequestException(`Only ${available} items available in stock`);
        }
      }

      cartItem.quantity = newQuantity;
    } else {
      cartItem = this.cartRepository.create({
        userId,
        productId,
        productVariantId,
        quantity,
      });
    }

    return this.cartRepository.save(cartItem);
  }

  async getCart(userId: string): Promise<any[]> {
    const cartItems = await this.cartRepository.find({
      where: { userId },
      relations: ['product', 'product.category', 'productVariant'],
    });

    return cartItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        images: item.product.images,
        price: item.product.price,
        sellingPrice: item.product.sellingPrice,
        mrp: item.product.mrp,
        unit: item.product.unit,
        category: item.product.category,
      },
      variant: item.productVariant
        ? {
            id: item.productVariant.id,
            name: item.productVariant.name,
            price: item.productVariant.sellingPrice,
            image: item.productVariant.image,
          }
        : null,
    }));
  }

  async updateCartItem(
    userId: string,
    cartItemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<Cart> {
    const cartItem = await this.cartRepository.findOne({
      where: { id: cartItemId, userId },
      relations: ['product'],
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    const inventory = await this.inventoryRepository.findOne({
      where: { productId: cartItem.productId },
    });

    if (inventory && inventory.trackInventory) {
      const available = inventory.quantity - inventory.reservedQuantity;
      if (available < updateCartItemDto.quantity) {
        throw new BadRequestException(`Only ${available} items available in stock`);
      }
    }

    cartItem.quantity = updateCartItemDto.quantity;
    return this.cartRepository.save(cartItem);
  }

  async removeFromCart(userId: string, cartItemId: string): Promise<void> {
    const cartItem = await this.cartRepository.findOne({
      where: { id: cartItemId, userId },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartRepository.remove(cartItem);
  }

  async clearCart(userId: string): Promise<void> {
    await this.cartRepository.delete({ userId });
  }

  async getCartTotal(userId: string): Promise<{ subtotal: number; items: number }> {
    const cartItems = await this.getCart(userId);

    const subtotal = cartItems.reduce((total, item) => {
      const price = item.variant?.price || item.product.sellingPrice;
      return total + price * item.quantity;
    }, 0);

    return {
      subtotal,
      items: cartItems.length,
    };
  }
}
