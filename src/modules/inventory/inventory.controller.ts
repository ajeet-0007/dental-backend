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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto, UpdateInventoryDto } from './dto/inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all inventory (Admin only)' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.inventoryService.findAll(+page, +limit);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock products (Admin only)' })
  async getLowStock(@Query('threshold') threshold = 10) {
    return this.inventoryService.getLowStockProducts(+threshold);
  }

  @Get('out-of-stock')
  @ApiOperation({ summary: 'Get out of stock products (Admin only)' })
  async getOutOfStock() {
    return this.inventoryService.getOutOfStockProducts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory by ID (Admin only)' })
  async findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get inventory by product ID' })
  async findByProduct(@Param('productId') productId: string) {
    return this.inventoryService.findByProduct(productId);
  }

  @Get('product/:productId/available')
  @ApiOperation({ summary: 'Get available quantity for product' })
  async getAvailableQuantity(@Param('productId') productId: string) {
    const quantity = await this.inventoryService.getAvailableQuantity(productId);
    return { productId, availableQuantity: quantity };
  }

  @Post()
  @ApiOperation({ summary: 'Create inventory (Admin only)' })
  async create(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoryService.create(createInventoryDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update inventory (Admin only)' })
  async update(
    @Param('id') id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(id, updateInventoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete inventory (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}
