# AutoLux — Integrated Phases 1–3

This project combines the Phase 1 public website and PostgreSQL foundation, Phase 2 authentication and customer identity, and Phase 3 vehicle catalogue and fleet administration. Existing public routes and authentication are retained.

## Project structure
- `frontend/` — React 19, Vite, JSX, MUI, Tailwind, Framer Motion, GSAP, Lenis, React Router, Axios, React Hook Form and Zod.
- `backend/` — Express 5 API, PostgreSQL pool, SQL migrations, authentication, customer identity, role/permission middleware and first Super Admin setup.
- `docs/` — phase design, architecture, integration notes, security boundaries and verification checklist.
- `backend/src/modules/vehicles/seed-vehicles.json` — 100 catalogue records with transparent price-basis metadata and image search terms.

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
The integrated migration runner applies `000_phase1_foundation.sql`, `001_identity.sql`, `002_vehicle_catalog.sql`, `003_rental_bookings.sql`, then `004_booking_operations.sql`. It supports the Phase 1 `schema_migrations.filename` and standalone Phase 2 `schema_migrations.name` ledger formats. Back up any existing database before running migrations.

## Phase 3 — Vehicle catalogue and fleet foundation
The integrated project now includes a 100-model vehicle catalogue, public search/filter/detail pages, a fleet management screen, PostgreSQL vehicle/image/status-history tables and protected fleet APIs. See `docs/PHASE-3.md` for details, price-source notes, image licensing behavior and API routes.

The seeded records are sample catalogue entries (`is_demo=true`), not confirmation of physical AutoLux inventory. Model-level sale prices are used-market median references where available; otherwise they are segment estimates. Rental prices are published model examples or category market-guide rates. Confirm actual vehicle, trim, branch availability, dates and AutoLux-approved pricing before accepting payment or a reservation. Vehicle photos are resolved server-side from Wikimedia Commons at runtime to avoid browser-side API/CORS failures, with category-level Unsplash fallbacks. Images are not bundled in the ZIP; verify each result is the correct model/trim before commercial publication.

## Phase 4 — Reservations & rental operations
Phase 4 adds date availability checks, customer reservation requests, customer booking history/cancellation, staff reservation management, reservation status transitions and event history. See `docs/PHASE-4.md`. The reservation estimate is a base rental subtotal only; no payment is taken.

## Current scope and known boundaries
Payment checkout, rental contracts, customer/driver document verification, maintenance work orders, inspections/damage workflows, stock transfers, vehicle sales checkout and full MFA workflows remain future implementation work. The Phase 2 security-boundary and verification documents remain in `docs/`; review them before production use.

## GitHub
Commit source code, package manifests, lockfiles when generated, SQL migrations, documentation and `.env.example`. Do not commit `.env`, `node_modules`, database backups, real customer data or private keys.
