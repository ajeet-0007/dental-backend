import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '../../database/entities';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
export declare class AuthService {
    private userRepository;
    private jwtService;
    private configService;
    constructor(userRepository: Repository<User>, jwtService: JwtService, configService: ConfigService);
    register(registerDto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: UserRole;
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
            role: UserRole;
            isActive: boolean;
            addresses: import("../../database/entities").Address[];
            orders: import("../../database/entities").Order[];
            cartItems: import("../../database/entities").Cart[];
            reviews: import("../../database/entities").Review[];
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    refreshTokens(refreshTokenDto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string): Promise<void>;
    validateUser(userId: string): Promise<User>;
    private generateTokens;
    private updateRefreshToken;
    private sanitizeUser;
}
