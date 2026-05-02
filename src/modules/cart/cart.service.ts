import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Cart,
  Product,
  ProductVariant,
  Inventory,
  Order,
  OrderStatus,
} from "../../database/entities";
import { AddToCartDto, UpdateCartItemDto } from "./dto/cart.dto";

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
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<Cart> {
    const { productId, productVariantId, quantity } = addToCartDto;
    const productIdNum = +productId;

    const product = await this.productRepository.findOne({
      where: { id: productIdNum },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (!product.isActive) {
      throw new BadRequestException("Product is not available");
    }

    let price = product.sellingPrice;

    if (productVariantId) {
      const variant = await this.productVariantRepository.findOne({
        where: { id: productVariantId, productId: String(productIdNum) },
      });

      if (!variant) {
        throw new NotFoundException("Product variant not found");
      }

      price = variant.sellingPrice;
    }

    const inventory = await this.inventoryRepository.findOne({
      where: { productId: productIdNum, productVariantId: productVariantId || undefined },
    });

    if (inventory && inventory.trackInventory) {
      const available = inventory.quantity - inventory.reservedQuantity;
      if (available < quantity) {
        throw new BadRequestException(
          `Only ${available} items available in stock`,
        );
      }
    }

    let cartItem = await this.cartRepository.findOne({
      where: {
        userId,
        productId: productIdNum,
        productVariantId: productVariantId || undefined,
      },
    });

    if (cartItem) {
      const newQuantity = cartItem.quantity + quantity;

      if (inventory && inventory.trackInventory) {
        const available = inventory.quantity - inventory.reservedQuantity;
        if (available < newQuantity) {
          throw new BadRequestException(
            `Only ${available} items available in stock`,
          );
        }
      }

      cartItem.quantity = newQuantity;
    } else {
      cartItem = this.cartRepository.create({
        userId,
        productId: productIdNum,
        productVariantId,
        quantity,
      });
    }

    return this.cartRepository.save(cartItem);
  }

  async getCart(userId: string): Promise<any[]> {
    const cartItems = await this.cartRepository.find({
      where: { userId },
      relations: ["product", "product.category", "product.brandEntity", "productVariant"],
    });

    return cartItems
      .filter((item) => item.product !== null)
      .map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        images: item.product.images,
        price: item.product.sellingPrice,
        sellingPrice: item.product.sellingPrice,
        mrp: item.product.mrp,
        unit: item.product.unit,
        category: item.product.category,
        brand: item.product.brand,
        brandId: item.product.brandId,
      },
      variant: item.productVariant
        ? {
            id: item.productVariant.id,
            name: item.productVariant.name,
            sku: item.productVariant.sku,
            color: item.productVariant.color,
            size: item.productVariant.size,
            flavor: item.productVariant.flavor,
            packQuantity: item.productVariant.packQuantity,
            sellingPrice: item.productVariant.sellingPrice,
            mrp: item.productVariant.mrp,
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
      relations: ["product"],
    });

    if (!cartItem) {
      throw new NotFoundException("Cart item not found");
    }

    const inventory = await this.inventoryRepository.findOne({
      where: { productId: cartItem.productId },
    });

    if (inventory && inventory.trackInventory) {
      const available = inventory.quantity - inventory.reservedQuantity;
      if (available < updateCartItemDto.quantity) {
        throw new BadRequestException(
          `Only ${available} items available in stock`,
        );
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
      throw new NotFoundException("Cart item not found");
    }

    await this.cartRepository.remove(cartItem);
  }

  async clearCart(userId: string): Promise<void> {
    await this.cartRepository.delete({ userId });
  }

  async getCartTotal(
    userId: string,
  ): Promise<{ subtotal: number; items: number }> {
    const cartItems = await this.getCart(userId);

    const subtotal = cartItems.reduce((total, item) => {
      const price = item.variant?.sellingPrice || item.product.sellingPrice;
      return total + price * item.quantity;
    }, 0);

    return {
      subtotal,
      items: cartItems.length,
    };
  }

  async reorder(userId: string, orderId: string): Promise<{
    success: boolean;
    addedItems: any[];
    failedItems: any[];
    message: string;
    cart: any[];
  }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
      relations: ["items", "items.product"],
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const addedItems: any[] = [];
    const failedItems: any[] = [];

    for (const item of order.items) {
      try {
        const product = await this.productRepository.findOne({
          where: { id: Number(item.productId) },
        });

        if (!product || !product.isActive) {
          failedItems.push({
            productId: item.productId,
            name: item.productName,
            reason: "Product is no longer available",
          });
          continue;
        }

        const inventory = await this.inventoryRepository.findOne({
          where: { productId: Number(item.productId) },
        });

        let maxQuantity = item.quantity;

        if (inventory && inventory.trackInventory) {
          const available = inventory.quantity - inventory.reservedQuantity;
          if (available <= 0) {
            failedItems.push({
              productId: item.productId,
              name: item.productName,
              reason: "Out of stock",
            });
            continue;
          }
          maxQuantity = Math.min(item.quantity, available);
        }

        const existingCartItem = await this.cartRepository.findOne({
          where: {
            userId,
            productId: Number(item.productId),
            productVariantId: item.productVariantId ? String(item.productVariantId) : undefined,
          },
        });

        if (existingCartItem) {
          const newQuantity = existingCartItem.quantity + maxQuantity;
          if (inventory && inventory.trackInventory) {
            const available = inventory.quantity - inventory.reservedQuantity;
            existingCartItem.quantity = Math.min(newQuantity, available);
          } else {
            existingCartItem.quantity = newQuantity;
          }
          await this.cartRepository.save(existingCartItem);
        } else {
          const newCartItem = this.cartRepository.create({
            userId,
            productId: Number(item.productId),
            productVariantId: item.productVariantId ? String(item.productVariantId) : undefined,
            quantity: maxQuantity,
          });
          await this.cartRepository.save(newCartItem);
        }

        addedItems.push({
          productId: item.productId,
          name: item.productName,
          quantity: maxQuantity,
          wasAdjusted: maxQuantity < item.quantity,
        });
      } catch (error) {
        failedItems.push({
          productId: item.productId,
          name: item.productName,
          reason: "Failed to add to cart",
        });
      }
    }

    const cart = await this.getCart(userId);

    let message = "";
    if (addedItems.length === order.items.length) {
      message = `All ${addedItems.length} items added to your cart`;
    } else if (addedItems.length > 0) {
      message = `${addedItems.length} of ${order.items.length} items added to cart`;
    } else {
      message = "No items could be added to cart";
    }

    return {
      success: addedItems.length > 0,
      addedItems,
      failedItems,
      message,
      cart,
    };
  }
}
