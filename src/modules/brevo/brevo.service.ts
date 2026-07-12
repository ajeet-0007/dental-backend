import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';

@Injectable()
export class BrevoService {
  private client: BrevoClient;
  private readonly logger = new Logger(BrevoService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (!apiKey) {
      throw new Error('BREVO_API_KEY is not configured');
    }
    this.client = new BrevoClient({
      apiKey: apiKey,
    });
  }

  async sendOtpEmail(
    to: string,
    otp: string,
    type: 'login' | 'register' | 'reset',
  ): Promise<boolean> {
    try {
      const templateId =
        type === 'reset'
          ? this.configService.get<number>('BREVO_PASSWORD_RESET_TEMPLATE_ID')
          : this.configService.get<number>('BREVO_OTP_TEMPLATE_ID');

      const senderEmail =
        this.configService.get<string>('BREVO_SENDER_EMAIL') ||
        'noreply@dentalkart.com';
      const senderName =
        this.configService.get<string>('BREVO_SENDER_NAME') || 'Dentalkart';

      const subject =
        type === 'reset'
          ? 'Reset Your Dentalkart Password'
          : 'Your Dentalkart Verification Code';

      const htmlContent = this.getOtpHtml(otp, type);

      if (templateId && templateId > 2) {
        await this.client.transactionalEmails.sendTransacEmail({
          subject,
          sender: { email: senderEmail, name: senderName },
          to: [{ email: to }],
          templateId: Number(templateId),
          params: { code: otp, type },
        });
      } else {
        await this.client.transactionalEmails.sendTransacEmail({
          subject,
          sender: { email: senderEmail, name: senderName },
          to: [{ email: to }],
          htmlContent,
        });
      }

      this.logger.log(`OTP email sent to ${to} for type: ${type}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}:`, error);
      return false;
    }
  }

  private getOtpHtml(otp: string, type: string): string {
    const heading =
      type === 'reset' ? 'Password Reset Request' : 'Verification Code';
    const message =
      type === 'reset'
        ? 'You requested to reset your Dentalkart password. Use the code below:'
        : 'Use the following code to verify your email:';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #333; text-align: center;">Dentalkart</h2>
        <h3 style="color: #555; text-align: center;">${heading}</h3>
        <p style="color: #666; font-size: 14px;">${message}</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333; background: #f5f5f5; padding: 15px 30px; border-radius: 8px;">${otp}</span>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `;
  }
}
