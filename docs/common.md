# Common Module

**Location:** `src/common/`

## Purpose

Shared cross-cutting infrastructure: authentication guards, authorization, parameter decorators, middleware, utilities, and pipes used across all modules.

---

## Guards

| Guard | File | Purpose |
|---|---|---|
| `JwtAuthGuard` | `guards/jwt-auth.guard.ts` | Extends `AuthGuard('jwt')` — validates Bearer token |
| `JwtStrategy` | `guards/jwt.strategy.ts` | Passport strategy: extracts JWT, looks up user by `payload.sub`, checks `isActive`, returns `{ id, email, role }` |
| `RolesGuard` | `guards/roles.guard.ts` | RBAC: reads `@Roles()` metadata via `Reflector`, checks `user.role` |
| `VerifiedOnlyGuard` | `guards/verified-only.guard.ts` | Restricts order placement to professionally verified users; looks up user in DB, throws `ForbiddenException` if `!isProfessionalVerified` |

---

## Decorators

| Decorator | File | Purpose |
|---|---|---|
| `@CurrentUser()` | `decorators/current-user.decorator.ts` | Custom param decorator: extracts `request.user` (JWT payload) |
| `@Roles(...)` | `decorators/roles.decorator.ts` | Sets metadata for `RolesGuard`: `@Roles(UserRole.ADMIN)` |

---

## Middleware

| Middleware | File | Purpose |
|---|---|---|
| `RawBodyMiddleware` | `middleware/raw-body.middleware.ts` | Captures raw request body for Stripe webhook signature verification. Only activates for `/api/payments/webhook`. Buffers chunks into `req.rawBody`. |

---

## Utils

| File | Purpose |
|---|---|
| `slugify.ts` | URL-safe slug generator, SKU generator (`generateSKU(prefix)`), order number generator (`generateOrderNumber()` → `DK-XXXX-XXXX`) |
| `error-logger.ts` | File-based error logging: writes to `logs/error-YYYY-MM-DD.log`, supports `getLogs()` for reading back |
| `order-status.util.ts` | `getOrderDisplayStatus()` returns labels, Tailwind CSS colors, flags (`canCancel`, `canReturn`, `showRTOAlert`) based on order/shipment status; `SHIPMENT_STATUS_INFO` maps all states |

---

## Pipes

No custom pipes currently defined (uses global `ValidationPipe` from `@nestjs/common`).

---

## Filters

No custom exception filters currently defined.

---

## Interceptors

No custom interceptors currently defined.

---

## CommonModule Configuration

```
CommonModule implements NestModule
├── Configure consumer:
│   ├── forRoutes('payments/webhook') → apply RawBodyMiddleware
│   └── exclude all other routes
```

The CommonModule is imported by `AppModule` and makes guards/decorators available app-wide.
