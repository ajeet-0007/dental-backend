import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  SendOtpDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { GoogleRecaptchaGuard } from '@nestlab/google-recaptcha';
import { Response, Request as ExpressRequest } from 'express';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OtpService } from '../otp/otp.service';
import {
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
  clearAuthCookies,
} from './auth-cookies';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UseGuards(GoogleRecaptchaGuard)
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(GoogleRecaptchaGuard)
  @ApiOperation({ summary: 'Login user' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    setAuthCookies(res, this.configService, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      req.cookies?.[REFRESH_TOKEN_COOKIE] || refreshTokenDto.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const tokens = await this.authService.refreshTokens(refreshToken);
    setAuthCookies(res, this.configService, tokens.accessToken, tokens.refreshToken);
    return { message: 'OK' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@Request() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  async logout(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user.id);
    clearAuthCookies(res, this.configService);
    return { message: 'Logged out successfully' };
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Send OTP to email' })
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.otpService.sendOtp(
      sendOtpDto.email,
      sendOtpDto.type as 'login' | 'register' | 'reset',
    );
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify OTP' })
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyOtp(verifyOtpDto);
    if ('accessToken' in result) {
      setAuthCookies(
        res,
        this.configService,
        result.accessToken,
        result.refreshToken,
      );
      return { user: result.user };
    }
    return result;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UseGuards(GoogleRecaptchaGuard)
  @ApiOperation({ summary: 'Send password reset OTP' })
  async forgotPassword(@Body() body: { email: string }) {
    return this.otpService.sendOtp(body.email, 'reset');
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password with OTP' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.resetPassword(resetPasswordDto);
    setAuthCookies(res, this.configService, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('google/token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(GoogleRecaptchaGuard)
  @ApiOperation({ summary: 'Verify Google token and login/register user' })
  async googleToken(
    @Body() body: { token: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token } = body;
    if (!token) {
      throw new UnauthorizedException('Invalid token');
    }

    const clientId = this.configService.get('GOOGLE_CLIENT_ID');

    let payload: any;
    try {
      const { data } = await axios.get(
        'https://oauth2.googleapis.com/tokeninfo',
        { params: { id_token: token }, timeout: 10000 },
      );
      payload = data;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (
      !payload ||
      !payload.sub ||
      !payload.email ||
      payload.aud !== clientId
    ) {
      throw new UnauthorizedException('Invalid token');
    }

    const { email, name, picture, sub: googleId } = payload;
    const firstName = name?.split(' ')[0] || '';
    const lastName = name?.split(' ').slice(1).join(' ') || '';

    const result = await this.authService.validateSocialUser({
      provider: 'google',
      providerId: googleId,
      email,
      firstName,
      lastName,
      avatar: picture,
    });

    setAuthCookies(res, this.configService, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const { accessToken, refreshToken } = req.user;
    const frontendUrl = this.getFrontendUrl();
    setAuthCookies(res, this.configService, accessToken, refreshToken);
    res.redirect(`${frontendUrl}/auth/callback`);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  facebookAuth() {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  facebookAuthCallback(@Req() req: any, @Res() res: Response) {
    const { accessToken, refreshToken } = req.user;
    const frontendUrl = this.getFrontendUrl();
    setAuthCookies(res, this.configService, accessToken, refreshToken);
    res.redirect(`${frontendUrl}/auth/callback`);
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Initiate Apple OAuth login' })
  appleAuth() {}

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple OAuth callback' })
  appleAuthCallback(@Req() req: any, @Res() res: Response) {
    const { accessToken, refreshToken } = req.user;
    const frontendUrl = this.getFrontendUrl();
    setAuthCookies(res, this.configService, accessToken, refreshToken);
    res.redirect(`${frontendUrl}/auth/callback`);
  }

  private getFrontendUrl(): string {
    let frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
    return frontendUrl.replace(/\/$/, '');
  }
}
