# 🪺 FormNest

> **Build forms in minutes. Collect responses forever.**

Production-grade form builder SaaS — Typeform's elegance + Google Forms' simplicity + Formspree's developer-friendliness.

## ✨ Features

- 🎨 **Drag-drop builder** — 13 field types, instant preview, auto-save with retry
- 🔌 **REST API + OpenAPI 3.1** — auto-generated docs, idempotency keys, cursor pagination
- 🪝 **HMAC webhooks** — Stripe-style signatures, exponential retries, auto-disable on persistent failure
- 📊 **Analytics** — views, starts, completions, 7-day chart (privacy-first, no third-party trackers)
- 👥 **Teams + RBAC** — Owner/Member roles, email invitations
- 💳 **Stripe billing** — Checkout + Customer Portal, plan limit enforcement
- 🛡️ **Security-first** — GDPR IP anonymization, AES-GCM webhook secrets, bcrypt, audit log
- ♿ **WCAG AA** — labels, ARIA, keyboard nav, focus rings

## 🏗️ Architecture

```
formnest/
├── backend/        Node.js 20 + TypeScript strict + Express + Drizzle + Postgres + Redis + BullMQ
└── frontend/       React 18 + TypeScript strict + Vite + Tailwind + TanStack Query + Zustand
```

Two processes per deployment:
- **API** (`backend/src/server.ts`) — Express HTTP, autoscaled
- **Worker** (`backend/src/worker.ts`) — BullMQ workers (webhooks + emails), scaled by queue depth

## 🚀 Quick start

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run db:generate && npm run db:migrate && npm run db:seed
npm run dev          # API on :4000

# Worker (separate terminal)
npm run dev:worker

# Frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev          # UI on :5173
```

**Demo login**: `demo@formnest.com` / `DemoPass123!`

## 📐 Stack decisions

| Choice | Why |
|---|---|
| **Drizzle ORM** over Prisma | Explicit SQL, lightweight, no separate process, better TS inference |
| **Postgres + Redis** | Postgres for durability; Redis for rate-limit, idempotency, queues, analytics counters |
| **BullMQ** | Mature, battle-tested, supports retries with backoff + jitter |
| **HS256 JWT (MVP)** | Simpler; RS256 in Phase 2 with key rotation |
| **bcrypt over argon2** | Wider ecosystem support in MVP; argon2id consideration in Phase 2 |
| **Fields as rows** (not embedded JSON) | Per-field analytics, indexing, schema evolution |
| **Sync CSV export** (≤2000 rows) | Simpler than async queue for MVP; switch to job for larger exports |
| **Transactional outbox** for webhooks | Prevents "response saved but webhook lost" on crash |
| **Renderer = single source of truth** | `frontend/src/components/renderer/` used by BOTH builder preview AND public form view |

## 🔐 Security highlights

- IPs anonymized at write (last octet zeroed for IPv4, /48 for IPv6)
- API keys: sha256 + env pepper, prefix shown in UI, raw shown ONCE on creation
- Webhook secrets: AES-256-GCM encrypted at rest, HMAC-SHA256 signatures with timestamp (anti-replay)
- Rate limiting: Redis sliding window per route + plan-aware API limits
- Honeypot + time-trap + per-IP rate limit on public submissions
- Audit log entry for every sensitive mutation
- Strict CORS, Helmet, CSP-ready
- All env vars Zod-validated on boot — fails fast

## 📜 License

Proprietary — all rights reserved.
