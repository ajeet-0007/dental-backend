import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Otp, OtpType } from '../../database/entities';
import { BrevoService } from '../brevo/brevo.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
    private brevoService: BrevoService,
  ) {}

  async generateOtp(): Promise<string> {
    return crypto.randomInt(1000, 9999).toString();
  }

  async sendOtp(
    email: string,
    type: 'login' | 'register' | 'reset',
  ): Promise<{ message: string }> {
    const recentOtp = await this.otpRepository.findOne({
      where: {
        email,
        type: type as OtpType,
        isUsed: false,
        createdAt: MoreThan(new Date(Date.now() - 60 * 1000)),
      },
      order: { createdAt: 'DESC' },
    });

    if (recentOtp) {
      throw new BadRequestException(
        'Please wait 60 seconds before requesting a new OTP',
      );
    }

    const otp = await this.generateOtp();
    const hashedCode = await bcrypt.hash(otp, 10);

    const otpRecord = this.otpRepository.create({
      email,
      code: hashedCode,
      type: type as OtpType,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await this.otpRepository.save(otpRecord);
    await this.brevoService.sendOtpEmail(email, otp, type);

    this.logger.log(`OTP sent to ${email} for type: ${type}`);
    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(
    email: string,
    code: string,
    type: string,
  ): Promise<boolean> {
    const otpRecord = await this.otpRepository.findOne({
      where: {
        email,
        type: type as OtpType,
        isUsed: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (otpRecord.expiresAt < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    if (otpRecord.attempts >= 3) {
      otpRecord.isUsed = true;
      await this.otpRepository.save(otpRecord);
      throw new BadRequestException(
        'Too many attempts. Please request a new OTP',
      );
    }

    const isValid = await bcrypt.compare(code, otpRecord.code);
    if (!isValid) {
      otpRecord.attempts += 1;
      await this.otpRepository.save(otpRecord);
      throw new BadRequestException('Invalid OTP');
    }

    otpRecord.isUsed = true;
    await this.otpRepository.save(otpRecord);

    return true;
  }
}
