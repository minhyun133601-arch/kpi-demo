#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${STACK_DIR}/backups/${STAMP}"

if [[ ! -f "${STACK_DIR}/.env" ]]; then
  echo "missing_env: ${STACK_DIR}/.env" >&2
  exit 1
fi

set -a
source "${STACK_DIR}/.env"
set +a

mkdir -p "${BACKUP_DIR}"
mkdir -p "${STACK_DIR}/runtime-var"

docker compose --project-directory "${STACK_DIR}" exec -T db \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --format=custom \
  > "${BACKUP_DIR}/db.dump"

tar -czf "${BACKUP_DIR}/runtime-var.tar.gz" -C "${STACK_DIR}" runtime-var

cp "${STACK_DIR}/docker-compose.yml" "${BACKUP_DIR}/docker-compose.yml"
cp "${STACK_DIR}/Caddyfile" "${BACKUP_DIR}/Caddyfile"
cp "${STACK_DIR}/.env" "${BACKUP_DIR}/.env.snapshot"

echo "backup_complete:${BACKUP_DIR}"
