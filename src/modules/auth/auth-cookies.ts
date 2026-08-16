import { CookieOptions, Response } from 'express';
import { ConfigService } from '@nestjs/config';

export const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';

export function getCookieOptions(
  configService: ConfigService,
): CookieOptions {
  const sameSite = configService.get('COOKIE_SAME_SITE') || 'lax';
  return {
    httpOnly: true,
    secure: configService.get('NODE_ENV') === 'production',
    sameSite: sameSite as 'lax' | 'strict' | 'none',
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  configService: ConfigService,
  accessToken: string,
  refreshToken: string,
) {
  const base = getCookieOptions(configService);
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...base,
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...base,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

export function clearAuthCookies(
  res: Response,
  configService: ConfigService,
) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, getCookieOptions(configService));
  res.clearCookie(REFRESH_TOKEN_COOKIE, getCookieOptions(configService));
}
