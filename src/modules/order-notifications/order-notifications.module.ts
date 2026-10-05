import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { OrderNotificationsListener } from './order-notifications.listener';

/**
 * Order lifecycle emails. The listener is the only provider and is exported so
 * the order, payment, admin and shipping paths can inject it directly. There is
 * no controller - notifications are awaited at each call site rather than
 * dispatched through the event emitter, because a detached emit is dropped when
 * a serverless instance is frozen after the response.
 */
@Module({
  imports: [EmailModule],
  providers: [OrderNotificationsListener],
  exports: [OrderNotificationsListener],
})
export class OrderNotificationsModule {}