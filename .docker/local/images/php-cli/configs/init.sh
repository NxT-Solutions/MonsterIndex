#!/bin/sh
set -e

role=${CONTAINER_ROLE:-queue}

if [ -f /var/www/html/artisan ]; then
  mkdir -p \
    /var/www/html/bootstrap/cache \
    /var/www/html/storage/framework/cache/data \
    /var/www/html/storage/framework/sessions \
    /var/www/html/storage/framework/testing \
    /var/www/html/storage/framework/views \
    /var/www/html/storage/logs
fi

if [ "$role" = "queue" ]; then
  php /var/www/html/artisan queue:work --verbose --tries=3 --timeout=120
elif [ "$role" = "scheduler" ]; then
  while true; do
    php /var/www/html/artisan schedule:run --verbose --no-interaction
    sleep 60
  done
else
  echo "Unknown CONTAINER_ROLE=$role"
  exit 1
fi
