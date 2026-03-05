# Lord of the Reads — Progress Log

## Session Instructions (compact)

- `plan.md` = what we intend to build.
- `progress.md` = what we have actually built.
- Update this file at the end of each phase.
- For each phase, record: status, completed work, manual checks run, deviations from plan, errors made, lessons learned, and next step.

---

## Current Snapshot

- Date: 2026-03-04
- Active phase: Phase 6 complete
- Overall status: In progress (Phase 7 not started)

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

### Phase 4 — GraphQL API foundation (books/users read paths)

Status: ✅ Completed

Completed work:
- Added GraphQL setup in Nest app with Apollo driver and code-first schema generation.
- Enabled GraphQL Playground and introspection in development mode only.
- Added Prisma runtime module/service with Prisma 7 adapter-based DB connectivity.
- Implemented thin read-path resolvers/services for:
	- `books(limit, offset, search)`
	- `book(id)`
	- `users(search, limit, offset)`
- Added safe pagination limits and stable ordering in read services.

Manual checks run:
- `npm run build` in `api` (passes).
- Booted API with local `DATABASE_URL` and executed GraphQL query:
	- `{ books(limit: 2) { id title } users(limit: 2) { id name } }`
- Verified successful GraphQL response with seeded data.

Deviations from initial plan:
- None in scope; Phase 4 goals completed as planned.

Errors made / issues encountered:
- Runtime initially failed due to missing `@as-integrations/express5` package required by Nest + Apollo 5.
- A local port conflict (`3000`) occurred because compose-managed API was still running.

Lessons learned:
- With Nest GraphQL + Apollo 5, ensure `@as-integrations/express5` is installed.
- Stop compose API/web before local API smoke tests to avoid false negatives from port collisions.

Next step:
- Start Phase 5: unified title+author search and pagination hardening.

### Phase 5 — Unified search and pagination hardening

Status: ✅ Completed

Completed work:
- Implemented unified book search across both:
	- `Book.title`
	- related `Author.name`
- Extended `BookModel` GraphQL type to include `authors` projection.
- Updated books read service to use relation-aware includes and map authors in one query path.
- Hardened pagination/search inputs in resolver:
	- bounded `limit` (existing)
	- bounded `offset` (max 10,000)
	- normalized/capped search input length.

Manual checks run:
- `npm run build` in `api` (passes).
- Booted API with local DB URL and executed GraphQL query:
	- `{ books(limit: 2, search: "Author 7") { id title authors { id name } } }`
- Verified non-empty results and author projection in response.

Deviations from initial plan:
- Used relation `include` strategy for author projection to keep resolver/service simple rather than adding DataLoader this phase.

Errors made / issues encountered:
- Initial runtime checks hit stale process/port collision (`3000`) and queried an old schema instance.
- First validation query failed due to targeting the stale API process before cleanup.

Lessons learned:
- Always check/clear existing listeners on `3000` before manual API verification.
- For this scope, relation-aware includes provide clear behavior without introducing extra caching/batching layers.

Next step:
- Start Phase 6: immutable reviews + aggregate view wiring in GraphQL.

### Phase 6 — Immutable reviews + aggregate view wiring

Status: ✅ Completed

Completed work:
- Added migration creating DB view `book_review_stats` with `reviewCount` and `reviewMean` grouped by `bookId`.
- Added GraphQL mutation `createReview(userId, bookId, rating)`.
- Implemented review creation service with:
	- rating validation (`1..5` integer)
	- duplicate prevention handling via unique constraint conflict mapping
- Added `reviewCount` and `reviewMean` fields to `BookModel`.
- Wired book read paths to fetch aggregate stats from `book_review_stats` and return 1-decimal mean.
- Added `ReviewsModule` to application module graph.

Manual checks run:
- `DATABASE_URL=... npx prisma migrate dev` (applied view migration).
- `npm run build` in `api` (passes).
- GraphQL mutation test:
	- create review succeeds once.
	- duplicate create for same `(userId, bookId)` fails.
- GraphQL book query test confirms aggregate fields are populated:
	- `{ book(id: "book_0002") { id reviewCount reviewMean } }`

Deviations from initial plan:
- Duplicate review conflict currently surfaces GraphQL error with HTTP conflict details in extensions rather than a custom domain error code.

Errors made / issues encountered:
- None blocking in implementation; duplicate prevention behavior validated through DB uniqueness and error mapping.

Lessons learned:
- DB-view-backed aggregates are straightforward to wire for read paths while preserving strong write consistency.
- Unique index + service-level conflict mapping gives clear immutable review behavior with minimal code.

Next step:
- Start Phase 7: checkout and order price memoization flow.
