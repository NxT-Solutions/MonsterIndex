# syntax=docker/dockerfile:1.7

FROM php:8.4-fpm-alpine AS base

ENV BUN_INSTALL=/usr/local/bun
ENV PATH="${BUN_INSTALL}/bin:${PATH}"

RUN apk add --no-cache \
    bash \
    chromium \
    curl \
    git \
    icu-dev \
    libzip-dev \
    nginx \
    nodejs \
    oniguruma-dev \
    sqlite \
    su-exec \
    unzip

RUN curl -fsSL https://bun.sh/install | bash \
    && ln -sf "${BUN_INSTALL}/bin/bun" /usr/local/bin/bun

ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

RUN install-php-extensions pdo_mysql pdo_sqlite sqlite3 zip exif pcntl intl opcache bcmath @composer

WORKDIR /var/www/html

FROM base AS build

ENV APP_ENV=production
ENV APP_DEBUG=false
ENV APP_URL=https://monster.cheapest.promo
ENV CACHE_STORE=file
ENV DB_CONNECTION=sqlite
ENV DB_DATABASE=/tmp/monsterindex-build.sqlite
ENV QUEUE_CONNECTION=sync
ENV SESSION_DRIVER=file

COPY codebase/ /var/www/html/

RUN APP_KEY=base64:0/86JhZpPi2WqyHvw6vKbLW17gSmHrxP/mw26Pjvc0M= \
    cp .env.production .env \
    && touch /tmp/monsterindex-build.sqlite \
    && composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader \
    && bun install --frozen-lockfile \
    && bun run build \
    && rm .env

FROM base AS runtime

COPY codebase/ /var/www/html/
COPY --from=build /var/www/html/vendor /var/www/html/vendor
COPY --from=build /var/www/html/public/build /var/www/html/public/build

RUN bun install --frozen-lockfile --production

RUN --mount=type=secret,id=runtime_env,target=/run/secrets/runtime_env \
    install -m 0644 /run/secrets/runtime_env /var/www/html/.env.production \
    && cp /var/www/html/.env.production /var/www/html/.env \
    && chmod 0644 /var/www/html/.env

COPY .docker/production/images/configs/nginx/nginx.conf /etc/nginx/nginx.conf
COPY .docker/production/images/configs/php/app.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY .docker/production/images/configs/php/opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini
COPY .docker/production/images/configs/app/entrypoint.sh /usr/local/bin/monsterindex-entrypoint
COPY .docker/production/images/configs/app/post-deploy.sh /usr/local/bin/monsterindex-post-deploy

RUN chmod +x /usr/local/bin/monsterindex-entrypoint /usr/local/bin/monsterindex-post-deploy \
    && install -d -m 0775 \
      /run/nginx \
      /var/lib/nginx/tmp/client_body \
      /var/www/html/bootstrap/cache \
      /var/www/html/storage/app/public \
      /var/www/html/storage/database \
      /var/www/html/storage/framework/cache/data \
      /var/www/html/storage/framework/sessions \
      /var/www/html/storage/framework/testing \
      /var/www/html/storage/framework/views \
      /var/www/html/storage/logs

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/monsterindex-entrypoint"]
