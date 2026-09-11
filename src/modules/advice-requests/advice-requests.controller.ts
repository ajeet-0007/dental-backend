import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { AdviceRequestsService } from "./advice-requests.service";
import {
  CreateAdviceRequestDto,
  UpdateAdviceRequestStatusDto,
} from "./dto/advice-request.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../database/entities";

@ApiTags("Advice Requests")
@Controller("advice-requests")
export class AdviceRequestsController {
  constructor(private readonly adviceRequestsService: AdviceRequestsService) {}

  @Post()
  @ApiOperation({
    summary: "Submit a free equipment advice request (public)",
  })
  async create(@Body() createAdviceRequestDto: CreateAdviceRequestDto) {
    const saved = await this.adviceRequestsService.create(createAdviceRequestDto);
    return { message: "Advice request submitted successfully", id: saved.id };
  }

  @Get("admin/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get advice request status stats (Admin only)" })
  async getStats() {
    return this.adviceRequestsService.getStats();
  }

  @Get("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all advice requests with pagination (Admin only)" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "search", required: false })
  async findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.adviceRequestsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      search,
    });
  }

  @Get("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a single advice request (Admin only)" })
  async findOne(@Param("id") id: string) {
    return this.adviceRequestsService.findOne(id);
  }

  @Patch("admin/:id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update advice request status (Admin only)" })
  async updateStatus(
    @Param("id") id: string,
    @Body() updateDto: UpdateAdviceRequestStatusDto,
  ) {
    return this.adviceRequestsService.updateStatus(id, updateDto);
  }
}