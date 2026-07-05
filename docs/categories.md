# Categories Module

**Location:** `src/modules/categories/`

## Purpose

Category tree management with parent-child hierarchy, slug-based lookups, and tree-building for frontend navigation.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/categories` | Public | List (activeOnly filter) |
| GET | `/categories/search/:query` | Public | Search by name |
| GET | `/categories/tree` | Public | Full category tree (root → children → grandchildren) |
| GET | `/categories/:id` | Public | Get by ID |
| GET | `/categories/slug/:slug` | Public | Get by slug |
| POST | `/categories` | ADMIN | Create |
| PUT | `/categories/:id` | ADMIN | Update |
| DELETE | `/categories/:id` | ADMIN | Delete (blocks if has children) |

---

## Service Layer

| Method | Description |
|---|---|
| `create(dto)` | Create with auto-slugify |
| `findAll(activeOnly)` | List with optional active filter |
| `findOne(id)` | By ID |
| `findBySlug(slug)` | By slug |
| `update(id, dto)` | Update fields |
| `remove(id)` | Delete (throws if children exist) |
| `getTree()` | Build nested tree: root → children → grandchildren |
| `search(query)` | ILIKE name search |

---

## Entity

**Category** (`categories` table) — Int auto PK, name, slug*, description, image, isActive, sortOrder, parentId (self-referencing FK, nullable).

```
Category (self-referencing)
  ├── parentId (nullable) → parent Category
  ├── children[] → child Categories
  └── M:M Department (via category_departments)
```

---

# Departments Module

**Location:** `src/modules/departments/`

## Purpose

Department management with category and product relation counts.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/departments` | Public | List (activeOnly) with categoryCount & productCount |
| GET | `/departments/:id` | Public | Get by ID |
| GET | `/departments/slug/:slug` | Public | Get by slug |
| POST | `/departments` | ADMIN | Create |
| PUT | `/departments/:id` | ADMIN | Update |
| DELETE | `/departments/:id` | ADMIN | Delete |

---

## Service Layer

Standard CRUD: `create`, `findAll` (with counts), `findOne`, `findBySlug`, `update`, `remove`.

---

## Entity

**Department** — Int auto PK, name, slug*, description, image, isActive, sortOrder. M:M with Category, M:M with Product.

---

# Brands Module

**Location:** `src/modules/brands/`

## Purpose

Brand CRUD with admin-specific endpoints including product counts.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/brands` | Public | List (activeOnly filter) |
| GET | `/brands/admin/all` | ADMIN | All brands with product counts |
| GET | `/brands/:id` | Public | Get by ID |
| GET | `/brands/slug/:slug` | Public | Get by slug |
| POST | `/brands` | ADMIN | Create |
| PUT | `/brands/:id` | ADMIN | Update |
| DELETE | `/brands/:id` | ADMIN | Delete |

---

## Service Layer

Standard CRUD: `create`, `findAll`, `findAllForAdmin` (with productCount), `findOne`, `findBySlug`, `update`, `remove`.

---

## Entity

**Brand** (`brands` table) — Int auto PK, name, slug*, logo, description, isActive, sortOrder. 1:M with Product.

---

# Banners Module

**Location:** `src/modules/banners/`

## Purpose

Promotional banner management for the frontend homepage/carousel.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/banners` | Public | List (activeOnly filter) |
| GET | `/banners/:id` | Public | Get single |
| POST | `/banners` | ADMIN | Create |
| PUT | `/banners/:id` | ADMIN | Update |
| DELETE | `/banners/:id` | ADMIN | Delete |

---

## Service Layer

Standard CRUD: `create`, `findAll(activeOnly)`, `findOne`, `update`, `remove`.

---

## Entity

**Banner** — UUID PK, title, subtitle?, image (required), link?, isActive, sortOrder, startDate?, endDate?.
