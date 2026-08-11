import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { HomepageCategoriesService } from "./homepage-categories.service";
import { CreateHomepageCategoryDto, UpdateHomepageCategoryDto } from "./dto/homepage-category.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../database/entities";

@ApiTags("Homepage Categories")
@Controller("homepage-categories")
export class HomepageCategoriesController {
  constructor(private readonly homepageCategoriesService: HomepageCategoriesService) {}

  @Get()
  @ApiOperation({ summary: "Get homepage category sections with their products" })
  async findAllForHome() {
    return this.homepageCategoriesService.findAllForHome();
  }

  @Get("admin/all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all homepage category sections for admin" })
  async findAllForAdmin() {
    return this.homepageCategoriesService.findAllForAdmin();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create homepage category section (Admin only)" })
  async create(@Body() createHomepageCategoryDto: CreateHomepageCategoryDto) {
    return this.homepageCategoriesService.create(createHomepageCategoryDto);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update homepage category section (Admin only)" })
  async update(
    @Param("id") id: string,
    @Body() updateHomepageCategoryDto: UpdateHomepageCategoryDto,
  ) {
    return this.homepageCategoriesService.update(id, updateHomepageCategoryDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete homepage category section (Admin only)" })
  async remove(@Param("id") id: string) {
    return this.homepageCategoriesService.remove(id);
  }
}
