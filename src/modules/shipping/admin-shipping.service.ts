import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Shipment, Order } from '../../database/entities';
import { ShippingRocketService } from './shipping-rocket.service';
import { ShippingQueryDto, BulkActionDto, SchedulePickupDto, CancelBySrIdDto, BulkCancelBySrIdsDto } from './dto/admin-shipping.dto';

@Injectable()
export class AdminShippingService {
  private readonly logger = new Logger(AdminShippingService.name);

  constructor(
    @InjectRepository(Shipment)
    private shipmentRepository: Repository<Shipment>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private shippingRocketService: ShippingRocketService,
  ) {}

  async getShipments(query: ShippingQueryDto) {
    const { status, courier, startDate, endDate, page = 1, limit = 20, search } = query;

    const queryBuilder = this.shipmentRepository
      .createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.order', 'order')
      .orderBy('shipment.createdAt', 'DESC');

    if (status && status !== 'all') {
      queryBuilder.andWhere('shipment.status = :status', { status });
    }

    if (courier) {
      queryBuilder.andWhere('shipment.courierName LIKE :courier', { courier: `%${courier}%` });
    }

    if (startDate) {
      queryBuilder.andWhere('shipment.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere('shipment.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    if (search) {
      queryBuilder.andWhere(
        '(shipment.shippingRocketId LIKE :search OR shipment.awbNumber LIKE :search OR shipment.trackingNumber LIKE :search OR order.orderNumber LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await queryBuilder.getCount();
    const shipments = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: shipments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getShipmentsList() {
    const shipments = await this.shipmentRepository
      .createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.order', 'order')
      .orderBy('shipment.createdAt', 'DESC')
      .getMany();

    const list = shipments.map(shipment => ({
      id: shipment.id,
      orderNumber: shipment.order?.orderNumber || null,
      shippingRocketId: shipment.shippingRocketId,
      awbNumber: shipment.awbNumber,
      trackingNumber: shipment.trackingNumber,
      courierName: shipment.courierName,
      courierServiceType: shipment.courierServiceType,
      status: shipment.status,
      isCOD: shipment.isCOD,
      weight: shipment.weight,
      createdAt: shipment.createdAt,
    }));

    return { data: list, total: list.length };
  }

  async getShipmentBySrId(shippingRocketId: string) {
    const shipment = await this.shipmentRepository.findOne({
      where: { shippingRocketId },
      relations: ['order', 'order.user'],
    });

    if (!shipment) {
      throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);
    }

    return shipment;
  }

  async getShipmentById(id: string) {
    const shipment = await this.shipmentRepository.findOne({
      where: { id },
      relations: ['order', 'order.user'],
    });

    if (!shipment) {
      throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);
    }

    let trackingData = null;
    if (shipment.awbNumber) {
      try {
        trackingData = await this.shippingRocketService.getShipmentTracking(shipment.awbNumber);
      } catch (error) {
        this.logger.warn(`Failed to get tracking for shipment ${id}: ${error.message}`);
      }
    }

    return {
      ...shipment,
      tracking: trackingData,
    };
  }

  async getShipmentTracking(id: string) {
    const shipment = await this.shipmentRepository.findOne({
      where: { id },
    });

    if (!shipment) {
      throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);
    }

    if (!shipment.awbNumber) {
      throw new HttpException('AWB number not available', HttpStatus.BAD_REQUEST);
    }

    return this.shippingRocketService.getShipmentTracking(shipment.awbNumber);
  }

  async downloadLabel(id: string) {
    const shipment = await this.shipmentRepository.findOne({
      where: { id },
    });

    if (!shipment) {
      throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);
    }

    if (!shipment.shippingRocketId) {
      throw new HttpException('ShipRocket ID not available', HttpStatus.BAD_REQUEST);
    }

    return this.shippingRocketService.generateLabel(shipment.shippingRocketId);
  }

  async downloadManifest(id: string) {
    const shipment = await this.shipmentRepository.findOne({
      where: { id },
    });

    if (!shipment) {
      throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);
    }

    if (!shipment.shippingRocketId) {
      throw new HttpException('ShipRocket ID not available', HttpStatus.BAD_REQUEST);
    }

    return this.shippingRocketService.generateManifest(shipment.shippingRocketId);
  }

  async downloadBulkLabels(shipmentIds: string[]) {
    const shipments = await this.shipmentRepository.findByIds(shipmentIds);

    const validIds = shipments
      .filter((s) => s.shippingRocketId)
      .map((s) => s.shippingRocketId);

    if (validIds.length === 0) {
      throw new HttpException('No valid shipments found', HttpStatus.BAD_REQUEST);
    }

    return this.shippingRocketService.generateBulkLabels(validIds);
  }

  async downloadBulkManifests(shipmentIds: string[]) {
    const shipments = await this.shipmentRepository.findByIds(shipmentIds);

    const validIds = shipments
      .filter((s) => s.shippingRocketId)
      .map((s) => s.shippingRocketId);

    if (validIds.length === 0) {
      throw new HttpException('No valid shipments found', HttpStatus.BAD_REQUEST);
    }

    return this.shippingRocketService.generateBulkManifests(validIds);
  }

  async downloadInvoice(id: string) {
    const shipment = await this.shipmentRepository.findOne({
      where: { id },
    });

    if (!shipment) {
      throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);
    }

    if (!shipment.shippingRocketId) {
      throw new HttpException('ShipRocket ID not available', HttpStatus.BAD_REQUEST);
    }

    return this.shippingRocketService.generateInvoice(shipment.shippingRocketId);
  }

  async downloadBulkInvoices(shipmentIds: string[]) {
    const shipments = await this.shipmentRepository.findByIds(shipmentIds);

    const validIds = shipments
      .filter((s) => s.shippingRocketId)
      .map((s) => s.shippingRocketId);

    if (validIds.length === 0) {
      throw new HttpException('No valid shipments found', HttpStatus.BAD_REQUEST);
    }

    return this.shippingRocketService.generateBulkInvoices(validIds);
  }

  async cancelShipment(id: string) {
    const shipment = await this.shipmentRepository.findOne({ where: { id } });
    
    if (!shipment) {
      throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);
    }

    // Use ShipRocket's order ID to cancel
    const shiprocketOrderId = (shipment as any).srOrderId || shipment.shippingRocketId;
    const result = await this.shippingRocketService.cancelShipment(shiprocketOrderId);

    shipment.status = 'cancelled' as any;
    await this.shipmentRepository.save(shipment);

    return result;
  }

  async bulkCancelShipments(shipmentIds: string[]) {
    console.log('[AdminShipping] bulkCancelShipments called with IDs:', shipmentIds);
    const shipments = await this.shipmentRepository.findByIds(shipmentIds);
    console.log('[AdminShipping] Found shipments:', shipments.length, shipments.map(s => s.id));

    const results = [];
    for (const shipment of shipments) {
      if (shipment.shippingRocketId && shipment.status !== 'cancelled') {
        try {
          const shiprocketOrderId = (shipment as any).srOrderId || shipment.shippingRocketId;
          await this.shippingRocketService.cancelShipment(shiprocketOrderId);
          shipment.status = 'cancelled' as any;
          await this.shipmentRepository.save(shipment);
          results.push({ id: shipment.id, success: true });
        } catch (error) {
          results.push({ id: shipment.id, success: false, error: error.message });
        }
      }
    }

    return results;
  }

  async cancelByShipRocketId(shippingRocketId: string) {
    console.log('[AdminShipping] cancelByShipRocketId called with ID:', shippingRocketId);
    
    const shipment = await this.shipmentRepository.findOne({
      where: { shippingRocketId },
    });

    if (!shipment) {
      console.log('[AdminShipping] Shipment not found with shippingRocketId:', shippingRocketId);
      throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);
    }

    if (shipment.status === 'cancelled') {
      return { success: true, message: 'Shipment already cancelled' };
    }

    // Try to cancel on ShipRocket, handle "Order Id does not exist" gracefully
    try {
      await this.shippingRocketService.cancelShipment(shippingRocketId);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || '';
      
      // If order doesn't exist in ShipRocket (already cancelled/deleted), just update local status
      if (errorMessage.includes('Order Id does not exist') || error?.response?.status === 400) {
        console.log(`[AdminShipping] ShipRocket order ${shippingRocketId} not found - updating local status only`);
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    // Update local shipment status regardless of ShipRocket API result
    shipment.status = 'cancelled' as any;
    await this.shipmentRepository.save(shipment);

    return { success: true, message: 'Shipment cancelled successfully' };
  }

  async bulkCancelByShipRocketIds(shippingRocketIds: string[]) {
    console.log('[AdminShipping] bulkCancelByShipRocketIds called with IDs:', shippingRocketIds);
    
    const results = [];
    for (const srId of shippingRocketIds) {
      const shipment = await this.shipmentRepository.findOne({
        where: { shippingRocketId: srId },
      });

      if (!shipment) {
        results.push({ shippingRocketId: srId, success: false, error: 'Shipment not found' });
        continue;
      }

      if (shipment.status === 'cancelled') {
        results.push({ shippingRocketId: srId, success: true, message: 'Already cancelled' });
        continue;
      }

      try {
        await this.shippingRocketService.cancelShipment(srId);
      } catch (error: any) {
        const errorMessage = error?.response?.data?.message || error?.message || '';
        
        // If order doesn't exist, just mark as cancelled locally
        if (!errorMessage.includes('Order Id does not exist') && error?.response?.status !== 400) {
          console.log(`[AdminShipping] Error cancelling ${srId}: ${errorMessage}`);
        }
      }

      // Update local status regardless
      shipment.status = 'cancelled' as any;
      await this.shipmentRepository.save(shipment);
      results.push({ shippingRocketId: srId, success: true });
    }

    return results;
  }

  async schedulePickup(dto: SchedulePickupDto) {
    const shipments = await this.shipmentRepository.findByIds(dto.shipmentIds);

    const validIds = shipments
      .filter((s) => s.shippingRocketId && s.status !== 'cancelled' && s.status !== 'delivered')
      .map((s) => parseInt(s.shippingRocketId));

    if (validIds.length === 0) {
      throw new HttpException('No valid shipments found for pickup', HttpStatus.BAD_REQUEST);
    }

    const pickupDate = new Date(dto.scheduledDate);
    return this.shippingRocketService.schedulePickup(validIds, pickupDate);
  }

  async assignAwb(shipmentId: string, courierCompanyId: number) {
    const shipment = await this.shipmentRepository.findOne({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);
    }

    if (!shipment.shippingRocketId) {
      throw new HttpException('ShipRocket ID not available', HttpStatus.BAD_REQUEST);
    }

    const result = await this.shippingRocketService.assignAWB(shipment.shippingRocketId, courierCompanyId);

    shipment.awbNumber = result.awbNumber;
    shipment.courierName = result.courierName;
    await this.shipmentRepository.save(shipment);

    return result;
  }

  async getNdrShipments() {
    return this.shippingRocketService.getNDRShipments();
  }

  async retryNdrDelivery(shipmentId: string) {
    const shipment = await this.shipmentRepository.findOne({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);
    }

    if (!shipment.shippingRocketId) {
      throw new HttpException('ShipRocket ID not available', HttpStatus.BAD_REQUEST);
    }

    return this.shippingRocketService.retryNDRDelivery(shipment.shippingRocketId);
  }

  async rescheduleNdrDelivery(shipmentId: string, scheduledDate: string) {
    const shipment = await this.shipmentRepository.findOne({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);
    }

    if (!shipment.shippingRocketId) {
      throw new HttpException('ShipRocket ID not available', HttpStatus.BAD_REQUEST);
    }

    return this.shippingRocketService.rescheduleNDRDelivery(
      shipment.shippingRocketId,
      new Date(scheduledDate),
    );
  }

  async createReturnShipment(shipmentId: string, returnAddress?: any) {
    const shipment = await this.shipmentRepository.findOne({
      where: { id: shipmentId },
      relations: ['order'],
    });

    if (!shipment) {
      throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);
    }

    if (!shipment.shippingRocketId) {
      throw new HttpException('ShipRocket ID not available', HttpStatus.BAD_REQUEST);
    }

    const result = await this.shippingRocketService.createReturnShipment(
      shipment.shippingRocketId,
      returnAddress,
    );

    shipment.returnShipmentId = result.returnShipmentId;
    shipment.isReturnInitiated = true;
    await this.shipmentRepository.save(shipment);

    return result;
  }

  async getCourierCompanies() {
    return this.shippingRocketService.getCourierCompanies();
  }

  async getShippingStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const statusPending = 'pending' as any;
    const statusShipped = 'shipped' as any;
    const statusInTransit = 'in_transit' as any;
    const statusDelivered = 'delivered' as any;
    const statusCancelled = 'cancelled' as any;
    const statusFailed = 'failed' as any;

    const [pendingCount, shippedCount, inTransitCount, deliveredCount, cancelledCount, ndrCount, todayShipped, todayDelivered] = await Promise.all([
      this.shipmentRepository.count({ where: { status: statusPending } }),
      this.shipmentRepository.count({ where: { status: statusShipped } }),
      this.shipmentRepository.count({ where: { status: statusInTransit } }),
      this.shipmentRepository.count({ where: { status: statusDelivered } }),
      this.shipmentRepository.count({ where: { status: statusCancelled } }),
      this.shipmentRepository.count({ where: { status: statusFailed } }),
      this.shipmentRepository.count({
        where: {
          createdAt: MoreThan(today),
        },
      }),
      this.shipmentRepository.count({
        where: {
          deliveredDate: MoreThan(today),
        },
      }),
    ]);

    return {
      pending: pendingCount,
      shipped: shippedCount,
      inTransit: inTransitCount,
      delivered: deliveredCount,
      cancelled: cancelledCount,
      ndr: ndrCount,
      todayShipped,
      todayDelivered,
    };
  }
}