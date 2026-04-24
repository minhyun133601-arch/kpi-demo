#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 /absolute/or/relative/path/to/backups/YYYYMMDD-HHMMSS" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="$1"

if [[ ! -d "${BACKUP_DIR}" ]]; then
  echo "backup_dir_not_found:${BACKUP_DIR}" >&2
  exit 1
fi

if [[ ! -f "${STACK_DIR}/.env" ]]; then
  echo "missing_env: ${STACK_DIR}/.env" >&2
  exit 1
fi

set -a
source "${STACK_DIR}/.env"
set +a

docker compose --project-directory "${STACK_DIR}" stop app proxy || true
docker compose --project-directory "${STACK_DIR}" up -d db

echo "waiting_for_db..."
sleep 10

cat "${BACKUP_DIR}/db.dump" | docker compose --project-directory "${STACK_DIR}" exec -T db \
  pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists

rm -rf "${STACK_DIR}/runtime-var"
mkdir -p "${STACK_DIR}/runtime-var"
tar -xzf "${BACKUP_DIR}/runtime-var.tar.gz" -C "${STACK_DIR}"

docker compose --project-directory "${STACK_DIR}" up -d app proxy

echo "restore_complete:${BACKUP_DIR}"
