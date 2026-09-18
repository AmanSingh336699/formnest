# 🪺 FormNest

> **Build forms in minutes. Collect responses forever.**

Production-grade Form Builder SaaS platform — featuring live form building, file upload support via Cloudinary, real-time analytics, and admin control.

---

## ✨ Features

- 🎨 **Drag-and-Drop Form Builder** — 14 field types (text, email, file uploads, dropdowns, ratings, etc.), live preview, auto-save.
- ☁️ **Cloud Storage Integration** — Powered by **Cloudinary API** for secure, memory-buffered file uploads (up to 10MB per file with MIME validation).
- 📊 **Real-time Analytics** — Privacy-first analytics tracking views, starts, completions, and conversion rates without 3rd-party trackers.
- 🔐 **Authentication & Security** — Argon2id password hashing, Redis-backed rate limiting & session handling, GDPR-compliant IP anonymization.
- 👑 **Admin Panel & User Management** — Full administrative controls for user verification, subscription plan management, and account suspension.
- 💳 **Stripe Billing & Tier Quotas** — Streamlined plan tier limits (`maxForms` quota: Free 5, Pro 50, Enterprise 1000).
- ♿ **Accessibility & Dark Mode** — Full WCAG AA compliant layout with adaptive dark mode.

---

## 🏗️ Tech Stack & Architecture

```
formnest/
├── backend/        Node.js 20 + TypeScript + Express + Drizzle ORM + PostgreSQL + Redis + Cloudinary
└── frontend/       React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query + Zustand
```

### Backend Micro-services & Workers:
- **API Server** (`backend/src/server.ts`) — Express REST API
- **Worker Process** (`backend/src/worker.ts`) — BullMQ email queue worker

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
cp .env.example .env

# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start API server (:4000)
npm run dev

# Start Email Worker (separate terminal)
npm run dev:worker
```

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env

# Install dependencies
npm install

# Start development server (:5173)
npm run dev
```

---

## 🛡️ Security Highlights

- **IP Anonymization**: IP addresses anonymized at write time for GDPR compliance.
- **Argon2id Hashing**: Industry-standard password hashing.
- **Cloud Storage Security**: Cloudinary direct buffer streaming with server-side file type and size restrictions.
- **Form Submission Protection**: Time-trap validation, honeypot traps, and rate limiting per IP.
- **Audit Logging**: Comprehensive audit log entries recorded for administrative mutations.

---

## 📜 License

Proprietary — All Rights Reserved.
