# Inventory Module

**Location:** `src/modules/inventory/`

## Purpose

Stock management: CRUD for inventory records, stock reservation/release/deduction for order fulfillment, low-stock and out-of-stock queries.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/inventory` | ADMIN | Paginated inventory list |
| GET | `/inventory/low-stock` | ADMIN | Low stock items (threshold query param) |
| GET | `/inventory/out-of-stock` | ADMIN | Out-of-stock items |
| GET | `/inventory/:id` | ADMIN | Get by ID |
| GET | `/inventory/product/:productId` | JWT | Get by product ID |
| GET | `/inventory/product/:productId/available` | JWT | Available quantity (qty - reserved) |
| POST | `/inventory` | ADMIN | Create inventory |
| PUT | `/inventory/:id` | ADMIN | Update inventory |
| DELETE | `/inventory/:id` | ADMIN | Delete inventory |

---

## Service Layer

| Method | Signature | Description |
|---|---|---|
| `create` | `(dto: CreateInventoryDto): Promise<Inventory>` | Create inventory record |
| `findAll` | `(page, limit): Promise<{ inventory, total }>` | Paginated list |
| `findOne` | `(id: string): Promise<Inventory>` | By ID |
| `findByProduct` | `(productId: string): Promise<Inventory[]>` | By product |
| `getAvailableQuantity` | `(productId: string): Promise<number>` | qty - reservedQty |
| `reserveStock` | `(productId, quantity): Promise<boolean>` | Atomically increment reservedQty |
| `releaseStock` | `(productId, quantity): Promise<void>` | Decrement reservedQty |
| `deductStock` | `(productId, quantity): Promise<void>` | Decrement quantity (after shipment) |
| `getLowStockProducts` | `(threshold = 10): Promise<Inventory[]>` | qty < threshold |
| `getOutOfStockProducts` | `(): Promise<Inventory[]>` | qty = 0 |

---

## DTOs

| DTO | Fields |
|---|---|
| `CreateInventoryDto` | productId, productVariantId?, warehouseLocation?, quantity, lowStockThreshold?, trackInventory? |
| `UpdateInventoryDto` | quantity?, reservedQuantity?, lowStockThreshold?, trackInventory?, warehouseLocation? |

---

## Entity

**Inventory** (`inventory` table) — UUID PK, productId (FK→Product), productVariantId (FK→Variant, nullable), warehouseLocation, quantity, reservedQuantity, lowStockThreshold, trackInventory.

---

## Module Configuration

```
InventoryModule
├── imports: TypeOrmModule.forFeature([Inventory, Product])
├── controllers: InventoryController
├── providers: InventoryService
└── exports: InventoryService
```
