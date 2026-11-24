# AutoLux — Integrated Phase 1 + Phase 2

This project combines the Phase 1 public website, design system, PostgreSQL foundation and branch/settings schema with the Phase 2 authentication and customer identity foundation. Existing Phase 1 landing-page routes are retained and authentication routes are added.

## Project structure
- `frontend/` — React 19, Vite, JSX, MUI, Tailwind, Framer Motion, GSAP, Lenis, React Router, Axios, React Hook Form and Zod.
- `backend/` — Express 5 API, PostgreSQL pool, SQL migrations, authentication, customer identity, role/permission middleware and first Super Admin setup.
- `docs/` — phase design, architecture, integration notes, security boundaries and verification checklist.

## Requirements
- Node.js 20 or newer
- PostgreSQL 15 or newer

## Run locally

### 1. Backend
```bash
cd backend
cp .env.example .env
# Set DATABASE_URL, JWT_ACCESS_SECRET (at least 32 characters), and ADMIN_SETUP_TOKEN (at least 24 characters).
npm install
npm run db:migrate
npm run dev
```
The API listens on `http://localhost:4000`. Health endpoints: `/api/v1/health` and `/api/health`; readiness endpoints: `/api/v1/ready` and `/api/ready`.

### 2. Frontend
Open a second terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Open `http://localhost:5173`.

## Important configuration
- Configure the same frontend origin in backend `FRONTEND_ORIGIN`.
- Configure Google OAuth, Resend and Twilio credentials before enabling those live flows.
- Set production cookie and HTTPS settings correctly before deployment.
- Never commit `.env` files or private credentials.

## Database migration order
The integrated migration runner applies `000_phase1_foundation.sql` before `001_identity.sql`. It supports the Phase 1 `schema_migrations.filename` and standalone Phase 2 `schema_migrations.name` ledger formats. Back up any existing database before running migrations.

## Current scope and known boundaries
This is an integration of the two supplied phase archives, not a claim that all later AutoLux features are complete. The 100-vehicle catalogue, live vehicle images and market-verified rental/sales prices, bookings, checkout, payments, inventory operations and full MFA workflows remain future implementation work. The Phase 2 security-boundary and verification documents remain in `docs/`; review them before production use.

## GitHub
Commit source code, package manifests, lockfiles when generated, SQL migrations, documentation and `.env.example`. Do not commit `.env`, `node_modules`, database backups, real customer data or private keys.
