import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AdminShippingService } from './admin-shipping.service';
import { ShippingQueryDto, SchedulePickupDto, CancelBySrIdDto, BulkCancelBySrIdsDto } from './dto/admin-shipping.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities';

@Controller('admin/shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminShippingController {
  constructor(private readonly adminShippingService: AdminShippingService) {}

  @Get()
  async getShipments(@Query() query: ShippingQueryDto) {
    return this.adminShippingService.getShipments(query);
  }

  @Get('stats')
  async getShippingStats() {
    return this.adminShippingService.getShippingStats();
  }

  @Get('list')
  async getShipmentsList() {
    return this.adminShippingService.getShipmentsList();
  }

  @Get('by-sr-id/:shippingRocketId')
  async getShipmentBySrId(@Param('shippingRocketId') shippingRocketId: string) {
    return this.adminShippingService.getShipmentBySrId(shippingRocketId);
  }

  // Bulk routes first (MUST come before :id routes to avoid route conflicts)
  @Post('bulk/label')
  async downloadBulkLabels(@Body('shipmentIds') shipmentIds: string[], @Res() res: Response) {
    const labels = await this.adminShippingService.downloadBulkLabels(shipmentIds);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bulk-labels.pdf"`,
    });
    res.send(labels);
  }

  @Post('bulk/manifest')
  async downloadBulkManifests(@Body('shipmentIds') shipmentIds: string[], @Res() res: Response) {
    const manifests = await this.adminShippingService.downloadBulkManifests(shipmentIds);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bulk-manifests.pdf"`,
    });
    res.send(manifests);
  }

  @Post('bulk/invoice')
  async downloadBulkInvoices(@Body('shipmentIds') shipmentIds: string[], @Res() res: Response) {
    const invoices = await this.adminShippingService.downloadBulkInvoices(shipmentIds);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bulk-invoices.pdf"`,
    });
    res.send(invoices);
  }

  @Post('bulk/cancel')
  async bulkCancelShipments(@Body('shipmentIds') shipmentIds: string[]) {
    return this.adminShippingService.bulkCancelShipments(shipmentIds);
  }

  @Post('pickup/schedule')
  async schedulePickup(@Body() dto: SchedulePickupDto) {
    return this.adminShippingService.schedulePickup(dto);
  }

  @Get('ndr/list')
  async getNdrShipments() {
    return this.adminShippingService.getNdrShipments();
  }

  @Get('couriers/list')
  async getCourierCompanies() {
    return this.adminShippingService.getCourierCompanies();
  }

  // Cancel by ShipRocket ID (must come before :id routes)
  @Post('cancel-by-sr-id')
  async cancelByShipRocketId(@Body() dto: CancelBySrIdDto) {
    return this.adminShippingService.cancelByShipRocketId(dto.shippingRocketId);
  }

  @Post('bulk-cancel-by-sr-id')
  async bulkCancelByShipRocketIds(@Body() dto: BulkCancelBySrIdsDto) {
    return this.adminShippingService.bulkCancelByShipRocketIds(dto.shippingRocketIds);
  }

  // NDR routes with :id param
  @Post('ndr/:id/retry')
  async retryNdrDelivery(@Param('id') id: string) {
    return this.adminShippingService.retryNdrDelivery(id);
  }

  @Post('ndr/:id/reschedule')
  async rescheduleNdrDelivery(
    @Param('id') id: string,
    @Body('scheduledDate') scheduledDate: string,
  ) {
    return this.adminShippingService.rescheduleNdrDelivery(id, scheduledDate);
  }

  // Individual shipment routes (:id must come last)
  @Get(':id')
  async getShipmentById(@Param('id') id: string) {
    return this.adminShippingService.getShipmentById(id);
  }

  @Get(':id/track')
  async getShipmentTracking(@Param('id') id: string) {
    return this.adminShippingService.getShipmentTracking(id);
  }

  @Get(':id/label')
  async downloadLabel(@Param('id') id: string, @Res() res: Response) {
    const label = await this.adminShippingService.downloadLabel(id);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="label-${id}.pdf"`,
    });
    res.send(label);
  }

  @Get(':id/manifest')
  async downloadManifest(@Param('id') id: string, @Res() res: Response) {
    const manifest = await this.adminShippingService.downloadManifest(id);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="manifest-${id}.pdf"`,
    });
    res.send(manifest);
  }

  @Get(':id/invoice')
  async downloadInvoice(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.adminShippingService.downloadInvoice(id);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
    });
    res.send(invoice);
  }

  @Post(':id/cancel')
  async cancelShipment(@Param('id') id: string) {
    return this.adminShippingService.cancelShipment(id);
  }

  @Post(':id/awb')
  async assignAwb(
    @Param('id') id: string,
    @Body('courierCompanyId') courierCompanyId: number,
  ) {
    return this.adminShippingService.assignAwb(id, courierCompanyId);
  }

  @Post(':id/return')
  async createReturnShipment(
    @Param('id') id: string,
    @Body() returnAddress?: any,
  ) {
    return this.adminShippingService.createReturnShipment(id, returnAddress);
  }
}