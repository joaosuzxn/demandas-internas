#!/bin/sh
set -e

cd /var/www/api

# Sempre: é idempotente e rápido, e pega dependência nova depois de um pull.
composer install --no-interaction --prefer-dist

php artisan migrate --force

exec "$@"
