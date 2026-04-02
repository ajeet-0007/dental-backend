import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const { id, displayName, emails, photos } = profile;
    const email = emails?.[0]?.value;
    const firstName = displayName?.split(' ')[0] || '';
    const lastName = displayName?.split(' ').slice(1).join(' ') || '';
    const avatar = photos?.[0]?.value || '';

    if (!email) {
      throw new Error('No email provided by Google');
    }

    const user = await this.authService.validateSocialUser({
      provider: 'google',
      providerId: id,
      email,
      firstName,
      lastName,
      avatar,
    });

    return user;
  }
}
