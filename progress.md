# Lord of the Reads — Progress Log

## Session Instructions (compact)

- `plan.md` = what we intend to build.
- `progress.md` = what we have actually built.
- Update this file at the end of each phase.
- For each phase, record: status, completed work, manual checks run, deviations from plan, errors made, lessons learned, and next step.

---

## Current Snapshot

- Date: 2026-03-05
- Active phase: Phase 15 implementation complete (awaiting manual review)
- Overall status: In progress (Phases 1-15 implemented)

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

### Phase 7 — Checkout and order price memoization

Status: ✅ Completed

Completed work:
- Added `OrdersModule` with GraphQL mutation/query surface:
	- `checkout(userId, items)`
	- `order(id)`
	- `userOrders(userId, limit, offset)`
- Implemented transactional checkout service behavior:
	- validates user and item quantities
	- merges duplicate input lines (`bookId + format`)
	- validates `bookId + format` pairs against `BookFormat`
	- creates order + order items atomically
	- memoizes `unitPriceCents` from current `Book.priceCents` at checkout time
- Added GraphQL order types and checkout input types.
- Wired `OrdersModule` into `AppModule`.

Manual checks run:
- `npm run build` in `api` (passes).
- GraphQL checkout mutation #1 for `book_0001`/`SOFTCOVER` returned `unitPriceCents=1037`.
- Updated book price in DB (+111).
- GraphQL checkout mutation #2 returned `unitPriceCents=1148`.
- Queried both orders via GraphQL `order(id)` and confirmed first order retained old price while second used new price.
- Restored temporary DB price update after test to keep data baseline stable.

Deviations from initial plan:
- Added `order(id)` and `userOrders(...)` read queries in Phase 7 to make memoization verification and frontend integration straightforward.

Errors made / issues encountered:
- None blocking; checkout flow validated end-to-end.

Lessons learned:
- Input line merging avoids composite-key conflicts while preserving expected cart semantics.
- Transactional write path keeps order and order items consistent with minimal resolver complexity.

Next step:
- Start Phase 8: frontend thin vertical slice (Mantine) for book list/detail, user selector, and checkout path.

### Phase 8 — Frontend thin vertical slice (Mantine + Apollo)

Status: ✅ Implemented (pending manual review)

Completed work:
- Installed frontend data/UI dependencies:
	- `@apollo/client`, `graphql`
	- `@mantine/core`, `@mantine/hooks`, `@mantine/carousel`, `embla-carousel-react`
- Replaced Vite starter app with a minimal vertical slice in `web/src/App.tsx`:
	- current user selector with search
	- searchable book shelf (title/author) backed by GraphQL
	- paginated book browsing UI
	- selected book detail panel
	- checkout action (`checkout` mutation) with format + quantity input
	- success/error feedback for checkout submission
- Wired global providers in `web/src/main.tsx`:
	- Apollo client against `VITE_GRAPHQL_URL` (fallback `http://localhost:3000/graphql`)
	- Mantine provider and required global styles
- Simplified base CSS in `web/src/index.css` to remove conflicting Vite starter defaults.

Manual checks run:
- `npm run build` in `web` (passes).

Deviations from initial plan:
- UI currently uses simple fixed pagination control (`total=20`) as a minimal Phase 8 implementation because backend read API does not yet return total counts.

Errors made / issues encountered:
- Initial build failed due to Apollo Client v4 import/API changes; resolved by using:
	- `@apollo/client/core` for client primitives
	- `@apollo/client/react` for React hooks/provider.
- Initial carousel props included unsupported `align`; removed for compatibility.

Lessons learned:
- Apollo Client v4 split entrypoints should be used explicitly to avoid type/runtime drift from older examples.
- Mantine provides enough primitives to keep this vertical slice thin without custom component overhead.

Next step:
- Run manual UI walkthrough against live API data, then adjust UX edge behavior before Phase 8 commit.

### Phase 9 — Logging, health, and error clarity

Status: ✅ Implemented (pending manual review)

Completed work:
- Enabled structured API logging with `nestjs-pino`:
	- configured `LoggerModule.forRoot` in `api/src/app.module.ts`
	- pretty local output via `pino-pretty` outside production
	- request-level correlation field support via `x-correlation-id`
- Wired Nest bootstrap logger in `api/src/main.ts` with buffered startup logs.
- Added readiness endpoint `GET /health` in `api/src/app.controller.ts` and `api/src/app.service.ts`.
- Normalized GraphQL error formatting in `api/src/app.module.ts`:
	- stable extension `code`
	- optional `statusCode` when available
	- readable message fallback behavior
	- mapped common HTTP statuses to deterministic GraphQL codes.

Manual checks run:
- `npm run build` in `api` (passes).
- Runtime check on local API instance (`PORT=3001`):
	- `GET /health` returns readiness payload with `status=ok`.
	- invalid GraphQL query returns consistent error shape with readable message and code (`GRAPHQL_VALIDATION_FAILED`).

Deviations from initial plan:
- Health endpoint currently reports service readiness (process uptime/timestamp) and does not perform active DB connectivity probing.

Errors made / issues encountered:
- Initial GraphQL formatter version over-normalized errors and dropped useful detail in one runtime path.
- Formatter was revised to preserve readable message fallback and improve code/status derivation.

Lessons learned:
- Apollo/Nest formatter hooks should preserve standard GraphQL validation codes while normalizing application errors.
- `nestjs-pino` integration is most reliable when logger is wired in both module config and bootstrap (`app.useLogger`).

Next step:
- Manual review of Phase 9 behavior, then commit approved Phase 8 + Phase 9 changes.

### Phase 10 — Test pass and final readiness review

Status: ✅ Implemented (pending manual review)

Completed work:
- Added focused frontend Vitest coverage for critical app flows:
	- test tooling/config in `web/vite.config.ts` and `web/src/test/setup.ts`
	- UI behavior tests in `web/src/App.test.tsx`
	- test scripts/deps in `web/package.json`
- Expanded API integration smoke checks in `api/test/app.e2e-spec.ts`:
	- root endpoint response
	- `/health` readiness payload
	- GraphQL books/users query smoke
	- GraphQL error-format smoke
- Finalized runbook-style README for Docker-first workflows in `README.md`:
	- start/stop commands
	- migrate/seed commands
	- Dockerized test/build commands
	- manual verification checklist

Manual checks run (Docker only):
- `POSTGRES_PORT=5433 docker compose down`
- `POSTGRES_PORT=5433 docker compose up -d postgres api web`
- `POSTGRES_PORT=5433 docker compose exec api npx prisma generate`
- `POSTGRES_PORT=5433 docker compose exec api npm run test:e2e` (passes)
- `POSTGRES_PORT=5433 docker compose exec web npm install`
- `POSTGRES_PORT=5433 docker compose exec web npm run test` (passes)
- `POSTGRES_PORT=5433 docker compose exec api npm run build` (passes)
- `POSTGRES_PORT=5433 docker compose exec web npm run build` (passes)

Deviations from initial plan:
- Manual replay checklist items are documented in README and partially exercised via smoke tests; full business-flow replay remains a manual UI/GraphQL walkthrough step.

Errors made / issues encountered:
- Docker API startup initially failed because host port `3000` was occupied; resolved by freeing the host port before compose startup.
- API e2e initially failed due to missing generated Prisma client in container; resolved with `prisma generate` in `api` container.
- Frontend tests required additional jsdom browser API shims (`matchMedia`, `ResizeObserver`) and stable Apollo hook mocks to handle rerenders.

Lessons learned:
- In this repo, test/build reliability improves when all checks run from compose containers with explicit dependency prep.
- Mantine in jsdom requires small environment shims for stable unit tests.

Next step:
- Manual review of Phase 10 test/readme updates, then commit Phase 10.

### Phase 11 — Cart bundle checkout flow

Status: ✅ Implemented (pending manual review)

Completed work:
- Refactored checkout UI from single-book purchase to cart-based flow in `web/src/App.tsx`.
- Added `Add to cart` action using selected book + format + quantity.
- Added cart line aggregation behavior:
	- duplicate `bookId + format` entries merge by incrementing quantity.
- Added cart item list UI with per-line remove action.
- Updated checkout mutation payload to submit all cart items in one bundled `items` array.
- Updated checkout enabled-state logic:
	- requires selected user
	- requires non-empty cart.
- Cleared cart after successful checkout mutation.

Manual checks run (Docker only):
- `POSTGRES_PORT=5433 docker compose exec web npm run test` (passes)
- `POSTGRES_PORT=5433 docker compose exec web npm run build` (passes)

Deviations from initial plan:
- This phase extends MVP checkout UX beyond the original single-item path to support explicit bundled cart checkout.

Errors made / issues encountered:
- None blocking; implementation passed existing frontend test suite and production build.

Lessons learned:
- Keeping cart line identity as `bookId + format` matches backend order-item uniqueness and simplifies bundling behavior.

Next step:
- Manual UX verification of multi-item checkout flow, then commit approved Phase 11 change.

### Phase 12 — Review creation modal with stars and text

Status: ✅ Implemented (pending manual review)

Completed work:
- Extended review data model to include review text:
	- added `Review.text` in Prisma schema
	- added migration with backfill + non-empty DB constraint
	- updated seed data to provide deterministic review text
- Extended GraphQL review mutation shape:
	- `createReview(userId, bookId, rating, text)`
	- review model now exposes `text`
	- service validation enforces rating bounds and non-empty/max-length text
- Added frontend review UX in `web/src/App.tsx`:
	- `Review` button enabled when user + book are selected
	- Mantine modal for review creation
	- 1–5 star `Rating` input
	- text entry via `Textarea`
	- submit mutation and success/error feedback

Manual checks run (Docker only):
- `POSTGRES_PORT=5433 docker compose exec api npx prisma migrate deploy` (passes)
- `POSTGRES_PORT=5433 docker compose exec api npx prisma generate` (passes)
- `POSTGRES_PORT=5433 docker compose exec api npm run build` (passes)
- `POSTGRES_PORT=5433 docker compose exec web npm run test` (passes)
- `POSTGRES_PORT=5433 docker compose exec web npm run build` (passes)

Deviations from initial plan:
- Review text is now persisted and validated at API/DB layers (broader than original rating-only mutation scope).

Errors made / issues encountered:
- API build initially failed until Prisma client was regenerated after schema updates.

Lessons learned:
- For Prisma schema changes in this Docker flow, regenerate client before TypeScript build to keep generated types synchronized.

Next step:
- Manual UI verification of review modal flow and duplicate-review behavior, then commit approved Phase 12 changes.

### Phase 13 — Lazy review stats resolution with DataLoader

Status: ✅ Implemented (pending manual review)

Completed work:
- Refactored `books` read path to stop eagerly calculating `reviewCount` and `reviewMean` in `BooksService`.
- Added request-scoped DataLoader `BookReviewStatsLoader` to batch and cache review-stats lookups per request.
- Added `@ResolveField` implementations in `BooksResolver` for:
	- `reviewCount`
	- `reviewMean`
- Registered DataLoader provider in `BooksModule`.
- Added `dataloader` package to API dependencies.
- Performed minor type-safe cleanup:
	- consolidated GraphQL import in `review.model.ts`
	- removed inline Prisma create literal in reviews service to avoid excess-property diagnostic noise.

Manual checks run:
- Local `api`: `npm run build` (passes)
- Docker `api`: `POSTGRES_PORT=5433 docker compose exec api npm install` (passes)
- Docker `api`: `POSTGRES_PORT=5433 docker compose exec api npm run build` (passes)
- Docker `api`: `POSTGRES_PORT=5433 docker compose exec api npm run test:e2e` (passes)
- Workspace diagnostics check: no remaining TypeScript errors.

Deviations from initial plan:
- No schema/API contract change for books query shape; implementation detail changed from eager service fetch to lazy resolver-based fetch.

Errors made / issues encountered:
- Workspace briefly showed stale diagnostics tied to generated/lockfile state; resolved via dependency refresh and Prisma client generation.

Lessons learned:
- Resolver-level DataLoader gives predictable opt-in work for expensive fields while preserving existing GraphQL contract.

Next step:
- Manual verification of books query variants (with and without review stats fields), then commit approved Phase 13 changes.

### Phase 14 — Genre catalog normalization and seeded assignment coverage

Status: ✅ Implemented (pending manual review)

Completed work:
- Updated canonical seed genre list in `api/prisma/seed.js` to exactly:
	- Fiction
	- Non-Fiction
	- DIY
	- Self-Help
	- Comedy
	- Horror
	- Drama
	- Sci-Fi
	- Fantasy
	- Romance
	- Literature
- Re-seeded database from Dockerized API workflow.
- Preserved existing one-or-more book genre assignment behavior in seed generation.

Manual checks run (Docker only):
- `POSTGRES_PORT=5433 docker compose exec api npm run db:seed` (passes)
- SQL validation of `Genre` names from Postgres (11 expected rows found)
- SQL validation for unassigned books:
	- `books_without_genres = 0`

Deviations from initial plan:
- None; this is a targeted data-catalog and seed-content update.

Errors made / issues encountered:
- None blocking.

Lessons learned:
- Keeping genre catalog deterministic in seed data allows clean catalog evolution without schema changes.

Next step:
- Manual review of seeded data in UI/API and commit approved Phase 14 changes.

### Phase 15 — Bookshelf genre filtering and full-page listing density

Status: ✅ Implemented (pending manual review)

Completed work:
- Added backend genre filtering support for books query:
	- `books(limit, offset, search, genreId)`
- Added backend query for filtered total count:
	- `booksCount(search, genreId)`
- Added backend query for genre dropdown options:
	- `genres()`
- Refactored `BooksService` with shared typed where-builder for search + genre filters.
- Updated frontend bookshelf to include a single-select genre dropdown filter.
- Replaced carousel-only display with denser full-page grid listing (`SimpleGrid`) so all books for the current page are visible at once.
- Increased page size to 24 and switched pagination to use real backend `booksCount` total pages.
- Updated frontend tests for new books/genre/count query flow.

Manual checks run (Docker only):
- `POSTGRES_PORT=5433 docker compose exec api npm run build` (passes)
- `POSTGRES_PORT=5433 docker compose exec web npm run test` (passes)
- `POSTGRES_PORT=5433 docker compose exec web npm run build` (passes)

Deviations from initial plan:
- This extends bookshelf UX from fixed pagination total and carousel slices to true filtered pagination with full-page visibility.

Errors made / issues encountered:
- Initial Prisma where typing for case-insensitive search required literal `QueryMode` narrowing; resolved with typed literal values.

Lessons learned:
- Pairing `booksCount` with filtered list query keeps offset pagination accurate and predictable for UI controls.

Next step:
- Manual UI verification of genre filter + pagination behavior, then commit approved Phase 15 changes.
