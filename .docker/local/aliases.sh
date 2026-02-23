#!/usr/bin/env bash

if [ -n "${ZSH_VERSION:-}" ]; then
  SCRIPT_SOURCE="$(eval 'echo ${(%):-%x}')"
else
  SCRIPT_SOURCE="${BASH_SOURCE[0]}"
fi

DOCKER_DIR="$(cd "$(dirname "$SCRIPT_SOURCE")" && pwd)"
PROJECT_ROOT="$(cd "$DOCKER_DIR/../.." && pwd)"
COMPOSE_FILE="$DOCKER_DIR/compose.yaml"
ENV_FILE="$DOCKER_DIR/.env"

# Avoid zsh alias collisions when these helper names already exist.
for helper_name in compose_cmd dartisan dcomposer dnpm devite dup ddown dlogs; do
  unalias "$helper_name" >/dev/null 2>&1 || true
done

function compose_cmd {
  (cd "$PROJECT_ROOT" && docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@")
}

function dartisan {
  compose_cmd exec php php /var/www/html/artisan "$@"
}

function dcomposer {
  compose_cmd exec php composer "$@"
}

function dnpm {
  compose_cmd run --rm node npm "$@"
}

function devite {
  compose_cmd run --rm --service-ports node npm run dev -- --host 0.0.0.0 --port 5173
}

function dup {
  compose_cmd up -d --build
}

function ddown {
  compose_cmd down
}

function dlogs {
  compose_cmd logs -f "$@"
}

echo "Loaded MonsterIndex docker helpers: dup, ddown, dlogs, dartisan, dcomposer, dnpm, devite"
