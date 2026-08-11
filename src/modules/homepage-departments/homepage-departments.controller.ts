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
import { HomepageDepartmentsService } from "./homepage-departments.service";
import { CreateHomepageDepartmentDto, UpdateHomepageDepartmentDto } from "./dto/homepage-department.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../database/entities";

@ApiTags("Homepage Departments")
@Controller("homepage-departments")
export class HomepageDepartmentsController {
  constructor(private readonly homepageDepartmentsService: HomepageDepartmentsService) {}

  @Get()
  @ApiOperation({ summary: "Get homepage department sections with their products" })
  async findAllForHome() {
    return this.homepageDepartmentsService.findAllForHome();
  }

  @Get("admin/all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all homepage department sections for admin" })
  async findAllForAdmin() {
    return this.homepageDepartmentsService.findAllForAdmin();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create homepage department section (Admin only)" })
  async create(@Body() createHomepageDepartmentDto: CreateHomepageDepartmentDto) {
    return this.homepageDepartmentsService.create(createHomepageDepartmentDto);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update homepage department section (Admin only)" })
  async update(
    @Param("id") id: string,
    @Body() updateHomepageDepartmentDto: UpdateHomepageDepartmentDto,
  ) {
    return this.homepageDepartmentsService.update(id, updateHomepageDepartmentDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete homepage department section (Admin only)" })
  async remove(@Param("id") id: string) {
    return this.homepageDepartmentsService.remove(id);
  }
}
