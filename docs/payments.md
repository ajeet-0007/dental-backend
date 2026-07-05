# Payments Module

**Location:** `src/modules/payments/`

## Purpose

Stripe payment integration: create Checkout Sessions, handle webhooks, verify payments, and manage COD payment confirmation. Core bridge between cart checkout and order creation.

---

## Flow Diagram

### Stripe Checkout Flow

```
Client                     PaymentsService                      Stripe
  │                            │                                  │
  │ POST /payments/create-     │                                  │
  │ checkout-session           │                                  │
  │ { items[], subtotal,       │                                  │
  │   taxAmount, totalAmount,  │                                  │
  │   addressId, ... }         │                                  │
  │ ───────────────────────►   │                                  │
  │                            │  Save full order payload as      │
  │                            │  PaymentIntent (to bypass        │
  │                            │  Stripe's 500-char metadata      │
  │                            │  limit)                          │
  │                            │ ──► DB ───────────────────►      │
  │                            │                                  │
  │                            │  Create Stripe Checkout Session  │
  │                            │  with line items, success/cancel │
  │                            │  URLs, metadata:                 │
  │                            │  { paymentIntentId, userId }     │
  │                            │ ─────────────────────────────►   │
  │                            │ ◄── { sessionId, url } ──────── │
  │                            │                                  │
  │ ◄── { sessionId, url }    │                                  │
  │                            │                                  │
  │ Redirect to Stripe Checkout                                  │
  │ ─────────────────────────────────────────────────────────►   │
  │                            │                                  │
  │ User completes payment     │                                  │
  │                            │                                  │
  │ Stripe sends webhook:                                        │
  │ checkout.session.completed                                   │
  │ ◄─────────────────────────────────────────────────────────    │
  │                            │                                  │
  │ ─── POST /payments/        │                                  │
  │     webhook ─────────────► │                                  │
  │                            │  Verify Stripe webhook           │
  │                            │  signature (STRIPE_WEBHOOK_SECRET)│
  │                            │                                  │
  │                            │  processSuccessfulPayment():     │
  │                            │  1. Read PaymentIntent from DB   │
  │                            │  2. BEGIN TRANSACTION            │
  │                            │  3. Create Order                 │
  │                            │  4. Create OrderItems            │
  │                            │  5. Create Payment (COMPLETED)   │
  │                            │  6. Mark PaymentIntent as used   │
  │                            │  7. Reserve Inventory            │
  │                            │  8. COMMIT                       │
  │                            │  9. Auto-create Shipment         │
  │                            │     (ShipRocket)                 │
  │                            │                                  │
  │ (fallback)                                                  │
  │ POST /payments/verify-     │                                  │
  │ session { sessionId }      │                                  │
  │ ───────────────────────►   │                                  │
  │                            │  Same order creation logic       │
  │                            │  (used if webhook delayed)       │
  │                            │                                  │
  │ ◄── { success, orderId }  │                                  │
```

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/create-checkout-session` | JWT + VerifiedOnly | Create Stripe Checkout Session |
| POST | `/payments/webhook` | Public (raw body) | Stripe webhook receiver |
| GET | `/payments/verify/:orderId` | JWT | Verify payment status for order |
| POST | `/payments/verify-session` | Public | Verify Stripe session + confirm order (fallback) |
| GET | `/payments/order/:orderId` | JWT | Get payment record by order |
| GET | `/payments/admin/all` | JWT + ADMIN | Paginated payment list |
| POST | `/payments/confirm-cod/:orderId` | JWT + ADMIN | Confirm COD payment (collected) |
| POST | `/payments/cod-failed/:orderId` | JWT + ADMIN | Mark COD payment as failed |

---

## Service Layer

| Method | Signature | Description |
|---|---|---|
| `createPaymentSession` | `(userId, dto: CreatePaymentSessionDto): Promise<{ sessionId, url }>` | Save PaymentIntent, create Stripe session |
| `handleWebhook` | `(payload: Buffer, signature: string): Promise<void>` | Verify signature, dispatch completed event |
| `processSuccessfulPayment` | `(session: Stripe.Checkout.Session): Promise<void>` | Create order + items + payment + reserve + shipment (new & legacy flows) |
| `verifyAndConfirmPayment` | `(sessionId: string): Promise<{ success, orderId?, error? }>` | Check if processed, else create order from PaymentIntent |
| `verifyPayment` | `(orderId: string): Promise<Payment>` | Get payment by order |
| `confirmCODPayment` | `(orderId, transactionId?): Promise<Payment>` | Mark COD as COMPLETED |
| `markCODPaymentFailed` | `(orderId, reason): Promise<Payment>` | Mark COD as FAILED |
| `getPaymentsForAdmin` | `(page, limit): Promise<{ payments, total }>` | Paginated admin list |

---

## DTOs

| DTO | Key Fields |
|---|---|
| `CreatePaymentSessionDto` | items[] (productId, productVariantId?, quantity, unitPrice), addressId?, subtotal, taxAmount, shippingAmount, totalAmount, paymentMethod? |
| `VerifyPaymentDto` | sessionId (for Stripe) |

---

## PaymentIntent Table Strategy

The `PaymentIntent` entity stores the full order payload temporarily to bypass Stripe's 500-character metadata limit. Flow:

```
1. createPaymentSession()
   → INSERT INTO payment_intents (sessionId, userId, orderData JSON, used=false)

2. Webhook received
   → SELECT * FROM payment_intents WHERE sessionId = ? AND used = false
   → Parse orderData JSON → create Order + OrderItems
   → UPDATE payment_intents SET used = true

3. Failed/expired intents cleaned up by TTL (expiresAt field)
```

---

## Entities

| Entity | Table | Purpose |
|---|---|---|
| Payment | `payments` | Payment transaction records |
| PaymentIntent | `payment_intents` | Temp storage of order JSON for Stripe flow |
| Order | `orders` | Order created on payment |
| OrderItem | `order_items` | Line items |
| User | `users` | User reference |

---

## Module Configuration

```
PaymentsModule
├── imports: TypeOrmModule.forFeature([Payment, PaymentIntent, Order,
│               OrderItem, User]),
│            forwardRef(() => InventoryModule),
│            forwardRef(() => ShippingModule)
├── controllers: PaymentsController
├── providers: PaymentsService
└── exports: PaymentsService
```
