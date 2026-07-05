import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response, Request } from 'express';

import { LogService } from './logger.service';
import { QueryLogsDto } from './dto/query-logs.dto';
import { CreateClientLogDto, BatchClientLogDto } from './dto/create-client-log.dto';
import { ResolveLogDto, BulkResolveLogsDto } from './dto/resolve-log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';
import { LogSource } from './enums/log-source.enum';

@ApiTags('Logs')
@Controller()
export class LoggerController {
  constructor(private readonly logService: LogService) {}

  @Post('logs/client')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Ingest client-side error logs' })
  async ingestClientLog(
    @Body() dto: CreateClientLogDto,
    @Req() req: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = req.ip || req.socket?.remoteAddress;
    this.logService.logFromClient({
      ...dto,
      userAgent: dto.userAgent || userAgent,
      url: dto.url || req.headers['referer'] || req.headers['origin'] as string,
    });
    return { accepted: true };
  }

  @Post('logs/client/batch')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Batch ingest client-side error logs' })
  async ingestClientLogsBatch(@Body() dto: BatchClientLogDto) {
    for (const log of dto.logs) {
      this.logService.logFromClient(log);
    }
    return { accepted: true, count: dto.logs.length };
  }

  @Get('admin/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated logs with filters' })
  async getLogs(@Query() query: QueryLogsDto) {
    return this.logService.getLogs(query);
  }

  @Get('admin/logs/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get log statistics' })
  async getLogStats(@Query() query: QueryLogsDto) {
    return this.logService.getStats(query);
  }

  @Get('admin/logs/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export logs as CSV' })
  async exportLogs(@Query() query: QueryLogsDto, @Res() res: Response) {
    const logs = await this.logService.exportLogs(query);

    const headers = 'ID,Timestamp,Level,Source,Module,Message,Status Code,URL,User ID,Correlation ID,Resolved\n';
    const rows = logs.map((log) => {
      const safeMessage = (log.message || '').replace(/"/g, '""');
      return [
        log.id,
        log.createdAt?.toISOString() || '',
        log.level,
        log.source,
        log.module || '',
        `"${safeMessage}"`,
        log.statusCode || '',
        log.url || '',
        log.userId || '',
        log.correlationId || '',
        log.resolved ? 'Yes' : 'No',
      ].join(',');
    }).join('\n');

    const csv = headers + rows;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="logs-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  }

  @Get('admin/logs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get log detail by ID' })
  async getLogById(@Param('id') id: string) {
    const log = await this.logService.getLogById(id);
    if (!log) {
      return { statusCode: 404, message: 'Log not found' };
    }
    return log;
  }

  @Put('admin/logs/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark log as resolved' })
  async resolveLog(
    @Param('id') id: string,
    @Body() dto: ResolveLogDto,
    @Req() req: Request,
  ) {
    const resolvedBy = (req.user as any)?.id || 'admin';
    const log = await this.logService.resolveLog(id, resolvedBy, dto.note);
    if (!log) {
      return { statusCode: 404, message: 'Log not found' };
    }
    return log;
  }

  @Put('admin/logs/bulk-resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk resolve logs' })
  async bulkResolve(
    @Body() dto: BulkResolveLogsDto,
    @Req() req: Request,
  ) {
    const resolvedBy = (req.user as any)?.id || 'admin';
    const count = await this.logService.bulkResolve(dto.ids, resolvedBy);
    return { resolved: count };
  }

  @Post('admin/logs/purge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purge old resolved logs' })
  async purgeLogs() {
    const count = await this.logService.purgeOldLogs();
    return { purged: count };
  }
}
