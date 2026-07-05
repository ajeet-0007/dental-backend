# Wishlist Module

**Location:** `src/modules/wishlist/`

## Purpose

User wishlist management: add/remove products, check wishlist status (single & batch). Prevents duplicate entries.

---

## API Endpoints

All routes require JWT authentication.

| Method | Path | Description |
|---|---|---|
| GET | `/wishlist` | List all wishlist items (newest first, with product + category) |
| POST | `/wishlist` | Add product to wishlist |
| DELETE | `/wishlist/:productId` | Remove product from wishlist |
| GET | `/wishlist/check/:productId` | Check if product is in wishlist |
| POST | `/wishlist/check-many` | Batch check multiple product IDs |

---

## Service Layer

| Method | Signature | Description |
|---|---|---|
| `findAll` | `(userId): Promise<Wishlist[]>` | All items with product + category relations, newest first |
| `add` | `(userId, dto: AddToWishlistDto): Promise<Wishlist>` | Throws ConflictException if already present |
| `remove` | `(userId, productId: number): Promise<{ message }>` | Throws NotFoundException if not present |
| `check` | `(userId, productId: number): Promise<{ inWishlist }>` | Single check |
| `checkMany` | `(userId, productIds: number[]): Promise<{ productId, inWishlist }[]>` | Single query with IN clause |

---

## DTOs

| DTO | Fields |
|---|---|
| `AddToWishlistDto` | productId (required, number) |

---

## Entity

**Wishlist** (`wishlists` table) — UUID PK, userId (FK→User), productId (FK→Product), createdAt, updatedAt.

---

## Module Configuration

```
WishlistModule
├── imports: TypeOrmModule.forFeature([Wishlist])
├── controllers: WishlistController
├── providers: WishlistService
└── exports: WishlistService
```
