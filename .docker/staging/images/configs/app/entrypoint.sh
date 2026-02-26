#!/bin/sh
set -eu

role="${CONTAINER_ROLE:-app}"
app_dir="/var/www/html"

if [ -f "${app_dir}/artisan" ]; then
  mkdir -p \
    "${app_dir}/bootstrap/cache" \
    "${app_dir}/storage/database" \
    "${app_dir}/storage/framework/cache/data" \
    "${app_dir}/storage/framework/sessions" \
    "${app_dir}/storage/framework/testing" \
    "${app_dir}/storage/framework/views" \
    "${app_dir}/storage/logs"

  if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
    db_file="${DB_DATABASE:-${app_dir}/storage/database/monsterindex.sqlite}"

    case "$db_file" in
      /*) ;;
      *) db_file="${app_dir}/${db_file#./}" ;;
    esac

    mkdir -p "$(dirname "$db_file")"
    touch "$db_file"
  fi

  chown -R www-data:www-data "${app_dir}/storage" "${app_dir}/bootstrap/cache" || true
fi

case "$role" in
  app)
    exec php-fpm -F
    ;;
  queue)
    while true; do
      php "${app_dir}/artisan" queue:work --verbose --tries=3 --timeout=120 --sleep=1 --max-jobs=250 --max-time=1800
      sleep 1
    done
    ;;
  scheduler)
    while true; do
      php "${app_dir}/artisan" schedule:run --verbose --no-interaction
      sleep 60
    done
    ;;
  *)
    echo "Unknown CONTAINER_ROLE=${role}" >&2
    exit 1
    ;;
esac
