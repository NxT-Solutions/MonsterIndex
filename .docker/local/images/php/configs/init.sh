#!/bin/sh
set -e

if [ -f /var/www/html/artisan ]; then
  mkdir -p \
    /var/www/html/bootstrap/cache \
    /var/www/html/storage/framework/cache/data \
    /var/www/html/storage/framework/sessions \
    /var/www/html/storage/framework/testing \
    /var/www/html/storage/framework/views \
    /var/www/html/storage/logs

  php /var/www/html/artisan config:clear >/dev/null 2>&1 || true
fi

exec php-fpm
