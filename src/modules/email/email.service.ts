import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';
import {
  OrderEmailPayload,
  OrderPlacedPayload,
  OrderCancelledPayload,
} from '../order-notifications/order-notifications.types';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(EmailService.name);
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
    this.loadTemplates();
  }

  private initializeTransporter(): void {
    const smtpHost = this.configService.get<string>('SMTP_HOST') || 'localhost';
    // ConfigService returns raw dotenv strings - `get<number>` is only a TS
    // assertion and does not coerce. Without parseInt, `'465' === 465` is false
    // and port 465 never gets implicit TLS.
    const smtpPort = parseInt(this.configService.get<string>('SMTP_PORT') || '', 10) || 587;
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    // Accept either spelling; SMTP_FROM is what the .env actually uses.
    const smtpFromEmail =
      this.configService.get<string>('SMTP_FROM_EMAIL') ||
      this.configService.get<string>('SMTP_FROM') ||
      'noreply@dentzoo.com';

    // Check if SMTP credentials are configured
    if (!smtpUser || !smtpPassword) {
      this.logger.warn('SMTP credentials not configured - email sending will be disabled');
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465 (implicit TLS), false for 587 (STARTTLS)
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    this.logger.log(
      `Email transporter initialized for ${smtpFromEmail} via ${smtpHost}:${smtpPort} (secure: ${smtpPort === 465})`,
    );
  }

  private loadTemplates(): void {
    const templateDir = join(__dirname, 'templates');
    const templates = ['order-confirmation', 'order-cancelled', 'shipping-status', 'shipment-created', 'delivery-attempted', 'delivered', 'return-initiated'];

    templates.forEach((template) => {
      try {
        const filePath = join(templateDir, `${template}.hbs`);
        const content = readFileSync(filePath, 'utf-8');
        this.templates.set(template, Handlebars.compile(content));
        this.logger.log(`Template loaded: ${template}`);
      } catch (error) {
        this.logger.warn(`Failed to load template ${template}: ${error.message}`);
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email transporter not configured - skipping email send');
      return false;
    }

    try {
      const template = this.templates.get(options.template);
      if (!template) {
        this.logger.warn(`Template not found: ${options.template}`);
        return false;
      }

      const html = template(options.context);
    const smtpFromEmail = this.fromEmail();

      const mailOptions = {
        from: smtpFromEmail,
        to: options.to,
        subject: options.subject,
        html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${options.to}: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  /**
   * Resolved sender address. Accepts either `SMTP_FROM_EMAIL` or `SMTP_FROM`
   * so the .env spelling actually used in this repo works.
   */
  private fromEmail(): string {
    return (
      this.configService.get<string>('SMTP_FROM_EMAIL') ||
      this.configService.get<string>('SMTP_FROM') ||
      'noreply@dentzoo.com'
    );
  }

  /**
   * Admin recipients for order notifications. Configured via
   * ADMIN_NOTIFICATION_EMAIL, which may hold a comma-separated list so several
   * admins can be notified without a code change. Read from config rather than
   * the users table so the notification listener stays off the database pool.
   */
  getAdminRecipients(): string {
    const configured =
      this.configService.get<string>('ADMIN_NOTIFICATION_EMAIL') ||
      'support@dentzoo.com';

    return configured
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0)
      .join(', ');
  }

  /**
   * Order "placed" email - lists the products and the final price. The same
   * template serves the customer and the admin; `showCustomer` adds the
   * customer's contact details for the internal copy.
   */
  async sendOrderPlaced(
    payload: OrderPlacedPayload,
    to: string,
    isAdmin = false,
  ): Promise<boolean> {
    if (!to) {
      this.logger.warn('No recipient for order-placed email - skipping');
      return false;
    }

    return this.sendEmail({
      to,
      subject: isAdmin
        ? `New order placed - #${payload.orderNumber} (${this.money(payload.totalAmount)})`
        : `Order Confirmation - #${payload.orderNumber}`,
      template: 'order-confirmation',
      context: {
        ...this.baseOrderContext(payload),
        showCustomer: isAdmin,
      },
    });
  }

  /**
   * Order "cancelled" email - lists the products and the final price that was
   * cancelled, for both the customer and the admin.
   */
  async sendOrderCancelled(
    payload: OrderCancelledPayload,
    to: string,
    isAdmin = false,
  ): Promise<boolean> {
    if (!to) {
      this.logger.warn('No recipient for order-cancelled email - skipping');
      return false;
    }

    return this.sendEmail({
      to,
      subject: isAdmin
        ? `Order cancelled - #${payload.orderNumber} by ${payload.cancelledBy}`
        : `Order Cancelled - #${payload.orderNumber}`,
      template: 'order-cancelled',
      context: {
        ...this.baseOrderContext(payload),
        showCustomer: isAdmin,
        cancelledByLabel: payload.cancelledBy === 'admin' ? 'our team' : 'you',
        cancelledDate: this.formatDate(new Date()),
        reason: payload.reason,
      },
    });
  }

  /**
   * Context shared by the order-placed and order-cancelled templates.
   */
  private baseOrderContext(payload: OrderEmailPayload): Record<string, any> {
    const discount = this.money(payload.discountAmount);
    const tax = this.money(payload.taxAmount);

    return {
      orderNumber: payload.orderNumber,
      orderId: payload.orderId,
      status: payload.status,
      paymentMethod: this.humanizePaymentMethod(payload.paymentMethod),
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone,
      orderDate: this.formatDate(payload.placedAt),
      items: payload.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        lineTotal: this.money(item.totalAmount),
      })),
      subtotal: this.money(payload.subtotal),
      shippingAmount: this.money(payload.shippingAmount),
      discountAmount: discount,
      taxAmount: tax,
      hasDiscount: discount > 0,
      hasTax: tax > 0,
      totalAmount: this.money(payload.totalAmount),
      siteUrl: this.siteUrl(),
      // `GET /orders/:id` (OrderDetail) fetches `/orders/${id}` and
      // OrdersService.findOne() matches on `{ id }` only - an orderNumber
      // here would 404.
      orderUrl: `${this.siteUrl()}/orders/${payload.orderId}`,
      year: new Date().getFullYear(),
    };
  }

  /**
   * MySQL `decimal` columns come back from TypeORM as strings, so every
   * monetary value is coerced before it reaches a template - otherwise the
   * email renders "1299.000000".
   */
  private money(value: number | string | null | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private humanizePaymentMethod(method: string): string {
    const normalized = (method || '').toLowerCase();

    if (normalized === 'cod' || normalized === 'cash_on_delivery') {
      return 'Cash on Delivery';
    }
    if (normalized.includes('prepaid') || normalized.includes('card')) {
      return 'Prepaid (online)';
    }
    return method || '-';
  }

  private formatDate(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Storefront origin used for every link in an email. Read from env only -
   * no hardcoded domain, so changing SITE_URL (or the frontend's
   * VITE_SITE_URL) redirects every button without a code change.
   *
   * Trailing slashes are stripped so `${this.siteUrl()}/orders` never doubles up.
   */
  private siteUrl(): string {
    const raw =
      this.configService.get<string>('VITE_SITE_URL') ||
      this.configService.get<string>('SITE_URL') ||
      this.configService.get<string>('FRONTEND_URL');

    if (!raw || !raw.trim()) {
      // Email links are unusable without an origin, so warn loudly rather than
      // silently emitting broken hrefs.
      this.logger.warn(
        'No site URL configured (set SITE_URL or VITE_SITE_URL) - links in emails will be invalid',
      );
      return '';
    }

    return raw.trim().replace(/\/+$/, '');
  }

  /**
   * Send shipment created email
   */
  async sendShipmentCreated(shipmentData: {
    orderId: string;
    orderNumber: string;
    customerEmail: string;
    customerName: string;
    trackingNumber: string;
    courierName: string;
    estimatedDelivery: Date;
    labelUrl?: string;
  }): Promise<boolean> {
    return this.sendEmail({
      to: shipmentData.customerEmail,
      subject: `Shipment Confirmed - ${shipmentData.courierName} | #${shipmentData.orderNumber}`,
      template: 'shipment-created',
      context: {
        siteUrl: this.siteUrl(),
        customerName: shipmentData.customerName,
        orderNumber: shipmentData.orderNumber,
        trackingNumber: shipmentData.trackingNumber,
        courierName: shipmentData.courierName,
        estimatedDelivery: shipmentData.estimatedDelivery.toLocaleDateString('en-IN'),
        labelUrl: shipmentData.labelUrl,
        trackingUrl: `${this.siteUrl()}/orders`,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send shipping status update email
   */
  async sendShippingStatusUpdate(shipmentData: {
    orderNumber: string;
    customerEmail: string;
    customerName: string;
    trackingNumber: string;
    status: string;
    location: string;
    courierName: string;
    estimatedDelivery?: Date;
  }): Promise<boolean> {
    const statusMessages: Record<string, string> = {
      picked_up: 'Your package has been picked up',
      in_transit: 'Your package is on its way',
      out_for_delivery: 'Your package is out for delivery today',
      delivered: 'Your package has been delivered',
      failed: 'Delivery attempt failed',
      rto: 'Return to origin initiated',
    };

    return this.sendEmail({
      to: shipmentData.customerEmail,
      subject: `Shipment Update: ${statusMessages[shipmentData.status] || 'Status Update'} | #${shipmentData.orderNumber}`,
      template: 'shipping-status',
      context: {
        siteUrl: this.siteUrl(),
        customerName: shipmentData.customerName,
        orderNumber: shipmentData.orderNumber,
        trackingNumber: shipmentData.trackingNumber,
        status: shipmentData.status,
        statusMessage: statusMessages[shipmentData.status] || shipmentData.status,
        location: shipmentData.location,
        courierName: shipmentData.courierName,
        estimatedDelivery: shipmentData.estimatedDelivery?.toLocaleDateString('en-IN'),
        trackingUrl: `${this.siteUrl()}/orders`,
        // Handlebars' `if` takes exactly one argument, so the comparison has to
        // be precomputed rather than written as `{{#if (eq status '...')}}`.
        isOutForDelivery: shipmentData.status === 'out_for_delivery',
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send delivery attempted email
   */
  async sendDeliveryAttempted(shipmentData: {
    orderNumber: string;
    customerEmail: string;
    customerName: string;
    trackingNumber: string;
    courierName: string;
    location: string;
  }): Promise<boolean> {
    return this.sendEmail({
      to: shipmentData.customerEmail,
      subject: `Delivery Attempt Failed - Action Required | #${shipmentData.orderNumber}`,
      template: 'delivery-attempted',
      context: {
        siteUrl: this.siteUrl(),
        customerName: shipmentData.customerName,
        orderNumber: shipmentData.orderNumber,
        trackingNumber: shipmentData.trackingNumber,
        courierName: shipmentData.courierName,
        location: shipmentData.location,
        trackingUrl: `${this.siteUrl()}/orders`,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send delivered email
   */
  async sendDelivered(shipmentData: {
    orderNumber: string;
    customerEmail: string;
    customerName: string;
    trackingNumber: string;
    courierName: string;
    deliveredDate: Date;
  }): Promise<boolean> {
    return this.sendEmail({
      to: shipmentData.customerEmail,
      subject: `Delivery Confirmed - Thank You! | #${shipmentData.orderNumber}`,
      template: 'delivered',
      context: {
        siteUrl: this.siteUrl(),
        customerName: shipmentData.customerName,
        orderNumber: shipmentData.orderNumber,
        trackingNumber: shipmentData.trackingNumber,
        courierName: shipmentData.courierName,
        deliveredDate: shipmentData.deliveredDate.toLocaleDateString('en-IN'),
        feedbackUrl: `${this.siteUrl()}/orders`,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send return initiated email
   */
  async sendReturnInitiated(returnData: {
    orderNumber: string;
    customerEmail: string;
    customerName: string;
    trackingNumber: string;
    returnReason: string;
    returnInstructionUrl?: string;
  }): Promise<boolean> {
    return this.sendEmail({
      to: returnData.customerEmail,
      subject: `Return Request Received - #${returnData.orderNumber}`,
      template: 'return-initiated',
      context: {
        siteUrl: this.siteUrl(),
        customerName: returnData.customerName,
        orderNumber: returnData.orderNumber,
        trackingNumber: returnData.trackingNumber,
        returnReason: returnData.returnReason,
        returnInstructionUrl: returnData.returnInstructionUrl || `${this.siteUrl()}/returns`,
        year: new Date().getFullYear(),
      },
    });
  }

  async sendSupportEmail(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    userId?: string;
  }): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email transporter not configured - skipping support email');
      return false;
    }

    try {
      const smtpFromEmail = this.fromEmail();
      const html = `
        <h2>New Support Message</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px;">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Name</td><td style="padding:8px;border:1px solid #ddd;">${data.name}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:8px;border:1px solid #ddd;">${data.email}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Subject</td><td style="padding:8px;border:1px solid #ddd;">${data.subject}</td></tr>
          ${data.userId ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">User ID</td><td style="padding:8px;border:1px solid #ddd;">${data.userId}</td></tr>` : ''}
        </table>
        <h3>Message:</h3>
        <p style="padding:12px;background:#f5f5f5;border-radius:4px;">${data.message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p style="color:#888;font-size:12px;">Sent from the Dentzoo Help & Support form</p>
      `;

      const mailOptions = {
        from: smtpFromEmail,
        to: 'support@dentzoo.com',
        subject: `Support Message: ${data.subject} - from ${data.name}`,
        html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Support email sent to support@dentzoo.com: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send support email:', error);
      return false;
    }
  }
}
