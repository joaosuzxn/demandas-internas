#!/bin/sh
set -e

cd /var/www/api

php artisan migrate --force
php artisan db:seed --force

# Caches gerados na subida (bootstrap/cache é tmpfs): refletem o ambiente deste container.
php artisan config:cache
php artisan route:cache
php artisan view:cache

exec "$@"
