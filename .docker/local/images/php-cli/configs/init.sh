#!/bin/sh
set -e

role=${CONTAINER_ROLE:-queue}

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
fi

if [ "$role" = "queue" ]; then
  while true; do
    php /var/www/html/artisan queue:work --verbose --tries=3 --timeout=120 --sleep=1 --max-jobs=250 --max-time=1800
    sleep 1
  done
elif [ "$role" = "scheduler" ]; then
  while true; do
    php /var/www/html/artisan schedule:run --verbose --no-interaction
    sleep 60
  done
else
  echo "Unknown CONTAINER_ROLE=$role"
  exit 1
fi
