import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import {
  OrderCancelledPayload,
  OrderPlacedPayload,
} from './order-notifications.types';

/**
 * Sends order lifecycle emails to the customer and to the configured admin
 * address(es).
 *
 * These handlers are called directly and awaited rather than being dispatched
 * through `@OnEvent`. With `async: true`, eventemitter2 hands the listener to
 * `setImmediate` and `emit()` returns a boolean, so nothing waits for the send
 * to finish. That is fine under a long-lived local process, but on Vercel the
 * function is frozen as soon as the response is sent and the detached SMTP send
 * dies mid-flight - which is why order-placed mail arrived locally but never in
 * production. Cancellation mail still made it only because that request happens
 * to run long enough (ShipRocket cancel + inventory release) for the send to
 * complete first.
 *
 * Failure isolation is unchanged: the order is already committed by the time
 * these run, and every method swallows its own errors, so a mail failure can
 * never roll back or fail an order. `EmailService.sendEmail` additionally
 * catches its own errors and resolves to `false`, so a broken SMTP host
 * degrades to a warning in the log rather than an exception.
 */
@Injectable()
export class OrderNotificationsListener {
  private readonly logger = new Logger(OrderNotificationsListener.name);

  constructor(private readonly emailService: EmailService) {}

  async notifyOrderPlaced(payload: OrderPlacedPayload): Promise<void> {
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

  async notifyOrderCancelled(payload: OrderCancelledPayload): Promise<void> {
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