export declare class RegisterDto {
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    isAdmin?: boolean;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
