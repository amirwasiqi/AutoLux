#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

pass(){ printf '\033[32mPASS\033[0m %s\n' "$1"; }
warn(){ printf '\033[33mBLOCKED/NOT RUN\033[0m %s\n' "$1"; }
fail(){ printf '\033[31mFAIL\033[0m %s\n' "$1"; }

printf '\nAutoLux release checks (this script does not certify production readiness)\n\n'

if node --test backend/tests/*.test.js; then pass "Backend test suite"; else fail "Backend test suite"; exit 1; fi

while IFS= read -r -d '' file; do
  node --check "$file"
done < <(find backend/src backend/tests -type f -name '*.js' -print0)
pass "Backend JavaScript syntax"

if [[ -x frontend/node_modules/.bin/vite ]]; then
  (cd frontend && npm run build)
  pass "Frontend Vite production build"
else
  warn "Frontend build skipped: install frontend dependencies first (cd frontend && npm install)"
fi

if command -v pg_isready >/dev/null 2>&1 && [[ -n "${DATABASE_URL:-}" ]]; then
  if pg_isready -d "$DATABASE_URL"; then pass "PostgreSQL server reachable"; else fail "PostgreSQL server not reachable"; fi
else
  warn "PostgreSQL connectivity skipped: pg_isready and DATABASE_URL are required"
fi

for pair in \
  "Google OAuth:GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,GOOGLE_REDIRECT_URI" \
  "Gmail delivery:GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,GMAIL_REFRESH_TOKEN,GMAIL_SENDER_EMAIL,CONTACT_INBOX_EMAIL" \
  "Stripe sandbox/live:STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET" \
  "PayPal sandbox/live:PAYPAL_CLIENT_ID,PAYPAL_CLIENT_SECRET,PAYPAL_WEBHOOK_ID" \
  "Private S3 storage:AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_REGION,S3_BUCKET" \
  "Twilio SMS:TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN,TWILIO_VERIFY_SERVICE_SID,TWILIO_FROM_NUMBER"; do
  label="${pair%%:*}"; vars="${pair#*:}"; missing=()
  IFS=',' read -r -a list <<< "$vars"
  for key in "${list[@]}"; do [[ -n "${!key:-}" ]] || missing+=("$key"); done
  if ((${#missing[@]}==0)); then pass "$label environment variables are present (connectivity not tested)"; else warn "$label missing: ${missing[*]}"; fi
done

if [[ "${RUN_MIGRATIONS:-0}" == "1" ]]; then
  echo "RUN_MIGRATIONS=1: applying migrations to DATABASE_URL. Ensure a verified backup exists first."
  (cd backend && npm run db:migrate)
  pass "Database migrations applied"
else
  warn "Database migrations not applied. Review/backup the target database, then explicitly run: (cd backend && npm run db:migrate)"
fi

printf '\nThis script does not perform provider sandbox transactions, real fleet verification, browser E2E, penetration testing, or production deployment.\n'
