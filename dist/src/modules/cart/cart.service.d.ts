import { Repository } from "typeorm";
import { Cart, Product, ProductVariant, Inventory } from "../../database/entities";
import { AddToCartDto, UpdateCartItemDto } from "./dto/cart.dto";
export declare class CartService {
    private cartRepository;
    private productRepository;
    private productVariantRepository;
    private inventoryRepository;
    constructor(cartRepository: Repository<Cart>, productRepository: Repository<Product>, productVariantRepository: Repository<ProductVariant>, inventoryRepository: Repository<Inventory>);
    addToCart(userId: string, addToCartDto: AddToCartDto): Promise<Cart>;
    getCart(userId: string): Promise<any[]>;
    updateCartItem(userId: string, cartItemId: string, updateCartItemDto: UpdateCartItemDto): Promise<Cart>;
    removeFromCart(userId: string, cartItemId: string): Promise<void>;
    clearCart(userId: string): Promise<void>;
    getCartTotal(userId: string): Promise<{
        subtotal: number;
        items: number;
    }>;
}
