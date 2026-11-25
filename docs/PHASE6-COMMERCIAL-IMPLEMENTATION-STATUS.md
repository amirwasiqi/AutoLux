# AutoLux Phase 6 — Commercial Implementation Status

**Base:** Original AutoLux Phase 1–5 project.  
**Scope:** Commercial platform foundation and workflows added during this implementation pass.  
**Release status:** **NOT PRODUCTION READY — DO NOT HAND OVER AS A COMPLETED LIVE SERVICE.**

## Implemented in source

- PostgreSQL migration `006_commercial_platform.sql` adds commercial tables for partners, partner listings, sales enquiries/orders, commissions, suppliers, products, carts, shop orders, inventory, shipments, coupons, driver documents, vehicle ownership documents, contracts and versioning, payment transactions/refunds/webhooks, notifications/preferences, reservation holds, branches/transfers, integration status, and MFA email recovery codes.
- Ten role names are supported, with granular permission definitions and explicit default role-to-permission mappings. Super Admin permission editing is protected.
- TOTP authenticator enrollment, QR-code URI, encrypted secret storage (AES-256-GCM), login challenge, one-time recovery codes, and email recovery code flow are implemented in the backend and account/login UI.
- Booking checks reject demo/unverified vehicles. Temporary 10-minute reservation holds, expiry handling, overlap protection, and extension/early-return requests are implemented.
- Company fleet verification workflow requires a non-demo company vehicle, registration number, reviewed registration and ownership documents, and at least one individually approved vehicle photograph. Vehicle photos and sensitive documents use short-lived S3 presigned uploads and staff review endpoints.
- Dealership application, partner membership using normal AutoLux authentication, partner listing submission/approval, public sales catalogue, sales enquiries, sales orders, and commission records/workflows are implemented.
- Shop product catalogue, customer cart, order creation, stock reservation, coupons, supplier/AutoLux/hybrid fulfillment snapshots, order status and shipment endpoints, and product/supplier admin endpoints are implemented.
- Stripe Checkout and PayPal order creation/capture, signed webhook verification, idempotent event records, amount matching, and refund API workflows are implemented. They remain disabled until provider credentials are configured.
- Rental contract templates, version creation, legal-review status, issuing against a booking, snapshotting, clickwrap acceptance, and print-ready HTML are implemented. Customers can print/save the HTML contract as PDF through the browser; server-side PDF generation is not included.
- Driver document uploads use private S3 presigned URLs, file-size verification, staff review, and driver profile status updates. Automated identity/license verification provider integration is not included.
- Gmail API email delivery is used for contact messages and transactional email when configured. Contact messages are still stored in the database. Twilio SMS sending is available when a verified phone number and Twilio Messaging sender are configured.
- Customer in-app notifications and communication preferences are implemented. Booking status and driver document review events create notifications.
- Branch CRUD, vehicle transfer APIs, finance summary, recorded tax report, transaction CSV export, integration status, and system health endpoints are included.
- Customer frontend pages added for shop/cart, sales catalogue/enquiries, partner portal, payment result, account recovery, MFA, driver documents, notifications/preferences, and contracts. Commercial admin pages cover products, suppliers, dealerships, listings, sales enquiries, branches, commissions, contract templates, finance summary, and system health.

## Still incomplete or not verified

- The 100 seed vehicles remain demonstration records. No real AutoLux fleet records or real photographs were supplied. No real fleet can be marked verified until company documents and genuine photos are uploaded and reviewed.
- Google OAuth login exists in the inherited project; real OAuth client configuration and production redirect/domain testing are not performed.
- Gmail API delivery is code-complete but no real Gmail OAuth refresh token was supplied and no inbox delivery test was performed for `khannamirr2020@gmail.com`.
- Twilio Verify/SMS requires account SID, auth token, Verify service SID, and a Messaging-capable sender number. No live SMS test was performed.
- Stripe and PayPal have not been tested in sandbox or live mode. Webhook endpoints must be registered at the provider dashboards.
- S3 upload code is present, but bucket policy, CORS, encryption, CloudFront/public asset access, credentials, and real uploads have not been configured or tested.
- Automated driver verification provider is not integrated; staff approval is the active verification path.
- Contract templates are configurable but must be authored/reviewed/approved by qualified US counsel. PDF is browser print-to-PDF, not a generated PDF artifact from the server.
- Rental lifecycle still needs further work for deposits, pickup/return inspections, late fees, no-shows, damage claims, cancellation/refund coordination, and operational edge cases.
- Sales operations still need complete customer sales-order UI, deposit/order lifecycle refinements, partner settlement payout automation, and full commission reconciliation.
- Shop operations still need more complete shipping carrier integrations, tracking automation, tax calculation, inventory audit tools, order cancellation/return workflows, and complete refund-to-stock handling.
- Ten-role and permission management are implemented, but not every API route has been migrated from role checks to granular permission checks. A full authorization matrix test is still required.
- Financial reconciliation is only represented by schema foundations; automated provider settlement import/matching is not implemented. Tax totals are not calculated and must not be treated as tax advice or filed reports.
- PDF exports, full customer profile/consent workflows, complete audit/security console, scheduled backup automation, and tested restore procedures remain outstanding.
- No PostgreSQL migration was executed. No live PostgreSQL server or `psql` client was available in the build environment.
- Frontend production build was not run: dependencies could not be installed in this environment. JSX/JavaScript syntax was checked separately.
- No end-to-end browser test, payment sandbox test, penetration test, load test, Gmail inbox test, S3 upload test, or production deployment was performed.

## Tests run in this environment

- Backend source syntax checks: passed.
- Frontend JSX/JavaScript transpile syntax checks: passed (TypeScript transpile parser only; not a Vite build).
- `node --test backend/tests/*.test.js`: **9 passed, 0 failed**. The added Phase 6 tests are source-contract/static checks, not live database or provider integration tests.
- `npm install` timed out in the environment. Frontend `npm run build` and a dependency-backed backend runtime test were therefore not completed.

## Required before production release

1. Install dependencies in a network-enabled build environment and run frontend/backend builds.
2. Apply migrations to a staging PostgreSQL database and execute rollback/restore checks.
3. Configure HTTPS domain, production secrets, Google OAuth, Gmail OAuth, S3/CloudFront, Twilio, Stripe, and PayPal.
4. Upload and independently verify real fleet records, ownership/registration documents, and photographs.
5. Run provider sandbox tests, webhook replay/idempotency tests, full customer/admin end-to-end tests, authorization tests, and security review.
6. Configure automated encrypted backups and perform a restore drill.
7. Obtain legal and tax review for rental agreements, payment/refund rules, and US tax handling.
8. Deploy to the company's hosting account, verify DNS/TLS, monitoring, logging, backup retention, and incident recovery.
