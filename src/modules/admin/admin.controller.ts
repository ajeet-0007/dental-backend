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
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../database/entities/user.entity";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get("orders")
  async getOrders(
    @Query("page") page = 1,
    @Query("limit") limit = 20,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.adminService.getAllOrders(+page, +limit, status, search);
  }

  @Put("orders/:id/status")
  async updateOrderStatus(
    @Param("id") id: string,
    @Body("status") status: string,
  ) {
    return this.adminService.updateOrderStatus(id, status);
  }

  @Get("users")
  async getUsers(@Query("page") page = 1, @Query("limit") limit = 20) {
    return this.adminService.getAllUsers(+page, +limit);
  }

  @Put("users/:id/status")
  async updateUserStatus(
    @Param("id") id: string,
    @Body("isActive") isActive: boolean,
  ) {
    return this.adminService.updateUserStatus(id, isActive);
  }

  @Get("products")
  async getProducts(
    @Query("page") page = 1,
    @Query("limit") limit = 20,
    @Query("search") search?: string,
    @Query("categoryId") categoryId?: number,
  ) {
    return this.adminService.getAllProducts(
      +page,
      +limit,
      search,
      categoryId ? +categoryId : undefined,
    );
  }

  @Post("products")
  async createProduct(@Body() productData: any) {
    return this.adminService.createProduct(productData);
  }

  @Put("products/:id")
  async updateProduct(@Param("id") id: string, @Body() productData: any) {
    return this.adminService.updateProduct(+id, productData);
  }

  @Delete("products/:id")
  async deleteProduct(@Param("id") id: string) {
    return this.adminService.deleteProduct(+id);
  }

  @Get("inventory")
  async getInventory(@Query("productId") productId?: string, @Query("search") search?: string) {
    return this.adminService.getInventory(productId ? +productId : undefined, search);
  }

  @Get("categories")
  async getCategories() {
    return this.adminService.getAllCategories();
  }

  @Post("categories")
  async createCategory(
    @Body() categoryData: { name: string; slug?: string; description?: string },
  ) {
    return this.adminService.createCategory(categoryData);
  }

  @Put("inventory/:productId")
  async updateInventory(
    @Param("productId") productId: string,
    @Body("quantity") quantity: number,
  ) {
    return this.adminService.updateInventory(productId, quantity);
  }

  @Get("payments")
  async getPayments(
    @Query("page") page = 1,
    @Query("limit") limit = 20,
    @Query("status") status?: string,
  ) {
    return this.adminService.getAllPayments(+page, +limit, status);
  }
}
