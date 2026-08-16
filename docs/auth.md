# Auth Module

**Location:** `src/modules/auth/`

## Purpose

Handles user authentication including email/password registration, login, JWT token management, and social login via Google, Facebook, and Apple.

---

## Flow Diagrams

### Registration Flow

```
Client                         AuthService                         Database
  │                               │                                  │
  │  POST /auth/register          │                                  │
  │  { email, phone, password,    │                                  │
  │    firstName, lastName }      │                                  │
  │ ──────────────────────────►   │                                  │
  │                               │  Check duplicate email/phone     │
  │                               │ ──────────────────────────────►  │
  │                               │ ◄── exists? ─────────────────── │
  │                               │                                  │
  │                               │  bcrypt.hash(password, 10)       │
  │                               │                                  │
  │                               │  userRepository.create()         │
  │                               │  userRepository.save()           │
  │                               │ ──────────────────────────────►  │
  │                               │                                  │
  │                               │  generateTokens(user):           │
  │                               │    jwt.sign(accessToken)         │
  │                               │      (JWT_SECRET, 15m)           │
  │                               │    jwt.sign(refreshToken)        │
  │                               │      (JWT_REFRESH_SECRET, 7d)    │
  │                               │                                  │
  │                               │  bcrypt.hash(refreshToken)       │
  │                               │  update user.refreshToken        │
  │                               │ ──────────────────────────────►  │
  │                               │                                  │
  │  ◄── { user(no pwd) }         │                                  │
  │       + httpOnly cookies       │                                  │
  │       (accessToken, refreshToken)                                │
```

### Login Flow

```
Client                         AuthService                         Database
  │                               │                                  │
  │  POST /auth/login             │                                  │
  │  { email, password }          │                                  │
  │ ──────────────────────────►   │                                  │
  │                               │  Check lockout store (brute-     │
  │                               │    force protection)             │
  │                               │  Find user by email              │
  │                               │ ──────────────────────────────►  │
  │                               │ ◄── user ────────────────────── │
  │                               │                                  │
  │                               │  bcrypt.compare(password, hash)  │
  │                               │  Check user.isActive             │
  │                               │  generateTokens(user)            │
  │                               │  updateRefreshToken()            │
  │                               │ ──────────────────────────────►  │
  │                               │                                  │
  │  ◄── { user } + httpOnly     │                                  │
  │       cookies                 │                                  │
```

### Social Login (Server-side OAuth)

```
Browser                     Backend                         OAuth Provider
  │                           │                                  │
  │  GET /auth/google         │                                  │
  │  (redirect)               │                                  │
  │ ──────────────────────►   │                                  │
  │                           │  AuthGuard('google') redirects   │
  │  ◄── redirect ───────────│                                  │
  │                           │                                  │
  │  ───────────────────────────────────────────────────────►   │
  │                           │                                  │
  │  ◄── auth code ──────────────────────────────────────────── │
  │                           │                                  │
  │  GET /auth/google/callback│                                  │
  │ ──────────────────────►   │                                  │
  │                           │  GoogleStrategy.validate()       │
  │                           │  → authService.validateSocial()  │
  │                           │                                  │
  │                           │  Lookup by googleId              │
  │                           │    ├── found → update avatar     │
  │                           │    │          generate tokens    │
  │                           │    └── not found → lookup email  │
  │                           │        ├── found → link provider │
  │                           │        └── not found → create    │
  │                           │                     new user     │
  │                           │                                  │
  │                           │  Set httpOnly cookies            │
  │  ◄── redirect to          │                                  │
  │  frontend /auth/callback  │                                  │
  │  (no token in URL)        │                                  │
```

### Token Refresh Flow

```
Client                         AuthService                         Database
  │                               │                                  │
  │  POST /auth/refresh           │                                  │
  │  (refreshToken via httpOnly   │                                  │
  │   cookie, auto-sent)          │                                  │
  │ ──────────────────────────►   │                                  │
  │                               │  jwt.verify(refreshToken,        │
  │                               │    JWT_REFRESH_SECRET)           │
  │                               │                                  │
  │                               │  Find user by payload.sub        │
  │                               │ ──────────────────────────────►  │
  │                               │                                  │
  │                               │  bcrypt.compare(token, stored)   │
  │                               │                                  │
  │                               │  If token matches a rotated-out  │
  │                               │    token → revoke all sessions   │
  │                               │                                  │
  │                               │  generateTokens(user) → new pair │
  │                               │  updateRefreshToken(newToken)    │
  │                               │ ──────────────────────────────►  │
  │                               │                                  │
  │  ◄── 200 OK + rotated        │                                  │
  │       httpOnly cookies        │                                  │
```

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None (reCAPTCHA) | Register new user (always issues OTP; uniform response prevents user enumeration) |
| POST | `/auth/login` | None (reCAPTCHA) | Login with email/password; sets httpOnly cookies |
| POST | `/auth/refresh` | None | Rotates tokens from refresh cookie; no token in body required |
| GET | `/auth/me` | JWT | Return current authenticated user (used for session hydration) |
| POST | `/auth/logout` | JWT | Clear refresh token + httpOnly cookies |
| POST | `/auth/send-otp` | None | Send OTP email |
| POST | `/auth/verify-otp` | None | Verify OTP; on login/register issues cookies |
| POST | `/auth/forgot-password` | None (reCAPTCHA) | Send password-reset OTP |
| POST | `/auth/reset-password` | None | Reset password; issues cookies |
| POST | `/auth/google/token` | None (reCAPTCHA) | Verify Google ID token signature, then login/register |
| GET | `/auth/google` | Google OAuth | Initiate Google OAuth |
| GET | `/auth/google/callback` | Google OAuth | Google OAuth callback (sets cookies, no token in URL) |
| GET | `/auth/facebook` | Facebook OAuth | Initiate Facebook OAuth |
| GET | `/auth/facebook/callback` | Facebook OAuth | Facebook OAuth callback |
| GET | `/auth/apple` | Apple OAuth | Initiate Apple OAuth |
| GET | `/auth/apple/callback` | Apple OAuth | Apple OAuth callback |

> **Note:** Access/refresh tokens are delivered exclusively via `httpOnly` cookies (Secure in production,
> SameSite configurable via `COOKIE_SAME_SITE`, default `lax`). The API no longer returns tokens in the
> response body. The client hydrates the session via `GET /auth/me`.

---

## Service Layer

### AuthService

| Method | Signature | Description |
|---|---|---|
| `register` | `(registerDto: RegisterDto): Promise<{ message, email, requiresVerification }>` | Create user (role always `USER`), hash password, send OTP |
| `login` | `(loginDto: LoginDto): Promise<{ user, accessToken, refreshToken }>` | Validate credentials (with brute-force lockout), issue tokens |
| `refreshTokens` | `(refreshToken: string): Promise<{ accessToken, refreshToken }>` | Verify refresh token (with reuse detection), issue new pair |
| `logout` | `(userId: string): Promise<void>` | Clear stored refresh token |
| `getMe` | `(userId: string): Promise<User>` | Return sanitized current user |
| `validateUser` | `(userId: string): Promise<User>` | JWT strategy callback: check user exists + active |
| `validateSocialUser` | `(data: SocialUserData): Promise<{ user, accessToken, refreshToken }>` | 3-tier lookup: by providerId → by email → create new |

---

## DTOs

| DTO | Fields | Validation |
|---|---|---|
| `RegisterDto` | email, phone, password, firstName, lastName | `@IsEmail`, `@IsNotEmpty`, `@MinLength(8)` + complexity regex |
| `LoginDto` | email, password | `@IsEmail`, `@IsNotEmpty` |
| `RefreshTokenDto` | refreshToken? | `@IsOptional`, `@IsString` (token normally read from cookie) |

---

## Entities

**User** (`users` table) — UUID PK, unique email/phone, bcrypt password, social IDs (googleId, facebookId, appleId), role enum (user/admin), professional verification fields.

---

## Module Configuration

```
AuthModule
├── imports: TypeOrmModule.forFeature([User]),
│            PassportModule.register({ defaultStrategy: 'jwt' }),
│            JwtModule.registerAsync({ ... })
├── controllers: AuthController
├── providers: AuthService,
│              JwtStrategy (from common/guards),
│              GoogleStrategy, FacebookStrategy, AppleStrategy
└── exports: AuthService
```

---

## Security Design

- **Two secrets**: `JWT_SECRET` for access tokens, `JWT_REFRESH_SECRET` for refresh tokens
- **Refresh tokens bcrypt-hashed** before storage (never stored in plain text)
- **3-tier social login**: lookup by providerId → by email (linking) → create new
- **httpOnly cookies**: tokens are never exposed to JavaScript or placed in URL query strings
- **Google ID tokens** (`/auth/google/token`) verified server-side against `https://oauth2.googleapis.com/tokeninfo`
  with audience (`aud`) checked against `GOOGLE_CLIENT_ID` — signature is never trusted without verification
- **Brute-force protection**: `@nestjs/throttler` (global 100 req/min per IP; 3–10 req/min on auth routes)
  plus per-account lockout (5 failed attempts → 15 min exponential backoff)
- **Refresh-token reuse detection**: a rotated-out token presented again revokes all sessions
- **Role from DB**: JWT strategy re-reads role from the `users` table instead of trusting the token claim
- **No privilege escalation**: `isAdmin` was removed from `RegisterDto`; registrations always get `USER` role
- **Uniform register response** prevents account enumeration
- **Password policy**: min 8 chars with uppercase, lowercase, and a number (register + reset)
