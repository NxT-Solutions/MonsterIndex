#!/usr/bin/env bash

DOCKER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$DOCKER_DIR/../.." && pwd)"
COMPOSE_FILE="$DOCKER_DIR/compose.yaml"
ENV_FILE="$DOCKER_DIR/.env"

compose_cmd() {
  (cd "$PROJECT_ROOT" && docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@")
}

dartisan() {
  compose_cmd exec php php /var/www/html/artisan "$@"
}

dcomposer() {
  compose_cmd exec php composer "$@"
}

dnpm() {
  compose_cmd run --rm node npm "$@"
}

devite() {
  compose_cmd run --rm --service-ports node npm run dev -- --host 0.0.0.0 --port 5173
}

dup() {
  compose_cmd up -d --build
}

ddown() {
  compose_cmd down
}

dlogs() {
  compose_cmd logs -f "$@"
}

echo "Loaded MonsterIndex docker helpers: dup, ddown, dlogs, dartisan, dcomposer, dnpm, devite"
