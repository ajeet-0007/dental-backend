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
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ShippingService } from './shipping.service';
import { ShippingRocketService } from './shipping-rocket.service';
import {
  CreateShippingMethodDto,
  UpdateShippingMethodDto,
  UpdateShipmentDto,
} from './dto/shipping.dto';
import { CalculateRateDto } from './dto/calculate-rate.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities';

@ApiTags('Shipping')
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly shippingRocketService: ShippingRocketService,
  ) {}

  // ===== ShippingRocket Endpoints =====

  @Post('rates')
  @ApiOperation({ summary: 'Calculate shipping rates from ShippingRocket' })
  async calculateRates(@Body() rateDto: CalculateRateDto) {
    return this.shippingService.calculateShippingRates(rateDto);
  }

  @Post('shipments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create shipment via ShippingRocket' })
  async createShipment(@Body() shipmentDto: CreateShipmentDto) {
    return this.shippingService.createShippingRocketShipment(shipmentDto);
  }

  @Get('shipments/track/:trackingNumber')
  @ApiOperation({ summary: 'Get shipment tracking information' })
  async getTracking(@Param('trackingNumber') trackingNumber: string) {
    return this.shippingService.getShipmentTracking(trackingNumber);
  }

  @Get('labels/:shippingRocketId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate shipping label PDF' })
  async getLabel(
    @Param('shippingRocketId') shippingRocketId: string,
    @Res() res: Response,
  ) {
    const pdfData = await this.shippingService.generateLabel(shippingRocketId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="label-${shippingRocketId}.pdf"`,
    });
    res.send(pdfData);
  }

  @Post('labels/bulk-generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate bulk shipping labels' })
  async generateBulkLabels(
    @Body() body: { shipmentIds: string[] },
    @Res() res: Response,
  ) {
    const pdfData = await this.shippingService.generateBulkLabels(body.shipmentIds);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="labels-bulk.pdf"',
    });
    res.send(pdfData);
  }

  @Post('shipments/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel shipment (Admin only)' })
  async cancelShipment(@Param('id') id: string) {
    await this.shippingService.cancelShipment(id);
    return { success: true, message: 'Shipment cancelled' };
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get shipment by order ID' })
  async getShipmentByOrder(@Param('orderId') orderId: string) {
    return this.shippingService.getShipmentByOrder(orderId);
  }

  // ===== Legacy Endpoints (Backward Compatibility) =====

  @Get('methods')
  @ApiOperation({ summary: 'Get all shipping methods' })
  async getAllShippingMethods() {
    return this.shippingService.getAllShippingMethods();
  }

  @Get('calculate')
  @ApiOperation({ summary: 'Calculate shipping cost (legacy)' })
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
    await this.shippingService.deleteShippingMethod(id);
    return { success: true };
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

  // ===== Admin Endpoints =====

  @Get('admin/shipping/shipments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all shipments (Admin only)' })
  async getAdminShipments(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    // This would typically query the database for shipments with filtering
    // For now, returning empty array as placeholder
    return [];
  }

  @Post('admin/shipping/pickups/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Schedule pickup for shipments (Admin only)' })
  async schedulePickupBulk(
    @Body() body: { shipmentIds: string[]; pickupDate?: string },
  ) {
    const pickupDate = body.pickupDate 
      ? new Date(body.pickupDate) 
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to tomorrow
    return this.shippingService.schedulePickup(body.shipmentIds, pickupDate);
  }

  @Post('admin/shipping/pickups/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel scheduled pickup (Admin only)' })
  async cancelPickup(
    @Body() body: { pickupId: string },
  ) {
    return this.shippingService.cancelPickup(body.pickupId);
  }

  @Get('ndr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get NDR shipments (Admin only)' })
  async getNDRShipments() {
    return this.shippingService.getNDRShipments();
  }

  @Post('ndr/:shipmentId/retry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry delivery for NDR shipment (Admin only)' })
  async retryNDRDelivery(@Param('shipmentId') shipmentId: string) {
    return this.shippingService.retryNDRDelivery(shipmentId);
  }

  @Post('ndr/:shipmentId/reschedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reschedule delivery for NDR shipment (Admin only)' })
  async rescheduleNDRDelivery(
    @Param('shipmentId') shipmentId: string,
    @Body() body: { newPickupDate?: string },
  ) {
    const pickupDate = body.newPickupDate 
      ? new Date(body.newPickupDate) 
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    return this.shippingService.rescheduleNDRDelivery(shipmentId, pickupDate);
  }

  @Post('return')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create return shipment' })
  async createReturnShipment(
    @Body() body: { orderId: string; reason?: string; pickupDate?: string },
  ) {
    const pickupDate = body.pickupDate 
      ? new Date(body.pickupDate) 
      : new Date(Date.now() + 48 * 60 * 60 * 1000); // Default to 2 days later
    return this.shippingService.createReturnShipment(body.orderId, body.reason, pickupDate);
  }

  @Post('awb/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign AWB to existing shipment (Admin only)' })
  async assignAWB(
    @Body() body: { shipmentId: string; courierId: number },
  ) {
    return this.shippingService.assignAWB(body.shipmentId, body.courierId);
  }

  @Get('couriers')
  @ApiOperation({ summary: 'Get available couriers list' })
  async getAvailableCouriers(
    @Query('pickupPincode') pickupPincode: string,
    @Query('deliveryPincode') deliveryPincode: string,
    @Query('weight') weight: string = '1',
    @Query('isCOD') isCOD: string = 'false',
  ) {
    return this.shippingService.getAvailableCouriers({
      pickupPincode: pickupPincode || '243006',
      deliveryPincode,
      weight: parseFloat(weight) || 1,
      isCOD: isCOD === 'true',
    });
  }
}
