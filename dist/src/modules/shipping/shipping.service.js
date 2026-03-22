"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../../database/entities");
const slugify_1 = require("../../common/utils/slugify");
let ShippingService = class ShippingService {
    constructor(shippingMethodRepository, shipmentRepository, orderRepository) {
        this.shippingMethodRepository = shippingMethodRepository;
        this.shipmentRepository = shipmentRepository;
        this.orderRepository = orderRepository;
    }
    async createShippingMethod(createShippingMethodDto) {
        const slug = createShippingMethodDto.slug ||
            (0, slugify_1.slugify)(createShippingMethodDto.name);
        const method = this.shippingMethodRepository.create({
            ...createShippingMethodDto,
            slug,
        });
        return this.shippingMethodRepository.save(method);
    }
    async getAllShippingMethods() {
        return this.shippingMethodRepository.find({
            where: { isActive: true },
            order: { isDefault: 'DESC', estimatedDays: 'ASC' },
        });
    }
    async getShippingMethodById(id) {
        const method = await this.shippingMethodRepository.findOne({
            where: { id },
        });
        if (!method) {
            throw new common_1.NotFoundException('Shipping method not found');
        }
        return method;
    }
    async updateShippingMethod(id, updateShippingMethodDto) {
        const method = await this.getShippingMethodById(id);
        Object.assign(method, updateShippingMethodDto);
        return this.shippingMethodRepository.save(method);
    }
    async deleteShippingMethod(id) {
        const method = await this.getShippingMethodById(id);
        await this.shippingMethodRepository.remove(method);
    }
    async calculateShippingCost(subtotal, weight = 0) {
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
    async createShipment(orderId) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        const defaultMethod = await this.shippingMethodRepository.findOne({
            where: { isDefault: true },
        });
        const shipment = this.shipmentRepository.create({
            orderId,
            status: entities_1.ShipmentStatus.PENDING,
            carrier: defaultMethod?.name || 'Standard Shipping',
            shippingAddress: order.shippingAddress,
        });
        return this.shipmentRepository.save(shipment);
    }
    async updateShipment(id, updateShipmentDto) {
        const shipment = await this.shipmentRepository.findOne({
            where: { id },
        });
        if (!shipment) {
            throw new common_1.NotFoundException('Shipment not found');
        }
        if (updateShipmentDto.status) {
            if (!Object.values(entities_1.ShipmentStatus).includes(updateShipmentDto.status)) {
                throw new common_1.BadRequestException('Invalid shipment status');
            }
            shipment.status = updateShipmentDto.status;
        }
        if (updateShipmentDto.carrier)
            shipment.carrier = updateShipmentDto.carrier;
        if (updateShipmentDto.trackingNumber)
            shipment.trackingNumber = updateShipmentDto.trackingNumber;
        if (updateShipmentDto.trackingUrl)
            shipment.trackingUrl = updateShipmentDto.trackingUrl;
        return this.shipmentRepository.save(shipment);
    }
    async getShipmentByOrder(orderId) {
        const shipment = await this.shipmentRepository.findOne({
            where: { orderId },
        });
        if (!shipment) {
            throw new common_1.NotFoundException('Shipment not found');
        }
        return shipment;
    }
};
exports.ShippingService = ShippingService;
exports.ShippingService = ShippingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.ShippingMethod)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Shipment)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.Order)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ShippingService);
//# sourceMappingURL=shipping.service.js.map