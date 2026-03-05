# Lord of the Reads — Progress Log

## Session Instructions (compact)

- `plan.md` = what we intend to build.
- `progress.md` = what we have actually built.
- Update this file at the end of each phase.
- For each phase, record: status, completed work, manual checks run, deviations from plan, errors made, lessons learned, and next step.

---

## Current Snapshot

- Date: 2026-03-04
- Active phase: Phase 1 complete
- Overall status: In progress (Phase 2 not started)

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
- Used `POSTGRES_PORT=5433` during manual verification due to host `5432` conflict.
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
