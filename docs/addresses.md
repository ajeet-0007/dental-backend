# Addresses Module

**Location:** `src/modules/addresses/`

## Purpose

CRUD management of user shipping/billing addresses. Each address is scoped to the authenticated user. Supports a single default address per user.

---

## API Endpoints

All routes require JWT authentication (class-level `JwtAuthGuard`).

| Method | Path | Description |
|---|---|---|
| POST | `/addresses` | Create a new address |
| GET | `/addresses` | List all addresses (default first, then by creation date) |
| GET | `/addresses/default` | Get the default address |
| GET | `/addresses/:id` | Get single address by ID |
| PUT | `/addresses/:id` | Update address |
| DELETE | `/addresses/:id` | Delete address |
| PUT | `/addresses/:id/default` | Set this address as default |

---

## Service Layer

| Method | Signature | Description |
|---|---|---|
| `create` | `(userId: string, dto: CreateAddressDto): Promise<Address>` | Creates address; if isDefault, un-sets existing default |
| `findAll` | `(userId: string): Promise<Address[]>` | All user addresses, ordered by isDefault DESC, createdAt DESC |
| `findOne` | `(id: number, userId: string): Promise<Address>` | Find by ID + userId, throws NotFoundException |
| `update` | `(id: number, userId: string, dto: UpdateAddressDto): Promise<Address>` | Update fields; handles default flag swapping |
| `remove` | `(id: number, userId: string): Promise<void>` | Hard delete |
| `getDefaultAddress` | `(userId: string): Promise<Address \| null>` | Get default address |
| `setDefault` | `(id: number, userId: string): Promise<Address>` | Set as default, un-set others |

---

## DTOs

| DTO | Required Fields | Optional Fields |
|---|---|---|
| `CreateAddressDto` | name, phone, addressLine1, city, state, pincode | addressLine2, country (default India), landmark, isDefault, latitude, longitude |
| `UpdateAddressDto` | (all optional) | Same fields as CreateAddressDto |

---

## Entity

**Address** (`addresses` table) — auto-increment PK, userId (FK to User), name, phone, addressLine1/2, city, state, pincode, country (default 'India'), isDefault, landmark, lat/lng.

---

## User-Address Relationship

```
User (1) ────────── (N) Address
  │                        │
  │ userId (FK) ──────────┘
  │                        │
  │ addresses[]            │ user (ManyToOne)
  └────────────────────────┘
```

- One user can have many addresses
- At most one address can be `isDefault = true` per user (enforced in service)
- Addresses are always scoped to `userId` from JWT token
- Address deletion is hard delete

---

## Module Configuration

```
AddressesModule
├── imports: TypeOrmModule.forFeature([Address])
├── controllers: AddressesController
├── providers: AddressesService
└── exports: AddressesService
```
