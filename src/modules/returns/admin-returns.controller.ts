import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReturnsService } from './returns.service';
import {
  ReviewReturnDto,
  QualityCheckDto,
  ProcessRefundDto,
  ReturnQueryDto,
} from './dto/return.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities';

@ApiTags('Admin - Returns')
@Controller('admin/returns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all returns (admin)' })
  async getAllReturns(@Query() query: ReturnQueryDto) {
    return this.returnsService.getAdminReturns(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return details by ID (admin)' })
  async getReturnById(@Param('id') id: string) {
    return this.returnsService.getReturnById(id);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Review and approve/reject return request' })
  async reviewReturn(
    @Param('id') id: string,
    @Body() dto: ReviewReturnDto,
    @Request() req: any,
  ) {
    if (dto.decision === 'approved') {
      return this.returnsService.approveReturn(id, req.user.id, dto.notes);
    } else {
      return this.returnsService.rejectReturn(id, req.user.id, dto.notes);
    }
  }

  @Post(':id/quality-check')
  @ApiOperation({ summary: 'Perform quality check after receiving item' })
  async qualityCheck(
    @Param('id') id: string,
    @Body() dto: QualityCheckDto,
    @Request() req: any,
  ) {
    return this.returnsService.qualityCheck(id, req.user.id, dto.result, dto.notes);
  }

  @Post(':id/process-refund')
  @ApiOperation({ summary: 'Process refund for approved return' })
  async processRefund(
    @Param('id') id: string,
    @Body() dto: ProcessRefundDto,
    @Request() req: any,
  ) {
    return this.returnsService.processRefund(id, req.user.id);
  }

  @Get(':id/label')
  @ApiOperation({ summary: 'Get return label PDF' })
  async getReturnLabel(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const returnShipment = await this.returnsService.getReturnById(id);

    if (!returnShipment.returnLabelUrl) {
      throw new BadRequestException('Return label not generated yet');
    }

    res.redirect(returnShipment.returnLabelUrl);
  }

  @Post('bulk-action')
  @ApiOperation({ summary: 'Bulk approve/reject returns' })
  async bulkAction(
    @Body() body: { returnIds: string[]; action: 'approved' | 'rejected'; notes?: string },
    @Request() req: any,
  ) {
    const results = [];

    for (const returnId of body.returnIds) {
      try {
        if (body.action === 'approved') {
          const result = await this.returnsService.approveReturn(returnId, req.user.id, body.notes);
          results.push({ returnId, status: 'success', result: result.status });
        } else {
          const result = await this.returnsService.rejectReturn(returnId, req.user.id, body.notes);
          results.push({ returnId, status: 'success', result: result.status });
        }
      } catch (error) {
        results.push({ returnId, status: 'error', error: error.message });
      }
    }

    return { results };
  }
}