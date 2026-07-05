# Cart Module

**Location:** `src/modules/cart/`

## Purpose

Shopping cart management: add/update/remove items, clear cart, compute totals, and reorder from past orders. Enforces inventory stock validation.

---

## Flow Diagram: Add to Cart

```
Client                        CartService                          Database
  │                              │                                    │
  │ POST /cart/add               │                                    │
  │ { productId,                 │                                    │
  │   productVariantId?,         │                                    │
  │   quantity: 2 }              │                                    │
  │ ─────────────────────────►   │                                    │
  │                              │  Validate product exists & active  │
  │                              │ ───────────────────────────────►   │
  │                              │ ◄── product ────────────────────  │
  │                              │                                    │
  │                              │  If variantId: validate variant    │
  │                              │    belongs to product              │
  │                              │                                    │
  │                              │  Check inventory:                  │
  │                              │    if trackInventory:              │
  │                              │    (quantity - reservedQty) >= qty  │
  │                              │ ───────────────────────────────►   │
  │                              │ ◄── stock check ───────────────── │
  │                              │                                    │
  │                              │  Check existing cart entry         │
  │                              │  (userId + productId + variantId)  │
  │                              │                                    │
  │                              │  if exists: increment quantity     │
  │                              │  else: create new cart entry       │
  │                              │                                    │
  │                              │ ───────────────────────────────►   │
  │                              │ ◄── saved ──────────────────────  │
  │                              │                                    │
  │  ◄── Cart item ──────────── │                                    │
```

---

## API Endpoints

All routes require JWT authentication.

| Method | Path | Description |
|---|---|---|
| GET | `/cart` | Get all cart items with product details |
| GET | `/cart/total` | Compute subtotal + item count |
| POST | `/cart/add` | Add product/variant to cart |
| PUT | `/cart/:id` | Update item quantity |
| DELETE | `/cart/:id` | Remove single item |
| DELETE | `/cart` | Clear entire cart |
| POST | `/cart/reorder` | Copy past order items to cart |

---

## Service Layer

| Method | Signature | Description |
|---|---|---|
| `addToCart` | `(userId, dto: AddToCartDto): Promise<Cart>` | Stock validation, create or increment |
| `getCart` | `(userId): Promise<any[]>` | All items with product, category, brand, variant info |
| `getCartTotal` | `(userId): Promise<{ subtotal, items }>` | Sum of price × quantity |
| `updateCartItem` | `(userId, cartItemId, dto: UpdateCartItemDto): Promise<Cart>` | Quantity update with stock check |
| `removeFromCart` | `(userId, cartItemId): Promise<void>` | Hard delete |
| `clearCart` | `(userId): Promise<void>` | Delete all user items |
| `reorder` | `(userId, orderId): Promise<{ success, addedItems, failedItems, cart }>` | Copies order items to cart; handles inactive products, stock changes |

---

## DTOs

| DTO | Fields |
|---|---|
| `AddToCartDto` | productId (required), productVariantId? (optional), quantity (default 1) |
| `UpdateCartItemDto` | quantity (required) |

---

## Entity

**Cart** (`cart` table) — UUID PK, userId (FK→User), productId (FK→Product), productVariantId (FK→Variant, nullable), quantity. Unique constraint on `(userId, productId, productVariantId)`.

---

## Module Configuration

```
CartModule
├── imports: TypeOrmModule.forFeature([Cart, Product, ProductVariant, Inventory, Order])
├── controllers: CartController
├── providers: CartService
└── exports: CartService
```
