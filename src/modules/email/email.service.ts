import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';

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
    const smtpPort = this.configService.get<number>('SMTP_PORT') || 587;
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    const smtpFromEmail = this.configService.get<string>('SMTP_FROM_EMAIL') || 'noreply@dentalkart.com';

    // Check if SMTP credentials are configured
    if (!smtpUser || !smtpPassword) {
      this.logger.warn('SMTP credentials not configured - email sending will be disabled');
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    this.logger.log(`Email transporter initialized for ${smtpFromEmail}`);
  }

  private loadTemplates(): void {
    const templateDir = join(__dirname, 'templates');
    const templates = ['order-confirmation', 'shipping-status', 'shipment-created', 'delivery-attempted', 'delivered', 'return-initiated'];

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
      const smtpFromEmail = this.configService.get<string>('SMTP_FROM_EMAIL') || 'noreply@dentalkart.com';

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
   * Send order confirmation email
   */
  async sendOrderConfirmation(orderData: {
    orderId: string;
    orderNumber: string;
    customerEmail: string;
    customerName: string;
    totalAmount: number;
    items: Array<{ name: string; quantity: number; price: number }>;
  }): Promise<boolean> {
    return this.sendEmail({
      to: orderData.customerEmail,
      subject: `Order Confirmation - #${orderData.orderNumber}`,
      template: 'order-confirmation',
      context: {
        customerName: orderData.customerName,
        orderNumber: orderData.orderNumber,
        orderId: orderData.orderId,
        items: orderData.items,
        totalAmount: orderData.totalAmount,
        year: new Date().getFullYear(),
      },
    });
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
        customerName: shipmentData.customerName,
        orderNumber: shipmentData.orderNumber,
        trackingNumber: shipmentData.trackingNumber,
        courierName: shipmentData.courierName,
        estimatedDelivery: shipmentData.estimatedDelivery.toLocaleDateString('en-IN'),
        labelUrl: shipmentData.labelUrl,
        trackingUrl: `https://dentalkart.com/track/${shipmentData.trackingNumber}`,
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
        customerName: shipmentData.customerName,
        orderNumber: shipmentData.orderNumber,
        trackingNumber: shipmentData.trackingNumber,
        status: shipmentData.status,
        statusMessage: statusMessages[shipmentData.status] || shipmentData.status,
        location: shipmentData.location,
        courierName: shipmentData.courierName,
        estimatedDelivery: shipmentData.estimatedDelivery?.toLocaleDateString('en-IN'),
        trackingUrl: `https://dentalkart.com/track/${shipmentData.trackingNumber}`,
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
        customerName: shipmentData.customerName,
        orderNumber: shipmentData.orderNumber,
        trackingNumber: shipmentData.trackingNumber,
        courierName: shipmentData.courierName,
        location: shipmentData.location,
        trackingUrl: `https://dentalkart.com/track/${shipmentData.trackingNumber}`,
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
        customerName: shipmentData.customerName,
        orderNumber: shipmentData.orderNumber,
        trackingNumber: shipmentData.trackingNumber,
        courierName: shipmentData.courierName,
        deliveredDate: shipmentData.deliveredDate.toLocaleDateString('en-IN'),
        feedbackUrl: `https://dentalkart.com/orders/${shipmentData.orderNumber}/feedback`,
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
        customerName: returnData.customerName,
        orderNumber: returnData.orderNumber,
        trackingNumber: returnData.trackingNumber,
        returnReason: returnData.returnReason,
        returnInstructionUrl: returnData.returnInstructionUrl || 'https://dentalkart.com/returns/instructions',
        year: new Date().getFullYear(),
      },
    });
  }
}
