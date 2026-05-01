# notes-app-server

REST API for the notes-app. Express 5 + Prisma 6 + PostgreSQL + better-auth.
See [SPEC.md](../SPEC.md) for the architecture and API contract.

## Prerequisites

- Node 20+ (tested on 22)
- Docker (for local Postgres)

## Setup

```bash
npm install
docker compose up -d                 # Postgres on host port 5433
cp .env.example .env
cp .env.test.example .env.test
npx prisma migrate dev               # apply migrations to notes_dev
```

The Docker container creates two databases on first boot: `notes_dev`
(used by the app) and `notes_test` (used by `npm test`). The vitest
global setup applies migrations to `notes_test` automatically before
the suite runs.

## Running

```bash
npm run dev                          # http://localhost:3001
npm run build && npm start           # production build
```

## Tests

```bash
npm test                             # full suite (84 tests)
npm run test:watch
npm run test:coverage                # enforces 85/85/75/85 thresholds
```

`npm test` refuses to run unless `DATABASE_URL` ends in `_test` — the
guard is in `tests/setup.ts` and will fail-fast on misconfiguration.

## Smoke test

End-to-end happy-path check against a running dev server.

```bash
npm run dev &
bash scripts/smoke.sh
```

The script signs up, creates/updates/shares/deletes a note, and asserts
the public URL behaves correctly through the toggle. Override the host
with `API=http://other.host:3001 bash scripts/smoke.sh`.

## Routes

| Method | Path | Auth |
|---|---|---|
| ALL    | `/api/auth/*`              | better-auth |
| GET    | `/api/notes`               | required |
| POST   | `/api/notes`               | required |
| GET    | `/api/notes/:id`           | required |
| PUT    | `/api/notes/:id`           | required |
| DELETE | `/api/notes/:id`           | required |
| POST   | `/api/notes/:id/share`     | required |
| GET    | `/api/public-notes/:slug`  | none |

## Project layout

```
prisma/                  schema.prisma + migrations
src/
  index.ts               entrypoint
  app.ts                 buildApp() factory
  errors.ts              HttpError + global error handler
  config/env.ts          Zod-validated env
  db/prisma.ts           PrismaClient singleton
  auth/                  better-auth instance + requireAuth middleware
  routes/                /api/notes + /api/public-notes
  repositories/notes.ts  data layer (Prisma)
  schemas/notes.ts       Zod request/response schemas
tests/
  setup.ts               per-fork test bootstrap + truncateAll afterEach
  global-setup.ts        prisma migrate deploy on notes_test
  helpers/               createApp, signUpAndSignIn
  unit/                  pure logic tests
  integration/           supertest against the real Express app
scripts/smoke.sh         end-to-end happy-path script
```
