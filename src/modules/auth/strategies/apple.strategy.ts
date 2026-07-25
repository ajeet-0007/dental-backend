import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private authService: AuthService, private configService: ConfigService) {
    super({
      clientID: configService.get('APPLE_CLIENT_ID') || '',
      teamID: configService.get('APPLE_TEAM_ID') || '',
      keyID: configService.get('APPLE_KEY_ID') || '',
      privateKeyLocation: configService.get('APPLE_PRIVATE_KEY_PATH') || '',
      callbackURL: configService.get('APPLE_CALLBACK_URL') || 'http://localhost:3000/api/auth/apple/callback',
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
