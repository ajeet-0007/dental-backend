# Users Module

**Location:** `src/modules/users/`

## Purpose

User profile management: retrieve, update profile, change password, and admin-level user listing/status toggle. Uses `UsersService` which is exported for use by Auth and other modules.

---

## API Endpoints

All routes require JWT authentication (class-level `JwtAuthGuard` + `RolesGuard`).

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/profile` | Any JWT | Get current user profile (excludes password, refreshToken) |
| PUT | `/users/profile` | Any JWT | Update profile (firstName, lastName, phone) |
| PUT | `/users/change-password` | Any JWT | Change password (requires current password) |
| GET | `/users` | ADMIN | List all users (paginated) |
| GET | `/users/:id` | ADMIN | Get user by UUID |
| PUT | `/users/:id/toggle-status` | ADMIN | Toggle user isActive flag |

---

## Service Layer

| Method | Signature | Description |
|---|---|---|
| `getProfile` | `(userId: string): Promise<Partial<User>>` | Returns user without password/refreshToken |
| `update` | `(id: string, dto: UpdateUserDto): Promise<User>` | Update firstName, lastName, phone |
| `changePassword` | `(id: string, dto: ChangePasswordDto): Promise<{ message }>` | Validate current pwd, hash new one |
| `getAllUsers` | `(page?, limit?): Promise<{ users, total }>` | Paginated list, ordered by createdAt DESC |
| `toggleUserStatus` | `(userId: string): Promise<User>` | Flip isActive boolean |
| `findById` | `(id: string): Promise<User>` | Find by UUID, throws NotFoundException |
| `findByEmail` | `(email: string): Promise<User \| null>` | Internal lookup by email |

---

## DTOs

| DTO | Fields |
|---|---|
| `UpdateUserDto` | firstName?, lastName?, phone? (all optional) |
| `ChangePasswordDto` | currentPassword (required, min 6), newPassword (required, min 6) |

---

## Entity

**User** — see [auth.md](./auth.md#entities) for full schema. Key fields: id (UUID), email*, phone*, role (user/admin), isActive, professional verification fields.

---

## Module Configuration

```
UsersModule
├── imports: TypeOrmModule.forFeature([User])
├── controllers: UsersController
├── providers: UsersService
└── exports: UsersService
```
