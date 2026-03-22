import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("../../database/entities").UserRole;
            isActive: boolean;
            addresses: import("../../database/entities").Address[];
            orders: import("../../database/entities").Order[];
            cartItems: import("../../database/entities").Cart[];
            reviews: import("../../database/entities").Review[];
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("../../database/entities").UserRole;
            isActive: boolean;
            addresses: import("../../database/entities").Address[];
            orders: import("../../database/entities").Order[];
            cartItems: import("../../database/entities").Cart[];
            reviews: import("../../database/entities").Review[];
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    refresh(refreshTokenDto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(req: any): Promise<{
        message: string;
    }>;
}
