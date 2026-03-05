# Lord of the Reads — Progress Log

## Session Instructions (compact)

- `plan.md` = what we intend to build.
- `progress.md` = what we have actually built.
- Update this file at the end of each phase.
- For each phase, record: status, completed work, manual checks run, deviations from plan, errors made, lessons learned, and next step.

---

## Current Snapshot

- Date: 2026-03-04
- Active phase: Phase 3 complete
- Overall status: In progress (Phase 4 not started)

---

## Phase Log

### Phase 1 — Workspace and local runtime baseline

Status: ✅ Completed

Completed work:
- Scaffolded NestJS backend in `api/`.
- Installed core backend modules for GraphQL/Prisma/Postgres/config/logging.
- Scaffolded React + Vite frontend in `web/`.
- Added root `docker-compose.yml` with `postgres`, `api`, and `web` services.
- Added `.env.example` for local Postgres settings.
- Updated root `.gitignore` for nested workspace outputs and local artifacts.

Manual checks run:
- `docker compose config` (valid).
- `POSTGRES_PORT=5433 docker compose up -d postgres` (healthy).
- `POSTGRES_PORT=5433 docker compose up -d api web` (both started).
- `curl http://localhost:3000/` => `200` + `Hello World!`.
- `curl http://localhost:5173/` => `200`.

Deviations from initial plan:
- Used `POSTGRES_PORT=5433` during manual verification due to host `5432` conflict. (This was due to the user having another instance of postgres already running)
- `web/` scaffold includes default Vite starter files, which will be simplified in later phases.

Errors made / issues encountered:
- Terminal was still attached to a running process during one scaffold step.
- Interactive prompt handling for Vite scaffold initially failed and had to be retried.
- API startup check was attempted before first container install completed, causing transient connection reset.

Lessons learned:
- Always verify terminal state before running scaffold commands.
- Prefer non-interactive scaffold commands where possible.
- Allow warm-up time on first container boot (`npm install` in container) before endpoint checks.
- Use env override (`POSTGRES_PORT`) in verification commands to avoid local port collisions.

Next step:
- Start Phase 2: Prisma schema + integrity-first migration (FKs, unique constraints, checks, indexes).

### Phase 2 — Prisma schema and integrity-first migration

Status: ✅ Completed

Completed work:
- Initialized Prisma in `api/` (`prisma/schema.prisma`, migrations, config, local env template).
- Implemented minimal production-conscious schema for books, authors, publishers, genres, users, reviews, orders, and join tables.
- Added required FK relationships, composite PKs, unique constraints, and composite relation for `OrderItem(bookId, format) -> BookFormat(bookId, format)`.
- Added baseline search/pagination indexes in Prisma schema.
- Added raw SQL migration enhancements for:
	- `pg_trgm` extension
	- check constraints (`rating`, `priceCents`, `quantity`, `unitPriceCents`)
	- trigram indexes on `Book.title`, `Author.name`, `User.name`
- Applied migration successfully to local Postgres.

Manual checks run:
- `DATABASE_URL=... npx prisma migrate dev --name phase2_schema --create-only`
- Edited generated migration SQL with custom constraints/indexes.
- `DATABASE_URL=... npx prisma migrate dev`
- `\d "Review"` confirms rating check, FKs, and unique `(userId, bookId)`.
- `\d "OrderItem"` confirms quantity/unit price checks and composite FK to `BookFormat`.
- `SELECT indexname FROM pg_indexes ...` confirms all three trigram indexes exist.

Deviations from initial plan:
- None in scope; Phase 2 delivered as planned with DB-first integrity.

Errors made / issues encountered:
- Initial `\di` verification command passed multiple index names incorrectly and only returned the first index.

Lessons learned:
- Prefer `pg_indexes` SQL query for deterministic multi-index verification.
- `prisma migrate dev --create-only` is the right pattern when custom SQL constraints/indexes are required.

Next step:
- Start Phase 3: deterministic seed data for relational realism and repeatable local testing.

### Phase 3 — Seed data and query realism baseline

Status: ✅ Completed

Completed work:
- Added deterministic seed script in `api/prisma/seed.js`.
- Seed covers all core entities and joins with realistic relational distribution:
	- publishers, authors, genres, users, books
	- book-author, book-genre, book-format
	- reviews (1..5 rating)
	- orders and order items with format + unit price memoization
- Configured Prisma 7 seed command in `api/prisma.config.ts`.
- Added DB seed script entry in `api/package.json`.
- Installed Prisma 7 Postgres adapter and updated seed runtime to adapter-based PrismaClient initialization.

Manual checks run:
- `DATABASE_URL=... npx prisma generate`
- `DATABASE_URL=... npm run db:seed` (run #1)
- Count verification query via `psql` for key tables.
- `DATABASE_URL=... npm run db:seed` (run #2)
- Count verification query repeated; row counts match exactly across runs.

Determinism verification result:
- `authors=80`
- `books=120`
- `genres=10`
- `publishers=12`
- `users=140`
- `reviews=840`
- `orders=180`
- `order_items=360`

Deviations from initial plan:
- Used Prisma 7 adapter-based runtime in seed script (`@prisma/adapter-pg`) instead of legacy direct client URL behavior.

Errors made / issues encountered:
- Seed initially failed because Prisma 7 requires adapter-based PrismaClient runtime configuration.
- Temporary attempt to add `datasource.url` in schema caused a Prisma validation error (unsupported in Prisma 7 schema config model).

Lessons learned:
- For Prisma 7, keep datasource URL in `prisma.config.ts` and use adapters for runtime clients.
- Validate seed flow with two consecutive runs and SQL count checks to confirm deterministic behavior.

Next step:
- Start Phase 4: GraphQL API foundation (books/users read paths) with dev-only Playground and introspection.
