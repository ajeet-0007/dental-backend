import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AdviceRequest } from "../../database/entities";
import { BrevoService } from "../brevo/brevo.service";
import {
  CreateAdviceRequestDto,
  UpdateAdviceRequestStatusDto,
} from "./dto/advice-request.dto";

@Injectable()
export class AdviceRequestsService {
  constructor(
    @InjectRepository(AdviceRequest)
    private adviceRequestRepository: Repository<AdviceRequest>,
    private readonly brevoService: BrevoService,
  ) {}

  async create(dto: CreateAdviceRequestDto): Promise<AdviceRequest> {
    const request = this.adviceRequestRepository.create(dto);
    const saved = await this.adviceRequestRepository.save(request);
    await this.brevoService.sendAdviceRequestEmail(saved);
    return saved;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{
    data: AdviceRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 10));
    const { status, search } = params;

    const query = this.adviceRequestRepository
      .createQueryBuilder("advice")
      .orderBy("advice.createdAt", "DESC");

    if (status) {
      query.andWhere("advice.status = :status", { status });
    }

    if (search) {
      query.andWhere(
        "(advice.doctorName LIKE :search OR advice.equipmentName LIKE :search OR advice.equipmentBrand LIKE :search OR advice.email LIKE :search)",
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<AdviceRequest> {
    const request = await this.adviceRequestRepository.findOne({
      where: { id: parseInt(id, 10) },
    });

    if (!request) {
      throw new NotFoundException("Advice request not found");
    }

    return request;
  }

  async updateStatus(
    id: string,
    dto: UpdateAdviceRequestStatusDto,
  ): Promise<AdviceRequest> {
    const request = await this.findOne(id);
    request.status = dto.status;
    if (dto.adminNotes !== undefined) {
      request.adminNotes = dto.adminNotes;
    }
    return this.adviceRequestRepository.save(request);
  }

  async getStats(): Promise<Record<string, number>> {
    const grouped = await this.adviceRequestRepository
      .createQueryBuilder("advice")
      .select("advice.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("advice.status")
      .getRawMany();

    const stats: Record<string, number> = { total: 0, pending: 0, reviewed: 0, resolved: 0 };
    for (const row of grouped) {
      const count = parseInt(String(row.count), 10) || 0;
      stats[row.status] = count;
      stats.total += count;
    }
    return stats;
  }
}