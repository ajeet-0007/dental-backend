# Database Schema

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌──────────┐     ┌──────────┐     ┌─────────────────┐     ┌─────────────┐ │
│  │  User    │1──N►│ Address  │     │   Category      │     │  Department │ │
│  │          │     └──────────┘     │                 │     │             │ │
│  │ uuid PK  │                      │ id PK           │     │ id PK       │ │
│  │ email*   │1──N►┌──────────┐     │ name, slug      │     │ name, slug  │ │
│  │ phone*   ├─────│   Cart   │     │ parentId (self) │     │             │ │
│  │ password │     └──────────┘     └────────┬────────┘     └──────┬──────┘ │
│  │ role     │                               │M                   │M       │
│  │ isActive │1──N►┌──────────┐              │                    │        │
│  │ socialIds│─────│ Wishlist │              │    M────────M      │        │
│  │ profVerif│     └──────────┘              │   CategoryDepartmnt│        │
│  └────┬─────┘                               │                    │        │
│       │                                     │M                   │M       │
│       │1──N►┌──────────┐                    │                    │        │
│       │     │  Order   │                    └────────┬───────────┘        │
│       │     └────┬─────┘                             │                    │
│       │           │                                  │M                   │
│       │           │1──N►┌──────────┐                 │                    │
│       │           │     │OrderItem │     ┌───────────▼────────┐           │
│       │           │     └──────────┘     │      Product       │           │
│       │           │                      │                   │           │
│       │           │1──N►┌──────────┐     │ id PK             │           │
│       │           │     │ Payment  │     │ name, slug*       │           │
│       │           │     └──────────┘     │ sku               │           │
│       │           │                      │ sellingPrice, mrp │           │
│       │           │1──N►┌──────────┐     │ brand, brandId    │           │
│       │           │     │ Shipment │     │ images (JSON)     │           │
│       │           │     └──────────┘     │ hasVariants       │           │
│       │           │                      │ isActive, isFeat. │           │
│       │           │1──N►┌──────────┐     │ features, specs.. │           │
│       │           │     │ReturnShip│     │ warranty (long)   │           │
│       │           │     └──────────┘     └──┬────────────────┘           │
│       │           │                         │                            │
│       │           │1──N►┌──────────┐        │1:N                         │
│       │           │     │Timeline  │        │                            │
│       │           │     └──────────┘        ▼                            │
│       │1──N►┌──────────┐           ┌─────────────────┐                   │
│       │     │  Review  │           │ ProductVariant  │                   │
│       │     └──────────┘           │                 │                   │
│       │                            │ id (uuid) PK    │                   │
│       │                            │ productId (FK)  │                   │
│       │                            │ sku             │                   │
│       │                            │ sellingPrice,mrp│                   │
│       │                            │ image, images   │                   │
│       │                            │ isActive        │                   │
│       └──►┌──────────┐            └──┬──────────────┘                   │
│           │  Payment │               │                                  │
│           │  Intent  │               │1:N                               │
│           └──────────┘               ▼                                  │
│                             ┌─────────────────┐                         │
│                             │    Inventory     │                         │
│                             │                 │                         │
│                             │ id (uuid) PK    │                         │
│                             │ productId (FK)  │                         │
│                             │ variantId (FN)  │                         │
│                             │ quantity        │                         │
│                             │ reservedQty     │                         │
│                             │ lowStockThresh  │                         │
│                             └─────────────────┘                         │
│                                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐               │
│  │ProductOpt│1──N│ProductOptVal │    │  VariantOption   │               │
│  │          │    │              │    │                  │               │
│  │ id PK    │    │ id PK        │    │ variantId (FK)   │               │
│  │productId │    │ optionId(FK) │    │ optionId (FK)    │               │
│  │ name     │    │ value        │    │ optionValueId(FK)│               │
│  │ position │    │ hexCode      │    └──────────────────┘               │
│  └──────────┘    │ swatchUrl    │                                       │
│                  │ position     │                                       │
│                  └──────────────┘                                       │
│                                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────┐      │
│  │  Brand   │    │   Banner     │    │  News    │    │Shipping  │      │
│  │          │    │              │    │          │    │ Method   │      │
│  │ id PK    │    │ id PK        │    │ id PK    │    │          │      │
│  │ name,slug│    │ title, image │    │ title    │    │ name     │      │
│  │ logo     │    │ link, sort   │    │ content  │    │ baseCost │      │
│  │ desc     │    │ startDate    │    │ source   │    │ costPerKg│      │
│  │ isActive │    │ endDate      │    │ published│    │ freeShip │      │
│  │ sortOrder│    │ isActive     │    │ fetchedAt│    │ estimated│      │
│  └──────────┘    └──────────────┘    └──────────┘    │ isActive │      │
│                                                       └──────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Entity List

| # | Entity | Table | PK Type | Key Columns |
|---|---|---|---|---|
| 1 | User | `users` | UUID | email*, phone*, password, role, isActive, social IDs, prof verification fields |
| 2 | Address | `addresses` | UUID | userId(FK), name, phone, addrLine1/2, city, state, pincode, country, isDefault |
| 3 | Category | `categories` | Int (auto) | name, slug*, description, image, isActive, sortOrder, parentId(self FK) |
| 4 | Department | `departments` | Int (auto) | name, slug*, description, image, isActive, sortOrder |
| 5 | Brand | `brands` | Int (auto) | name, slug*, logo, description, isActive, sortOrder |
| 6 | Product | `products` | Int (auto) | name, slug*, sku, sellingPrice, mrp, brand, brandId, images(JSON), isActive, isFeatured, hasVariants, features/specs/packaging/directions(JSON), warranty(LONGTEXT) |
| 7 | ProductVariant | `product_variants` | UUID | productId(FK), name, sku, sellingPrice, mrp, image, images, isActive |
| 8 | ProductOption | `product_options` | Int (auto) | productId(FK), name, position |
| 9 | ProductOptionValue | `product_option_values` | Int (auto) | optionId(FK), value, hexCode, swatchUrl, position |
| 10 | VariantOption | `variant_options` | Int (auto) | variantId(FK), optionId(FK), optionValueId(FK) |
| 11 | Inventory | `inventory` | UUID | productId(FK), productVariantId(FK nullable), quantity, reservedQuantity, lowStockThreshold, trackInventory |
| 12 | Cart | `cart` | UUID | userId(FK), productId(FK), productVariantId(FK nullable), quantity (unique: userId+productId+variantId) |
| 13 | Wishlist | `wishlists` | UUID | userId(FK), productId(FK), createdAt |
| 14 | Order | `orders` | UUID | orderNumber*, userId(FK), status(enum), subtotal, taxAmount, shippingAmount, discountAmount, totalAmount, couponCode, shippingAddress(JSON), inventoryReserved, inventoryDeducted, isReturned, isRTO |
| 15 | OrderItem | `order_items` | UUID | orderId(FK), productId(FK), productVariantId(FK), productName, productImage, sku, quantity, unitPrice, sellingPrice, taxAmount, totalAmount |
| 16 | Payment | `payments` | UUID | orderId(FK), amount, status(enum), method(enum), transactionId, gatewayPaymentId, gatewayOrderId, gatewayResponse, failureReason, refundAmount |
| 17 | PaymentIntent | `payment_intents` | UUID | sessionId, userId, orderData(JSON), used(boolean), expiresAt |
| 18 | Shipment | `shipments` | UUID | orderId(FK), shippingRocketId, srOrderId, courierName, status(enum), trackingNumber, awbNumber, labelUrl, manifestUrl, invoiceUrl, weight, dimensions, isCOD, codCollectedAmount, courierCharges, lastWebhookEvent, NDR/RTO/return fields |
| 19 | ShipmentTrackingHistory | `shipment_tracking_history` | UUID | shipmentId(FK), eventType, status, location, remarks, courierName, awbNumber |
| 20 | Review | `reviews` | UUID | userId(FK), productId(FK), rating(1-5), title, comment, images, isActive, helpfulCount, orderId(FK) |
| 21 | Banner | `banners` | UUID | title, subtitle, image, link, isActive, sortOrder, startDate, endDate |
| 22 | ShippingMethod | `shipping_methods` | UUID | name, slug, description, baseCost, costPerKg, freeShippingMinAmount, estimatedDays, isActive |
| 23 | News | `news` | UUID | title, content, excerpt, image, source, sourceUrl, publishedAt, fetchedAt |
| 24 | ReturnShipment | `return_shipments` | UUID | orderId(FK), userId(FK), status(enum), reason, pickupAddress, pickupDate, returnType, refundAmount, refundMethod, shippingRocketId, srReturnOrderId, labelUrl, awbNumber |
| 25 | ReturnItem | `return_items` | UUID | returnId(FK), orderItemId(FK), quantity, condition, conditionImages |
| 26 | ReturnTimeline | `return_timeline` | UUID | returnId(FK), action(enum), actor(enum), actorId, previousStatus, newStatus, comment |

---

## Entity Relationships (Detail)

```
User (1) ────────── (N) Address
User (1) ────────── (N) Cart
User (1) ────────── (N) Wishlist
User (1) ────────── (N) Order
User (1) ────────── (N) Review
User (1) ────────── (N) ReturnShipment

Category (1) ────── (N) Product
Category (M) ────── (M) Department  (via category_departments)
Brand (1) ───────── (N) Product

Product (1) ──────── (N) ProductVariant
Product (1) ──────── (N) ProductOption
  ProductOption (1) ── (N) ProductOptionValue
ProductVariant (M) ── (M) ProductOptionValue  (via VariantOption)
Product (1) ──────── (N) Inventory
Product (1) ──────── (N) Cart
Product (1) ──────── (N) Wishlist
Product (1) ──────── (N) Review
Product (1) ──────── (N) OrderItem

Order (1) ───────── (N) OrderItem
Order (1) ───────── (N) Payment
Order (1) ───────── (N) Shipment
Order (1) ───────── (N) ReturnShipment

Shipment (1) ────── (N) ShipmentTrackingHistory

ReturnShipment (1) ── (N) ReturnItem
ReturnShipment (1) ── (N) ReturnTimeline
```

---

## Order Status State Machine

```
                    ┌──────────────────┐
                    │  PENDING_PAYMENT │ (prepaid only)
                    └────────┬─────────┘
                             │ payment received
                             ▼
                    ┌──────────────────┐
        ┌──────────►│    CONFIRMED     │◄────── COD orders start here
        │           └────────┬─────────┘
        │                    │ admin action
        │                    ▼
        │           ┌──────────────────┐
        │           │   PROCESSING     │
        │           └────────┬─────────┘
        │                    │ ShipRocket pickup
        │                    ▼
        │           ┌──────────────────┐
        │           │     SHIPPED      │
        │           └────────┬─────────┘
        │                    │ ShipRocket tracking update
        │                    ▼
        │           ┌──────────────────┐
        │           │   IN_TRANSIT     │
        │           └────────┬─────────┘
        │                    │ out for delivery
        │                    ▼
        │           ┌──────────────────┐
        │           │ OUT_FOR_DELIVERY │
        │           └────────┬─────────┘
        │                    │ delivered
        │                    ▼
        │           ┌──────────────────┐
        │           │   DELIVERED      │
        │           └──────────────────┘
        │
        │  CANCELLED (from PENDING_PAYMENT, CONFIRMED, PROCESSING)
        │  REFUNDED  (from DELIVERED → return process)
        │  PAYMENT_FAILED (from PENDING_PAYMENT)
        │  RTO        (from IN_TRANSIT, OUT_FOR_DELIVERY)
```

---

## Shipment Status State Machine

```
                    ┌──────────────────┐
                    │     PENDING      │
                    └────────┬─────────┘
                             │ picked up
                             ▼
                    ┌──────────────────┐
                    │   PICKED_UP      │
                    └────────┬─────────┘
                             │ in transit
                             ▼
                    ┌──────────────────┐
                    │   IN_TRANSIT     │
                    └────────┬─────────┘
                             │ out for delivery
                             ▼
                    ┌──────────────────┐
                    │ OUT_FOR_DELIVERY │
                    └────────┬─────────┘
                        ┌───┴───┐
                        ▼       ▼
                ┌──────────┐ ┌──────────┐
                │DELIVERED │ │  FAILED  │
                └──────────┘ └────┬─────┘
                                  │ attempt
                                  ▼
                          ┌──────────────┐
                          │  NDR (Ndr)   │  (Non-Delivery Report)
                          └──────┬───────┘
                             ┌───┴───┐
                             ▼       ▼
                       ┌────────┐ ┌────────┐
                       │RETRY   │ │ RTO    │
                       └────────┘ └────────┘

                         ┌──────────┐
                         │CANCELLED │
                         └──────────┘
```

---

## Payment Status State Machine

```
                    ┌──────────────────┐
                    │     PENDING      │
                    └────────┬─────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
            ┌──────────────┐  ┌──────────────┐
            │  PROCESSING  │  │  CANCELLED   │
            └──────┬───────┘  └──────────────┘
                   │
            ┌──────┴──────┐
            │             │
            ▼             ▼
    ┌────────────┐ ┌──────────────┐
    │ COMPLETED  │ │   FAILED     │
    └──────┬─────┘ └──────────────┘
           │
           ▼
    ┌────────────┐
    │  REFUNDED  │
    └────────────┘
```

---

## Return Shipment Status State Machine

```
                    ┌──────────────────┐
                    │    REQUESTED     │
                    └────────┬─────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
            ┌──────────────┐  ┌──────────────┐
            │PENDING_REVIEW│  │  CANCELLED   │
            └──────┬───────┘  └──────────────┘
                   │
            ┌──────┴──────┐
            │             │
            ▼             ▼
       ┌─────────┐  ┌──────────┐
       │APPROVED │  │ REJECTED │
       └────┬────┘  └──────────┘
            │
            ▼
      ┌───────────┐
      │ SCHEDULED │  (pickup scheduled)
      └─────┬─────┘
            │
            ▼
      ┌───────────┐
      │ PICKED_UP │
      └─────┬─────┘
            │
            ▼
      ┌───────────┐
      │ IN_TRANSIT│
      └─────┬─────┘
            │
            ▼
      ┌───────────┐
      │  RECEIVED │  (at warehouse)
      └─────┬─────┘
            │
            ▼
      ┌──────────────┐
      │ QUALITY_CHECK│
      └──────┬───────┘
             │
     ┌───────┴───────┐
     │               │
     ▼               ▼
 ┌─────────┐  ┌──────────┐
 │ REFUNDED│  │ REJECTED │
 └─────────┘  └──────────┘
```
