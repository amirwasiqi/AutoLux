#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/autolux}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/autolux-$STAMP.dump"
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" --file "$OUT"
chmod 600 "$OUT"
find "$BACKUP_DIR" -type f -name 'autolux-*.dump' -mtime "+$RETENTION_DAYS" -delete
printf 'Created %s\n' "$OUT"
