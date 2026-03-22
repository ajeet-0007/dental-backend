"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../../database/entities");
let CartService = class CartService {
    constructor(cartRepository, productRepository, productVariantRepository, inventoryRepository) {
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
        this.productVariantRepository = productVariantRepository;
        this.inventoryRepository = inventoryRepository;
    }
    async addToCart(userId, addToCartDto) {
        const { productId, productVariantId, quantity } = addToCartDto;
        const product = await this.productRepository.findOne({
            where: { id: +productId },
        });
        if (!product) {
            throw new common_1.NotFoundException("Product not found");
        }
        if (!product.isActive) {
            throw new common_1.BadRequestException("Product is not available");
        }
        let price = product.sellingPrice;
        if (productVariantId) {
            const variant = await this.productVariantRepository.findOne({
                where: { id: productVariantId, productId },
            });
            if (!variant) {
                throw new common_1.NotFoundException("Product variant not found");
            }
            price = variant.sellingPrice;
        }
        const inventory = await this.inventoryRepository.findOne({
            where: { productId, productVariantId: productVariantId || undefined },
        });
        if (inventory && inventory.trackInventory) {
            const available = inventory.quantity - inventory.reservedQuantity;
            if (available < quantity) {
                throw new common_1.BadRequestException(`Only ${available} items available in stock`);
            }
        }
        let cartItem = await this.cartRepository.findOne({
            where: {
                userId,
                productId,
                productVariantId: productVariantId || undefined,
            },
        });
        if (cartItem) {
            const newQuantity = cartItem.quantity + quantity;
            if (inventory && inventory.trackInventory) {
                const available = inventory.quantity - inventory.reservedQuantity;
                if (available < newQuantity) {
                    throw new common_1.BadRequestException(`Only ${available} items available in stock`);
                }
            }
            cartItem.quantity = newQuantity;
        }
        else {
            cartItem = this.cartRepository.create({
                userId,
                productId,
                productVariantId,
                quantity,
            });
        }
        return this.cartRepository.save(cartItem);
    }
    async getCart(userId) {
        const cartItems = await this.cartRepository.find({
            where: { userId },
            relations: ["product", "product.category", "productVariant"],
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
    async updateCartItem(userId, cartItemId, updateCartItemDto) {
        const cartItem = await this.cartRepository.findOne({
            where: { id: cartItemId, userId },
            relations: ["product"],
        });
        if (!cartItem) {
            throw new common_1.NotFoundException("Cart item not found");
        }
        const inventory = await this.inventoryRepository.findOne({
            where: { productId: cartItem.productId },
        });
        if (inventory && inventory.trackInventory) {
            const available = inventory.quantity - inventory.reservedQuantity;
            if (available < updateCartItemDto.quantity) {
                throw new common_1.BadRequestException(`Only ${available} items available in stock`);
            }
        }
        cartItem.quantity = updateCartItemDto.quantity;
        return this.cartRepository.save(cartItem);
    }
    async removeFromCart(userId, cartItemId) {
        const cartItem = await this.cartRepository.findOne({
            where: { id: cartItemId, userId },
        });
        if (!cartItem) {
            throw new common_1.NotFoundException("Cart item not found");
        }
        await this.cartRepository.remove(cartItem);
    }
    async clearCart(userId) {
        await this.cartRepository.delete({ userId });
    }
    async getCartTotal(userId) {
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
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Cart)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Product)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.ProductVariant)),
    __param(3, (0, typeorm_1.InjectRepository)(entities_1.Inventory)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CartService);
//# sourceMappingURL=cart.service.js.map