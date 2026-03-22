import { Repository } from 'typeorm';
import { ShippingMethod, Shipment, Order } from '../../database/entities';
import { CreateShippingMethodDto, UpdateShippingMethodDto, UpdateShipmentDto } from './dto/shipping.dto';
export declare class ShippingService {
    private shippingMethodRepository;
    private shipmentRepository;
    private orderRepository;
    constructor(shippingMethodRepository: Repository<ShippingMethod>, shipmentRepository: Repository<Shipment>, orderRepository: Repository<Order>);
    createShippingMethod(createShippingMethodDto: CreateShippingMethodDto): Promise<ShippingMethod>;
    getAllShippingMethods(): Promise<ShippingMethod[]>;
    getShippingMethodById(id: string): Promise<ShippingMethod>;
    updateShippingMethod(id: string, updateShippingMethodDto: UpdateShippingMethodDto): Promise<ShippingMethod>;
    deleteShippingMethod(id: string): Promise<void>;
    calculateShippingCost(subtotal: number, weight?: number): Promise<{
        method: ShippingMethod;
        cost: number;
    }[]>;
    createShipment(orderId: string): Promise<Shipment>;
    updateShipment(id: string, updateShipmentDto: UpdateShipmentDto): Promise<Shipment>;
    getShipmentByOrder(orderId: string): Promise<Shipment>;
}
