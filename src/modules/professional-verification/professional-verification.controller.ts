import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfessionalVerificationService } from './professional-verification.service';
import { SubmitCredentialsDto } from './dto/submit-credentials.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities';

@ApiTags('Professional Verification')
@Controller('profile/verification')
export class ProfessionalVerificationController {
  constructor(private readonly verificationService: ProfessionalVerificationService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit dental credentials for verification' })
  @HttpCode(HttpStatus.OK)
  async submitCredentials(
    @Request() req: any,
    @Body() dto: SubmitCredentialsDto,
  ) {
    return this.verificationService.submitCredentials(req.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current verification status' })
  async getStatus(@Request() req: any) {
    return this.verificationService.getVerificationStatus(req.user.id);
  }
}

@ApiTags('Admin - Verification')
@Controller('admin/verification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminVerificationController {
  constructor(private readonly verificationService: ProfessionalVerificationService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Get pending verification requests' })
  async getPending(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.verificationService.getPendingVerifications(+page, +limit);
  }

  @Post('verify/:userId')
  @ApiOperation({ summary: 'Re-verify a user via DCI' })
  async verifyUser(@Param('userId') userId: string) {
    return this.verificationService.reVerify(userId);
  }

  @Post('approve/:userId')
  @ApiOperation({ summary: 'Manually approve a user' })
  async approveUser(@Param('userId') userId: string) {
    return this.verificationService.approveManually(userId);
  }

  @Post('reject/:userId')
  @ApiOperation({ summary: 'Manually reject a user' })
  async rejectUser(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.verificationService.rejectManually(userId, reason);
  }
}
