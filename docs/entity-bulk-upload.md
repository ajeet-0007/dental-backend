# Entity Bulk Upload Module

**Location:** `src/modules/entity-bulk-upload/`

## Purpose

CSV-based bulk upload for master data entities (departments, brands, and categories). Each entity type has its own template download and upload endpoint.

---

## API Endpoints (ADMIN only)

| Method | Path | Description |
|---|---|---|
| GET | `/entity-bulk-upload/departments/template` | Download departments CSV template |
| POST | `/entity-bulk-upload/departments` | Upload departments CSV |
| GET | `/entity-bulk-upload/brands/template` | Download brands CSV template |
| POST | `/entity-bulk-upload/brands` | Upload brands CSV |
| GET | `/entity-bulk-upload/categories/template` | Download categories CSV template |
| POST | `/entity-bulk-upload/categories` | Upload categories CSV |

---

## Service Layer

Three parallel services with identical shape:

| Method | DepartmentsBulkService | BrandsBulkService | CategoriesBulkService |
|---|---|---|---|
| `generateTemplate()` | Returns CSV with name, slug, description, image, isActive, sortOrder columns | Same pattern | Same pattern (adds parentId) |
| `parseCSV(file)` | Parse → validate → upsert Department | Parse → validate → upsert Brand | Parse → validate → upsert Category |
| `processBulkUpload(file)` | Orchestrator: parse → validate → save with image upload | Same | Same |

---

## Module Configuration

```
EntityBulkUploadModule
├── imports: TypeOrmModule.forFeature([Department, Brand, Category])
├── controllers: EntityBulkUploadController
├── providers: DepartmentsBulkService, BrandsBulkService, CategoriesBulkService
└── exports: DepartmentsBulkService, BrandsBulkService, CategoriesBulkService
```
