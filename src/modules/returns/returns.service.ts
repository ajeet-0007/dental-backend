import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  ReturnShipment,
  ReturnShipmentStatus,
  ReturnItem,
  ReturnTimeline,
  ReturnTimelineAction,
  ReturnActor,
  RefundMethod,
  Order,
  OrderStatus,
  Shipment,
  ShipmentStatus,
  Payment,
  PaymentStatus,
  PaymentMethod,
  OrderItem,
} from '../../database/entities';
import { ShippingRocketService } from '../shipping/shipping-rocket.service';
import { InitiateReturnDto, ReturnQueryDto, EligibilityResponseDto } from './dto/return.dto';

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);
  private readonly returnWindowDays: number;
  private readonly autoApproveThreshold: number;
  private readonly shippingDeduction: number;

  constructor(
    @InjectRepository(ReturnShipment)
    private returnShipmentRepository: Repository<ReturnShipment>,
    @InjectRepository(ReturnItem)
    private returnItemRepository: Repository<ReturnItem>,
    @InjectRepository(ReturnTimeline)
    private returnTimelineRepository: Repository<ReturnTimeline>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Shipment)
    private shipmentRepository: Repository<Shipment>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private configService: ConfigService,
    private shippingRocketService: ShippingRocketService,
  ) {
    this.returnWindowDays = this.configService.get<number>('RETURN_WINDOW_DAYS', 7);
    this.autoApproveThreshold = this.configService.get<number>('RETURN_AUTO_APPROVE_THRESHOLD', 500);
    this.shippingDeduction = this.configService.get<number>('RETURN_SHIPPING_DEDUCTION', 3);
  }

  async checkEligibility(orderId: string, userId: string): Promise<EligibilityResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['shipments'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('This order does not belong to you');
    }

    const reasons: string[] = [];

    if (order.status !== OrderStatus.DELIVERED) {
      reasons.push(`Order status is "${order.status}". Only delivered orders can be returned.`);
    }

    const payment = await this.paymentRepository.findOne({
      where: { orderId: order.id, status: PaymentStatus.COMPLETED },
    });

    if (!payment) {
      reasons.push('No successful payment found for this order.');
    } else if (payment.method === PaymentMethod.COD) {
      reasons.push('Returns are not available for Cash on Delivery orders.');
    }

    const shipment = order.shipments?.find(s => s.status === ShipmentStatus.DELIVERED);
    if (!shipment) {
      reasons.push('Order has not been delivered yet.');
    } else {
      const deliveryDate = new Date((shipment as any).deliveredDate || shipment.updatedAt);
      const now = new Date();
      const daysSinceDelivery = Math.floor(
        (now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const remainingDays = Math.max(0, this.returnWindowDays - daysSinceDelivery);

      if (daysSinceDelivery > this.returnWindowDays) {
        reasons.push(`Return window expired. Returns must be initiated within ${this.returnWindowDays} days of delivery.`);
      }

      return {
        eligible: reasons.length === 0,
        reasons,
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: Number(order.totalAmount),
        paymentMethod: payment?.method || 'unknown',
        deliveryDate,
        daysSinceDelivery,
        remainingDays,
      };
    }

    return {
      eligible: reasons.length === 0,
      reasons,
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: Number(order.totalAmount),
      paymentMethod: payment?.method || 'unknown',
      deliveryDate: null,
      daysSinceDelivery: -1,
      remainingDays: 0,
    };
  }

  async initiateReturn(
    userId: string,
    dto: InitiateReturnDto,
  ): Promise<ReturnShipment> {
    const eligibility = await this.checkEligibility(dto.orderId, userId);

    if (!eligibility.eligible) {
      throw new BadRequestException(
        `Cannot initiate return: ${eligibility.reasons.join(' ')}`,
      );
    }

    const activeReturns = await this.returnShipmentRepository
      .createQueryBuilder('rs')
      .where('rs.orderId = :orderId', { orderId: dto.orderId })
      .andWhere('rs.userId = :userId', { userId })
      .andWhere('rs.status NOT IN (:...cancelStatuses)', {
        cancelStatuses: [
          ReturnShipmentStatus.CANCELLED,
          ReturnShipmentStatus.REJECTED,
          ReturnShipmentStatus.REFUNDED,
        ],
      })
      .getOne();

    if (activeReturns) {
      throw new BadRequestException(
        'A return request is already in progress for this order.',
      );
    }

    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId },
    });

    const shipment = await this.shipmentRepository.findOne({
      where: { orderId: dto.orderId },
    });

    const orderItems = await this.orderItemRepository.find({
      where: { orderId: dto.orderId },
    });

    const eligibleForAutoApprove = Number(order!.totalAmount) <= this.autoApproveThreshold;

    const returnShipment = this.returnShipmentRepository.create({
      orderId: dto.orderId,
      shipmentId: shipment!.id,
      userId,
      reason: dto.reason,
      comments: dto.comments,
      status: eligibleForAutoApprove
        ? ReturnShipmentStatus.APPROVED
        : ReturnShipmentStatus.PENDING_REVIEW,
      isAutoApproved: eligibleForAutoApprove,
      eligibleForAutoApprove,
      pickupAddress: dto.pickupAddress,
      pickupCity: dto.pickupCity,
      pickupState: dto.pickupState,
      pickupPincode: dto.pickupPincode,
      pickupPhone: dto.pickupPhone,
      shippingDeduction: this.shippingDeduction,
    });

    const savedReturn = await this.returnShipmentRepository.save(returnShipment);

    const returnItems: ReturnItem[] = [];
    let itemTotal = 0;

    for (const itemDto of dto.items) {
      const orderItem = orderItems.find(oi => oi.id === itemDto.orderItemId);
      if (!orderItem) continue;

      if (itemDto.quantity > orderItem.quantity) {
        throw new BadRequestException(
          `Return quantity (${itemDto.quantity}) cannot exceed ordered quantity (${orderItem.quantity}) for item "${orderItem.productName}".`,
        );
      }

      const returnItem = this.returnItemRepository.create({
        returnShipmentId: savedReturn.id,
        orderItemId: orderItem.id,
        productId: orderItem.productId,
        productVariantId: orderItem.productVariantId,
        productName: orderItem.productName,
        productImage: orderItem.productImage,
        sku: orderItem.sku,
        quantity: itemDto.quantity,
        unitPrice: Number(orderItem.sellingPrice),
        totalPrice: Number(orderItem.sellingPrice) * itemDto.quantity,
        images: itemDto.conditionImages || [],
      });

      returnItems.push(await this.returnItemRepository.save(returnItem));
      itemTotal += returnItem.totalPrice;
    }

    savedReturn.items = returnItems;
    savedReturn.itemTotal = itemTotal;
    await this.returnShipmentRepository.save(savedReturn);

    await this.addTimelineEntry(
      savedReturn.id,
      ReturnTimelineAction.RETURN_INITIATED,
      ReturnActor.USER,
      userId,
      undefined,
      eligibleForAutoApprove
        ? ReturnShipmentStatus.PENDING_REVIEW
        : ReturnShipmentStatus.APPROVED,
      `Return initiated for ${returnItems.length} item(s). ${eligibleForAutoApprove ? 'Auto-approved (order ≤ ₹' + this.autoApproveThreshold + ').' : 'Pending admin review (order > ₹' + this.autoApproveThreshold + ').'}`,
    );

    if (eligibleForAutoApprove) {
      await this.approveReturn(savedReturn.id, 'system', undefined);
    }

    return savedReturn;
  }

  async cancelReturn(
    returnId: string,
    userId: string,
    reason?: string,
  ): Promise<ReturnShipment> {
    const returnShipment = await this.getReturnById(returnId, userId);

    if (![ReturnShipmentStatus.REQUESTED, ReturnShipmentStatus.PENDING_REVIEW].includes(returnShipment.status)) {
      throw new BadRequestException(
        `Cannot cancel return with status "${returnShipment.status}". Cancellation is only allowed before pickup is scheduled.`,
      );
    }

    const previousStatus = returnShipment.status;
    returnShipment.status = ReturnShipmentStatus.CANCELLED;
    await this.returnShipmentRepository.save(returnShipment);

    await this.addTimelineEntry(
      returnId,
      ReturnTimelineAction.RETURN_CANCELLED,
      ReturnActor.USER,
      userId,
      previousStatus,
      ReturnShipmentStatus.CANCELLED,
      reason || 'Cancelled by customer.',
    );

    return returnShipment;
  }

  async reschedulePickup(
    returnId: string,
    userId: string,
    pickupDate: string,
    pickupSlot?: string,
  ): Promise<ReturnShipment> {
    const returnShipment = await this.getReturnById(returnId, userId);

    if (returnShipment.status !== ReturnShipmentStatus.SCHEDULED) {
      throw new BadRequestException(
        'Can only reschedule pickup when status is "scheduled".',
      );
    }

    const previousStatus = returnShipment.status;
    returnShipment.pickupScheduledDate = new Date(pickupDate);
    returnShipment.pickupSlot = pickupSlot || '';
    await this.returnShipmentRepository.save(returnShipment);

    await this.addTimelineEntry(
      returnId,
      ReturnTimelineAction.RESCHEDULED,
      ReturnActor.USER,
      userId,
      previousStatus,
      returnShipment.status,
      `Pickup rescheduled to ${pickupDate}${pickupSlot ? ' (' + pickupSlot + ')' : ''}.`,
    );

    return returnShipment;
  }

  async uploadConditionImages(
    returnId: string,
    userId: string,
    images: string[],
  ): Promise<ReturnShipment> {
    const returnShipment = await this.getReturnById(returnId, userId);

    if (![ReturnShipmentStatus.REQUESTED, ReturnShipmentStatus.PENDING_REVIEW].includes(returnShipment.status)) {
      throw new BadRequestException(
        'Cannot add images after return has been processed.',
      );
    }

    await this.addTimelineEntry(
      returnId,
      ReturnTimelineAction.IMAGES_UPLOADED,
      ReturnActor.USER,
      userId,
      returnShipment.status,
      returnShipment.status,
      `${images.length} condition image(s) uploaded.`,
    );

    return returnShipment;
  }

  async getUserReturns(userId: string, query: ReturnQueryDto): Promise<{ data: ReturnShipment[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.returnShipmentRepository
      .createQueryBuilder('rs')
      .leftJoinAndSelect('rs.items', 'items')
      .leftJoinAndSelect('rs.timeline', 'timeline')
      .where('rs.userId = :userId', { userId });

    if (query.status) {
      queryBuilder.andWhere('rs.status = :status', { status: query.status });
    }

    const [data, total] = await queryBuilder
      .orderBy('rs.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async getReturnById(returnId: string, userId?: string): Promise<ReturnShipment> {
    const returnShipment = await this.returnShipmentRepository.findOne({
      where: { id: returnId },
      relations: ['items', 'timeline'],
    });

    if (!returnShipment) {
      throw new NotFoundException('Return request not found');
    }

    if (userId && returnShipment.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return returnShipment;
  }

  async approveReturn(
    returnId: string,
    adminId: string,
    notes?: string,
  ): Promise<ReturnShipment> {
    const returnShipment = await this.returnShipmentRepository.findOne({
      where: { id: returnId },
      relations: ['items', 'order'],
    });

    if (!returnShipment) {
      throw new NotFoundException('Return request not found');
    }

    if (returnShipment.status !== ReturnShipmentStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Cannot approve return with status "${returnShipment.status}".`,
      );
    }

    const previousStatus = returnShipment.status;
    returnShipment.status = ReturnShipmentStatus.APPROVED;
    returnShipment.adminReviewedBy = adminId;
    returnShipment.adminReviewedAt = new Date();
    returnShipment.adminReviewNotes = notes || '';
    await this.returnShipmentRepository.save(returnShipment);

    try {
      const shipRocketResult = await this.shippingRocketService.createReturnShipment(
        returnShipment.shipmentId,
        undefined,
      );

      returnShipment.shippingRocketReturnId = shipRocketResult.returnShipmentId;
      returnShipment.returnTrackingNumber = shipRocketResult.trackingNumber;
      returnShipment.returnAwbNumber = shipRocketResult.awbNumber;
      returnShipment.returnLabelUrl = shipRocketResult.labelUrl;
      returnShipment.status = ReturnShipmentStatus.SCHEDULED;
      returnShipment.pickupScheduledDate = new Date();

      await this.returnShipmentRepository.save(returnShipment);

      await this.addTimelineEntry(
        returnId,
        ReturnTimelineAction.LABEL_GENERATED,
        ReturnActor.SYSTEM,
        'system',
        previousStatus,
        ReturnShipmentStatus.SCHEDULED,
        `Return label generated. AWB: ${shipRocketResult.awbNumber}`,
      );

      await this.addTimelineEntry(
        returnId,
        ReturnTimelineAction.PICKUP_SCHEDULED,
        ReturnActor.ADMIN,
        adminId,
        ReturnShipmentStatus.APPROVED,
        ReturnShipmentStatus.SCHEDULED,
        notes || 'Pickup scheduled via ShipRocket.',
      );
    } catch (error) {
      this.logger.error('Failed to create return shipment in ShipRocket:', error);
      throw new BadRequestException(
        'Failed to generate return label. Please try again.',
      );
    }

    return returnShipment;
  }

  async rejectReturn(
    returnId: string,
    adminId: string,
    notes?: string,
  ): Promise<ReturnShipment> {
    const returnShipment = await this.returnShipmentRepository.findOne({
      where: { id: returnId },
    });

    if (!returnShipment) {
      throw new NotFoundException('Return request not found');
    }

    if (returnShipment.status !== ReturnShipmentStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Cannot reject return with status "${returnShipment.status}".`,
      );
    }

    const previousStatus = returnShipment.status;
    returnShipment.status = ReturnShipmentStatus.REJECTED;
    returnShipment.adminReviewedBy = adminId;
    returnShipment.adminReviewedAt = new Date();
    returnShipment.adminReviewNotes = notes || '';
    await this.returnShipmentRepository.save(returnShipment);

    await this.addTimelineEntry(
      returnId,
      ReturnTimelineAction.RETURN_REJECTED,
      ReturnActor.ADMIN,
      adminId,
      previousStatus,
      ReturnShipmentStatus.REJECTED,
      notes || 'Return rejected.',
    );

    return returnShipment;
  }

  async updateReturnStatus(
    returnId: string,
    status: ReturnShipmentStatus,
    adminId?: string,
    notes?: string,
  ): Promise<ReturnShipment> {
    const returnShipment = await this.returnShipmentRepository.findOne({
      where: { id: returnId },
    });

    if (!returnShipment) {
      throw new NotFoundException('Return request not found');
    }

    const previousStatus = returnShipment.status;
    returnShipment.status = status;

    if (status === ReturnShipmentStatus.RECEIVED) {
      returnShipment.receivedDate = new Date();
    } else if (status === ReturnShipmentStatus.QUALITY_CHECK) {
await this.addTimelineEntry(
      returnId,
      ReturnTimelineAction.RECEIVED_AT_WAREHOUSE,
      ReturnActor.ADMIN,
      adminId || 'system',
      previousStatus,
      ReturnShipmentStatus.QUALITY_CHECK,
      'Item received at warehouse.',
    );
    }

    await this.returnShipmentRepository.save(returnShipment);

    await this.addTimelineEntry(
      returnId,
      this.getActionFromStatus(status),
      ReturnActor.ADMIN,
      adminId || 'system',
      previousStatus,
      status,
      notes,
    );

    return returnShipment;
  }

  async qualityCheck(
    returnId: string,
    adminId: string,
    result: 'passed' | 'failed',
    notes?: string,
  ): Promise<ReturnShipment> {
    const returnShipment = await this.returnShipmentRepository.findOne({
      where: { id: returnId },
    });

    if (!returnShipment) {
      throw new NotFoundException('Return request not found');
    }

    if (returnShipment.status !== ReturnShipmentStatus.QUALITY_CHECK) {
      throw new BadRequestException('Return must be in quality check status.');
    }

    const previousStatus = returnShipment.status;
    returnShipment.qualityCheckPassed = result === 'passed';
    returnShipment.qualityCheckNotes = notes || '';

    if (result === 'passed') {
      returnShipment.status = ReturnShipmentStatus.RECEIVED;
      await this.processRefund(returnShipment.id, adminId);
    } else {
      returnShipment.status = ReturnShipmentStatus.REJECTED;
      await this.addTimelineEntry(
        returnId,
        ReturnTimelineAction.QUALITY_CHECK_FAILED,
        ReturnActor.ADMIN,
        adminId,
        previousStatus,
        ReturnShipmentStatus.REJECTED,
        notes || 'Quality check failed.',
      );
    }

    await this.returnShipmentRepository.save(returnShipment);

    return returnShipment;
  }

  async processRefund(
    returnId: string,
    adminId: string,
  ): Promise<ReturnShipment> {
    const returnShipment = await this.returnShipmentRepository.findOne({
      where: { id: returnId },
      relations: ['order'],
    });

    if (!returnShipment) {
      throw new NotFoundException('Return request not found');
    }

    const refundAmount = returnShipment.itemTotal - returnShipment.shippingDeduction;
    returnShipment.refundAmount = refundAmount;
    returnShipment.refundMethod = RefundMethod.ORIGINAL_PAYMENT;

    await this.addTimelineEntry(
      returnId,
      ReturnTimelineAction.REFUND_INITIATED,
      ReturnActor.ADMIN,
      adminId,
      returnShipment.status,
      ReturnShipmentStatus.REFUNDED,
      `Refund of ₹${refundAmount} initiated.`,
    );

    returnShipment.status = ReturnShipmentStatus.REFUNDED;
    returnShipment.refundProcessedDate = new Date();
    await this.returnShipmentRepository.save(returnShipment);

    await this.addTimelineEntry(
      returnId,
      ReturnTimelineAction.REFUND_COMPLETED,
      ReturnActor.ADMIN,
      adminId,
      ReturnShipmentStatus.REFUNDED,
      ReturnShipmentStatus.REFUNDED,
      `Refund of ₹${refundAmount} credited to original payment method.`,
    );

    return returnShipment;
  }

  async getAdminReturns(query: ReturnQueryDto): Promise<{ data: ReturnShipment[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.returnShipmentRepository
      .createQueryBuilder('rs')
      .leftJoinAndSelect('rs.items', 'items')
      .leftJoinAndSelect('rs.timeline', 'timeline')
      .leftJoinAndSelect('rs.order', 'order');

    if (query.status) {
      queryBuilder.andWhere('rs.status = :status', { status: query.status });
    }

    const [data, total] = await queryBuilder
      .orderBy('rs.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  private async addTimelineEntry(
    returnShipmentId: string,
    action: ReturnTimelineAction,
    actor: ReturnActor,
    actorId: string,
    previousStatus?: string,
    newStatus?: string,
    comment?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const entry = this.returnTimelineRepository.create({
      returnShipmentId,
      action,
      actor,
      actorId,
      actorName: actorId,
      previousStatus,
      newStatus,
      comment,
      metadata,
    });

    await this.returnTimelineRepository.save(entry);
  }

  private getActionFromStatus(status: ReturnShipmentStatus): ReturnTimelineAction {
    const statusMap: Partial<Record<ReturnShipmentStatus, ReturnTimelineAction>> = {
      [ReturnShipmentStatus.SCHEDULED]: ReturnTimelineAction.PICKUP_SCHEDULED,
      [ReturnShipmentStatus.PICKED_UP]: ReturnTimelineAction.PICKUP_COMPLETED,
      [ReturnShipmentStatus.IN_TRANSIT]: ReturnTimelineAction.IN_TRANSIT,
      [ReturnShipmentStatus.RECEIVED]: ReturnTimelineAction.RECEIVED_AT_WAREHOUSE,
      [ReturnShipmentStatus.QUALITY_CHECK]: ReturnTimelineAction.QUALITY_CHECK_PASSED,
    };

    return statusMap[status] || ReturnTimelineAction.QUALITY_CHECK_PASSED;
  }
}