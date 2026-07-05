# Orders Module

**Location:** `src/modules/orders/`

## Purpose

Order lifecycle management: creation from cart, listing, tracking, cancellation. Integrates with Inventory (stock reservation/release) and Shipping (auto-shipment creation).

---

## Flow Diagrams

### Order Creation Flow (COD)

```
Client                         OrdersService                       Database
  │                                │                                  │
  │ POST /orders                   │                                  │
  │ { addressId, paymentMethod:    │                                  │
  │   "cod", customerNote }        │                                  │
  │ ───────────────────────────►   │                                  │
  │                                │  JwtAuthGuard: validate token    │
  │                                │  VerifiedOnlyGuard: check prof   │
  │                                │    verification                  │
  │                                │                                  │
  │                                │  Fetch cart items for user       │
  │                                │  (with product & variant)        │
  │                                │ ──────────────────────────────►  │
  │                                │ ◄── cart items ──────────────── │
  │                                │                                  │
  │                                │  Resolve shipping address:       │
  │                                │    if addressId: fetch Address   │
  │                                │    else: use raw JSON            │
  │                                │                                  │
  │                                │  Calculate line items:           │
  │                                │    price = variant.sellingPrice  │
  │                                │            || product.sellingPrice│
  │                                │    itemTotal = price * quantity  │
  │                                │    tax = 18% GST                 │
  │                                │                                  │
  │                                │  BEGIN TRANSACTION               │
  │                                │ ──────────────────────────────►  │
  │                                │                                  │
  │                                │  Save Order (status=CONFIRMED    │
  │                                │    for COD)                      │
  │                                │  Save OrderItems[]               │
  │                                │  Create Payment (PENDING, COD)   │
  │                                │  InventoryService.reserveStock() │
  │                                │                                  │
  │                                │  COMMIT                          │
  │                                │ ──────────────────────────────►  │
  │                                │                                  │
  │                                │  Delete cart items               │
  │                                │                                  │
  │                                │  Auto-create Shipment            │
  │                                │  (ShippingRocket: rates → create)│
  │                                │  (errors caught, order succeeds) │
  │                                │                                  │
  │  ◄── Order with items,        │                                  │
  │       payment, shipment        │                                  │
```

### Order Status Flow (Prepaid via Stripe)

```
Client                     Orders/Payments                   Stripe/ShipRocket
  │                           │                                   │
  │ POST /payments/create-    │                                   │
  │ checkout-session          │                                   │
  │ ──────────────────────►   │                                   │
  │                           │  Save payload in PaymentIntent    │
  │                           │  Create Stripe Checkout Session   │
  │                           │ ──────────────────────────────►   │
  │ ◄── { sessionId, url }   │                                   │
  │                           │                                   │
  │ User completes payment    │                                   │
  │ ─────────────────────────────────────────────────────────►   │
  │                           │                                   │
  │                           │  Webhook: session.completed       │
  │                           │ ◄────────────────────────────────│
  │                           │                                   │
  │                           │  Verify signature                 │
  │                           │  Read PaymentIntent (order data)  │
  │                           │  BEGIN TRANSACTION                │
  │                           │  Create Order (status=CONFIRMED)  │
  │                           │  Create OrderItems                │
  │                           │  Create Payment (COMPLETED)       │
  │                           │  Reserve Inventory                │
  │                           │  COMMIT                           │
  │                           │                                   │
  │                           │  Auto-create Shipment             │
  │                           │  (ShipRocket)                     │
```

### Cancellation Flow

```
Client                         OrdersService                       Database
  │                                │                                  │
  │ POST /orders/:id/cancel        │                                  │
  │ { reason }                     │                                  │
  │ ───────────────────────────►   │                                  │
  │                                │  Validate ownership              │
  │                                │                                  │
  │                                │  if PENDING_PAYMENT:             │
  │                                │    hard delete order + items     │
  │                                │                                  │
  │                                │  else:                           │
  │                                │    Check status in               │
  │                                │      [PENDING, CONFIRMED]        │
  │                                │    Set status = CANCELLED        │
  │                                │                                  │
  │                                │    Cancel ShipRocket shipment    │
  │                                │                                  │
  │                                │    InventoryService              │
  │                                │      .releaseStock()             │
  │                                │                                  │
  │  ◄── { success, message }     │                                  │
```

---

## API Endpoints

### User Endpoints (JWT + VerifiedOnly for create)

| Method | Path | Description |
|---|---|---|
| POST | `/orders` | Create order from cart |
| GET | `/orders` | List user's orders (page, limit, status filter) |
| GET | `/orders/:id` | Get single order |
| GET | `/orders/number/:orderNumber` | Find by order number |
| GET | `/orders/:id/tracking` | Get tracking timeline |
| POST | `/orders/:id/cancel` | Cancel own order |

### Admin Endpoints (JWT + ADMIN)

| Method | Path | Description |
|---|---|---|
| GET | `/orders/admin/all` | List all orders (paginated) |
| GET | `/orders/admin/:id` | Get any order |
| PUT | `/orders/admin/:id/status` | Update status (only CANCELLED allowed) |

---

## Service Layer

| Method | Signature | Description |
|---|---|---|
| `create` | `(userId, dto: CreateOrderDto): Promise<Order>` | Transactional: cart→order, payment, inventory reserve, auto-shipment |
| `findAll` | `(userId, page?, limit?, status?): Promise<{ orders, total, counts }>` | User's orders with status counts |
| `findOne` | `(id: string): Promise<any>` | Single order with all relations |
| `findByOrderNumber` | `(orderNumber, userId): Promise<any>` | By order number, scoped to user |
| `getTrackingHistory` | `(orderId): Promise<{ shipment, timeline }>` | Shipment tracking timeline |
| `cancelOrder` | `(id, userId): Promise<{ success, message }>` | Cancel with inventory release |
| `getOrdersForAdmin` | `(page?, limit?, status?): Promise<{ orders, total }>` | All orders paginated |
| `updateStatus` | `(id, dto: UpdateOrderStatusDto): Promise<Order>` | Only CANCELLED allowed |

---

## DTOs

| DTO | Fields |
|---|---|
| `CreateOrderDto` | addressId?, shippingAddress? (JSON), phone?, paymentMethod?, couponCode?, customerNote?, selectedCourier?, selectedService?, shippingRate? |
| `UpdateOrderStatusDto` | status (required, only 'cancelled' allowed), adminNote? |
| `CancelOrderDto` | reason? |

---

## Entities

| Entity | Table | Key Fields |
|---|---|---|
| Order | `orders` | UUID PK, orderNumber*, userId, status (enum), subtotal, taxAmount, shippingAmount, totalAmount, shippingAddress (JSON), inventoryReserved, inventoryDeducted, isReturned, isRTO |
| OrderItem | `order_items` | UUID PK, orderId, productId, productName, productImage, sku, quantity, unitPrice, sellingPrice, totalAmount |

---

## Status Enums

```
Order Status: pending_payment | pending | confirmed | processing
              | shipped | delivered | cancelled | refunded
              | payment_failed
```

**Order status transitions:**
- COD: starts at `CONFIRMED`
- Prepaid: starts at `PENDING_PAYMENT` → `CONFIRMED` (on payment)
- Cancellable from: `PENDING_PAYMENT`, `PENDING`, `CONFIRMED`

---

## Module Configuration

```
OrdersModule
├── imports: TypeOrmModule.forFeature([Order, OrderItem, Cart, Product,
│               ProductVariant, Inventory, Address, Payment, Shipment,
│               ShipmentTrackingHistory, User]),
│            forwardRef(() => InventoryModule),
│            forwardRef(() => ShippingModule)
├── controllers: OrdersController
├── providers: OrdersService, VerifiedOnlyGuard
└── exports: OrdersService
```

---

## Key Design Decisions

- **COD vs Prepaid bifurcation**: COD orders go directly to `CONFIRMED` with inventory reserved; prepaid require external payment flow
- **Status sync philosophy**: Status updates (other than cancellation) come from ShipRocket webhooks, not manual admin changes
- **Background shipment creation**: Errors in auto-shipment are caught and logged without failing the order
- **Tax**: Hardcoded 18% GST
- **Address snapshot**: Shipping address is stored as JSON snapshot (not a FK) to preserve historical accuracy
- **Order number format**: `DK-<timestamp-base36>-<random-base36>`
