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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../../database/entities");
const slugify_1 = require("../../common/utils/slugify");
const inventory_service_1 = require("../inventory/inventory.service");
let OrdersService = class OrdersService {
    constructor(orderRepository, orderItemRepository, cartRepository, productRepository, productVariantRepository, inventoryRepository, addressRepository, inventoryService) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
        this.productVariantRepository = productVariantRepository;
        this.inventoryRepository = inventoryRepository;
        this.addressRepository = addressRepository;
        this.inventoryService = inventoryService;
    }
    async create(userId, createOrderDto) {
        const cartItems = await this.cartRepository.find({
            where: { userId },
            relations: ['product', 'productVariant'],
        });
        if (cartItems.length === 0) {
            throw new common_1.BadRequestException('Cart is empty');
        }
        let shippingAddress = createOrderDto.shippingAddress;
        if (createOrderDto.addressId) {
            const address = await this.addressRepository.findOne({
                where: { id: +createOrderDto.addressId, userId },
            });
            if (!address) {
                throw new common_1.NotFoundException('Address not found');
            }
            shippingAddress = `${address.name}, ${address.addressLine1}, ${address.addressLine2 || ''}, ${address.city}, ${address.state} - ${address.pincode}`;
        }
        let subtotal = 0;
        const orderItems = [];
        for (const cartItem of cartItems) {
            const product = cartItem.product;
            const variant = cartItem.productVariant;
            const price = variant?.sellingPrice || product.sellingPrice;
            const itemTotal = price * cartItem.quantity;
            subtotal += itemTotal;
            orderItems.push({
                productId: String(product.id),
                productVariantId: variant?.id ? String(variant.id) : undefined,
                productName: product.name,
                productImage: variant?.image || product.images?.[0] || '',
                sku: variant?.sku || product.sku || '',
                quantity: cartItem.quantity,
                price: product.price,
                sellingPrice: price,
                taxAmount: 0,
                discountAmount: 0,
                totalAmount: itemTotal,
            });
        }
        const shippingAmount = subtotal > 500 ? 0 : 50;
        const totalAmount = subtotal + shippingAmount;
        const order = this.orderRepository.create({
            orderNumber: (0, slugify_1.generateOrderNumber)(),
            userId,
            status: entities_1.OrderStatus.PENDING_PAYMENT,
            subtotal,
            shippingAmount,
            discountAmount: 0,
            totalAmount,
            shippingAddress,
            customerNote: createOrderDto.customerNote,
            couponCode: createOrderDto.couponCode,
        });
        const savedOrder = await this.orderRepository.save(order);
        const orderItemsEntities = orderItems.map((item) => {
            return this.orderItemRepository.create({
                ...item,
                orderId: savedOrder.id,
            });
        });
        await this.orderItemRepository.save(orderItemsEntities);
        await this.cartRepository.delete({ userId });
        return this.findOne(savedOrder.id);
    }
    async findAll(userId, page = 1, limit = 10) {
        const queryBuilder = this.orderRepository
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.items', 'items')
            .where('order.userId = :userId', { userId })
            .andWhere('order.status != :failedStatus', { failedStatus: entities_1.OrderStatus.PAYMENT_FAILED })
            .orderBy('order.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        const [orders, total] = await queryBuilder.getManyAndCount();
        return {
            orders: orders.map(order => ({
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                subtotal: order.subtotal,
                totalAmount: order.totalAmount,
                shippingAmount: order.shippingAmount,
                discountAmount: order.discountAmount,
                shippingAddress: order.shippingAddress,
                createdAt: order.createdAt,
                items: order.items?.map(item => ({
                    id: item.id,
                    productId: item.productId,
                    productVariantId: item.productVariantId,
                    productName: item.productName,
                    productImage: item.productImage,
                    quantity: item.quantity,
                    price: item.price,
                    sellingPrice: item.sellingPrice,
                    totalAmount: item.totalAmount,
                })) || [],
            })),
            total
        };
    }
    async findOne(id) {
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: [
                'items',
                'items.product',
                'items.product.category',
                'payments',
                'shipments',
                'user',
            ],
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        return order;
    }
    async findByOrderNumber(orderNumber, userId) {
        const order = await this.orderRepository.findOne({
            where: { orderNumber, userId },
            relations: ['items', 'items.product', 'payments', 'shipments'],
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        return order;
    }
    async updateStatus(id, updateOrderStatusDto) {
        const order = await this.findOne(id);
        if (!Object.values(entities_1.OrderStatus).includes(updateOrderStatusDto.status)) {
            throw new common_1.BadRequestException('Invalid order status');
        }
        order.status = updateOrderStatusDto.status;
        if (updateOrderStatusDto.adminNote) {
            order.adminNote = updateOrderStatusDto.adminNote;
        }
        if (updateOrderStatusDto.status === entities_1.OrderStatus.CANCELLED) {
            for (const item of order.items) {
                await this.inventoryService.releaseStock(item.productId, item.quantity);
            }
        }
        return this.orderRepository.save(order);
    }
    async getOrdersForAdmin(page = 1, limit = 10, status) {
        const queryBuilder = this.orderRepository
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('order.user', 'user')
            .orderBy('order.createdAt', 'DESC');
        if (status) {
            queryBuilder.andWhere('order.status = :status', { status });
        }
        const [orders, total] = await queryBuilder
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { orders, total };
    }
    async getOrderByIdForAdmin(id) {
        return this.findOne(id);
    }
    async cancelOrder(id, userId) {
        const order = await this.findOne(id);
        if (order.userId !== userId) {
            throw new common_1.BadRequestException('You can only cancel your own orders');
        }
        if (order.status === entities_1.OrderStatus.PENDING_PAYMENT) {
            await this.orderItemRepository.delete({ orderId: id });
            await this.orderRepository.delete(id);
            return { success: true, message: 'Order cancelled' };
        }
        if (![entities_1.OrderStatus.PENDING, entities_1.OrderStatus.CONFIRMED].includes(order.status)) {
            throw new common_1.BadRequestException('Cannot cancel order in current status');
        }
        order.status = entities_1.OrderStatus.CANCELLED;
        for (const item of order.items) {
            await this.inventoryService.releaseStock(item.productId, item.quantity);
        }
        await this.orderRepository.save(order);
        return { success: true, message: 'Order cancelled' };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.OrderItem)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.Cart)),
    __param(3, (0, typeorm_1.InjectRepository)(entities_1.Product)),
    __param(4, (0, typeorm_1.InjectRepository)(entities_1.ProductVariant)),
    __param(5, (0, typeorm_1.InjectRepository)(entities_1.Inventory)),
    __param(6, (0, typeorm_1.InjectRepository)(entities_1.Address)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        inventory_service_1.InventoryService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map