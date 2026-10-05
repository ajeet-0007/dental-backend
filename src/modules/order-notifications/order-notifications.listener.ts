import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from '../email/email.service';
import {
  ORDER_CANCELLED_EVENT,
  ORDER_PLACED_EVENT,
  OrderCancelledPayload,
  OrderPlacedPayload,
} from './order-notifications.types';

/**
 * Sends order lifecycle emails to the customer and to the configured admin
 * address(es).
 *
 * Both handlers are registered with `async: true`, so EventEmitter2 dispatches
 * them without awaiting and the order request path never waits on SMTP. Three
 * things keep a mail failure from affecting the order:
 *
 *   1. `async: true` - the emitter does not await the listener.
 *   2. `suppressErrors: true` - EventEmitter2 swallows rejections instead of
 *      letting them surface as an unhandled rejection.
 *   3. the try/catch in each handler - nothing is ever rethrown.
 *
 * `EmailService.sendEmail` additionally catches its own errors and resolves to
 * `false`, so a broken SMTP host degrades to a warning in the log.
 */
@Injectable()
export class OrderNotificationsListener {
  private readonly logger = new Logger(OrderNotificationsListener.name);

  constructor(private readonly emailService: EmailService) {}

  @OnEvent(ORDER_PLACED_EVENT, { async: true, suppressErrors: true })
  async handleOrderPlaced(payload: OrderPlacedPayload): Promise<void> {
    try {
      const admins = this.emailService.getAdminRecipients();

      // EmailService resolves to false instead of rejecting when a send fails,
      // so the results are inspected rather than just awaited - otherwise a
      // total mail outage would still be logged as "sent".
      const results = await Promise.all([
        this.emailService.sendOrderPlaced(payload, payload.customerEmail, false),
        this.emailService.sendOrderPlaced(payload, admins, true),
      ]);

      this.report(results[0], results[1], 'order-placed', payload.orderNumber);
    } catch (error) {
      this.logger.error(
        `Order-placed email failed for #${payload.orderNumber}: ${this.describe(error)}`,
      );
    }
  }

  @OnEvent(ORDER_CANCELLED_EVENT, { async: true, suppressErrors: true })
  async handleOrderCancelled(payload: OrderCancelledPayload): Promise<void> {
    try {
      const admins = this.emailService.getAdminRecipients();

      const results = await Promise.all([
        this.emailService.sendOrderCancelled(payload, payload.customerEmail, false),
        this.emailService.sendOrderCancelled(payload, admins, true),
      ]);

      this.report(results[0], results[1], 'order-cancelled', payload.orderNumber);
    } catch (error) {
      this.logger.error(
        `Order-cancelled email failed for #${payload.orderNumber}: ${this.describe(error)}`,
      );
    }
  }

  /**
   * Logs the true outcome. EmailService already logged the underlying SMTP
   * error, so this only records whether the notification actually went out and
   * to whom - never a false "sent".
   */
  private report(
    customerSent: boolean,
    adminSent: boolean,
    kind: string,
    orderNumber: string,
  ): void {
    if (customerSent && adminSent) {
      this.logger.log(`${kind} notifications sent for #${orderNumber}`);
      return;
    }

    const failed: string[] = [];
    if (!customerSent) failed.push('customer');
    if (!adminSent) failed.push('admin');

    this.logger.warn(
      `${kind} email delivery failed for #${orderNumber} (${failed.join(' and ')}) - order unaffected`,
    );
  }

  private describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}