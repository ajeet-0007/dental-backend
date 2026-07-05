# Admin Module

**Location:** `src/modules/admin/`

## Purpose

Centralized admin dashboard and management operations: dashboard statistics, order/user/product CRUD, inventory management, category/brand CRUD, payment listing, and ShipRocket shipment cancellation.

---

## API Endpoints

All routes require `JwtAuthGuard` + `RolesGuard` with `@Roles(UserRole.ADMIN)`.

| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard` | Dashboard statistics (counts, monthly revenue, top products) |
| GET | `/admin/orders` | Paginated orders (query: page, limit, status, search) |
| PUT | `/admin/orders/:id/status` | Update order status |
| GET | `/admin/users` | Paginated users list |
| PUT | `/admin/users/:id/status` | Toggle user active status |
| GET | `/admin/products` | Paginated products (query: page, limit, search, categoryId) |
| POST | `/admin/products` | Create product |
| PUT | `/admin/products/:id` | Update product |
| DELETE | `/admin/products/:id` | Delete product |
| GET | `/admin/inventory` | Inventory list with low-stock |
| GET | `/admin/categories` | All active categories |
| POST | `/admin/categories` | Create category |
| PUT | `/admin/inventory/:productId` | Update inventory |
| GET | `/admin/payments` | Paginated payments |
| POST | `/admin/orders/:id/cancel-shipment` | Cancel ShipRocket shipment |

---

## Service Layer

| Method | Description |
|---|---|
| `getDashboardStats()` | Monthly revenue (last 6 months), order/user/product/payment counts, top products |
| `getAllOrders(page, limit, status?, search?)` | Enriched order list |
| `updateOrderStatus(orderId, status)` | Direct status update |
| `getAllUsers(page, limit)` | Paginated users |
| `updateUserStatus(userId, isActive)` | Activate/deactivate |
| `getAllProducts(page, limit, search?, categoryId?)` | Products with variant price ranges |
| `createProduct(data)` | Product + optional inventory + department relations |
| `updateProduct(id, data)` | Product + options + departments + inventory |
| `deleteProduct(id)` | Transactional: delete product + inventory |
| `getInventory(productId?, search?)` | Inventory with low-stock detection |
| `updateInventory(productId, quantity, variantId?)` | Upsert inventory |
| `getAllCategories()` | Active sorted categories |
| `createCategory(data)` | Category with slug deduplication |
| `getAllPayments(page, limit, status?)` | Paginated payments |
| `cancelOrderShipment(orderId)` | Cancel via ShipRocket, update statuses |

---

## Module Configuration

```
AdminModule
├── imports: TypeOrmModule.forFeature([Order, Payment, Product, User,
│               OrderItem, Inventory, Category, ProductOption,
│               ProductOptionValue, Department, Brand, Shipment]),
│            forwardRef(() => ShippingModule)
├── controllers: AdminController
├── providers: AdminService
└── exports: AdminService
```
