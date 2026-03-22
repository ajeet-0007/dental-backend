import { Repository } from 'typeorm';
import { User } from '../../database/entities';
import { UpdateUserDto, ChangePasswordDto } from './dto/user.dto';
export declare class UsersService {
    private userRepository;
    constructor(userRepository: Repository<User>);
    findById(id: string): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<User>;
    changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    getProfile(userId: string): Promise<Partial<User>>;
    getAllUsers(page?: number, limit?: number): Promise<{
        users: User[];
        total: number;
    }>;
    toggleUserStatus(userId: string): Promise<User>;
}
