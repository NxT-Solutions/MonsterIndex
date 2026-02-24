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
for helper_name in compose_cmd dartisan dcomposer dnpm devite dup ddown dlogs dfresh; do
  unalias "$helper_name" >/dev/null 2>&1 || true
done

function compose_cmd {
  (cd "$PROJECT_ROOT" && docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@")
}

function dartisan {
  compose_cmd exec php php /var/www/html/artisan "$@"
}

function dfresh {
  local restart_services=()
  local running_services
  local exit_code=0

  running_services="$(compose_cmd ps --status running --services 2>/dev/null || true)"

  for service_name in queue scheduler; do
    if printf '%s\n' "$running_services" | grep -Fxq "$service_name"; then
      restart_services+=("$service_name")
    fi
  done

  if [ "${#restart_services[@]}" -gt 0 ]; then
    compose_cmd stop "${restart_services[@]}" >/dev/null
  fi

  compose_cmd exec php php /var/www/html/artisan migrate:fresh --seed "$@" || exit_code=$?

  if [ "${#restart_services[@]}" -gt 0 ]; then
    compose_cmd up -d "${restart_services[@]}" >/dev/null
  fi

  return "$exit_code"
}

function dcomposer {
  compose_cmd exec php composer "$@"
}

function dnpm {
  compose_cmd exec node npm "$@"
}

function devite {
  compose_cmd up -d node
  compose_cmd logs -f node
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

echo "Loaded MonsterIndex docker helpers: dup, ddown, dlogs, dartisan, dfresh, dcomposer, dnpm, devite"
