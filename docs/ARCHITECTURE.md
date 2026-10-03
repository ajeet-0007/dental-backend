# System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Applications                         │
│            (Web App, Mobile App, Admin Dashboard)                    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP/HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Dentalkart Backend API                         │
│                          (NestJS v10)                                │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   API Gateway (main.ts)                      │   │
│  │  • CORS (all origins)    • Global prefix: /api               │   │
│  │  • Global ValidationPipe  • Swagger at /api/docs             │   │
│  │  • Raw body for Stripe webhook                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   Common Infrastructure                       │   │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │   │
│  │  │ Guards  │ │Decorators│ │Middleware│ │    Utils      │   │   │
│  │  │ JWT,RBAC│ │@Current  │ │ RawBody  │ │ slugify, SKU, │   │   │
│  │  │Verified │ │@Roles    │ │          │ │ error-logger  │   │   │
│  │  └─────────┘ └──────────┘ └──────────┘ └───────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     Feature Modules                           │   │
│  │                                                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │  Auth   │ │  Users  │ │Addresses│ │Products │           │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │   │
│  │       │           │           │           │                 │   │
│  │  ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐           │   │
│  │  │  Cart   │ │Wishlist │ │ Orders  │ │Payments │           │   │
│  │  └────┬────┘ └─────────┘ └────┬────┘ └────┬────┘           │   │
│  │       │                       │           │                 │   │
│  │  ┌────▼────┐ ┌─────────┐ ┌────▼────┐ ┌────▼────┐           │   │
│  │  │Shipping │ │ Returns │ │Reviews  │ │Inventory│           │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │   │
│  │                                                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │  Admin  │ │Banners  │ │ Brands  │ │Categories           │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │   │
│  │                                                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │Departmnt│ │BulkUpload│ │EntityBU │ │  Email  │           │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │   │
│  │                                                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │ImageKit │ │ Health  │ │  News   │ │ AI Asst │           │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │   │
│  │                                                              │   │
│  │  ┌────────────────────────┐                                  │   │
│  │  │ProfessionalVerification│                                  │   │
│  │  └────────────────────────┘                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   Database Layer (TypeORM)                    │   │
│  │  ┌─────────────────────────────────────────────────────────┐ │   │
│  │  │                    MySQL 8 Database                       │ │   │
│  │  │  26+ tables: users, products, orders, payments, ...     │ │   │
│  │  └─────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐ ┌──────────────┐ ┌──────────────────┐
│   Stripe      │ │  ShipRocket  │ │   ImageKit CDN   │
│  (Payments)   │ │  (Shipping)  │ │    (Media)       │
└───────────────┘ └──────────────┘ └──────────────────┘

┌───────────────┐ ┌──────────────┐ ┌──────────────────┐
│    Tavily     │ │    Brevo     │ │  Google/FB/Apple  │
│  (News API)   │ │   (Email)    │ │     (OAuth)      │
└───────────────┘ └──────────────┘ └──────────────────┘

┌───────────────┐
│  Axios+Chr   │
│  (DCI Scrape)│
└───────────────┘
```

---

## Module Dependency Graph

```
                    ┌──────────────┐
                    │  AppModule   │
                    └──────┬───────┘
          ┌────────────────┼────────────────┐
          ▼                ▼                 ▼
    ┌──────────┐    ┌──────────┐    ┌──────────────┐
    │  Auth    │    │  Users   │    │   Health     │
    │          │◄───│(exports) │    └──────────────┘
    └──────────┘    └──────────┘
          │
          │  ┌──────────┐    ┌──────────┐
          ├──│Addresses │    │ Products │
          │  └──────────┘    └────┬─────┘
          │                       │
          │  ┌──────────┐    ┌────▼─────┐    ┌──────────┐
          ├──│   Cart   │    │Wishlist  │    │ Reviews  │
          │  └────┬─────┘    └──────────┘    └────┬─────┘
          │       │                               │
          │  ┌────▼─────┐    ┌──────────┐         │
          ├──│  Orders  │    │ Payments │         │
          │  └────┬─────┘    └────┬─────┘         │
          │       │               │               │
          │  ┌────▼─────┐    ┌────▼─────┐         │
          ├──│ Shipping │◄───│(fwd ref) │         │
          │  └────┬─────┘    └──────────┘         │
          │       │                               │
          │  ┌────▼─────┐    ┌──────────┐         │
          ├──│ Returns  │    │Inventory │         │
          │  └──────────┘    └────┬─────┘         │
          │                       │               │
          │  ┌──────────┐    ┌────▼─────┐         │
          ├──│   Admin  │◄───│(fwd ref) │         │
          │  └──────────┘    └──────────┘         │
          │
          │  ┌──────────┐    ┌──────────┐
          ├──│  Email   │    │ ImageKit │
          │  └──────────┘    └──────────┘
          │
          │  ┌──────────┐    ┌──────────┐
          ├──│AI Asst   │◄───│ Products │
          │  └──────────┘    └──────────┘
          │
          │  ┌──────────┐    ┌──────────┐
          │  │Prof Verif│    │   News   │
          │  └──────────┘    └──────────┘
          │
          │  ┌──────────┐    ┌──────────────┐
          │  │BulkUpload│    │EntityBulkUpld│
          │  └──────────┘    └──────────────┘
          │
          │  ┌──────────┐    ┌──────────┐
          └──│Banners   │    │ Brands   │
             └──────────┘    └──────────┘

             ┌──────────┐    ┌──────────┐
             │Categories│    │Departments│
             └──────────┘    └──────────┘

             ┌──────────────────┐
             │ (incomplete)     │
             │ Questions        │
             │ StockNotif.      │
             └──────────────────┘
```

**Legend:**
- Solid line = direct import/usage
- Dotted = `forwardRef()` (circular dependency)
- Arrow points FROM the dependent module TOWARD the module it depends on

---

## Request Lifecycle Example: Place Order

```
Client                     Backend                         Stripe/ShipRocket
  │                          │                                   │
  │  POST /orders            │                                   │
  │ ──────────────────────►  │                                   │
  │                          │                                   │
  │                    ┌─────▼──────┐                            │
  │                    │ Validation │                            │
  │                    │ • JWT Guard│                            │
  │                    │ • Verified │                            │
  │                    │ • DTO pipe │                            │
  │                    └─────┬──────┘                            │
  │                          │                                   │
  │                    ┌─────▼──────┐                            │
  │                    │ OrderSvc   │                            │
  │                    │ • fetch    │                            │
  │                    │   cart     │                            │
  │                    │ • calc     │                            │
  │                    │   totals   │                            │
  │                    │ • TX: save │                            │
  │                    │   order    │                            │
  │                    └─────┬──────┘                            │
  │                          │                                   │
  │                    ┌─────▼──────┐                            │
  │                    │ Inventory  │                            │
  │                    │ • reserve  │                            │
  │                    │   stock    │                            │
  │                    └─────┬──────┘                            │
  │                          │                                   │
  │                    ┌─────▼──────┐                            │
  │                    │ Shipping   │                            │
  │                    │ • calc     │──── ShipRocket rates ───►  │
  │                    │   rates    │◄──── response ──────────── │
  │                    │ • create   │──── ShipRocket ship ────►  │
  │                    │   shipment │◄──── label/AWB ─────────── │
  │                    └─────┬──────┘                            │
  │                          │                                   │
  │  ◄── Order Response ────┤                                   │
  │                          │                                   │
  │                          │    ...later...                    │
  │                          │                                   │
  │                    ┌─────▼──────┐                            │
  │                    │ ShipWebhook│◄─── ShipRocket update ──── │
  │                    │ • update   │                            │
  │                    │   status   │                            │
  │                    │ • send     │                            │
  │                    │   email    │                            │
  │                    └────────────┘                            │
```

---

## Authentication Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Auth Service                                      │
│                                                                         │
│  Register          Login           Refresh Token       Logout           │
│  POST /register    POST /login     POST /refresh       POST /logout     │
│       │                │                │                  │            │
│       ▼                ▼                ▼                  ▼            │
│  ┌────────┐      ┌────────┐      ┌──────────┐       ┌────────┐        │
│  │Hash pwd│      │Compare │      │Verify JWT│       │Clear   │        │
│  │Save    │      │Sign    │      │Compare   │       │refresh │        │
│  │tokens  │      │tokens  │      │hash in DB│       │token   │        │
│  └────────┘      └────────┘      └──────────┘       └────────┘        │
│                                                                         │
│  Social Login (Google / Facebook / Apple)                               │
│                                                                         │
│  ┌──────────────┐     ┌────────────────┐     ┌────────────────────┐   │
│  │GET /auth/    │     │OAuth Provider  │     │Callback redirects  │   │
│  │{provider}   │────►│Consent Screen  │────►│to frontend with    │   │
│  │(redirect)   │     │                │     │base64 token payload│   │
│  └──────────────┘     └────────────────┘     └────────────────────┘   │
│                                                                         │
│  Or: Client-side token: POST /auth/google/token  { token: "<id>" }    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Payment Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Payment Flow (Stripe)                               │
│                                                                         │
│  Client                    Backend                    Stripe            │
│    │                          │                        │               │
│    │ POST /create-checkout    │                        │               │
│    │ ───────────────────────► │                        │               │
│    │                          │  Save order payload    │               │
│    │                          │  in PaymentIntent tbl  │               │
│    │                          │  (bypass 500-char lim) │               │
│    │                          │                        │               │
│    │                          │  Create Stripe Session │               │
│    │                          │ ──────────────────────►│               │
│    │  ◄── { sessionId, url } │ ◄──── session ─────────│               │
│    │                          │                        │               │
│    │  Redirect to Stripe      │                        │               │
│    │ ─────────────────────────────────────────────────►│               │
│    │                          │                        │               │
│    │  User completes payment  │                        │               │
│    │                          │                        │               │
│    │                          │  Webhook:              │               │
│    │                          │  checkout.session.     │               │
│    │                          │  completed             │               │
│    │                          │ ◄──────────────────────│               │
│    │                          │                        │               │
│    │                          │  Verify webhook sig    │               │
│    │                          │  Read PaymentIntent    │               │
│    │                          │  Create Order + Items  │               │
│    │                          │  Reserve Inventory     │               │
│    │                          │  Create Shipment       │               │
│    │                          │  (ShipRocket)          │               │
│    │                          │                        │               │
│    │  POST /verify-session    │                        │               │
│    │  (fallback if webhook    │                        │               │
│    │   is delayed)            │                        │               │
│    │ ───────────────────────► │                        │               │
│    │  ◄── { success, orderId}│                        │               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Configuration

| Variable Group | Variables | Used By |
|---|---|---|
| Database | `MYSQL_DATABASE_*` | TypeORM config |
| JWT | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `*_EXPIRES_IN` | Auth module |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Payments module |
| OAuth | `GOOGLE_CLIENT_*`, `FACEBOOK_APP_*`, `APPLE_*` | Auth strategies |
| ImageKit | `IMAGEKIT_*` | ImageKit module |
| ShipRocket | `SHIPPINGROCKET_*` | Shipping module |
| SMTP | `SMTP_*` | Email module |
| Warehouse | `WAREHOUSE_*` | Shipping module |
| Shipping pricing | `SHIPPING_FLAT_CHARGE`, `FREE_SHIPPING_THRESHOLD` | Shipping + Orders modules |
| Returns | `RETURN_*` | Returns module |
| AI/News | `TAVILY_API_KEY` | News module |
