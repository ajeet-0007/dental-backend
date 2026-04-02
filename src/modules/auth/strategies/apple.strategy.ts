import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-apple';
import { AuthService } from '../auth.service';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.APPLE_CLIENT_ID || '',
      teamID: process.env.APPLE_TEAM_ID || '',
      keyID: process.env.APPLE_KEY_ID || '',
      privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH || '',
      callbackURL: process.env.APPLE_CALLBACK_URL || 'http://localhost:3000/api/auth/apple/callback',
      scope: ['email', 'name'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const { id, email, name } = profile;
    const appleEmail = email || `apple_${id}@placeholder.com`;
    const firstName = name?.firstName || '';
    const lastName = name?.lastName || '';
    const avatar = '';

    if (!appleEmail) {
      throw new Error('No email provided by Apple');
    }

    const user = await this.authService.validateSocialUser({
      provider: 'apple',
      providerId: id,
      email: appleEmail,
      firstName,
      lastName,
      avatar,
    });

    return user;
  }
}
