# Bulk Upload Module

**Location:** `src/modules/bulk-upload/`

## Purpose

CSV-based bulk product upload: parse, validate, group rows by product, resolve images via ImageKit, and transactionally create products with variants, options, and inventory.

---

## Flow Diagram

```
Admin                          BulkUploadService                    External
  │                                │                                  │
  │ POST /bulk-upload              │                                  │
  │ (multipart CSV file)           │                                  │
  │ ───────────────────────────►   │                                  │
  │                                │  Parse CSV → ParsedRow[]         │
  │                                │  (using @fast-csv/parse)         │
  │                                │                                  │
  │                                │  Group rows by product name      │
  │                                │  → ProductGroup[]                │
  │                                │                                  │
  │                                │  For each group:                 │
  │                                │    Validate fields               │
  │                                │    (name, SKU, price, etc.)      │
  │                                │                                  │
  │                                │  Pre-fetch:                      │
  │                                │    categoriesByName              │
  │                                │    brandsByName                  │
  │                                │    departmentsByName             │
  │                                │                                  │
  │                                │  Resolve images via ImageKit     │
  │                                │  (upload local files → CDN URLs) │
  │                                │ ───── ImageKit ──────────────►  │
  │                                │                                  │
  │                                │  For each validated group:       │
  │                                │    BEGIN TRANSACTION             │
  │                                │    Create Product                │
  │                                │    If has variants:              │
  │                                │      Create ProductOptions       │
  │                                │      Create ProductOptionValues  │
  │                                │      For each variant row:       │
  │                                │        Create ProductVariant     │
  │                                │        Create Inventory          │
  │                                │        Create VariantOption joins│
  │                                │    else:                         │
  │                                │      Create Inventory (qty=0)    │
  │                                │    COMMIT                        │
  │                                │                                  │
  │  ◄── { results: [{row,         │                                  │
  │        productName, status,    │                                  │
  │        productId?, error?}] }  │                                  │
```

---

## API Endpoints (ADMIN only)

| Method | Path | Description |
|---|---|---|
| GET | `/bulk-upload/template` | Download CSV template with headers + example rows |
| POST | `/bulk-upload` | Upload CSV file (multipart) |

---

## CSV Template Format

```
product_name,sku,price,mrp,category,brand,department,option1_name,option1_value,option2_name,option2_value,variant_name,variant_sku,variant_price,stock,image
```

Headers include: product_name, sku, description, short_description, price, mrp, category, brand, department, unit, min_order_qty, is_featured, is_returnable, features, key_specifications, packaging, direction_to_use, additional_info, warranty, option{1-3}_name, option{1-3}_value, variant_name, variant_sku, variant_price, variant_mrp, variant_weight, variant_weight_unit, variant_image, stock, image

---

## Service Layer

| Method | Description |
|---|---|
| `generateTemplate()` | Returns CSV string with headers + 3 example rows |
| `parseCSV(file)` | Parse multipart CSV into ParsedRow[] |
| `groupRowsByProduct(rows)` | Group by product_name |
| `validateGroup(group, categories, brands, departments)` | Field-level validation |
| `resolveImagePaths(imageField)` | Upload local images to ImageKit |
| `processBulkUpload(file)` | Main orchestrator |

---

## Module Configuration

```
BulkUploadModule
├── imports: TypeOrmModule.forFeature([Product, ProductVariant,
│               ProductOption, ProductOptionValue, VariantOption,
│               Inventory, Category, Brand, Department])
├── controllers: BulkUploadController
├── providers: BulkUploadService
└── exports: BulkUploadService
```
