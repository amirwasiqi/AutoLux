#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to the target restore database}"
DUMP_FILE="${1:?Usage: restore-postgres.sh /path/to/autolux-backup.dump}"
[[ -f "$DUMP_FILE" ]] || { echo "Backup file not found: $DUMP_FILE" >&2; exit 1; }
echo "WARNING: This replaces objects in the target database. Confirm this is NOT the production database unless an approved recovery is in progress."
read -r -p "Type RESTORE to continue: " CONFIRM
[[ "$CONFIRM" == "RESTORE" ]] || exit 2
pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" "$DUMP_FILE"
echo "Restore completed. Run application smoke tests before using the restored database."
