# AGENTS.md

NestJS 10 + TypeORM (MySQL) backend for the Dentalkart/Dentzoo dental-supplies store. Global API prefix is `api` (routes at `/api/...`); Swagger UI at `/api/docs`.

## Commands

- Dev: `npm run start:dev` (watch). Prod: `npm run build` then `npm run start:prod` (`node dist/main`).
- Lint: `npm run lint` — ESLint runs with `--fix`, so it auto-modifies files.
- Format: `npm run format` (prettier over `src/**/*.ts`).
- No test suite exists (`test/` is empty, no test script). Do not rely on `npm test`.
- No typecheck script; use `npm run build` (nest build runs tsc) to typecheck.

## Migrations

- CLI uses `src/config/typeorm.config.ts` which reads `.env` `MYSQL_DATABASE_*`:
  - `npm run migration:run` / `migration:revert` / `migration:generate -- --name=<Name>`
- New migrations go in `src/database/migrations/` with **MySQL** syntax (backticks, `varchar`, etc.).
- `synchronize: false` in both the app and migration DataSources — schema changes require a migration.
- Gotcha: `src/migrations/` holds stale **PostgreSQL-syntax** migrations (`uuid_generate_v4`, `character varying`) that are wired into no config and will fail against MySQL. Ignore them; never run or copy them.

## Entities & DB

- Entities live in `src/database/entities/`, auto-globbed by `app.module.ts` (`*.entity{.ts,.js}`) but **explicitly listed** in `src/config/typeorm.config.ts`. Adding an entity requires updating that DataSource list or the migration CLI won't see it.
- `NODE_ENV=development` enables SQL logging.

## Seeds & one-off scripts

- Real seeds: package.json `seed:*` scripts run `src/database/seed-*.ts` via ts-node, reading `.env` (MySQL + Supabase + NVIDIA embeddings).
- Root-level `seed*.ts`, `create-admin.ts`, `fix-inventory.ts`, `migrate*.js`, and `1774891285373-*.ts` are stale one-off scripts with hardcoded Aiven DB credentials — never run or copy them.

## Conventions (from `main.ts` / `src/common`)

- Global `ValidationPipe`: `whitelist` + `forbidNonWhitelisted` + transform — DTOs are strict; any unknown body field returns 400. Keep DTOs exact.
- Body parser is disabled globally; raw body (`express.raw`) is registered only for `/api/payments/webhook`. New webhook routes needing raw JSON must be added there.
- Global `AllExceptionsFilter` writes errors to the `logs` table via `LogService`.
- Auth: guards in `src/common/guards` (`JwtAuthGuard`, `VerifiedOnlyGuard`, `RolesGuard`) plus `@Roles()` / `@CurrentUser()` decorators.
- reCAPTCHA validation is skipped when `NODE_ENV !== production`.
- On Vercel, `.env` is ignored (`ignoreEnvFile: true`) — env comes from platform vars.
- `@/*` path alias is defined in tsconfig but unused; code uses relative imports and ts-node doesn't resolve the alias — use relative imports.

## Structure

- Feature modules: `src/modules/*` (module/service/controller + `dto/`). Per-module docs exist in `docs/*.md` (auth, orders, payments, shipping, etc.) — read the relevant one before modifying a module.
- `src/modules/questions` and `src/modules/stockNotifications` are stubs (only `dto/`) and are not registered in `app.module.ts`.
