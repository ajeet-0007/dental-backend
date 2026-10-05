# Email Module

**Location:** `src/modules/email/`

## Purpose

Transactional email service using Nodemailer + Handlebars templates: order confirmation, shipment updates, delivery notifications, and return-related emails. No REST controller — pure service module.

---

## Templates

| Template File | Trigger |
|---|---|
| `order-confirmation.hbs` | Order placed (customer **and** admin copy) |
| `order-cancelled.hbs` | Order cancelled (customer **and** admin copy) |
| `shipment-created.hbs` | Shipment created |
| `shipping-status.hbs` | Tracking status update |
| `delivery-attempted.hbs` | Delivery failed/NDR |
| `delivered.hbs` | Package delivered |
| `return-initiated.hbs` | Return request created |

A template must be listed in the `templates` array in `EmailService.loadTemplates()` or it will never load.

> `.hbs` files are build assets. `nest-cli.json` must list `"**/*.hbs"` under `compilerOptions.assets`, otherwise no template exists in `dist/` and every templated send silently returns `false` under `npm run start:prod`.

---

## Service Layer

| Method | Description |
|---|---|
| `sendEmail(options)` | Generic send via nodemailer (to, subject, template, context) |
| `sendOrderPlaced(payload, to, isAdmin)` | Order placed; lists products and final price |
| `sendOrderCancelled(payload, to, isAdmin)` | Order cancelled; lists products and final price |
| `getAdminRecipients()` | `ADMIN_NOTIFICATION_EMAIL`, comma-separated list allowed |
| `sendShipmentCreated(shipmentData)` | Shipment with tracking |
| `sendShippingStatusUpdate(shipmentData)` | Status change |
| `sendDeliveryAttempted(shipmentData)` | Failed delivery |
| `sendDelivered(shipmentData)` | Successful delivery |
| `sendReturnInitiated(returnData)` | Return request ack |

`isAdmin: true` switches the subject line and reveals the customer's email/phone via the `{{#if showCustomer}}` block. All money is coerced with `money()` before it reaches a template — MySQL `decimal` columns arrive from TypeORM as strings and would otherwise render as `1299.000000`.

Every method resolves to a boolean and never rejects, so a broken SMTP host degrades to a log warning.

---

## Module Configuration

```
EmailModule
├── providers: [EmailService]
└── exports: [EmailService]
```

---

# Order Notifications Module

**Location:** `src/modules/order-notifications/`

## Purpose

Event-driven order lifecycle emails. Emitters hand off a fully-built payload and `OrderNotificationsListener` sends the mail off the request path. No controller, no database access — the payload is built by the caller.

## Events

| Event | Payload | Emitted from |
|---|---|---|
| `order.placed` | `OrderPlacedPayload` | `OrdersService.create`, `PaymentsService` (prepaid) |
| `order.cancelled` | `OrderCancelledPayload` | `OrdersService.cancelOrder` / `updateStatus`, `AdminService.cancelOrderShipment`, `ShippingWebhookController` |

## Failure isolation

Three independent layers, so no mail failure can fail an order:

1. `@OnEvent(..., { async: true })` — the emitter does not await the listener, so the request path never blocks on SMTP.
2. `suppressErrors: true` — rejections do not surface as unhandled rejections.
3. `try/catch` in each handler, which only logs.

`EmailService` additionally catches its own errors. Delivery outcomes are inspected rather than assumed, so a total outage is logged as a failure instead of a false "sent".

Cancellations are only notified on a genuine transition to `cancelled`. This matters because `OrdersService.cancelOrder` cancels the shipment on ShipRocket, which sends the webhook straight back and would otherwise flip the order to `cancelled` a second time and double-send.

> `async: true` means a serverless instance can be frozen immediately after the response is sent, so an email can occasionally be dropped. Switch the handlers to `await` inside the existing `try/catch` if guaranteed delivery matters more than zero latency.

## Module Configuration

```
OrderNotificationsModule
├── imports: [EmailModule]
└── providers: [OrderNotificationsListener]
```

## Files

| File | Purpose |
|---|---|
| `order-notifications.types.ts` | Event name constants and payload interfaces |
| `order-notifications.mapper.ts` | `buildOrderEmailPayload()` — pure function shared by all emit sites |
| `order-notifications.listener.ts` | `@OnEvent` handlers |

---

# ImageKit Module

**Location:** `src/modules/imagekit/`

## Purpose

ImageKit CDN integration: provides authentication parameters for client-side uploads and server-side file upload endpoints.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/imagekit/auth` | ADMIN | Get auth params (token, expire, signature) + publicKey + urlEndpoint |
| POST | `/imagekit/upload` | JWT | Upload file to ImageKit |
| POST | `/imagekit/upload-review` | JWT | Upload review image (with MIME + size validation) |

---

## Service Layer

| Method | Description |
|---|---|
| `getPublicKey()` | Returns IMAGEKIT_PUBLIC_KEY |
| `getPrivateKey()` | Returns IMAGEKIT_PRIVATE_KEY |
| `getUrlEndpoint()` | Returns IMAGEKIT_URL_ENDPOINT |
| `getAuthParams()` | HMAC-SHA1 signature: { token, expire, signature } |

---

## Module Configuration (Global)

```
@Global()
ImageKitModule
├── controllers: [ImageKitController]
├── providers: [ImageKitService]
└── exports: [ImageKitService]
```

---

# Health Module

**Location:** `src/modules/health/`

## Purpose

Simple health check and API info endpoints.

---

## API Endpoints (Public)

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check: { status, timestamp, uptime } |
| GET | `/` | API info: { name: "Dentalkart API", version: "1.0", docs: "/api/docs" } |

---

## Module Configuration

```
HealthModule
├── controllers: [HealthController]
```
