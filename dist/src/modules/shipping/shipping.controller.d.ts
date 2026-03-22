import { ShippingService } from './shipping.service';
import { CreateShippingMethodDto, UpdateShippingMethodDto, UpdateShipmentDto } from './dto/shipping.dto';
export declare class ShippingController {
    private readonly shippingService;
    constructor(shippingService: ShippingService);
    getAllShippingMethods(): Promise<import("../../database/entities").ShippingMethod[]>;
    calculateShippingCost(subtotal: number, weight?: number): Promise<{
        method: import("../../database/entities").ShippingMethod;
        cost: number;
    }[]>;
    getShippingMethodById(id: string): Promise<import("../../database/entities").ShippingMethod>;
    getShipmentByOrder(orderId: string): Promise<import("../../database/entities").Shipment>;
    createShippingMethod(createShippingMethodDto: CreateShippingMethodDto): Promise<import("../../database/entities").ShippingMethod>;
    updateShippingMethod(id: string, updateShippingMethodDto: UpdateShippingMethodDto): Promise<import("../../database/entities").ShippingMethod>;
    deleteShippingMethod(id: string): Promise<void>;
    updateShipment(id: string, updateShipmentDto: UpdateShipmentDto): Promise<import("../../database/entities").Shipment>;
}
