# Lord of the Reads

Minimal bookstore app built for fast, reviewable delivery with strong data integrity and practical local operations.

## Stack

- API: NestJS + GraphQL (Apollo) + Prisma + PostgreSQL
- Web: React + Vite + Apollo Client + Mantine
- Runtime: Docker Compose (`postgres`, `api`, `web`)

## Setup Instructions

### 1) Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)

### 2) Start services (Docker-first)

```bash
docker compose up -d postgres api web
```

### 3) Verify service status

```bash
docker compose ps
```

### 4) Apply migrations and seed data

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma generate
docker compose exec api npm run db:seed
```

### 5) Open the app

- Web: http://localhost:5173
- GraphQL Playground: http://localhost:3000/graphql (dev only)
- Health: http://localhost:3000/health

### 6) Stop services

```bash
docker compose down
```

---

## Architecture Decisions

### Backend

- NestJS monolith with GraphQL code-first schema.
    - NestJS gives us plenty of plugins and good prod ready defaults.
- Resolver/service separation:
	- Resolvers stay thin (args normalization + orchestration).
	- Services hold business logic.
- Prisma with adapter-based Postgres runtime (`@prisma/adapter-pg`).
- DB constraints used as first-class integrity controls (unique/composite keys/checks/FKs).

### Data Modeling

- Books have one base price and one publisher.
- Many-to-many joins:
	- Book ↔ Author
	- Book ↔ Genre
	- Book ↔ Format
- Reviews:
	- One review per `(user, book)` (immutable once created).
	- Rating 1–5.
	- Text required.
- Orders:
	- Multiple items per order.
	- `unitPriceCents` memoized at checkout to preserve purchase-time price.

### Query/Performance Strategy

- Unified search on book title + author name.
- Offset pagination with bounded limits.
    - The catalog uses offset-based pagination with a stable sort on Book.id. Given the dataset size (~10k rows), offset pagination is simpler and more than performant enough. Cursor pagination provides better stability at very large scales but introduces additional complexity that isn’t justified for this timeboxed implementation.
- Review aggregate fields (`reviewCount`, `reviewMean`) are lazy-resolved via `@ResolveField` + request-scoped DataLoader (only computed when requested).

### Frontend UX Strategy

- Minimal stateful UI with explicit current user selector.
- Bookshelf includes search, genre filter, and paginated full-page dense grid.
- Checkout uses cart bundling and single mutation submission.
- Review flow uses modal entry (stars + text) for selected user/book.

---

## API Notes (Current)

- Books:
	- `books(limit, offset, search, genreId)`
	- `booksCount(search, genreId)`
	- `book(id)`
	- `genres()`
- Users:
	- `users(search, limit, offset)`
- Reviews:
	- `createReview(userId, bookId, rating, text)`
- Orders:
	- `checkout(userId, items)`
	- `order(id)`
	- `userOrders(userId, limit, offset)`

---

## Additional Features (Human starts here)

Dev Experience:
- I enforced Docker-first control for start/stop/testing (instead of host-process assumptions).
- You required dev-only Playground/introspection.
- Improved logging

UI Experience
- Chose Mantine UI library for prebuilt components and minimal code.

Performance
- I requested lazy review aggregate resolution with `@ResolveField` + DataLoader.

I wish I had more time to implement features. My next big concern would be a more elegant way to select users. The current implementation doesn't scale even for our targets.

## Reflection:

- I made a hard stop at 3 hours. 
- I used CoPilot inside of VsCode since I had already used up my Claude credits for the day.
- I exported the chat from VS Code using the command palette and then asked the AI to parse the resulting chat.json to create the Chat.md. I included chat.json if you really wwant to dig into the agent responses.

The AI just plain makes generating code easier. As far as my day to day, this was normal. If anything the time pressure made me a little more careless at a step or two. 

I spent ~1 hour actually just reading the spec, and typing it up as cleanly as possible for hard requirements. (A oopsie enter key split that into two parts) The next hour was getting to phase 10. The next hour after that was cleanup, verification that we hit spec, etc... 

I read and tested code throughout. I hit a little bit of a rough patch after phases 8-9 - but that was quickly resolved. It speaks to the power of consistant gating. There were a few small code review items that I had to push back on. Some bad includes. An inefficient query. Otherwise the coding agent did a good job of staying on track.

I haven't done a post mortem to see what I forgot to specify and what the system forgot to build. I was going to comment that it looks like I forgot about genres in the spec because they wound up not existing in the app. But now I can look back over the history, and it was there. It would be good practice to have the AI re-read the plan at step 8 when we start building the UI.

Because of the nested directory structure, it updated the gitignore after installing 20K modules... And then spent 15 minutes verifying the whole list. It can be inefficient by it's nature sometimes. VS code tracks the same changes in no time flat. This is a change I would have normally just made by hand.

Given our usage spec, I optimized for simplicity and concurrency. If I chose a UI library or Framework, it was to minimize code.

[My process explained](https://www.linkedin.com/feed/update/urn:li:activity:7425286864535900160/)

What I found works best is a two document approach - What we are building, and what we have built. 

You can see it in my other repos:
[Smart API](https://github.com/JasonMaggard/smart-api)
[WCAG-AUDIT](https://github.com/JasonMaggard/wcag-audit)



## Constraints (Back to AI)

1. Keep the solution minimal; avoid overengineering.
2. Prefer DB constraints/integrity first.
3. Keep resolvers thin. Cap page size.
4. Review rules:
	 - immutable
	 - one review per user/book
	 - rating 1–5
5. Orders must memoize purchase-time item price.
6. GraphQL settings:
	 - no Swagger path for GraphQL
	 - Playground/introspection only in development
7. Docker Compose as primary local runtime.
8. Phase-driven execution with explicit verification and commit gates.

---

## Verification Commands

### Build

```bash
docker compose exec api npm run build
docker compose exec web npm run build
```

### Tests

```bash
docker compose exec api npm run test:e2e
docker compose exec web npm run test
```

### Quick health checks

```bash
curl -s http://localhost:3000/health
curl -s -X POST http://localhost:3000/graphql -H 'content-type: application/json' --data '{"query":"{ books(limit: 2) { id title } }"}'
```

---

## Troubleshooting

- If GraphQL fails after schema changes:
	- Run `docker compose exec api npx prisma generate`
- If web cannot query API:
	- Check API logs: `docker compose logs api --tail=200`
	- Confirm CORS preflight is allowed from `http://localhost:5173`
- If ports are occupied:
	- Keep using `POSTGRES_PORT=5433`
	- Verify `3000/5173` availability or restart compose stack.
