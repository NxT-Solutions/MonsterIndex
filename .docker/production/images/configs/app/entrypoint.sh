#!/usr/bin/env bash
set -euo pipefail

cd /var/www/html

if [ -f .env.production ]; then
  cp .env.production .env
fi

mkdir -p \
  bootstrap/cache \
  storage/app/public \
  storage/database \
  storage/framework/cache/data \
  storage/framework/sessions \
  storage/framework/testing \
  storage/framework/views \
  storage/logs

if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
  db_file="${DB_DATABASE:-storage/database/monsterindex.sqlite}"

  case "$db_file" in
    /*) ;;
    *) db_file="/var/www/html/${db_file#./}" ;;
  esac

  mkdir -p "$(dirname "$db_file")"
  touch "$db_file"
fi

role="${APP_RUNTIME_ROLE:-web}"

case "$role" in
  web)
    if [ "${RUN_POST_DEPLOY_ON_BOOT:-false}" = "true" ]; then
      /usr/local/bin/monsterindex-post-deploy
    fi

    php-fpm -F &
    php_pid=$!

    nginx -g 'daemon off;' &
    nginx_pid=$!

    trap 'kill "$php_pid" "$nginx_pid" 2>/dev/null || true' EXIT
    wait -n "$php_pid" "$nginx_pid"
    ;;
  queue)
    while true; do
      php artisan queue:work --verbose --tries=3 --timeout=120 --sleep=1 --max-jobs=250 --max-time=1800
      sleep 1
    done
    ;;
  scheduler)
    while true; do
      php artisan schedule:run --verbose --no-interaction
      sleep 60
    done
    ;;
  post-deploy)
    exec /usr/local/bin/monsterindex-post-deploy
    ;;
  *)
    printf 'Unknown APP_RUNTIME_ROLE=%s\n' "$role" >&2
    exit 1
    ;;
esac
