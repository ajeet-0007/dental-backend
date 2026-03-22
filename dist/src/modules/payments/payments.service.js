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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const stripe_1 = require("stripe");
const entities_1 = require("../../database/entities");
const inventory_service_1 = require("../inventory/inventory.service");
let PaymentsService = class PaymentsService {
    constructor(paymentRepository, orderRepository, orderItemRepository, configService, inventoryService) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.configService = configService;
        this.inventoryService = inventoryService;
        const secretKey = this.configService.get('STRIPE_SECRET_KEY');
        if (secretKey) {
            this.stripe = new stripe_1.default(secretKey);
        }
    }
    async createPaymentSession(userId, createPaymentDto) {
        const order = await this.orderRepository.findOne({
            where: { id: createPaymentDto.orderId, userId },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.status === entities_1.OrderStatus.CANCELLED) {
            throw new common_1.BadRequestException('Cannot payment for cancelled order');
        }
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: `Order #${order.orderNumber}`,
                            description: 'Dental products purchase',
                        },
                        unit_amount: Math.round(Number(order.totalAmount) * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${frontendUrl}/orders/${order.id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${frontendUrl}/orders/${order.id}?payment=cancelled`,
            metadata: {
                orderId: order.id,
                userId,
            },
        });
        const payment = this.paymentRepository.create({
            orderId: order.id,
            amount: order.totalAmount,
            status: entities_1.PaymentStatus.PENDING,
            method: entities_1.PaymentMethod.CARD,
            gatewayPaymentId: session.id,
        });
        await this.paymentRepository.save(payment);
        let checkoutUrl = session.url || '';
        console.log('[DEBUG] Original Stripe URL:', checkoutUrl);
        if (checkoutUrl.includes('{CHECKOUT_SESSION_ID}')) {
            checkoutUrl = checkoutUrl.replace('{CHECKOUT_SESSION_ID}', session.id);
        }
        else if (checkoutUrl.includes('#')) {
            checkoutUrl = checkoutUrl.replace('#', `?session_id=${session.id}#`);
        }
        else {
            const separator = checkoutUrl.includes('?') ? '&' : '?';
            checkoutUrl = `${checkoutUrl}${separator}session_id=${session.id}`;
        }
        console.log('[DEBUG] Final redirect URL:', checkoutUrl);
        return {
            sessionId: session.id,
            url: checkoutUrl,
        };
    }
    async handleWebhook(payload, signature) {
        const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
        if (!webhookSecret) {
            console.log('Stripe webhook secret not configured - skipping webhook');
            return;
        }
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        }
        catch (err) {
            console.error('Webhook signature verification failed:', err);
            throw new common_1.BadRequestException('Webhook signature verification failed');
        }
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            await this.processSuccessfulPayment(session);
        }
    }
    async processSuccessfulPayment(session) {
        const orderId = session.metadata?.orderId;
        if (!orderId) {
            console.log('No orderId in session metadata');
            return;
        }
        const payment = await this.paymentRepository.findOne({
            where: { orderId },
        });
        if (payment) {
            payment.status = entities_1.PaymentStatus.COMPLETED;
            payment.transactionId = session.payment_intent;
            payment.gatewayPaymentId = session.id;
            payment.gatewayResponse = JSON.stringify(session);
            await this.paymentRepository.save(payment);
            const order = await this.orderRepository.findOne({
                where: { id: orderId },
                relations: ['items'],
            });
            if (order && order.status === entities_1.OrderStatus.PENDING_PAYMENT) {
                order.status = entities_1.OrderStatus.CONFIRMED;
                await this.orderRepository.save(order);
                for (const item of order.items) {
                    await this.inventoryService.reserveStock(item.productId, item.quantity);
                }
                console.log(`Order ${orderId} confirmed successfully`);
            }
        }
    }
    async verifyAndConfirmPayment(sessionId) {
        console.log('Verifying session:', sessionId);
        const existingPayment = await this.paymentRepository.findOne({
            where: { gatewayPaymentId: sessionId },
            relations: ['order'],
        });
        if (existingPayment && existingPayment.order) {
            console.log('Found existing payment for session');
            if (existingPayment.order.status === entities_1.OrderStatus.PENDING_PAYMENT) {
                if (existingPayment.status !== entities_1.PaymentStatus.COMPLETED) {
                    existingPayment.status = entities_1.PaymentStatus.COMPLETED;
                    existingPayment.transactionId = existingPayment.gatewayPaymentId;
                    await this.paymentRepository.save(existingPayment);
                }
                existingPayment.order.status = entities_1.OrderStatus.CONFIRMED;
                await this.orderRepository.save(existingPayment.order);
                const orderItems = await this.orderItemRepository.find({
                    where: { orderId: existingPayment.order.id }
                });
                for (const item of orderItems) {
                    await this.inventoryService.reserveStock(item.productId, item.quantity);
                }
                console.log('Order confirmed via existing payment');
                return { success: true, orderId: existingPayment.order.id };
            }
            return { success: true, orderId: existingPayment.order.id };
        }
        if (!this.stripe) {
            console.error('Stripe not initialized');
            return { success: false, error: 'Stripe not configured' };
        }
        try {
            const session = await this.stripe.checkout.sessions.retrieve(sessionId);
            console.log('Session retrieved:', session.id, 'Status:', session.payment_status);
            if (session.payment_status === 'paid') {
                console.log('Payment is paid, processing...');
                await this.processSuccessfulPayment(session);
                return { success: true, orderId: session.metadata?.orderId };
            }
            console.log('Payment not completed, status:', session.payment_status);
            return { success: false, error: `Payment status: ${session.payment_status}` };
        }
        catch (error) {
            console.error('Error verifying payment:', error.message);
            return { success: false, error: error.message };
        }
    }
    async verifyPayment(orderId) {
        const payment = await this.paymentRepository.findOne({
            where: { orderId },
            relations: ['order'],
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        return payment;
    }
    async handlePaymentFailure(orderId, reason) {
        const payment = await this.paymentRepository.findOne({
            where: { orderId },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        payment.status = entities_1.PaymentStatus.FAILED;
        payment.failureReason = reason;
        return this.paymentRepository.save(payment);
    }
    async getPaymentByOrder(orderId) {
        const payment = await this.paymentRepository.findOne({
            where: { orderId },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        return payment;
    }
    async getPaymentsForAdmin(page = 1, limit = 10) {
        const [payments, total] = await this.paymentRepository.findAndCount({
            relations: ['order', 'order.user'],
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
        });
        return { payments, total };
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Payment)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Order)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.OrderItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService,
        inventory_service_1.InventoryService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map