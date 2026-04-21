import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import {
  InitiateReturnDto,
  CancelReturnDto,
  ReschedulePickupDto,
  UploadImagesDto,
  ReturnQueryDto,
  EligibilityResponseDto,
} from './dto/return.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Returns')
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get('eligibility/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if an order is eligible for return' })
  async checkEligibility(
    @Param('orderId') orderId: string,
    @Request() req: any,
  ): Promise<EligibilityResponseDto> {
    return this.returnsService.checkEligibility(orderId, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all returns for current user' })
  async getUserReturns(
    @Query() query: ReturnQueryDto,
    @Request() req: any,
  ) {
    return this.returnsService.getUserReturns(req.user.id, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get return details by ID' })
  async getReturnById(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.returnsService.getReturnById(id, req.user.id);
  }

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a return request' })
  async initiateReturn(
    @Body() dto: InitiateReturnDto,
    @Request() req: any,
  ) {
    return this.returnsService.initiateReturn(req.user.id, dto);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a return request' })
  async cancelReturn(
    @Param('id') id: string,
    @Body() dto: CancelReturnDto,
    @Request() req: any,
  ) {
    return this.returnsService.cancelReturn(id, req.user.id, dto.reason);
  }

  @Post(':id/reschedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reschedule pickup for return' })
  async reschedulePickup(
    @Param('id') id: string,
    @Body() dto: ReschedulePickupDto,
    @Request() req: any,
  ) {
    return this.returnsService.reschedulePickup(
      id,
      req.user.id,
      dto.pickupDate,
      dto.pickupSlot,
    );
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload condition images for return items' })
  async uploadImages(
    @Param('id') id: string,
    @Body() dto: UploadImagesDto,
    @Request() req: any,
  ) {
    return this.returnsService.uploadConditionImages(id, req.user.id, dto.images);
  }
}
