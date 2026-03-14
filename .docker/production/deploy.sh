#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

: "${MONSTER_INDEX_IMAGE:?MONSTER_INDEX_IMAGE must be set}"

export MONSTER_INDEX_IMAGE

docker compose -f compose.yaml pull
docker compose -f compose.yaml stop monster-index-queue monster-index-scheduler >/dev/null 2>&1 || true
docker compose -f compose.yaml up -d --remove-orphans monster-index

for attempt in $(seq 1 30); do
  if docker compose -f compose.yaml ps --status running --services | grep -qx "monster-index"; then
    break
  fi

  sleep 2
done

docker compose -f compose.yaml exec -T monster-index /usr/local/bin/monsterindex-post-deploy
docker compose -f compose.yaml up -d --remove-orphans monster-index-queue monster-index-scheduler
