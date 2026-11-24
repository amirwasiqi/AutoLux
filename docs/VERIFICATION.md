
# Verification checklist

## Backend
```bash
cd backend
npm install
npm test
npm run db:migrate
npm run dev
```
- `GET /api/v1/health` returns `200`.
- `GET /api/v1/ready` returns `200` only when PostgreSQL is reachable.
- Registration rejects invalid email/password and duplicate email.
- Passwords are stored as Argon2id hashes, never plaintext.
- Refresh cookie is HttpOnly, Secure in production, SameSite=Lax and rotated on refresh.
- Logout revokes the current refresh token.
- Protected endpoints reject missing/invalid access tokens.
- User-supplied role names are never accepted during public registration.
- Super Admin setup rejects missing/wrong/consumed setup tokens.
- Twilio SMS start/check succeeds only with configured Verify credentials.
- TOTP MFA is not production-ready in this phase; see MFA-AND-SECURITY-BOUNDARIES.md.

## Frontend
```bash
cd frontend
npm install
npm run build
```
- Registration/login forms validate input.
- Auth state loads from `/auth/me`.
- Protected routes redirect unauthenticated users.
- Auth pages work at mobile and desktop widths.

## Live integrations still requiring credentials
- Google OAuth authorized origins and redirect configuration.
- Resend verified sender/domain.
- Twilio Verify service and verified destination numbers during testing.
- PostgreSQL TLS/network access.
- Production cookie domain and HTTPS.
