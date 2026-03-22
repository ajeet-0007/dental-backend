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
  ) {}

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
}
