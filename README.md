# Lord of the Reads

Minimal bookstore app with:
- NestJS + GraphQL + Prisma + Postgres (`api`)
- React + Vite + Apollo + Mantine (`web`)
- Docker Compose local runtime

## Prerequisites

- Docker + Docker Compose

## Quick Start (Docker)

1) Start services:

```bash
POSTGRES_PORT=5433 docker compose up -d postgres api web
```

2) Verify services are running:

```bash
docker compose ps
```

3) Open apps:
- API GraphQL: http://localhost:3000/graphql
- API health: http://localhost:3000/health
- Web: http://localhost:5173

## Database Migrate + Seed (Docker)

Run from the API container:

```bash
docker compose exec api npx prisma migrate dev
docker compose exec api npm run db:seed
```

## Test Commands (Docker)

Frontend Vitest:

```bash
docker compose exec web sh -c "npm install && npm run test"
```

API e2e smoke tests:

```bash
docker compose exec api npm run test:e2e
```

## Build Commands (Docker)

```bash
docker compose exec api npm run build
docker compose exec web sh -c "npm install && npm run build"
```

## Manual Verification Checklist

- Search books by title and author in web UI.
- Select current user and place checkout order with format and quantity.
- Create a review once; duplicate review fails.
- Change `Book.priceCents`, place second order, and verify memoized unit price differs by order.
- Confirm `/health` returns `status: ok`.

## Stop Services

```bash
docker compose down
```
