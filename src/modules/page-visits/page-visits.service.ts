import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PageVisit, DeviceType } from '../../database/entities/page-visit.entity';
import { CreatePageVisitDto } from './dto/create-page-visit.dto';
import { QueryPageVisitsDto } from './dto/query-page-visits.dto';
import { QueryVisitorsDto, PurgePageVisitsDto } from './dto/query-visitors.dto';

function detectDeviceType(userAgent?: string | null): DeviceType {
  if (!userAgent) return DeviceType.DESKTOP;
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return DeviceType.TABLET;
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(ua)) return DeviceType.MOBILE;
  return DeviceType.DESKTOP;
}

@Injectable()
export class PageVisitsService {
  constructor(
    @InjectRepository(PageVisit)
    private readonly repo: Repository<PageVisit>,
  ) {}

  async createVisit(
    dto: CreatePageVisitDto,
    meta: { visitorId: string; userId: string | null; ip: string | null; userAgent: string | null },
  ): Promise<{ ok: true }> {
    await this.repo.insert({
      visitorId: meta.visitorId,
      userId: meta.userId,
      path: dto.path.slice(0, 500),
      pageTitle: dto.pageTitle?.slice(0, 255) || null,
      referrer: dto.referrer?.slice(0, 500) || null,
      ip: meta.ip?.slice(0, 45) || null,
      userAgent: meta.userAgent?.slice(0, 500) || null,
      deviceType: detectDeviceType(meta.userAgent),
    });
    return { ok: true };
  }

  private applyVisitFilters(qb: SelectQueryBuilder<PageVisit>, query: QueryPageVisitsDto): void {
    if (query.search) {
      qb.andWhere('(pv.path LIKE :s OR pv.pageTitle LIKE :s)', { s: `%${query.search}%` });
    }
    if (query.visitorId) {
      qb.andWhere('pv.visitorId = :visitorId', { visitorId: query.visitorId });
    }
    if (query.userId) {
      qb.andWhere('pv.userId = :userId', { userId: query.userId });
    }
    if (query.device) {
      qb.andWhere('pv.deviceType = :device', { device: query.device });
    }
    if (query.startDate) {
      qb.andWhere('pv.createdAt >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('pv.createdAt <= :endDate', { endDate: query.endDate });
    }
  }

  async getVisits(query: QueryPageVisitsDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';

    const qb = this.repo
      .createQueryBuilder('pv')
      .leftJoin('pv.user', 'u')
      .select([
        'pv.id',
        'pv.visitorId',
        'pv.userId',
        'pv.path',
        'pv.pageTitle',
        'pv.referrer',
        'pv.ip',
        'pv.userAgent',
        'pv.deviceType',
        'pv.createdAt',
        'u.email',
        'u.firstName',
        'u.lastName',
      ]);

    this.applyVisitFilters(qb, query);

    const total = await qb.getCount();
    const data = await qb
      .orderBy(`pv.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStats() {
    const day = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString();
    };

    const countSince = (date: string) =>
      this.repo.createQueryBuilder('pv').where('pv.createdAt >= :d', { d: date }).getCount();

    const uniqueSince = async (date: string) => {
      const rows = await this.repo
        .createQueryBuilder('pv')
        .select('COUNT(DISTINCT pv.visitorId)', 'c')
        .where('pv.createdAt >= :d', { d: date })
        .getRawOne();
      return Number(rows?.c || 0);
    };

    const topPages = await this.repo
      .createQueryBuilder('pv')
      .select('pv.path', 'path')
      .addSelect('COUNT(*)', 'visits')
      .addSelect('COUNT(DISTINCT pv.visitorId)', 'visitors')
      .where('pv.createdAt >= :d', { d: day(7) })
      .groupBy('pv.path')
      .orderBy('visits', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      visitsToday: await countSince(day(0)),
      visits7d: await countSince(day(7)),
      visits30d: await countSince(day(30)),
      uniqueVisitors7d: await uniqueSince(day(7)),
      uniqueVisitors30d: await uniqueSince(day(30)),
      topPages,
    };
  }

  async getVisitors(query: QueryVisitorsDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;

    const qb = this.repo
      .createQueryBuilder('pv')
      .select('pv.visitorId', 'visitorId')
      .addSelect('COUNT(*)', 'visitCount')
      .addSelect('MAX(pv.createdAt)', 'lastSeen')
      .addSelect('MIN(pv.createdAt)', 'firstSeen')
      .addSelect('MAX(pv.userId)', 'userId')
      .addSelect('MAX(u.email)', 'email')
      .addSelect('MAX(u.firstName)', 'firstName')
      .addSelect('MAX(u.lastName)', 'lastName')
      .leftJoin('pv.user', 'u')
      .groupBy('pv.visitorId');

    if (query.search) {
      qb.andWhere('(pv.visitorId LIKE :s OR u.email LIKE :s)', { s: `%${query.search}%` });
    }

    const totalRows = await qb.getRawMany();
    const total = totalRows.length;
    const data = totalRows
      .slice((page - 1) * limit, page * limit)
      .map((r: any) => ({
        visitorId: r.visitorId,
        visitCount: Number(r.visitCount),
        lastSeen: r.lastSeen,
        firstSeen: r.firstSeen,
        userId: r.userId || null,
        email: r.email || null,
        firstName: r.firstName || null,
        lastName: r.lastName || null,
      }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getVisitorJourney(visitorId: string) {
    const visits = await this.repo.find({
      where: { visitorId },
      order: { createdAt: 'ASC' },
      relations: { user: true },
      select: {
        id: true,
        visitorId: true,
        userId: true,
        path: true,
        pageTitle: true,
        referrer: true,
        deviceType: true,
        createdAt: true,
        user: { id: true, email: true, firstName: true, lastName: true },
      },
    });

    if (!visits.length) {
      throw new NotFoundException(`No visits found for visitor ${visitorId}`);
    }

    return {
      visitorId,
      visitCount: visits.length,
      firstSeen: visits[0].createdAt,
      lastSeen: visits[visits.length - 1].createdAt,
      user: visits.find((v) => v.user)?.user || null,
      visits,
    };
  }

  async purge(query: PurgePageVisitsDto) {
    if (!query.olderThan) {
      throw new BadRequestException('olderThan query param is required');
    }
    const result = await this.repo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :d', { d: query.olderThan })
      .execute();
    return { deleted: result.affected || 0 };
  }
}
