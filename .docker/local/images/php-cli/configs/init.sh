#!/bin/sh
set -e

role=${CONTAINER_ROLE:-queue}

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
