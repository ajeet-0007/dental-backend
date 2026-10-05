import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { OrderNotificationsListener } from './order-notifications.listener';

/**
 * Event-driven order lifecycle emails. The listener is the only provider; there
 * is no controller - orders are notified by emitting ORDER_PLACED_EVENT /
 * ORDER_CANCELLED_EVENT from the order and payment services.
 */
@Module({
  imports: [EmailModule],
  providers: [OrderNotificationsListener],
  exports: [OrderNotificationsListener],
})
export class OrderNotificationsModule {}