import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../database/entities';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { OtpService } from '../otp/otp.service';

export interface SocialUserData {
  provider: 'google' | 'facebook' | 'apple';
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface LockoutEntry {
  count: number;
  lockUntil: number;
}

@Injectable()
export class AuthService {
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly BASE_LOCKOUT_MS = 15 * 60 * 1000;

  private readonly lockouts = new Map<string, LockoutEntry>();
  private readonly prevRefreshTokens = new Map<string, string>();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, phone, password, firstName, lastName } = registerDto;

    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { phone }],
    });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = this.userRepository.create({
        email,
        phone,
        password: hashedPassword,
        firstName,
        lastName,
        role: UserRole.USER,
        isEmailVerified: false,
      });

      await this.userRepository.save(user);
      await this.otpService.sendOtp(email, 'register');
    }

    return {
      message:
        'Registration successful. Please verify your email with the OTP sent.',
      email,
      requiresVerification: true,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const lockoutKey = email.toLowerCase();

    const lockout = this.lockouts.get(lockoutKey);
    if (lockout && lockout.lockUntil > Date.now()) {
      throw new UnauthorizedException(
        'Too many failed attempts. Please try again later.',
      );
    }

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      this.recordFailedAttempt(lockoutKey);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    this.lockouts.delete(lockoutKey);

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isValid) {
      const prevHash = this.prevRefreshTokens.get(user.id);
      if (prevHash && (await bcrypt.compare(refreshToken, prevHash))) {
        this.prevRefreshTokens.delete(user.id);
        await this.userRepository.update(user.id, { refreshToken: '' as any });
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    const newHash = await bcrypt.hash(tokens.refreshToken, 10);
    this.prevRefreshTokens.set(user.id, user.refreshToken);
    await this.userRepository.update(user.id, { refreshToken: newHash });

    return tokens;
  }

  async logout(userId: string) {
    this.prevRefreshTokens.delete(userId);
    await this.userRepository.update(userId, {
      refreshToken: '' as any,
    });
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return this.sanitizeUser(user);
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return user;
  }

  async verifyOtp(dto: VerifyOtpDto) {
    await this.otpService.verifyOtp(dto.email, dto.code, dto.type);

    if (dto.type === 'login') {
      const user = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (!user) throw new UnauthorizedException('User not found');
      if (!user.isActive)
        throw new UnauthorizedException('Account is deactivated');

      const tokens = await this.generateTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);
      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    }

    if (dto.type === 'register') {
      const user = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (!user) throw new UnauthorizedException('User not found');

      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date();
      await this.userRepository.save(user);

      const tokens = await this.generateTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);
      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    }

    return { message: 'OTP verified successfully' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    await this.otpService.verifyOtp(dto.email, dto.code, 'reset');

    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('User not found');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);
    await this.otpService.markOtpUsed(dto.email, 'reset');

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn:
          this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    this.prevRefreshTokens.delete(userId);
    await this.userRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  private sanitizeUser(user: User) {
    const { password, refreshToken, ...result } = user;
    return result;
  }

  private recordFailedAttempt(key: string) {
    const entry = this.lockouts.get(key) || { count: 0, lockUntil: 0 };
    entry.count += 1;

    if (entry.count >= AuthService.MAX_FAILED_ATTEMPTS) {
      const extra =
        entry.count - AuthService.MAX_FAILED_ATTEMPTS;
      const delay = AuthService.BASE_LOCKOUT_MS * Math.pow(2, extra);
      entry.lockUntil = Date.now() + delay;
    }

    this.lockouts.set(key, entry);
    this.pruneLockouts();
  }

  private pruneLockouts() {
    const cutoff = Date.now() - AuthService.BASE_LOCKOUT_MS;
    for (const [key, entry] of this.lockouts) {
      if (entry.lockUntil <= cutoff) {
        this.lockouts.delete(key);
      }
    }
  }

  async validateSocialUser(data: SocialUserData) {
    const { provider, providerId, email, firstName, lastName, avatar } =
      data;

    const providerField =
      `${provider}Id` as 'googleId' | 'facebookId' | 'appleId';

    let user = await this.userRepository.findOne({
      where: { [providerField]: providerId },
    });

    if (user) {
      if (avatar && user.avatar !== avatar) {
        user.avatar = avatar;
        await this.userRepository.save(user);
      }
      const tokens = await this.generateTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);
      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    }

    user = await this.userRepository.findOne({
      where: { email },
    });

    if (user) {
      user[providerField] = providerId;
      if (avatar) user.avatar = avatar;
      user.isSocialLogin = true;
      user.isEmailVerified = true;
      await this.userRepository.save(user);
      const tokens = await this.generateTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);
      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    }

    const randomPassword =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    user = this.userRepository.create({
      email,
      phone: `social_${Date.now()}`,
      password: hashedPassword,
      firstName: firstName || 'User',
      lastName: lastName || '',
      [providerField]: providerId,
      avatar: avatar || '',
      isSocialLogin: true,
      isEmailVerified: true,
    });

    await this.userRepository.save(user);
    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }
}
