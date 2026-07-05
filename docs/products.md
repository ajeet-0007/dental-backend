# Products Module

**Location:** `src/modules/products/`

## Purpose

Core product catalog management: CRUD for products, variants, options, inventory. Provides search, filtering, recommendations, and featured/top-selling product queries.

---

## Flow Diagrams

### Product with Variants Creation

```
Admin                          ProductsService                     Database
  │                                │                                  │
  │ POST /products/with-variants   │                                  │
  │ { name, sku, sellingPrice,     │                                  │
  │   options: [{ name: "Size",    │                                  │
  │     values: ["S","M","L"] }],  │                                  │
  │   variants: [{ name: "S",      │                                  │
  │     options: [{ optionName:    │                                  │
  │       "Size", optionValue:     │                                  │
  │       "S" }] }] }              │                                  │
  │ ───────────────────────────►   │                                  │
  │                                │  BEGIN TRANSACTION               │
  │                                │ ──────────────────────────────►  │
  │                                │                                  │
  │                                │  Create Product                  │
  │                                │  Create Inventory (qty=0)        │
  │                                │                                  │
  │                                │  For each option:                │
  │                                │    Create ProductOption          │
  │                                │    For each value:               │
  │                                │      Create ProductOptionValue   │
  │                                │                                  │
  │                                │  For each variant:               │
  │                                │    Create ProductVariant         │
  │                                │    Create Inventory for variant  │
  │                                │    Create VariantOption joins    │
  │                                │      (variant → option → value)  │
  │                                │                                  │
  │                                │  COMMIT TRANSACTION              │
  │                                │ ──────────────────────────────►  │
  │                                │                                  │
  │  ◄── Product with options     │                                  │
  │       and variants             │                                  │
```

### Product Search/Filter Flow

```
Client                          ProductsService                      Database
  │                                │                                   │
  │ GET /products?search=tooth     │                                   │
  │ &category=dental-brushes       │                                   │
  │ &minPrice=100&maxPrice=500     │                                   │
  │ &sort=price-asc&page=1         │                                   │
  │ &limit=20                      │                                   │
  │ ───────────────────────────►   │                                   │
  │                                │  Build QueryBuilder:              │
  │                                │    leftJoin category, brand, dept │
  │                                │    WHERE name ILIKE '%tooth%'     │
  │                                │      OR description ILIKE '%...'  │
  │                                │    AND category.slug = 'dental..' │
  │                                │    AND sellingPrice BETWEEN       │
  │                                │    ORDER BY sellingPrice ASC      │
  │                                │    LIMIT 20 OFFSET 0              │
  │                                │                                   │
  │                                │ ───────────────────────────────►  │
  │                                │ ◄── products + total count ────  │
  │                                │                                   │
  │                                │  Batch load variants & inventory  │
  │                                │  for returned products            │
  │                                │                                   │
  │  ◄── { products, total,       │                                   │
  │        page, limit,            │                                   │
  │        totalPages }            │                                   │
```

---

## API Endpoints

### Public Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/products` | List/filter products (search, category, brand, price, department, pagination, sort) |
| GET | `/products/featured` | Get featured products (limit, default 10) |
| GET | `/products/top-selling` | Random top-selling in price range 500-1500 (limit, default 20) |
| GET | `/products/brands` | Get distinct brand names |
| GET | `/products/recommended` | Recommended by category slugs |
| GET | `/products/recommended-for-cart` | Cart page recommendations |
| GET | `/products/search/:query` | Global search (products + categories + brands) |
| GET | `/products/:id` | Get product by numeric ID |
| GET | `/products/slug/:slug` | Get product by slug |
| GET | `/products/:id/related` | Related products in same category |
| GET | `/products/:id/variants` | Variants for a product |

### Admin Endpoints (JWT + ADMIN)

| Method | Path | Description |
|---|---|---|
| POST | `/products` | Create single product |
| POST | `/products/with-variants` | Create product + options + variants (transactional) |
| POST | `/products/variants` | Create single variant |
| POST | `/products/variants/bulk` | Create multiple variants (transactional) |
| PUT | `/products/:id` | Update product + options |
| PUT | `/products/variants/:id` | Update variant |
| PUT | `/products/variants/:id/inventory` | Update variant inventory |
| DELETE | `/products/:id` | Delete product |
| DELETE | `/products/variants/:id` | Delete variant |

---

## Service Layer

### ProductsService

| Method | Signature | Description |
|---|---|---|
| `create` | `(dto: CreateProductDto): Promise<Product>` | Slugify, check slug uniqueness, generate SKU, create + auto-inventory |
| `createWithVariants` | `(dto: CreateProductWithVariantsDto): Promise<any>` | **Transactional**: product + options + values + variants + inventory |
| `findAll` | `(query: ProductQueryDto): Promise<{ products, total, page, limit, totalPages }>` | QueryBuilder with filters, pagination, variant/inventory enrichment |
| `findOne` | `(id: string): Promise<any>` | By ID with all relations, variant option enrichment |
| `findBySlug` | `(slug: string): Promise<any>` | By slug with all relations + review.user |
| `update` | `(id: string, dto: UpdateProductDto): Promise<Product>` | Slugify new name, update options (transactional delete+recreate) |
| `remove` | `(id: string): Promise<void>` | Delete product |
| `createVariant` | `(dto: CreateProductVariantDto): Promise<ProductVariant>` | Single variant + inventory + option links |
| `createVariantsBulk` | `(dtos: CreateProductVariantDto[]): Promise<ProductVariant[]>` | **Transactional**: multiple variants, supports legacy `attributes` map |
| `updateVariant` | `(id: string, dto: UpdateProductVariantDto): Promise<ProductVariant>` | Update variant fields |
| `removeVariant` | `(id: string): Promise<void>` | Delete variant; if none left, set hasVariants=false |
| `updateVariantInventory` | `(variantId: string, quantity: number): Promise<Inventory>` | Direct inventory quantity update |
| `getFeaturedProducts` | `(limit = 10): Promise<Product[]>` | isFeatured + isActive, with variant inventory merge |
| `getTopSellingProducts` | `(limit = 20): Promise<Product[]>` | Price range 500-1500, random order |
| `getRelatedProducts` | `(productId: string, limit = 10): Promise<Product[]>` | Same category, variant inventory merge |
| `getAllBrands` | `(): Promise<string[]>` | Raw SQL: SELECT DISTINCT brand |
| `globalSearch` | `(query: string): Promise<{ products, categories, brands }>` | LIKE search on name/description (8 products, 5 categories, 5 brands) |
| `getRecommendedByCategories` | `(categorySlugs, excludeProductIds, limit): Promise<Product[]>` | Category match, fallback to featured |
| `getRecommendedForCart` | `(categorySlugs, brandIds, excludeProductIds, limit): Promise<Product[]>` | Category OR brand match, fallback to featured |

---

## DTOs

| DTO | Purpose | Key Fields |
|---|---|---|
| `CreateProductDto` | Single product creation | name, slug, sku, sellingPrice, mrp, brand, brandId, images, isFeatured, categoryId |
| `UpdateProductDto` | Product update (all optional) | Same + options: ProductOptionDto[] |
| `CreateProductWithVariantsDto` | Product + variants (transactional) | name, options[], variants[] (with option links) |
| `CreateProductVariantDto` | Single variant | productId, name, sku, sellingPrice, mrp, options[] |
| `UpdateProductVariantDto` | Variant update | Same as create + categoryId, hasVariants |
| `ProductQueryDto` | Search/filter query params | search, category, brand, minPrice, maxPrice, page, limit, sortBy |
| `ProductOptionDto` | Option definition | name, values (string[] or { value, hexCode, swatchUrl }[]) |
| `VariantOptionInputDto` | Variant→option link | optionName, optionValue |

---

## Product Variant Architecture

```
Product (1)
├── ProductOption (N)  e.g., "Size", "Color"
│   └── ProductOptionValue (N)  e.g., "S", "M", "L" | "Red", "Blue"
│
├── ProductVariant (N)  e.g., "T-Shirt Red S", "T-Shirt Blue L"
│   └── VariantOption (N)  → joins Variant → ProductOptionValue
│                           e.g., variant "Red S" links to
│                           option "Size" + value "S" AND
│                           option "Color" + value "Red"
│
└── Inventory (N)  → links to Product (if no variants)
                   → links to Variant (if has variants)
```

---

## Entities Used

| Entity | Table | Key Purpose |
|---|---|---|
| Product | `products` | Core product data |
| ProductVariant | `product_variants` | Variant-level SKU/pricing |
| ProductOption | `product_options` | Option groups (Size, Color, Flavor) |
| ProductOptionValue | `product_option_values` | Values within an option |
| VariantOption | `variant_options` | Join: variant → option + value |
| Inventory | `inventory` | Stock per product or variant |
| Category | `categories` | Product category |
| Brand | `brands` | Product brand |
| Department | `departments` | Product department (M2M) |

---

## Module Configuration

```
ProductsModule
├── imports: TypeOrmModule.forFeature([Product, ProductVariant, Inventory,
│               Category, Brand, ProductOption, ProductOptionValue, VariantOption])
├── controllers: ProductsController
├── providers: ProductsService
└── exports: ProductsService
```
