#!/bin/sh
set -e

cd /var/www/api

php artisan migrate --force
php artisan db:seed --force

# Caches gerados na subida (bootstrap/cache é tmpfs): refletem o ambiente deste container.
# Sem view:cache: a API não tem views Blade (resources/views não existe).
php artisan config:cache
php artisan route:cache

exec "$@"
