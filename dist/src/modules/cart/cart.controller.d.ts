import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
export declare class CartController {
    private readonly cartService;
    constructor(cartService: CartService);
    getCart(req: any): Promise<any[]>;
    getCartTotal(req: any): Promise<{
        subtotal: number;
        items: number;
    }>;
    addToCart(req: any, addToCartDto: AddToCartDto): Promise<import("../../database/entities").Cart>;
    updateCartItem(req: any, id: string, updateCartItemDto: UpdateCartItemDto): Promise<import("../../database/entities").Cart>;
    removeFromCart(req: any, id: string): Promise<void>;
    clearCart(req: any): Promise<void>;
}
