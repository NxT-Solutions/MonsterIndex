ARG PHP_VERSION=8.4

FROM php:${PHP_VERSION}-fpm-alpine

RUN apk --no-cache update && apk --no-cache add \
    bash \
    curl \
    git \
    icu-dev \
    libzip-dev \
    oniguruma-dev \
    nodejs \
    npm

ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

RUN install-php-extensions pdo_mysql zip exif pcntl intl redis opcache bcmath @composer

ADD ./configs/opcache.ini /usr/local/etc/php/conf.d/opcache.ini
ADD ./configs/init.sh /init.sh

RUN chmod +x /init.sh

ENTRYPOINT ["/init.sh"]
