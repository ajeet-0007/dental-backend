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
import { ShippingService } from './shipping.service';
import {
  CreateShippingMethodDto,
  UpdateShippingMethodDto,
  UpdateShipmentDto,
} from './dto/shipping.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities';

@ApiTags('Shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('methods')
  @ApiOperation({ summary: 'Get all shipping methods' })
  async getAllShippingMethods() {
    return this.shippingService.getAllShippingMethods();
  }

  @Get('calculate')
  @ApiOperation({ summary: 'Calculate shipping cost' })
  async calculateShippingCost(
    @Query('subtotal') subtotal: number,
    @Query('weight') weight = 0,
  ) {
    return this.shippingService.calculateShippingCost(+subtotal, +weight);
  }

  @Get('methods/:id')
  @ApiOperation({ summary: 'Get shipping method by ID' })
  async getShippingMethodById(@Param('id') id: string) {
    return this.shippingService.getShippingMethodById(id);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get shipment by order ID' })
  async getShipmentByOrder(@Param('orderId') orderId: string) {
    return this.shippingService.getShipmentByOrder(orderId);
  }

  @Post('methods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create shipping method (Admin only)' })
  async createShippingMethod(
    @Body() createShippingMethodDto: CreateShippingMethodDto,
  ) {
    return this.shippingService.createShippingMethod(createShippingMethodDto);
  }

  @Put('methods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update shipping method (Admin only)' })
  async updateShippingMethod(
    @Param('id') id: string,
    @Body() updateShippingMethodDto: UpdateShippingMethodDto,
  ) {
    return this.shippingService.updateShippingMethod(id, updateShippingMethodDto);
  }

  @Delete('methods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete shipping method (Admin only)' })
  async deleteShippingMethod(@Param('id') id: string) {
    return this.shippingService.deleteShippingMethod(id);
  }

  @Put('shipments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update shipment (Admin only)' })
  async updateShipment(
    @Param('id') id: string,
    @Body() updateShipmentDto: UpdateShipmentDto,
  ) {
    return this.shippingService.updateShipment(id, updateShipmentDto);
  }
}
