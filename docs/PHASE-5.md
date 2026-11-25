# AutoLux Phase 5 — Identity, contact and administration

Phase 5 extends the integrated Phase 1–4 project. It adds Google Identity Services sign-in, a public contact form, email forwarding through Resend to the owner's Gmail inbox, a private first-sign-in JSONL record, and an expanded role-protected admin control center.

## Features

- Google sign-in on `/login`, backed by the existing Google ID-token verification endpoint.
- Contact form on `/contact`; messages are saved in PostgreSQL before attempting email delivery.
- Resend sends each enquiry to `CONTACT_INBOX_EMAIL`; `reply_to` is set to the sender's email. Configure a verified sender domain in Resend. The destination may be a Gmail inbox.
- Admin contact inbox at `/admin` lets authorized admins review enquiries, change status, retry email delivery and open a reply in their mail client.
- User administration at `/admin`: search customers, change non-super-admin roles (Super Admin only), and activate, lock or suspend accounts. Locking/suspending revokes refresh tokens.
- Overview metrics, reservation/fleet shortcuts, and audit activity.
- First successful password or Google sign-in is written once to `backend/private-data/first-signins.jsonl`.
- The JSONL record contains only user ID, email, first/last name, account creation time, first sign-in time and sign-in method. It never contains passwords, access tokens, refresh tokens, identity documents or payment data. The file is ignored by Git and should be protected in production with private persistent storage, restricted OS permissions, backups and a retention policy.
- `backend/src/scripts/create-admin.js` securely creates the first Super Admin using environment values and Argon2id. No default admin password is shipped.

## Setup

1. Configure `backend/.env` using `.env.example` as a guide.
2. Set `GOOGLE_CLIENT_ID` to the Google OAuth Web client ID. Add the local frontend origin and production website origin to the OAuth authorized JavaScript origins in Google Cloud Console.
3. Set `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` to the same Google OAuth Web client ID, then restart Vite.
4. Set `RESEND_API_KEY`, a verified `EMAIL_FROM` sender, and `CONTACT_INBOX_EMAIL=your-real-gmail@gmail.com`.
5. Run the backend migrations: `cd backend && npm install && npm run db:migrate`.
6. Set `ADMIN_EMAIL`, a unique `ADMIN_PASSWORD` of at least 14 characters, and `ADMIN_SETUP_TOKEN_CONFIRM` equal to the private `ADMIN_SETUP_TOKEN` value in `backend/.env`.
7. Run `npm run admin:create` once from `backend`. Remove `ADMIN_PASSWORD` and `ADMIN_SETUP_TOKEN_CONFIRM` from the runtime environment after bootstrap; keep `ADMIN_SETUP_TOKEN` private for any remaining setup flow.
8. Start backend and frontend in separate terminals: `npm run dev` in each directory.

## Important operational notes

- A website contact message is persisted even if the email provider is not configured or temporarily unavailable. The admin inbox shows delivery status and provides retry.
- Email forwarding is not a direct Gmail SMTP login. Resend delivers to the configured Gmail recipient; verify the sender domain and check Resend's delivery logs.
- Google sign-in is only displayed when `VITE_GOOGLE_CLIENT_ID` is configured.
- The private first-sign-in file is local filesystem storage. On Render or other ephemeral hosts, configure a persistent private disk or replace this with an encrypted/object-storage audit export. Do not expose this directory through static hosting.
- User-role assignment is restricted to Super Admin. Company Admin can review users and change account status, but cannot grant elevated roles.
- This phase does not claim all website functions are complete. Payments, products/orders, subscriptions, MFA/TOTP enrollment, full driver-document workflows and live GPS require their own implementation and verification.

## Security checklist before production

- Rotate all sample credentials; use unique 32+ character JWT secrets.
- Keep `.env` out of Git and rotate any credential ever committed.
- Restrict database and private-disk access; enable TLS and backups.
- Configure HTTPS, production CORS origins, secure cookies and a real domain.
- Set Resend sender/domain verification and Google OAuth production origins.
- Add CAPTCHA/anti-bot protection to the public contact form before heavy public traffic.
- Define privacy notice, data retention/deletion process and lawful basis/consent for contact enquiries and first-sign-in records.
- Run production build, live PostgreSQL migration tests, Google OAuth tests, email delivery tests and role-authorization tests in the deployment environment.
