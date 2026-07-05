# Reviews Module

**Location:** `src/modules/reviews/`

## Purpose

Product review management: purchase-verified reviews, CRUD, helpful votes, rating statistics, and admin moderation.

---

## Flow Diagram

### Review Creation Flow

```
Client                          ReviewsService                      Database
  │                                │                                  │
  │ GET /reviews/user/can-review   │                                  │
  │ /:productId                    │                                  │
  │ ───────────────────────────►   │                                  │
  │                                │  Check if user has a DELIVERED   │
  │                                │  order containing this product   │
  │                                │ ──────────────────────────────►  │
  │                                │ ◄── hasOrder ────────────────── │
  │                                │                                  │
  │                                │  Check if user already reviewed  │
  │                                │  this product                    │
  │                                │                                  │
  │  ◄── { canReview, orderId?,   │                                  │
  │        existingReview? }       │                                  │
  │                                │                                  │
  │ POST /reviews                  │                                  │
  │ { productId, rating: 4,        │                                  │
  │   title: "Great product",      │                                  │
  │   comment: "...",              │                                  │
  │   images: [...],               │                                  │
  │   orderId }                    │                                  │
  │ ───────────────────────────►   │                                  │
  │                                │  Verify order belongs to user    │
  │                                │  Create Review (isActive=true)   │
  │                                │ ──────────────────────────────►  │
  │                                │                                  │
  │  ◄── Review ───────────────── │                                  │
```

---

## API Endpoints

### User/Public Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/reviews/user/can-review/:productId` | JWT | Check if user can review (purchased + delivered) |
| POST | `/reviews` | JWT | Create review (purchase-verified) |
| GET | `/reviews/product/:productId` | Public | Get product reviews (paginated, sortable) |
| GET | `/reviews/product/:productId/stats` | Public | Rating distribution and averages |
| GET | `/reviews/:id` | Public | Get single review |
| PUT | `/reviews/:id` | JWT | Update own review |
| DELETE | `/reviews/:id` | JWT | Delete own review |
| POST | `/reviews/:id/helpful` | Public | Mark review as helpful |

### Admin Endpoints (JWT + ADMIN)

| Method | Path | Description |
|---|---|---|
| GET | `/reviews/admin/all` | Get all reviews (paginated) |
| PUT | `/reviews/admin/:id/toggle` | Toggle review active status |

---

## Service Layer

| Method | Signature | Description |
|---|---|---|
| `canUserReview` | `(userId, productId): Promise<{ canReview, orderId?, existingReview? }>` | Check purchase + no duplicate |
| `create` | `(userId, dto: CreateReviewDto): Promise<Review>` | Verify order, create review |
| `findByProduct` | `(productId, query: ReviewQueryDto): Promise<{ reviews, total }>` | Paginated, sortable product reviews |
| `getStats` | `(productId): Promise<ReviewStatsDto>` | Average rating, total, breakdown, verified count |
| `markHelpful` | `(id: string): Promise<Review>` | Increment helpfulCount |
| `findAllForAdmin` | `(query): Promise<{ reviews, total }>` | All reviews paginated |
| `toggleActive` | `(id, isActive): Promise<Review>` | Admin moderation |

---

## DTOs

| DTO | Fields |
|---|---|
| `CreateReviewDto` | productId, rating (1-5), title?, comment?, images[]?, orderId? |
| `UpdateReviewDto` | rating?, title?, comment?, images[]? |
| `ReviewQueryDto` | page?, limit?, sort? |
| `ReviewStatsDto` | averageRating, totalReviews, ratingBreakdown { 1-5 counts }, verifiedCount |

---

## Entity

**Review** (`reviews` table) — UUID PK, userId (FK→User), productId (FK→Product), rating, title, comment, images (json), isActive, helpfulCount, orderId (FK→Order).

---

## Module Configuration

```
ReviewsModule
├── imports: TypeOrmModule.forFeature([Review, Order, OrderItem])
├── controllers: ReviewsController
├── providers: ReviewsService
└── exports: ReviewsService
```
