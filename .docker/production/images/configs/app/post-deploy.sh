#!/usr/bin/env bash
set -euo pipefail

cd /var/www/html

app_user="${APP_RUNTIME_USER:-www-data}"
app_group="${APP_RUNTIME_GROUP:-www-data}"

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

php artisan down --retry=60 || true
trap 'php artisan up || true' EXIT

php artisan migrate --force
php artisan storage:link || true
php artisan optimize:clear
php artisan optimize
