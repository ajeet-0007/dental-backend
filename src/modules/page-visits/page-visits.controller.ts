import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  Req,
  Res,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as uuid from 'uuid';

import { PageVisitsService } from './page-visits.service';
import { CreatePageVisitDto } from './dto/create-page-visit.dto';
import { QueryPageVisitsDto } from './dto/query-page-visits.dto';
import { QueryVisitorsDto, PurgePageVisitsDto } from './dto/query-visitors.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';

export const VISITOR_ID_COOKIE = 'dz_vid';
const VISITOR_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const VISITOR_ID_PATTERN = /^[a-zA-Z0-9-]{16,64}$/;

@ApiTags('Page Visits')
@Controller('page-visits')
export class PageVisitsController {
  constructor(private readonly pageVisitsService: PageVisitsService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Record a page visit (public)' })
  async recordVisit(
    @Body() dto: CreatePageVisitDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent?: string,
  ) {
    const cookies = (req as any).cookies || {};
    let visitorId: string = cookies[VISITOR_ID_COOKIE];
    const renew = !visitorId || !VISITOR_ID_PATTERN.test(visitorId);
    if (renew) {
      visitorId = uuid.v4();
      res.cookie(VISITOR_ID_COOKIE, visitorId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: VISITOR_COOKIE_MAX_AGE_MS,
      });
    }

    const user = (req as any).user;
    return this.pageVisitsService.createVisit(dto, {
      visitorId,
      userId: user?.id || null,
      ip: req.ip || req.socket?.remoteAddress || null,
      userAgent: userAgent || null,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Paginated page-visit feed with filters (admin)' })
  async getVisits(@Query() query: QueryPageVisitsDto) {
    return this.pageVisitsService.getVisits(query);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Page-visit statistics (admin)' })
  async getStats() {
    return this.pageVisitsService.getStats();
  }

  @Get('visitors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Grouped visitor list (admin)' })
  async getVisitors(@Query() query: QueryVisitorsDto) {
    return this.pageVisitsService.getVisitors(query);
  }

  @Get('visitor/:visitorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Full journey of one visitor (admin)' })
  async getVisitorJourney(@Param('visitorId') visitorId: string) {
    return this.pageVisitsService.getVisitorJourney(visitorId);
  }

  @Delete('purge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete visits older than a given date (admin)' })
  async purge(@Query() query: PurgePageVisitsDto) {
    return this.pageVisitsService.purge(query);
  }
}
