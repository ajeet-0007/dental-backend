import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Cart } from '../../database/entities';

const STUDENT_SECTION_SLUG = 'student-section';

@Injectable()
export class VerifiedOnlyGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const dbUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (dbUser?.isProfessionalVerified) {
      return true;
    }

    const cartItems = await this.cartRepository.find({
      where: { userId: user.id },
      relations: ['product', 'product.category'],
    });

    const hasNonStudentProducts = cartItems.some(
      (item) => item.product?.category?.slug !== STUDENT_SECTION_SLUG,
    );

    if (hasNonStudentProducts) {
      throw new ForbiddenException(
        'Professional verification required to place orders. Remove non-student items from your cart or verify your dental credentials first.',
      );
    }

    return true;
  }
}
