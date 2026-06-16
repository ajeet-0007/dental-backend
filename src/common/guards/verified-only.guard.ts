import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities';

@Injectable()
export class VerifiedOnlyGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const dbUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!dbUser?.isProfessionalVerified) {
      throw new ForbiddenException(
        'Professional verification required to place orders. Please verify your dental credentials first.',
      );
    }
    return true;
  }
}
