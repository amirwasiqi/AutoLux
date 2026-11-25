# AutoLux deployment and external integrations

## Recommended hosting profile

For the selected $10–$25/month budget, a self-managed 2-vCPU / 4-GB RAM VPS is a practical initial target. A DigitalOcean 4-GB Droplet has historically been listed around $24/month; verify current pricing before purchase. Keep domain registration, backups, object storage/CDN, email provider costs, SMS, and payment processing fees as separate costs.

Deploy with Docker Compose or a hardened Ubuntu service setup. Run the React/Vite frontend behind HTTPS, the Express API behind a reverse proxy, and PostgreSQL on a private network. Do not expose PostgreSQL to the public internet. Use a separate staging environment before production.

## Required backend environment

Copy `backend/.env.example` to a protected server-side `.env` and set real values. Never commit production secrets.

- `DATABASE_URL`, JWT secrets, cookie/session settings, `FRONTEND_ORIGIN`.
- `GOOGLE_CLIENT_ID` for Google sign-in.
- `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER_EMAIL` for Gmail API delivery. The OAuth grant must include Gmail send scope and be authorized by the sending Workspace/Gmail account. Set `CONTACT_INBOX_EMAIL=khannamirr2020@gmail.com`.
- `MFA_ENCRYPTION_KEY`: a high-entropy secret used to encrypt authenticator secrets. Back it up securely; losing it can make existing TOTP secrets undecryptable.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, and the correct live or sandbox `PAYPAL_BASE_URL`.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, and `TWILIO_FROM_NUMBER`.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`, `PUBLIC_ASSET_BASE_URL`.

## Google and Gmail

Configure authorized JavaScript origins and redirect URIs for the production domain in Google Cloud. Google login and Gmail sending are separate OAuth uses. Obtain a refresh token using offline access and the Gmail send scope for the chosen sender account. The Gmail sender should be the authenticated mailbox or a verified send-as alias. Send a real test from the website and confirm delivery in `khannamirr2020@gmail.com` before enabling the integration status.

## S3 / CDN

Use a private bucket with public access blocked and server-side encryption enabled. Use least-privilege IAM credentials scoped to the required prefixes. Configure CORS for the production website origin and PUT requests with the content types used by the upload UI. Configure CloudFront (or an equivalent CDN) with private S3 origin access for public vehicle images; set `PUBLIC_ASSET_BASE_URL` to that CDN origin. Sensitive driver and ownership documents must remain private and be accessed only through short-lived signed GET URLs. Do not make the bucket public.

## Payment webhooks

Register the following endpoints over HTTPS:

- `POST /api/v1/payments/webhooks/stripe` — subscribe at minimum to `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, and `payment_intent.payment_failed`.
- `POST /api/v1/payments/webhooks/paypal` — configure the webhook in PayPal and store its webhook ID in `PAYPAL_WEBHOOK_ID`. Include capture completion and denial events.

Use provider sandbox credentials first. Verify successful, failed, expired, duplicate, delayed, and refunded flows. Do not set integration status to verified until webhook delivery and amount reconciliation have passed.

## Twilio

Use Verify for phone-number verification and a Messaging-capable sender number for transactional SMS. `TWILIO_FROM_NUMBER` must be provisioned for the target destination countries. Test opt-in, STOP/opt-out requirements, delivery failures, and phone verification before enabling SMS notifications.

## Database migration

Run backend migrations against staging first, inspect the resulting schema and data, and verify the 100 seed records remain clearly marked as demonstration inventory and are not bookable. The new migration is `006_commercial_platform.sql`. Do not run it against an existing production database without a backup and migration review.

## Backups

Use `ops/backup-postgres.sh` with a restricted database credential and encrypted off-server storage. Schedule it with cron or the hosting provider's scheduler. Perform a restore drill using `ops/restore-postgres.sh` in a separate database before launch. Backups are not configured automatically by this source package.
