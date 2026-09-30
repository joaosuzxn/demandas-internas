# Contexto de build: raiz do repositório (ver compose.*.yml)

FROM php:8.4-fpm-alpine AS base
COPY --from=mlocati/php-extension-installer:latest /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions pdo_pgsql intl zip bcmath opcache
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /var/www/api

# ---------- dev: o código vem por bind mount (compose.dev.yml) ----------
FROM base AS dev
COPY docker/php/entrypoint.dev.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]

# ---------- vendor: dependências de produção + código ----------
FROM base AS vendor
COPY api/composer.json api/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY api/ ./
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev

# ---------- prod: código dentro da imagem, somente leitura (compose.prod.yml) ----------
FROM base AS prod
# php.ini de produção: display_errors Off, log_errors On (sem ele o PHP mostra erro na resposta)
RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY docker/php/prod.ini "$PHP_INI_DIR/conf.d/zz-prod.ini"
COPY --from=vendor --chown=www-data:www-data /var/www/api /var/www/api
COPY docker/php/entrypoint.prod.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && rm /usr/local/bin/composer
USER www-data
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
