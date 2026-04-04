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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request as ExpressRequest } from 'express';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  async logout(@Request() req: any) {
    await this.authService.logout(req.user.id);
    return { message: 'Logged out successfully' };
  }

  @Post('google/token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Google token and login/register user' })
  async googleToken(@Body() body: { token: string }) {
    const { token } = body;
    
    // Decode the Google JWT token
    const decoded = jwt.decode(token) as any;
    
    if (!decoded) {
      throw new Error('Invalid token');
    }

    const { email, name, picture, sub: googleId } = decoded;
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

    return result;
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const { user, accessToken, refreshToken } = req.user;
    let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    // Remove trailing slash if present
    frontendUrl = frontendUrl.replace(/\/$/, '');
    const tokenPayload = Buffer.from(JSON.stringify({ accessToken, refreshToken, user })).toString('base64');
    res.redirect(`${frontendUrl}/auth/callback?token=${tokenPayload}`);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  facebookAuth() {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  facebookAuthCallback(@Req() req: any, @Res() res: Response) {
    const { user, accessToken, refreshToken } = req.user;
    let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    frontendUrl = frontendUrl.replace(/\/$/, '');
    const tokenPayload = Buffer.from(JSON.stringify({ accessToken, refreshToken, user })).toString('base64');
    res.redirect(`${frontendUrl}/auth/callback?token=${tokenPayload}`);
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Initiate Apple OAuth login' })
  appleAuth() {}

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple OAuth callback' })
  appleAuthCallback(@Req() req: any, @Res() res: Response) {
    const { user, accessToken, refreshToken } = req.user;
    let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    frontendUrl = frontendUrl.replace(/\/$/, '');
    const tokenPayload = Buffer.from(JSON.stringify({ accessToken, refreshToken, user })).toString('base64');
    res.redirect(`${frontendUrl}/auth/callback?token=${tokenPayload}`);
  }
}
