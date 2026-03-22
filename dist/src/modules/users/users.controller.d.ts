import { UsersService } from './users.service';
import { UpdateUserDto, ChangePasswordDto } from './dto/user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(req: any): Promise<Partial<import("../../database/entities").User>>;
    updateProfile(req: any, updateUserDto: UpdateUserDto): Promise<import("../../database/entities").User>;
    changePassword(req: any, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    getAllUsers(page?: number, limit?: number): Promise<{
        users: import("../../database/entities").User[];
        total: number;
    }>;
    getUserById(id: string): Promise<import("../../database/entities").User>;
    toggleUserStatus(id: string): Promise<import("../../database/entities").User>;
}
