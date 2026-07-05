import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ShippingMethod,
  Shipment,
  Order,
  ShipmentStatus,
} from '../../database/entities';
import {
  CreateShippingMethodDto,
  UpdateShippingMethodDto,
  UpdateShipmentDto,
} from './dto/shipping.dto';
import { CalculateRateDto } from './dto/calculate-rate.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { ShippingRocketService } from './shipping-rocket.service';
import { slugify } from '../../common/utils/slugify';

@Injectable()
export class ShippingService {
  constructor(
    @InjectRepository(ShippingMethod)
    private shippingMethodRepository: Repository<ShippingMethod>,
    @InjectRepository(Shipment)
    private shipmentRepository: Repository<Shipment>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private shippingRocketService: ShippingRocketService,
  ) {}

  /**
   * Calculate shipping rates from ShippingRocket
   */
  async calculateShippingRates(rateDto: CalculateRateDto) {
    return this.shippingRocketService.calculateRates(rateDto);
  }

  /**
   * Create shipment via ShippingRocket
   */
  async createShippingRocketShipment(
    shipmentDto: CreateShipmentDto,
  ): Promise<Shipment> {
    // Get order with all relations needed for shipment
    const order = await this.orderRepository.findOne({
      where: { id: shipmentDto.orderId },
      relations: ['user', 'items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Parse shipping address if it's a JSON string
    let parsedAddress: any = {};
    if (order.shippingAddress) {
      try {
        parsedAddress = typeof order.shippingAddress === 'string' 
          ? JSON.parse(order.shippingAddress) 
          : order.shippingAddress;
      } catch {
        parsedAddress = {};
      }
    }

    // Merge parsed address with order for ShipRocket API
    const orderWithAddress = {
      ...order,
      shippingAddress: parsedAddress,
    };

    // Call ShippingRocket API
    const srResponse = await this.shippingRocketService.createShipment(
      shipmentDto,
      orderWithAddress,
    );


    // Auto-generate label and manifest
    let labelUrl = srResponse.labelUrl;
    let manifestUrl = '';
    
    try {
      if (srResponse.shippingRocketId) {
        await this.shippingRocketService.generateLabel(srResponse.shippingRocketId);
        await this.shippingRocketService.generateManifest(srResponse.shippingRocketId);
      }
    } catch (error) {
    }

    // Create Shipment entity
    const shipment = this.shipmentRepository.create({
      orderId: shipmentDto.orderId,
      status: ShipmentStatus.PENDING,
      shippingRocketId: srResponse.shippingRocketId,
      srOrderId: srResponse.srOrderId || srResponse.shippingRocketId,
      courierName: srResponse.courierName,
      courierServiceType: shipmentDto.selectedService,
      trackingNumber: srResponse.trackingNumber,
      labelUrl: labelUrl,
      awbNumber: srResponse.awbNumber,
      pickupPincode: process.env.WAREHOUSE_PINCODE || '243006',
      deliveryPincode: parsedAddress.pincode || shipmentDto.deliveryPincode || '',
      weight: shipmentDto.weight,
      length: shipmentDto.length,
      breadth: shipmentDto.breadth,
      height: shipmentDto.height,
      isCOD: shipmentDto.isCOD || false,
    });

    return this.shipmentRepository.save(shipment);
  }

  /**
   * Get tracking information
   */
  async getShipmentTracking(trackingNumber: string) {
    return this.shippingRocketService.getShipmentTracking(trackingNumber);
  }

  /**
   * Generate shipping label
   */
  async generateLabel(shippingRocketId: string) {
    return this.shippingRocketService.generateLabel(shippingRocketId);
  }

/**
    * Generate bulk labels
    */
  async generateBulkLabels(shipmentIds: string[]) {
    return this.shippingRocketService.generateBulkLabels(shipmentIds);
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(id: string): Promise<void> {
    const shipment = await this.shipmentRepository.findOne({
      where: { id },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    // Use orderId to cancel on ShipRocket
    await this.shippingRocketService.cancelShipment(shipment.orderId);

    shipment.status = ShipmentStatus.CANCELLED;
    await this.shipmentRepository.save(shipment);
  }

  // ===== Legacy methods (kept for backward compatibility) =====

  async createShippingMethod(
    createShippingMethodDto: CreateShippingMethodDto,
  ): Promise<ShippingMethod> {
    const slug =
      createShippingMethodDto.slug ||
      slugify(createShippingMethodDto.name);

    const method = this.shippingMethodRepository.create({
      ...createShippingMethodDto,
      slug,
    });

    return this.shippingMethodRepository.save(method);
  }

  async getAllShippingMethods(): Promise<ShippingMethod[]> {
    return this.shippingMethodRepository.find({
      where: { isActive: true },
      order: { isDefault: 'DESC', estimatedDays: 'ASC' },
    });
  }

  async getShippingMethodById(id: string): Promise<ShippingMethod> {
    const method = await this.shippingMethodRepository.findOne({
      where: { id },
    });

    if (!method) {
      throw new NotFoundException('Shipping method not found');
    }

    return method;
  }

  async updateShippingMethod(
    id: string,
    updateShippingMethodDto: UpdateShippingMethodDto,
  ): Promise<ShippingMethod> {
    const method = await this.getShippingMethodById(id);
    Object.assign(method, updateShippingMethodDto);
    return this.shippingMethodRepository.save(method);
  }

  async deleteShippingMethod(id: string): Promise<void> {
    const method = await this.getShippingMethodById(id);
    await this.shippingMethodRepository.remove(method);
  }

  async calculateShippingCost(
    subtotal: number,
    weight = 0,
  ): Promise<{ method: ShippingMethod; cost: number }[]> {
    const methods = await this.getAllShippingMethods();

    return methods.map((method) => {
      let cost = Number(method.baseCost);

      if (method.costPerKg && weight > 0) {
        cost += Number(method.costPerKg) * weight;
      }

      if (method.freeShippingMinAmount && subtotal >= Number(method.freeShippingMinAmount)) {
        cost = 0;
      }

      return { method, cost };
    });
  }

  async createShipment(orderId: string): Promise<Shipment> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const defaultMethod = await this.shippingMethodRepository.findOne({
      where: { isDefault: true },
    });

    const shipment = this.shipmentRepository.create({
      orderId,
      status: ShipmentStatus.PENDING,
      carrier: defaultMethod?.name || 'Standard Shipping',
      shippingAddress: order.shippingAddress,
      pickupPincode: process.env.WAREHOUSE_PINCODE,
      deliveryPincode: '',
      weight: 0,
      length: 0,
      breadth: 0,
      height: 0,
    });

    return this.shipmentRepository.save(shipment);
  }

  async updateShipment(
    id: string,
    updateShipmentDto: UpdateShipmentDto,
  ): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findOne({
      where: { id },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (updateShipmentDto.status) {
      if (!Object.values(ShipmentStatus).includes(updateShipmentDto.status as ShipmentStatus)) {
        throw new BadRequestException('Invalid shipment status');
      }
      shipment.status = updateShipmentDto.status as ShipmentStatus;
    }

    if (updateShipmentDto.carrier) shipment.carrier = updateShipmentDto.carrier;
    if (updateShipmentDto.trackingNumber) shipment.trackingNumber = updateShipmentDto.trackingNumber;
    if (updateShipmentDto.trackingUrl) shipment.trackingUrl = updateShipmentDto.trackingUrl;

    return this.shipmentRepository.save(shipment);
  }

  async getShipmentByOrder(orderId: string): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findOne({
      where: { orderId },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return shipment;
  }

  /**
   * Check if a shipment already exists for an order
   * Returns true if any shipment exists for the order
   */
  async shipmentExistsForOrder(orderId: string): Promise<boolean> {
    const count = await this.shipmentRepository.count({
      where: { orderId },
    });
    return count > 0;
  }

/**
    * Schedule pickup for shipments
    */
  async schedulePickup(shipmentIds: string[], pickupDate: Date) {
    const numericIds = shipmentIds.map(id => parseInt(id));
    return this.shippingRocketService.schedulePickup(numericIds, pickupDate);
  }

  /**
   * Cancel scheduled pickup
   */
  async cancelPickup(pickupId: string) {
    return this.shippingRocketService.cancelPickupById(pickupId);
  }

  /**
   * Get NDR (Non-Delivery Report) shipments
   */
  async getNDRShipments() {
    return this.shippingRocketService.getNDRShipments();
  }

  /**
   * Retry delivery for NDR shipment
   */
  async retryNDRDelivery(shipmentId: string) {
    const shipment = await this.shipmentRepository.findOne({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.trackingNumber) {
      return this.shippingRocketService.retryNDRDelivery(shipment.trackingNumber);
    }

    throw new BadRequestException('No tracking number available for this shipment');
  }

  /**
   * Reschedule delivery for NDR shipment
   */
  async rescheduleNDRDelivery(shipmentId: string, pickupDate: Date) {
    const shipment = await this.shipmentRepository.findOne({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.shippingRocketId) {
      return this.shippingRocketService.rescheduleNDRDelivery(shipment.shippingRocketId, pickupDate);
    }

    throw new BadRequestException('No ShipRocket ID available for this shipment');
  }

  /**
   * Reschedule delivery for failed shipment (user-initiated)
   */
  async rescheduleDelivery(shipmentId: string, newDeliveryDate?: string) {
    const shipment = await this.shipmentRepository.findOne({
      where: { id: shipmentId },
      relations: ['order'],
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.order.deliveryFailed !== true) {
      throw new BadRequestException('Delivery has not failed. Cannot reschedule.');
    }

    const deliveryDate = newDeliveryDate 
      ? new Date(newDeliveryDate) 
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (shipment.shippingRocketId) {
      const result = await this.shippingRocketService.rescheduleNDRDelivery(
        shipment.shippingRocketId,
        deliveryDate,
      );

      shipment.order.deliveryFailed = false;
      shipment.order.deliveryFailedReason = null;
      await this.orderRepository.save(shipment.order);

      return {
        success: true,
        message: 'Delivery rescheduled successfully',
        newDeliveryDate: deliveryDate.toISOString(),
        ...result,
      };
    }

    throw new BadRequestException('No ShipRocket ID available for this shipment');
  }

  /**
   * Create return shipment
   */
  async createReturnShipment(orderId: string, reason?: string, pickupDate?: Date) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const shipment = await this.shipmentRepository.findOne({
      where: { orderId },
    });

    if (!shipment) {
      throw new NotFoundException('Original shipment not found');
    }

    if (!shipment.shippingRocketId) {
      throw new BadRequestException('Original shipment not linked to ShipRocket');
    }

    return this.shippingRocketService.createReturnShipment(shipment.shippingRocketId, undefined);
  }

  /**
   * Assign AWB to existing shipment
   */
  async assignAWB(shipmentId: string, courierCompanyId: number) {
    const shipment = await this.shipmentRepository.findOne({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (!shipment.shippingRocketId) {
      throw new BadRequestException('Shipment not created in ShipRocket yet');
    }

    return this.shippingRocketService.assignAWB(shipment.shippingRocketId, courierCompanyId);
  }

  /**
   * Get available couriers for a route
   */
  async getAvailableCouriers(params: {
    pickupPincode: string;
    deliveryPincode: string;
    weight: number;
    isCOD: boolean;
  }) {
    const rateDto: CalculateRateDto = {
      pickupPincode: params.pickupPincode,
      deliveryPincode: params.deliveryPincode,
      weight: params.weight,
      length: 10,
      breadth: 10,
      height: 10,
      isCOD: params.isCOD,
    };

    return this.shippingRocketService.calculateRates(rateDto);
  }

  /**
   * Get courier companies list
   */
  async getCourierCompanies() {
    return this.shippingRocketService.getCourierCompanies();
  }
}
