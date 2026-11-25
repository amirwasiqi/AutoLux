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


## Phase 5 — Google sign-in, contact inbox and admin control

See [docs/PHASE-5.md](docs/PHASE-5.md) for complete configuration. New migration: `005_phase5_admin_contact.sql`. Configure Google OAuth, Resend and `CONTACT_INBOX_EMAIL`, run `npm run db:migrate`, then bootstrap the first administrator with `npm run admin:create` from the backend directory. No default administrator credentials are shipped.

## Phase 6 commercial implementation work

The original Phase 1–5 application has been extended with the Phase 6 commercial platform source foundation and workflows. See:

- `docs/PHASE6-COMMERCIAL-IMPLEMENTATION-STATUS.md` for the precise implemented / incomplete / unverified status.
- `docs/DEPLOYMENT-AND-INTEGRATIONS.md` for hosting, Gmail, Google OAuth, Stripe, PayPal, Twilio, S3/CDN, migration, and backup configuration.
- `backend/src/db/migrations/006_commercial_platform.sql` for the Phase 6 schema migration.
- `ops/backup-postgres.sh` and `ops/restore-postgres.sh` for manual PostgreSQL backup/restore procedures.

**Important:** this package is an integrated development build, not a production-certified release. The new migration has not been run against a live PostgreSQL instance in this environment, frontend dependencies could not be installed here, and real provider credentials/sandbox tests/security review/deployment are still required. Do not hand over or publish it as production-ready until the release gates in the Phase 6 status report have passed.

## Release verification status — 2026-11-25

This package is **not approved for production handover**. The backend source checks and 9 backend tests pass, but the Vite build, PostgreSQL migration execution, Google/Gmail live verification, Stripe/PayPal sandbox tests, S3/CDN tests, real fleet verification, browser end-to-end testing, penetration testing, and production deployment remain unverified or blocked by missing company resources. See `docs/RELEASE-VERIFICATION-REPORT.md` for the exact results and required release gates. Run `ops/release-check.sh` in a configured build/staging environment to repeat the locally available checks.
