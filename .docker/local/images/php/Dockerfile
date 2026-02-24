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
    unzip

ENV BUN_INSTALL=/usr/local/bun
ENV PATH="${BUN_INSTALL}/bin:${PATH}"

RUN curl -fsSL https://bun.sh/install | bash \
    && ln -sf "${BUN_INSTALL}/bin/bun" /usr/local/bin/bun \
    && bun --version

ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

RUN install-php-extensions pdo_mysql pdo_sqlite sqlite3 zip exif pcntl intl redis opcache bcmath @composer

ADD ./configs/opcache.ini /usr/local/etc/php/conf.d/opcache.ini
ADD ./configs/init.sh /init.sh

RUN chmod +x /init.sh

ENTRYPOINT ["/init.sh"]
