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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { BrandsService } from "./brands.service";
import { CreateBrandDto, UpdateBrandDto } from "./dto/brand.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../database/entities";

@ApiTags("Brands")
@Controller("brands")
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get("admin/all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all brands for admin (including inactive)" })
  async findAllForAdmin() {
    return this.brandsService.findAllForAdmin();
  }

  @Get("slug/:slug")
  @ApiOperation({ summary: "Get brand by slug" })
  async findBySlug(@Param("slug") slug: string) {
    return this.brandsService.findBySlug(slug);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get brand by ID" })
  async findOne(@Param("id") id: string) {
    return this.brandsService.findOne(id);
  }

  @Get()
  @ApiOperation({ summary: "Get all brands" })
  async findAll(@Query("active") active = "true") {
    return this.brandsService.findAll(active === "true");
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create brand (Admin only)" })
  async create(@Body() createBrandDto: CreateBrandDto) {
    return this.brandsService.create(createBrandDto);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update brand (Admin only)" })
  async update(
    @Param("id") id: string,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    return this.brandsService.update(id, updateBrandDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete brand (Admin only)" })
  async remove(@Param("id") id: string) {
    return this.brandsService.remove(id);
  }
}
