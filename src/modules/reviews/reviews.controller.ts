import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewQueryDto,
} from './dto/review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('user/can-review/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user can review a product' })
  async canUserReview(
    @Request() req: any,
    @Param('productId') productId: string,
  ) {
    return this.reviewsService.canUserReview(req.user.id, productId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review (only for purchased products)' })
  async create(
    @Request() req: any,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(req.user.id, createReviewDto);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get reviews for a product' })
  async findByProduct(
    @Param('productId') productId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.findByProduct(productId, query);
  }

  @Get('product/:productId/stats')
  @ApiOperation({ summary: 'Get rating stats for a product' })
  async getStats(@Param('productId') productId: string) {
    return this.reviewsService.getStats(productId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single review by ID' })
  async findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own review' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, req.user.id, updateReviewDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own review' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.reviewsService.remove(id, req.user.id);
  }

  @Post(':id/helpful')
  @ApiOperation({ summary: 'Mark review as helpful' })
  async markHelpful(@Param('id') id: string) {
    return this.reviewsService.markHelpful(id);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all reviews (Admin only)' })
  async findAllForAdmin(@Query() query: ReviewQueryDto) {
    return this.reviewsService.findAllForAdmin(query);
  }

  @Put('admin/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle review active status (Admin only)' })
  async toggleActive(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.reviewsService.toggleActive(id, body.isActive);
  }
}