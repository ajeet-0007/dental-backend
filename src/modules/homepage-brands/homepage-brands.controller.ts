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
import { HomepageBrandsService } from "./homepage-brands.service";
import { CreateHomepageBrandDto, UpdateHomepageBrandDto } from "./dto/homepage-brand.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../database/entities";

@ApiTags("Homepage Brands")
@Controller("homepage-brands")
export class HomepageBrandsController {
  constructor(private readonly homepageBrandsService: HomepageBrandsService) {}

  @Get()
  @ApiOperation({ summary: "Get homepage brand sections with their products" })
  async findAllForHome() {
    return this.homepageBrandsService.findAllForHome();
  }

  @Get("admin/all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all homepage brand sections for admin" })
  async findAllForAdmin() {
    return this.homepageBrandsService.findAllForAdmin();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create homepage brand section (Admin only)" })
  async create(@Body() createHomepageBrandDto: CreateHomepageBrandDto) {
    return this.homepageBrandsService.create(createHomepageBrandDto);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update homepage brand section (Admin only)" })
  async update(
    @Param("id") id: string,
    @Body() updateHomepageBrandDto: UpdateHomepageBrandDto,
  ) {
    return this.homepageBrandsService.update(id, updateHomepageBrandDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete homepage brand section (Admin only)" })
  async remove(@Param("id") id: string) {
    return this.homepageBrandsService.remove(id);
  }
}
