import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../database/entities/review.entity';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewQueryDto,
  ReviewStatsDto,
} from './dto/review.dto';
import { ImageKitService } from '../imagekit/imagekit.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    private imageKitService: ImageKitService,
  ) {}

  async canUserReview(userId: string, productId: string | number): Promise<{ canReview: boolean; existingReview?: boolean }> {
    const existingReview = await this.reviewRepository.findOne({
      where: {
        userId,
        productId: Number(productId),
      },
    });

    return {
      canReview: true,
      existingReview: !!existingReview,
    };
  }

  async create(userId: string, createReviewDto: CreateReviewDto): Promise<Review> {
    const { existingReview } = await this.canUserReview(
      userId,
      createReviewDto.productId,
    );

    if (existingReview) {
      throw new BadRequestException(
        'You have already reviewed this product.',
      );
    }

    const review = this.reviewRepository.create({
      userId,
      productId: createReviewDto.productId,
      orderId: createReviewDto.orderId,
      rating: createReviewDto.rating,
      title: createReviewDto.title,
      comment: createReviewDto.comment,
      images: createReviewDto.images || [],
      isVerified: true,
      isActive: true,
      helpfulCount: 0,
    });

    return this.reviewRepository.save(review);
  }

  async findByProduct(productId: string | number, query: ReviewQueryDto) {
    const { page = 1, limit = 10, sort = 'newest' } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .where('review.productId = :productId', { productId: Number(productId) })
      .andWhere('review.isActive = :isActive', { isActive: true });

    switch (sort) {
      case 'oldest':
        queryBuilder.orderBy('review.createdAt', 'ASC');
        break;
      case 'highest':
        queryBuilder.orderBy('review.rating', 'DESC');
        break;
      case 'lowest':
        queryBuilder.orderBy('review.rating', 'ASC');
        break;
      case 'most_helpful':
        queryBuilder.orderBy('review.helpfulCount', 'DESC');
        break;
      case 'newest':
      default:
        queryBuilder.orderBy('review.createdAt', 'DESC');
        break;
    }

    const [reviews, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const reviewsWithUser = reviews.map((review) => ({
      ...review,
      user: {
        id: review.user?.id,
        firstName: review.user?.firstName,
        lastName: review.user?.lastName,
        avatar: review.user?.avatar,
      },
    }));

    return {
      reviews: reviewsWithUser,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats(productId: string | number): Promise<ReviewStatsDto> {
    const reviews = await this.reviewRepository.find({
      where: {
        productId: Number(productId),
        isActive: true,
      },
    });

    const totalReviews = reviews.length;

    if (totalReviews === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        verifiedCount: 0,
      };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = sum / totalReviews;

    const ratingBreakdown = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    const verifiedCount = reviews.filter((r) => r.isVerified).length;

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingBreakdown,
      verifiedCount,
    };
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['user', 'product'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async update(
    id: string,
    userId: string,
    updateReviewDto: UpdateReviewDto,
  ): Promise<Review> {
    const review = await this.findOne(id);

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const previousImages = review.images || [];

    Object.assign(review, updateReviewDto);
    const savedReview = await this.reviewRepository.save(review);

    const removedImages = previousImages.filter(
      (img) => !(savedReview.images || []).includes(img),
    );
    await this.imageKitService.deleteFiles(removedImages);

    return savedReview;
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.findOne(id);

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    const imageUrls = review.images || [];
    await this.reviewRepository.remove(review);
    await this.imageKitService.deleteFiles(imageUrls);
  }

  async markHelpful(id: string): Promise<Review> {
    const review = await this.findOne(id);
    review.helpfulCount += 1;
    return this.reviewRepository.save(review);
  }

  async findAllForAdmin(query: ReviewQueryDto & { productId?: string; userId?: string }) {
    const { page = 1, limit = 10, sort = 'newest', productId, userId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.product', 'product');

    if (productId) {
      queryBuilder.andWhere('review.productId = :productId', { productId });
    }

    if (userId) {
      queryBuilder.andWhere('review.userId = :userId', { userId });
    }

    switch (sort) {
      case 'oldest':
        queryBuilder.orderBy('review.createdAt', 'ASC');
        break;
      case 'highest':
        queryBuilder.orderBy('review.rating', 'DESC');
        break;
      case 'lowest':
        queryBuilder.orderBy('review.rating', 'ASC');
        break;
      default:
        queryBuilder.orderBy('review.createdAt', 'DESC');
    }

    const [reviews, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async toggleActive(id: string, isActive: boolean): Promise<Review> {
    const review = await this.findOne(id);
    review.isActive = isActive;
    return this.reviewRepository.save(review);
  }
}