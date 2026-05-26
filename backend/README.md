# FormNest Backend

Production-grade Node.js + TypeScript + Drizzle + PostgreSQL backend for FormNest.

## Quick start

```bash
cp .env.example .env       # fill secrets
npm install
npm run db:generate         # generate SQL from schema
npm run db:migrate          # apply migrations
npm run db:seed             # optional demo data
npm run dev                 # HTTP API on :4000
npm run dev:worker          # BullMQ worker (separate terminal)
```

## Architecture

- **API process** (`src/server.ts`) — Express HTTP server
- **Worker process** (`src/worker.ts`) — BullMQ workers for webhook delivery + email dispatch
- Both processes share `db` + `redis` singletons but run independently for scaling

## Folder layout

```
src/
├── config/        env, db, redis, queue, email, storage, logger
├── middleware/    auth, validate, rate-limit, idempotency, error, request-id
├── lib/           pure helpers (AppError, jwt, hmac, password, sanitize, audit)
├── modules/       feature-first: auth, forms, responses, webhooks, etc.
├── jobs/          BullMQ worker implementations
├── openapi/       Zod → OpenAPI 3.1 registry (served at /api/v1/openapi.json)
├── app.ts         Express composition (no listen)
├── server.ts      HTTP entry point
└── worker.ts      Worker entry point

drizzle/
├── schema/        Drizzle table definitions, one file per domain
├── migrations/    Generated SQL, committed to repo
└── seed.ts
```

## Key conventions

- TS strict, zero `any`, zero `console.log`
- Every endpoint goes route → controller → service → db
- All inputs validated via Zod
- Errors via `AppError` hierarchy; global error middleware formats responses
- All times timestamptz, all IDs cuid2 (text)
- IPs anonymized via `lib/ipAnonymize.ts` before storage
- Audit log entry for every sensitive mutation
- OpenAPI auto-generated from Zod schemas — docs never out-of-sync

## Migrations (CRITICAL)

- Dev: `npm run db:generate` → review SQL → `npm run db:migrate`
- Production: only `npm run db:migrate` (never `drizzle-kit push`)

## Health endpoints

- `GET /health` — shallow (process alive)
- `GET /health/ready` — deep (DB + Redis connectivity)
- `GET /api/v1/openapi.json` — live API spec
- `GET /version`

## Environment

See `.env.example` for the full Zod-validated list. The process refuses to start with missing/invalid env.
