# Email Module

**Location:** `src/modules/email/`

## Purpose

Transactional email service using Nodemailer + Handlebars templates: order confirmation, shipment updates, delivery notifications, and return-related emails. No REST controller — pure service module.

---

## Templates

| Template File | Trigger |
|---|---|
| `order-confirmation.hbs` | Order placed |
| `shipment-created.hbs` | Shipment created |
| `shipping-status.hbs` | Tracking status update |
| `delivery-attempted.hbs` | Delivery failed/NDR |
| `delivered.hbs` | Package delivered |
| `return-initiated.hbs` | Return request created |

---

## Service Layer

| Method | Description |
|---|---|
| `sendEmail(options)` | Generic send via nodemailer (to, subject, html) |
| `sendOrderConfirmation(orderData)` | Order placed confirmation |
| `sendShipmentCreated(shipmentData)` | Shipment with tracking |
| `sendShippingStatusUpdate(shipmentData)` | Status change |
| `sendDeliveryAttempted(shipmentData)` | Failed delivery |
| `sendDelivered(shipmentData)` | Successful delivery |
| `sendReturnInitiated(returnData)` | Return request ack |

---

## Module Configuration

```
EmailModule
├── providers: [EmailService]
└── exports: [EmailService]
```

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
