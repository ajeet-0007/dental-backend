# Returns Module

**Location:** `src/modules/returns/`

## Purpose

Complete return/refund management: eligibility checking, return initiation, admin review, quality check, and refund processing. Integrates with ShipRocket for return label generation.

---

## Flow Diagram

### Return Lifecycle

```
User                          ReturnsService                   Admin/ShipRocket
  │                                │                                │
  │ POST /returns/initiate         │                                │
  │ { orderId, reason, items[],    │                                │
  │   pickupAddress, ... }         │                                │
  │ ───────────────────────────►   │                                │
  │                                │  checkEligibility():           │
  │                                │  • Order DELIVERED?            │
  │                                │  • Within 7-day window?        │
  │                                │  • Not COD?                    │
  │                                │  • No active return exists?    │
  │                                │                                │
  │                                │  if total <= Rs. 500:          │
  │                                │    AUTO-APPROVE                │
  │                                │  else: PENDING_REVIEW          │
  │                                │                                │
  │                                │  Create ReturnShipment + Items │
  │                                │  Add timeline entry            │
  │                                │                                │
  │ ◄── ReturnShipment ────────── │                                │
  │                                │                                │
  │ (if auto-approved)             │                                │
  │                                │  POST /admin/returns/:id/review│
  │                                │  { decision: "approved" }      │
  │                                │ ──────────────────────────►   │
  │                                │                                │
  │                                │  approveReturn():              │
  │                                │  • Create ShipRocket return    │
  │                                │    shipment (label, AWB)       │
  │                                │  • Set status = SCHEDULED      │
  │                                │  • Add timeline entry          │
  │                                │                                │
  │                                │  ShipRocket pickup →           │
  │                                │  PICKED_UP → IN_TRANSIT        │
  │                                │                                │
  │                                │  POST /admin/returns/:id/      │
  │                                │  quality-check                 │
  │                                │  { result: "passed" }          │
  │                                │ ──────────────────────────►   │
  │                                │                                │
  │                                │  qualityCheck():               │
  │                                │  • If passed → processRefund() │
  │                                │  • If failed → mark REJECTED   │
  │                                │                                │
  │                                │  processRefund():              │
  │                                │  • Calculate: itemsTotal - Rs.3│
  │                                │  • Set status = REFUNDED       │
  │                                │  • Add timeline                │
```

---

## API Endpoints

### User Endpoints (JWT)

| Method | Path | Description |
|---|---|---|
| GET | `/returns/eligibility/:orderId` | Check if order is returnable |
| GET | `/returns` | List user's returns (paginated, filterable) |
| GET | `/returns/:id` | Get return details |
| POST | `/returns/initiate` | Initiate a return request |
| POST | `/returns/:id/cancel` | Cancel return (before pickup) |
| POST | `/returns/:id/reschedule` | Reschedule pickup |
| POST | `/returns/:id/images` | Upload condition images |

### Admin Endpoints (JWT + ADMIN)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/returns` | List all returns (paginated, filterable) |
| GET | `/admin/returns/:id` | Get return details |
| POST | `/admin/returns/:id/review` | Approve or reject return |
| POST | `/admin/returns/:id/quality-check` | Quality check (passed/failed) |
| POST | `/admin/returns/:id/process-refund` | Manually trigger refund |
| GET | `/admin/returns/:id/label` | Redirect to return label |
| POST | `/admin/returns/bulk-action` | Bulk approve/reject |

---

## Service Layer

| Method | Signature | Description |
|---|---|---|
| `checkEligibility` | `(orderId, userId): Promise<EligibilityResponseDto>` | Validates order status, return window, payment method, duplicates |
| `initiateReturn` | `(userId, dto): Promise<ReturnShipment>` | Checks eligibility, creates ReturnShipment+items+timeline, auto-approves if under threshold |
| `cancelReturn` | `(returnId, userId, reason?): Promise<ReturnShipment>` | Cancels if status is requested/pending_review |
| `reschedulePickup` | `(returnId, userId, date, slot?): Promise<ReturnShipment>` | Reschedules when status is scheduled |
| `uploadConditionImages` | `(returnId, userId, images[]): Promise<ReturnShipment>` | Records images in timeline |
| `getUserReturns` | `(userId, query): Promise<{ data, total }>` | Paginated user returns |
| `approveReturn` | `(returnId, adminId, notes?): Promise<ReturnShipment>` | Creates ShipRocket return, sets scheduled |
| `rejectReturn` | `(returnId, adminId, notes?): Promise<ReturnShipment>` | Rejects with admin notes |
| `qualityCheck` | `(returnId, adminId, result, notes?): Promise<ReturnShipment>` | If passed → processRefund; if failed → reject |
| `processRefund` | `(returnId, adminId): Promise<ReturnShipment>` | Calculates amount (itemsTotal - Rs.3), sets refunded |

---

## DTOs & Enums

| DTO | Key Fields |
|---|---|
| `InitiateReturnDto` | orderId, reason (enum), items[] (orderItemId, quantity), pickupAddress |
| `ReviewReturnDto` | decision (approved/rejected), notes? |
| `QualityCheckDto` | result (passed/failed), notes? |
| `ReturnQueryDto` | status?, page?, limit? |

**Enums:**
- `ReturnShipmentStatus`: requested, pending_review, approved, rejected, scheduled, picked_up, in_transit, received, quality_check, refunded, cancelled
- `ReturnReason`: defective, wrong_item, damaged, not_as_described, changed_mind, other
- `ReturnTimelineAction`: return_initiated, return_approved, return_rejected, label_generated, pickup_scheduled, refund_completed, etc.

---

## Entities

| Entity | Table | Purpose |
|---|---|---|
| ReturnShipment | `return_shipments` | Return request with status, pickup, refund info |
| ReturnItem | `return_items` | Individual items within return |
| ReturnTimeline | `return_timeline` | Audit trail of all actions |

---

## Module Configuration

```
ReturnsModule
├── imports: TypeOrmModule.forFeature([ReturnShipment, ReturnItem,
│               ReturnTimeline, Order, Shipment, Payment, OrderItem]),
│            forwardRef(() => ShippingModule)
├── controllers: ReturnsController, AdminReturnsController
├── providers: ReturnsService
└── exports: ReturnsService
```
