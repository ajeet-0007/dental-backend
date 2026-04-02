import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.FACEBOOK_APP_ID || '',
      clientSecret: process.env.FACEBOOK_APP_SECRET || '',
      callbackURL: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/api/auth/facebook/callback',
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'displayName', 'email', 'picture'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const { id, displayName, emails, photos } = profile;
    const email = emails?.[0]?.value;
    const firstName = displayName?.split(' ')[0] || '';
    const lastName = displayName?.split(' ').slice(1).join(' ') || '';
    const avatar = photos?.[0]?.value || '';

    if (!email) {
      throw new Error('No email provided by Facebook');
    }

    const user = await this.authService.validateSocialUser({
      provider: 'facebook',
      providerId: id,
      email,
      firstName,
      lastName,
      avatar,
    });

    return user;
  }
}
