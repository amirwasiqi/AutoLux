
# MFA and security implementation boundary

The Phase 2 schema reserves recovery-code records and the user MFA flag. Email/password authentication,
email verification, Google ID-token verification, refresh-token rotation, token revocation, and Twilio Verify
SMS start/check endpoints are implemented in this delivery.

**TOTP authenticator enrollment, TOTP challenge enforcement, encrypted TOTP-secret storage, recovery-code
generation/consumption, login lockout counters, and complete device/session management are not yet complete.**
They must be implemented and security-tested before enabling MFA in production. Do not expose the MFA flag as
an enabled feature until that work is complete.

The admin setup endpoint uses a one-time environment token and prevents a second first-admin creation. For
production, add an IP allowlist or deployment-only access control to the setup route, rotate/remove the token
immediately after successful setup, and verify the audit trail.

The refresh-token cookie is HttpOnly and rotated. Before production, add a strict Origin/CSRF strategy aligned
with the deployed domain topology, and run refresh-token replay/concurrency tests. Configure proxy trust only
for the actual trusted Render proxy chain.

Sensitive driver-license data must not be stored as plaintext. The current schema provides a placeholder
column for encrypted data; production encryption key management and document storage controls are required
before collecting actual license numbers or document images.
