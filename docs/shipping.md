# Shipping Module

**Location:** `src/modules/shipping/`

## Purpose

Complete shipping management via ShipRocket API v2 integration: rate calculation, shipment creation, label/manifest/invoice generation, tracking, NDR (Non-Delivery Report) handling, pickup scheduling, and webhook status sync.

---

## Flow Diagrams

### Shipment Creation Flow

```
Orders/Payments Service           ShippingService               ShipRocket API
      │                               │                              │
      │ createShippingRocketShipment()│                              │
      │ ──────────────────────────►   │                              │
      │                               │  Fetch order with items      │
      │                               │                              │
      │                               │  Parse shipping address      │
      │                               │  Calculate package dims:     │
      │                               │  { weight, length,           │
      │                               │    breadth, height }         │
      │                               │                              │
      │                               │  POST /courier/serviceability│
      │                               │  (pickupPincode,             │
      │                               │   deliveryPincode, weight,   │
      │                               │   isCOD)                     │
      │                               │ ─────────────────────────►   │
      │                               │ ◄── { couriers[] } ──────── │
      │                               │                              │
      │                               │  Choose cheapest courier     │
      │                               │                              │
      │                               │  POST /orders/create/adhoc   │
      │                               │  { order_id, order_date,     │
      │                               │    billing_address,          │
      │                               │    shipping_address,         │
      │                               │    order_items[],            │
      │                               │    payment_method,           │
      │                               │    shipping_charges,         │
      │                               │    sub_total,                │
      │                               │    courier_id,               │
      │                               │    pickup_location }         │
      │                               │ ─────────────────────────►   │
      │                               │ ◄── { order_id, shipment_id,│
      │                               │       awb, label_url,        │
      │                               │       manifest_url,          │
      │                               │       invoice_url } ───────  │
      │                               │                              │
      │                               │  Create Shipment entity      │
      │                               │  (status = PENDING)          │
      │                               │                              │
      │                               │  Update order with courier,  │
      │                               │  service, shippingRate       │
      │                               │                              │
      │ ◄── Shipment ─────────────── │                              │
```

### Webhook Status Sync Flow

```
ShipRocket                          ShippingModule                    DB/Email
  │                                      │                              │
  │ POST /shipping/webhook               │                              │
  │ { order_id, awb, tracking_data,      │                              │
  │   current_status, location,          │                              │
  │   courier_company_id, courier_name }  │                              │
  │ ──────────────────────────────────►   │                              │
  │                                      │  Verify HMAC-SHA256 sig      │
  │                                      │                              │
  │                                      │  Match shipment by:          │
  │                                      │    1. sr_order_id            │
  │                                      │    2. awb_number             │
  │                                      │    3. tracking_number        │
  │                                      │                              │
  │                                      │  Map ShipRocket status →     │
  │                                      │  ShipmentStatus enum         │
  │                                      │  (picked_up, in_transit,     │
  │                                      │   out_for_delivery,          │
  │                                      │   delivered, failed, rto)    │
  │                                      │                              │
  │                                      │  Update Shipment status      │
  │                                      │  Add tracking history entry  │
  │                                      │                              │
  │                                      │  if delivered:               │
  │                                      │    Update order status       │
  │                                      │    Auto-confirm COD payment  │
  │                                      │    Send email notification   │
  │                                      │                              │
  │                                      │  if RTO:                     │
  │                                      │    Mark order.isRTO = true   │
  │                                      │                              │
  │                                      │  if failed:                  │
  │                                      │    Mark delivery.failed=true │
```

### Label/Manifest/Invoice Generation

```
Admin                          ShippingService                   ShipRocket
  │                                │                                │
  │ GET /shipping/labels/:srId     │                                │
  │ ───────────────────────────►   │                                │
  │                                │  POST /courier/generate/label  │
  │                                │  { shipment_id: [srId] }       │
  │                                │ ───────────────────────────►   │
  │                                │ ◄── PDF buffer ────────────── │
  │                                │                                │
  │  ◄── label.pdf (Buffer)       │                                │
  │                                │                                │
  │ POST /shipping/labels/         │                                │
  │ bulk-generate                  │                                │
  │ { shipmentIds: [...] }         │                                │
  │ ───────────────────────────►   │                                │
  │                                │  POST /courier/generate/label  │
  │                                │  { shipment_id: [...] }        │
  │                                │ ───────────────────────────►   │
  │                                │ ◄── PDF buffer ────────────── │
  │                                │                                │
  │  ◄── bulk-labels.pdf (Buffer)  │                                │
```

---

## API Endpoints

### Public/User Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/shipping/rates` | Public | Calculate shipping rates |
| POST | `/shipping/shipments` | JWT | Create shipment |
| GET | `/shipping/shipments/track/:trackingNumber` | Public | Track by AWB |
| GET | `/shipping/order/:orderId` | Public | Get shipment by order |
| GET | `/shipping/methods` | Public | List active shipping methods |
| GET | `/shipping/methods/:id` | Public | Get method by ID |
| GET | `/shipping/calculate` | Public | Legacy cost calculation |
| GET | `/shipping/couriers` | Public | Available couriers for route |
| POST | `/shipping/return` | JWT | Create return shipment |
| POST | `/shipping/shipments/:id/reschedule` | JWT | Reschedule failed delivery |

### Admin Endpoints (JWT + ADMIN)

| Method | Path | Description |
|---|---|---|
| GET | `/shipping/labels/:shippingRocketId` | Download label PDF |
| POST | `/shipping/labels/bulk-generate` | Bulk labels PDF |
| POST | `/shipping/shipments/:id/cancel` | Cancel shipment |
| POST | `/shipping/methods` | Create shipping method |
| PUT | `/shipping/methods/:id` | Update method |
| DELETE | `/shipping/methods/:id` | Delete method |
| PUT | `/shipping/shipments/:id` | Update shipment |
| POST | `/shipping/pickups/schedule` | Schedule pickup |
| POST | `/shipping/pickups/cancel` | Cancel pickup |
| GET | `/shipping/ndr` | NDR shipments list |
| POST | `/shipping/ndr/:shipmentId/retry` | Retry NDR delivery |
| POST | `/shipping/ndr/:shipmentId/reschedule` | Reschedule NDR |
| POST | `/shipping/awb/assign` | Assign AWB |

### Admin Shipping Controller (`/admin/shipping`)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/shipping` | Filtered/paginated shipments |
| GET | `/admin/shipping/stats` | Counts by status |
| GET | `/admin/shipping/list` | Simplified list |
| POST | `/admin/shipping/bulk/label` | Bulk labels |
| POST | `/admin/shipping/bulk/manifest` | Bulk manifests |
| POST | `/admin/shipping/bulk/invoice` | Bulk invoices |
| POST | `/admin/shipping/bulk/cancel` | Bulk cancel |
| POST | `/admin/shipping/pickup/schedule` | Schedule pickup |
| GET | `/admin/shipping/ndr/list` | NDR list |
| POST | `/admin/shipping/ndr/:id/retry` | Retry NDR |
| POST | `/admin/shipping/ndr/:id/reschedule` | Reschedule NDR |

### Webhook (Public)

| Method | Path | Description |
|---|---|---|
| POST | `/shipping/webhook` | ShipRocket status update webhook |
| POST | `/shipping/webhooks/status` | Legacy webhook path |

---

## Service Layer

### ShippingService

| Method | Description |
|---|---|
| `calculateShippingRates(dto)` | Delegates to ShipRocket rate API |
| `createShippingRocketShipment(dto)` | Fetch order, calc dims, get cheapest courier, create ShipRocket order, save Shipment entity |
| `getShipmentTracking(trackingNumber)` | Track by AWB |
| `generateLabel(shippingRocketId)` | Download single label PDF |
| `generateBulkLabels(shipmentIds)` | Download bulk labels PDF |
| `cancelShipment(id)` | Cancel via ShipRocket, update status |
| `schedulePickup(shipmentIds, date)` | Bulk pickup scheduling |
| `cancelPickup(pickupId)` | Cancel pickup |
| `getNDRShipments()` | NDR list from ShipRocket |
| `retryNDRDelivery(shipmentId)` | Retry NDR |
| `rescheduleNDRDelivery(shipmentId, date)` | Reschedule NDR |
| `createReturnShipment(orderId, reason, date)` | Return via ShipRocket |
| `assignAWB(shipmentId, courierCompanyId)` | Assign AWB |
| `getAvailableCouriers(params)` | Route-based courier availability |
| `getCourierCompanies()` | All couriers from ShipRocket |

### ShippingRocketService

| Method | Description |
|---|---|
| `onModuleInit()` | Auto-authenticate + ensure pickup location on startup |
| `getPickupLocations()` | GET `/settings/company/pickup` |
| `createPickupLocation()` | POST `/settings/company/addpickup` |
| `calculateRates(dto)` | GET `/courier/serviceability` |
| `createShipment(dto, order)` | POST `/orders/create/adhoc` |
| `generateLabel(id)` | POST `/courier/generate/label` |
| `generateManifest(id)` | POST `/courier/generate/manifest` |
| `generateInvoice(id)` | POST `/orders/printinvoice` |
| `getShipmentTracking(awb)` | GET `/courier/track/awb/{awb}` |
| `cancelShipment(orderId)` | POST `/orders/cancel` |
| `schedulePickup(shipmentIds, date)` | POST `/pickups/schedule` |
| `getNDRShipments()` | GET `/ndr/list` |
| `retryNDRDelivery(id)` | POST `/ndr/retry` |
| `createReturnShipment(originalId, address)` | POST `/orders/create/return` |
| `assignAWB(srId, courierId)` | POST `/shipments/awb` |
| `getCourierCompanies()` | GET `/courier/list` |

---

## Entities

| Entity | Table | Key Fields |
|---|---|---|
| Shipment | `shipments` | UUID PK, orderId, shippingRocketId, srOrderId, courierName, status, trackingNumber, awbNumber, labelUrl, manifestUrl, invoiceUrl, pickupPincode, deliveryPincode, weight, dimensions, isCOD, codCollectedAmount, lastWebhookEvent, NDR/RTO fields |
| ShipmentTrackingHistory | `shipment_tracking_history` | UUID PK, shipmentId, eventType, status, location, remarks |
| ShippingMethod | `shipping_methods` | UUID PK, name, baseCost, costPerKg, freeShippingMinAmount, estimatedDays |

---

## Shipment Status Mapping (ShipRocket → Internal)

| ShipRocket Status | Internal Status |
|---|---|
| PICKED UP | `picked_up` |
| IN TRANSIT | `in_transit` |
| OUT FOR DELIVERY | `out_for_delivery` |
| DELIVERED | `delivered` |
| CANCELLED | `cancelled` |
| RTO | `rto` |
| RTO_NDR | `rto` |
| LOST | `failed` |
| DAMAGED | `failed` |
| NDR | `delivery_failed` |

---

## Module Configuration

```
ShippingModule
├── imports: TypeOrmModule.forFeature([Shipment, ShippingMethod,
│               ShipmentTrackingHistory, Order, Payment, User,
│               ReturnShipment]),
│            forwardRef(() => EmailModule),
│            forwardRef(() => PaymentsModule)
├── controllers: ShippingController, AdminShippingController,
│                ShippingWebhookController, ShippingTestController
├── providers: ShippingService, ShippingRocketService,
│              AdminShippingService, ShippingRocketTestService
└── exports: ShippingService, ShippingRocketService
```
