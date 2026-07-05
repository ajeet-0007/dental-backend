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
  │  ◄── { user(no pwd),         │                                  │
  │        accessToken,           │                                  │
  │        refreshToken }         │                                  │
```

### Login Flow

```
Client                         AuthService                         Database
  │                               │                                  │
  │  POST /auth/login             │                                  │
  │  { email, password }          │                                  │
  │ ──────────────────────────►   │                                  │
  │                               │  Find user by email              │
  │                               │ ──────────────────────────────►  │
  │                               │ ◄── user ────────────────────── │
  │                               │                                  │
  │                               │  bcrypt.compare(password, hash)  │
  │                               │  Check user.isActive             │
  │                               │                                  │
  │                               │  generateTokens(user)            │
  │                               │  updateRefreshToken()            │
  │                               │ ──────────────────────────────►  │
  │                               │                                  │
  │  ◄── { user, accessToken,    │                                  │
  │        refreshToken }         │                                  │
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
  │  ◄── redirect to          │                                  │
  │  frontend with base64     │                                  │
  │  token payload            │                                  │
```

### Token Refresh Flow

```
Client                         AuthService                         Database
  │                               │                                  │
  │  POST /auth/refresh           │                                  │
  │  { refreshToken }             │                                  │
  │ ──────────────────────────►   │                                  │
  │                               │  jwt.verify(refreshToken,        │
  │                               │    JWT_REFRESH_SECRET)           │
  │                               │                                  │
  │                               │  Find user by payload.sub        │
  │                               │ ──────────────────────────────►  │
  │                               │                                  │
  │                               │  bcrypt.compare(token, stored)   │
  │                               │                                  │
  │                               │  generateTokens(user) → new pair │
  │                               │  updateRefreshToken(newToken)    │
  │                               │ ──────────────────────────────►  │
  │                               │                                  │
  │  ◄── { accessToken,          │                                  │
  │        refreshToken }         │                                  │
```

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Register new user |
| POST | `/auth/login` | None | Login with email/password |
| POST | `/auth/refresh` | None | Refresh token pair |
| POST | `/auth/logout` | JWT | Clear refresh token |
| POST | `/auth/google/token` | None | Verify Google identity token (mobile/SPA) |
| GET | `/auth/google` | Google OAuth | Initiate Google OAuth |
| GET | `/auth/google/callback` | Google OAuth | Google OAuth callback |
| GET | `/auth/facebook` | Facebook OAuth | Initiate Facebook OAuth |
| GET | `/auth/facebook/callback` | Facebook OAuth | Facebook OAuth callback |
| GET | `/auth/apple` | Apple OAuth | Initiate Apple OAuth |
| GET | `/auth/apple/callback` | Apple OAuth | Apple OAuth callback |

---

## Service Layer

### AuthService

| Method | Signature | Description |
|---|---|---|
| `register` | `(registerDto: RegisterDto): Promise<{ user, accessToken, refreshToken }>` | Create user, hash password, generate tokens |
| `login` | `(loginDto: LoginDto): Promise<{ user, accessToken, refreshToken }>` | Validate credentials, issue tokens |
| `refreshTokens` | `(refreshTokenDto: RefreshTokenDto): Promise<{ accessToken, refreshToken }>` | Verify refresh token, issue new pair |
| `logout` | `(userId: string): Promise<void>` | Clear stored refresh token |
| `validateUser` | `(userId: string): Promise<User>` | JWT strategy callback: check user exists + active |
| `validateSocialUser` | `(data: SocialUserData): Promise<{ user, accessToken, refreshToken }>` | 3-tier lookup: by providerId → by email → create new |

---

## DTOs

| DTO | Fields | Validation |
|---|---|---|
| `RegisterDto` | email, phone, password, firstName, lastName, isAdmin? | `@IsEmail`, `@IsNotEmpty`, `@MinLength(6)` |
| `LoginDto` | email, password | `@IsEmail`, `@IsNotEmpty` |
| `RefreshTokenDto` | refreshToken | `@IsString`, `@IsNotEmpty` |

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
- **Social callbacks** redirect to frontend with base64-encoded token payload (not JSON)
- **Client-side Google Sign-In** supported via `POST /auth/google/token` (identity token)
