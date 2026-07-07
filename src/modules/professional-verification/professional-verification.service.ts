import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities';
import { SubmitCredentialsDto } from './dto/submit-credentials.dto';
import { VerificationResponseDto } from './dto/verification-response.dto';
import { DciVerifier } from './verifiers/dci-verifier';

@Injectable()
export class ProfessionalVerificationService {
  private readonly logger = new Logger(ProfessionalVerificationService.name);
  private readonly MAX_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dciVerifier: DciVerifier,
  ) {}

  async submitCredentials(userId: string, dto: SubmitCredentialsDto): Promise<VerificationResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { verified: false, error: 'User not found', retryable: false };
    }

    if (user.isProfessionalVerified) {
      return { verified: true, matchedName: `${user.firstName} ${user.lastName}`, source: user.verificationMethod };
    }

    const canRetry = this.canAttemptVerification(user);
    if (!canRetry) {
      const nextAttempt = new Date(user.verificationLastAttemptAt.getTime() + this.RATE_LIMIT_WINDOW_MS);
      return {
        verified: false,
        error: `Maximum verification attempts reached. Try again after ${nextAttempt.toLocaleTimeString()}.`,
        retryable: true,
        nextAttemptAt: nextAttempt,
      };
    }

    await this.userRepository.update(userId, {
      dentalRegistrationId: dto.dentalRegistrationId,
      stateDentalCouncil: dto.stateDentalCouncil,
      verificationAttempts: user.verificationAttempts + 1,
      verificationLastAttemptAt: new Date(),
    });

    const result = await this.dciVerifier.verify(dto.dentalRegistrationId, dto.stateDentalCouncil);

    if (result.verified) {
      await this.userRepository.update(userId, {
        isProfessionalVerified: true,
        professionalVerifiedAt: new Date(),
        verificationMethod: result.source,
        verificationError: null,
      });
      this.logger.log(`User ${userId} professionally verified via ${result.source}`);
    } else if (!result.retryable) {
      await this.userRepository.update(userId, {
        verificationError: result.error,
      });
    }

    return result;
  }

  async getVerificationStatus(userId: string): Promise<{ verified: boolean; professional: any }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { verified: false, professional: null };
    }

    return {
      verified: user.isProfessionalVerified,
      professional: {
        dentalRegistrationId: user.dentalRegistrationId,
        stateDentalCouncil: user.stateDentalCouncil,
        isVerified: user.isProfessionalVerified,
        verifiedAt: user.professionalVerifiedAt,
        verificationMethod: user.verificationMethod,
        verificationError: user.verificationError,
        verificationAttempts: user.verificationAttempts,
      },
    };
  }

  async getPendingVerifications(page = 1, limit = 20) {
    const [users, total] = await this.userRepository.findAndCount({
      where: { isProfessionalVerified: false },
      order: { verificationLastAttemptAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      users: users.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        dentalRegistrationId: u.dentalRegistrationId,
        stateDentalCouncil: u.stateDentalCouncil,
        verificationAttempts: u.verificationAttempts,
        verificationError: u.verificationError,
        verificationLastAttemptAt: u.verificationLastAttemptAt,
      })),
      total,
      page,
      limit,
    };
  }

  async approveManually(userId: string): Promise<VerificationResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { verified: false, error: 'User not found', retryable: false };
    }

    await this.userRepository.update(userId, {
      isProfessionalVerified: true,
      professionalVerifiedAt: new Date(),
      verificationMethod: 'manual',
      verificationError: null,
    });

    return { verified: true, matchedName: `${user.firstName} ${user.lastName}`, source: 'manual' };
  }

  async rejectManually(userId: string, reason: string): Promise<VerificationResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { verified: false, error: 'User not found', retryable: false };
    }

    await this.userRepository.update(userId, {
      verificationError: reason || 'Rejected by admin',
    });

    return { verified: false, error: reason || 'Rejected by admin', retryable: false };
  }

  async reVerify(userId: string): Promise<VerificationResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.dentalRegistrationId || !user.stateDentalCouncil) {
      return { verified: false, error: 'No credentials submitted yet', retryable: false };
    }

    const result = await this.dciVerifier.verify(user.dentalRegistrationId, user.stateDentalCouncil);

    if (result.verified) {
      await this.userRepository.update(userId, {
        isProfessionalVerified: true,
        professionalVerifiedAt: new Date(),
        verificationMethod: result.source,
        verificationError: null,
      });
    }

    return result;
  }

  private canAttemptVerification(user: User): boolean {
    if (!user.verificationLastAttemptAt) return true;
    if (user.verificationAttempts >= this.MAX_ATTEMPTS) {
      const timeSinceLastAttempt = Date.now() - user.verificationLastAttemptAt.getTime();
      return timeSinceLastAttempt >= this.RATE_LIMIT_WINDOW_MS;
    }
    return true;
  }
}
