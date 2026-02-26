# syntax=docker/dockerfile:1.7

ARG BUN_VERSION=1.2.17
ARG PHP_VERSION=8.4

FROM oven/bun:${BUN_VERSION}-alpine AS frontend-build
WORKDIR /var/www/html

COPY codebase/package.json codebase/bun.lock ./
RUN bun install --frozen-lockfile

COPY codebase/ ./
RUN bun run build

FROM php:${PHP_VERSION}-fpm-alpine AS php-base
ENV COMPOSER_ALLOW_SUPERUSER=1
WORKDIR /var/www/html

RUN apk --no-cache update && apk --no-cache add \
    bash \
    curl \
    git \
    icu-dev \
    libzip-dev \
    oniguruma-dev \
    unzip

ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

RUN install-php-extensions pdo_mysql pdo_sqlite sqlite3 zip exif pcntl intl redis opcache bcmath @composer

FROM php-base AS vendor-build
WORKDIR /var/www/html

COPY codebase/composer.json codebase/composer.lock ./
RUN composer install --prefer-dist --no-interaction --no-progress --optimize-autoloader --no-scripts

COPY codebase/ ./
RUN rm -f bootstrap/cache/*.php \
    && php artisan package:discover --ansi \
    && composer dump-autoload --optimize --classmap-authoritative

FROM php-base AS app
WORKDIR /var/www/html

COPY --from=vendor-build /var/www/html /var/www/html
COPY --from=frontend-build /var/www/html/public/build /var/www/html/public/build

COPY .docker/staging/images/configs/php/app.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY .docker/staging/images/configs/php/opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini
COPY .docker/staging/images/configs/app/entrypoint.sh /usr/local/bin/entrypoint

RUN chmod +x /usr/local/bin/entrypoint \
    && mkdir -p \
      /var/www/html/storage/database \
      /var/www/html/storage/framework/cache/data \
      /var/www/html/storage/framework/sessions \
      /var/www/html/storage/framework/testing \
      /var/www/html/storage/framework/views \
      /var/www/html/storage/logs \
      /var/www/html/bootstrap/cache \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

ENTRYPOINT ["/usr/local/bin/entrypoint"]

FROM nginx:1.27-alpine AS web
WORKDIR /var/www/html

COPY codebase/public /var/www/html/public
COPY --from=frontend-build /var/www/html/public/build /var/www/html/public/build
COPY .docker/staging/images/configs/nginx/nginx.conf /etc/nginx/nginx.conf
