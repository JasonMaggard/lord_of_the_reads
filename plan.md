# Lord of the Reads — Architecture & Delivery Plan

Date: 2026-03-04

## 0) Verified local baseline

- **Node in shell:** `v25.2.1` ✅
- **npm in shell:** `11.6.2`
- **Docker:** `29.0.1`
- **Docker Compose:** `v2.40.3-desktop.1`

### Current package versions (npm latest at planning time)

- `@nestjs/core`: `11.1.15`
- `@nestjs/graphql`: `13.2.4`
- `@apollo/server`: `5.4.0`
- `graphql`: `16.13.1`
- `prisma`: `7.4.2`
- `@prisma/client`: `7.4.2`
- `pg`: `8.19.0`
- `react`: `19.2.4`
- `react-dom`: `19.2.4`
- `@apollo/client`: `4.1.6`
- `vite`: `7.3.1`
- `vitest`: `4.0.18`
- `pino`: `10.3.1`
- `nestjs-pino`: `4.6.0`
- `pino-pretty`: `13.1.3`

---

## 1) Guiding principles for Lord of the Reads

- No premature caching layers.
- Keep schema minimal.
- Prefer DB-level constraints for integrity.
- Optimize for clarity over extensibility.
- Keep resolvers thin (validation/orchestration only; business logic in services).

---

## 2) Scope and scale assumptions

Target support:
- ~10,000 books
- ~10,000 authors
- ~100 publishers
- ~1,000 users

Functional constraints:
- Book has one price, one publisher, many authors, many genres, many formats.
- Formats fixed: `HARDCOVER`, `SOFTCOVER`, `AUDIOBOOK`, `EREADER`.
- Reviews: one per user/book, rating 1–5, immutable (no edit/delete).
- Orders: multiple per user; each item stores selected format + quantity + price snapshot.

---

## 3) High-level architecture decisions

### Backend (`/api`)
- NestJS monolith with GraphQL (Apollo Server).
- Prisma ORM with Postgres.
- Code-first GraphQL schema for speed and type alignment.
- Resolver/service split by domain: `books`, `reviews`, `orders`, `users`.

### GraphQL developer settings (dev only)
- Enable GraphQL Playground in development.
- Enable introspection in development.
- Disable both in production.

### Frontend (`/web`)
- React + Vite + Apollo Client.
- Current user selected by searchable dropdown; no auth.
- Keep frontend thin; push query composition and integrity checks to API/DB.

### Local infrastructure
- Docker Compose local stack with:
  - `postgres`
  - `api`
  - `web`

---

## 4) Data model decisions (Prisma-level)

### Core entities
- `Book(id, title, priceCents, publisherId, createdAt, updatedAt)`
- `Author(id, name)`
- `Publisher(id, name)`
- `Genre(id, name)`
- `User(id, name)`

### Join tables
- `BookAuthor(bookId, authorId)` for many-to-many.
- `BookGenre(bookId, genreId)` for many-to-many.
- `BookFormat(bookId, format)` for format availability.

### Formats modeling (explicit)
- `Format` enum in Prisma: `HARDCOVER | SOFTCOVER | AUDIOBOOK | EREADER`.
- `BookFormat` maps each book to any supported subset of formats.
- Single base price remains on `Book.priceCents`.
- At checkout, chosen format is copied to `OrderItem.format`.

### Reviews
- `Review(id, userId, bookId, rating, createdAt)`.
- DB constraints:
  - `@@unique([userId, bookId])` to prevent duplicates.
  - Check constraint for `rating` in `[1..5]`.
- No review update/delete GraphQL mutations.

### Orders
- `Order(id, userId, createdAt)`.
- `OrderItem(orderId, bookId, format, quantity, unitPriceCents)`.
- `unitPriceCents` memoizes price at order time.
- `@@id([orderId, bookId, format])` allows same book in multiple formats in one order.

---

## 5) Review aggregation approach

Decision:
- Strongly consistent writes.
- Mean/count read from DB view.
- API-enforced immutability.

Implementation shape:
- On review create: insert in transaction; uniqueness conflict returns deterministic error.
- Read path: SQL view `book_review_stats` computes `AVG(rating)` and `COUNT(*)` by `bookId`.
- GraphQL exposes:
  - `reviewMean` rounded to 1 decimal
  - `reviewCount` as integer

Why this fits:
- Minimal schema complexity.
- Always-fresh aggregate values.
- No async worker or cache invalidation workflow.

Tradeoff:
- Aggregate is computed at read time; if traffic grows materially, migrate to persisted counters later.

---

## 6) Potential performance issues at proposed scale

1. **GraphQL N+1 on book relations**
   - Risk: book list + authors + genres + publisher can explode query count.
   - Mitigation: batch loading (`DataLoader`) and relation-aware Prisma queries.

2. **Unified search over title + author with joins**
   - Risk: `ILIKE` + joins + `DISTINCT` can degrade under repeated queries.
   - Mitigation: `pg_trgm` GIN indexes on `book.title` and `author.name`; capped page size; stable sort.

3. **Offset pagination deep-page cost**
   - Risk: large offsets become slower.
   - Mitigation: acceptable for 10k rows MVP; keep limits small (20–50), add cursor pagination later if needed.

4. **Review aggregate view on high-traffic lists**
   - Risk: repeated aggregate computation overhead.
   - Mitigation: index `review(bookId)` and keep list projections lean.

5. **Current user selector at ~1,000 users**
   - Risk: loading all users hurts payload and UX.
   - Mitigation: server-side user search + pagination + debounce.

6. **Checkout consistency**
   - Risk: total/price mismatches if computed inconsistently.
   - Mitigation: transactionally compute/store line items and totals server-side.

---

## 7) Indexing and integrity strategy (minimum set)

Indexes:
- `Book(title)` + trigram index for search.
- `Author(name)` + trigram index for search.
- `Review(bookId)` for aggregate lookups.
- `Book(publisherId)` for filtering.
- `Order(userId, createdAt desc)` for order history.
- `OrderItem(orderId)` for order expansion.

Constraints:
- Unique `Review(userId, bookId)`.
- Composite PKs on `BookAuthor`, `BookGenre`, `BookFormat`.
- Composite PK on `OrderItem(orderId, bookId, format)`.
- FK constraints on all relation columns.
- Rating range check (`1 <= rating <= 5`).
- Quantity check (`quantity > 0`).

---

## 8) NestJS operational easy wins (GraphQL + logging + health)

- GraphQL endpoint `/graphql` is the single API contract surface.
- GraphQL Playground/introspection enabled in dev only.
- Structured logging via `nestjs-pino` + `pino`; pretty logs in local dev with `pino-pretty`.
- Correlation ID and request timing in logs.
- Health endpoint (`/health`) and readiness check.
- Global validation pipes (`class-validator`, `class-transformer`).
- Centralized GraphQL error formatting.

---

## 9) Frontend library decision to minimize custom code

### Chosen: Mantine
Reasoning:
- Fast MVP velocity with broad, polished component coverage.
- Includes `@mantine/carousel` (Embla-based) for bookshelf rows.
- Works smoothly with Vite + TypeScript.

### Next-best alternative: Ant Design
Tradeoffs:
- Pros: very complete component suite and built-in Carousel.
- Cons: heavier default styling opinion and generally more override work.

Decision summary:
- Lord of the Reads uses Mantine for MVP speed and low custom frontend code.

---

## 10) Docker Compose local development plan

Services:
- `postgres` (persistent volume)
- `api` (NestJS, depends_on postgres)
- `web` (Vite dev server, depends_on api)

Environment strategy:
- `.env` for local defaults; `.env.example` committed.
- Service-name-based URLs (`postgres`, `api`) in compose networking.

Developer flow target:
1. `docker compose up -d postgres`
2. Run Prisma migrate/seed from `api` container or host.
3. `docker compose up api web`

---

## 11) Phase-by-phase execution plan (small, reviewable, commit-driven)

Each phase is intentionally small. Finish code + checks, do a human review, then commit once.

### Phase 1 — Workspace and local runtime baseline

Concrete steps:
1. Create `api` and `web` folders and root-level Docker Compose file.
2. Add env templates and local defaults.
3. Ensure `postgres`, `api`, and `web` service wiring is valid.

Manual verification and checks:
- Run `docker compose config` and confirm no schema errors.
- Start only Postgres and confirm container is healthy.
- Start `api` and `web` containers and confirm both boot without crash loops.

Phase commit gate:
- Commit after compose is stable and startup instructions are accurate.

### Phase 2 — Prisma schema and integrity-first migration

Concrete steps:
1. Implement minimal models for books, authors, publishers, genres, users, reviews, orders.
2. Add all FK relations, PKs, unique constraints, and required composite keys.
3. Add SQL migration pieces for check constraints and trigram extensions/indexes.

Manual verification and checks:
- Run Prisma migrate successfully against local Postgres.
- Inspect resulting DB objects and confirm all FK constraints exist.
- Confirm review duplicate prevention via unique `(userId, bookId)`.
- Confirm `rating` and `quantity` checks reject invalid inserts.

Phase commit gate:
- Commit only after constraints/indexes are verified in DB, not just in schema text.

### Phase 3 — Seed data and query realism baseline

Concrete steps:
1. Create deterministic seed script for representative dataset slices.
2. Seed enough records to exercise joins/search/pagination realistically.
3. Ensure seeded data includes multiple authors/genres/formats per book.

Manual verification and checks:
- Run seed twice and confirm deterministic behavior (no unintended duplication).
- Confirm each core relation has non-trivial linked data.
- Run basic count queries for each table and sanity-check totals.

Phase commit gate:
- Commit when seed is repeatable and produces reviewable relational data.

### Phase 4 — GraphQL API foundation (books/users read paths)

Concrete steps:
1. Add GraphQL module/config with Playground + introspection enabled in dev only.
2. Implement read queries for books list/detail and user search.
3. Keep resolvers thin and place logic in domain services.

Manual verification and checks:
- Open GraphQL Playground locally and run list/detail queries.
- Verify pagination returns stable order (`title`, `id`).
- Verify user search supports dropdown use case without loading all users.

Phase commit gate:
- Commit after all read paths work end-to-end and resolver methods stay small/readable.

### Phase 5 — Unified search and pagination hardening

Concrete steps:
1. Implement unified search across book title and author name.
2. Add query limits and safe defaults for pagination.
3. Add batched loading strategy to avoid N+1 for common relations.

Manual verification and checks:
- Query with title and author terms and confirm expected matches.
- Confirm no duplicate books in results when joins expand rows.
- Run `EXPLAIN ANALYZE` on representative search query and verify index usage.

Phase commit gate:
- Commit once search correctness and acceptable local query plans are confirmed.

### Phase 6 — Reviews (immutable + aggregate view)

Concrete steps:
1. Implement review create mutation only (no update/delete mutations).
2. Add review aggregate DB view (`book_review_stats`).
3. Expose `reviewMean` (1 decimal) and `reviewCount` in GraphQL types.

Manual verification and checks:
- Submit first review and confirm aggregate updates immediately.
- Attempt duplicate review for same user/book and confirm deterministic failure.
- Attempt out-of-range rating and confirm DB-level rejection.

Phase commit gate:
- Commit after immutability and aggregate correctness are verified manually.

### Phase 7 — Checkout and order memoization

Concrete steps:
1. Implement checkout mutation creating `Order` + `OrderItem` rows transactionally.
2. Persist selected format per item.
3. Persist `unitPriceCents` snapshot for memoized purchase-time pricing.

Manual verification and checks:
- Place order, then change `Book.priceCents`, then place second order.
- Confirm first order keeps original `unitPriceCents` and second uses new value.
- Confirm invalid format/book combinations are rejected by FK constraints.

Phase commit gate:
- Commit when price memoization and integrity constraints behave correctly.

### Phase 8 — Frontend thin vertical slice (Mantine)

Concrete steps:
1. Build minimal pages/components: book list, book detail, user selector, checkout path.
2. Use Mantine components and carousel for bookshelf presentation.
3. Keep UI state minimal and derive values where possible.

Manual verification and checks:
- Confirm user can select current user from searchable dropdown.
- Confirm search + pagination + detail flow works against live API.
- Confirm checkout captures selected format and quantity.

Phase commit gate:
- Commit after complete happy-path flow works manually from UI.

### Phase 9 — Logging, health, and error clarity

Concrete steps:
1. Enable `nestjs-pino` structured logging with local pretty output.
2. Add `/health` endpoint and readiness response.
3. Normalize GraphQL error formatting for predictable client behavior.

Manual verification and checks:
- Trigger successful and failing requests and inspect logs for context fields.
- Verify `/health` reports expected service state.
- Confirm GraphQL errors are readable and consistent.

Phase commit gate:
- Commit after observability basics are in place and useful in local debugging.

### Phase 10 — Test pass and final readiness review

Concrete steps:
1. Add focused Vitest coverage for frontend critical flows.
2. Add minimal API integration smoke checks for core GraphQL operations.
3. Finalize README runbook and phase assumptions.

Manual verification and checks:
- Run full test command and ensure pass.
- Manually replay: search, review create, duplicate review rejection, checkout memoization.
- Review code for readability: short resolvers, clear service boundaries, no dead paths.

Phase commit gate:
- Commit only when tests pass and manual checklist is complete.

---

## 12) Commit protocol (applies to every phase)

1. Keep PR-sized changes: one phase per commit.
2. Before commit, run phase checks and capture command output in notes.
3. Use commit message format: `phase-N: <what was completed>`.
4. If a phase is incomplete, do not commit; split and finish a smaller sub-phase.
5. Prefer readability over abstraction in all touched files.

---

## 13) Out-of-scope for this MVP

- Authentication/authorization.
- Inventory/stock management.
- Payment integration.
- Async event bus / CQRS.
- External search engine (Elasticsearch/Meilisearch).

Lord of the Reads stays intentionally simple for a 3-hour build, with clean upgrade paths once real usage data exists.
