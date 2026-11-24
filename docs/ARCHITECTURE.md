# AutoLux Architecture — Phase 1
Browser → Vercel frontend → Render Express API → managed PostgreSQL. S3-compatible storage, Redis, payment providers, email/SMS and Google Maps are introduced in the phases that own those capabilities.

- PostgreSQL is the source of truth for business records.
- Use native `pg`; schema changes are versioned SQL migrations.
- Use parameterized SQL, short transactions and explicit connection budgets.
- Never store customer records or uploads on backend local disk.
- Keep API instances stateless.
- Add Redis coordination before horizontally scaling Socket.IO or distributed rate limiting.
- Booking concurrency and payment idempotency must be enforced in later domain/database layers.

Phase 1 exposes health/readiness endpoints and migration infrastructure. Business modules are introduced incrementally.
