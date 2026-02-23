#!/bin/sh
set -e

if [ -f /var/www/html/artisan ]; then
  php /var/www/html/artisan config:clear >/dev/null 2>&1 || true
fi

exec php-fpm
