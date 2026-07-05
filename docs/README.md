# Dentalkart Backend - Documentation

> NestJS-based e-commerce backend for dental supplies with Stripe payments, ShipRocket shipping, and AI-powered assistant.

## Quick Navigation

| Document | Description |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | High-level system architecture, module dependencies, request flow |
| [DATABASE.md](./DATABASE.md) | Entity relationship diagrams for all 26+ entities |

### Core Commerce Modules

| Module | Description | Key Integrations |
|---|---|---|
| [auth.md](./auth.md) | Authentication & authorization | JWT, Google/Facebook/Apple OAuth |
| [users.md](./users.md) | User profile management | Role-based access |
| [addresses.md](./addresses.md) | Address CRUD with defaults | User scoping |
| [products.md](./products.md) | Product catalog, variants, options | Complex variant system |
| [cart.md](./cart.md) | Shopping cart with stock validation | Inventory reservation |
| [wishlist.md](./wishlist.md) | Wishlist with batch checking | -- |
| [orders.md](./orders.md) | Order lifecycle & fulfillment | ShipRocket integration |
| [payments.md](./payments.md) | Stripe payment processing | Stripe Checkout, webhooks |
| [shipping.md](./shipping.md) | Shipping rates, labels, tracking | ShipRocket API v2 |
| [returns.md](./returns.md) | Return requests & refunds | ShipRocket returns |
| [reviews.md](./reviews.md) | Purchase-verified reviews | Order verification |

### Catalog Management

| Module | Description |
|---|---|
| [categories.md](./categories.md) | Category tree management |
| [departments.md](./departments.md) | Department management |
| [brands.md](./brands.md) | Brand CRUD |
| [banners.md](./banners.md) | Promotional banner management |

### Admin & Operations

| Module | Description |
|---|---|
| [admin.md](./admin.md) | Dashboard, admin CRUD, order management |
| [inventory.md](./inventory.md) | Stock tracking, reservation, low-stock alerts |
| [bulk-upload.md](./bulk-upload.md) | CSV bulk product upload |
| [entity-bulk-upload.md](./entity-bulk-upload.md) | CSV upload for brands/categories/departments |

### Infrastructure & Integrations

| Module | Description |
|---|---|
| [email.md](./email.md) | Transactional emails (Handlebars + Nodemailer) |
| [imagekit.md](./imagekit.md) | ImageKit CDN authentication & upload |
| [health.md](./health.md) | Health check & API info |
| [news.md](./news.md) | Dental news via Tavily API (cron) |
| [ai-assistant.md](./ai-assistant.md) | RAG chatbot with Supabase pgvector |
| [professional-verification.md](./professional-verification.md) | DCI dentist verification via Puppeteer |

### Shared Infrastructure

| Document | Description |
|---|---|
| [common.md](./common.md) | Guards, decorators, utils, middleware, pipes |
| [config.md](./config.md) | Environment variables, TypeORM config |

## Tech Stack

- **Runtime:** Node.js (TypeScript)
- **Framework:** NestJS 10
- **Database:** MySQL 8 (TypeORM)
- **Payments:** Stripe
- **Shipping:** ShipRocket API v2
- **Media:** ImageKit CDN
- **AI:** NVIDIA API (Llama 3.3 70B), Supabase pgvector
- **Email:** Nodemailer + Handlebars
- **Auth:** Passport (JWT, Google, Facebook, Apple)
- **Scraping:** Puppeteer
- **News:** Tavily API
- **Scheduling:** @nestjs/schedule
