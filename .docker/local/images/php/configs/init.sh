#!/bin/sh
set -e

if [ -f /var/www/html/artisan ]; then
  mkdir -p \
    /var/www/html/bootstrap/cache \
    /var/www/html/storage/database \
    /var/www/html/storage/framework/cache/data \
    /var/www/html/storage/framework/sessions \
    /var/www/html/storage/framework/testing \
    /var/www/html/storage/framework/views \
    /var/www/html/storage/logs

  if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
    DB_FILE="${DB_DATABASE:-storage/database/monsterindex.sqlite}"
    case "$DB_FILE" in
      /*) ;;
      *) DB_FILE="/var/www/html/${DB_FILE#./}" ;;
    esac
    mkdir -p "$(dirname "$DB_FILE")"
    touch "$DB_FILE"
  fi

  php /var/www/html/artisan config:clear >/dev/null 2>&1 || true
fi

exec php-fpm
