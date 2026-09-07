# ── Base: PHP 8.3 FPM ────────────────────────────────────────
FROM php:8.3-fpm-alpine AS base

# System dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    unzip \
    libpng-dev \
    libjpeg-turbo-dev \
    libwebp-dev \
    freetype-dev \
    libzip-dev \
    oniguruma-dev \
    icu-dev \
    linux-headers \
    $PHPIZE_DEPS

# PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
 && docker-php-ext-install \
    pdo_mysql \
    mbstring \
    zip \
    exif \
    bcmath \
    gd \
    intl \
    opcache \
    pcntl

# Redis extension (via PECL)
RUN pecl install redis && docker-php-ext-enable redis

# Composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# ── Dev stage ────────────────────────────────────────────────
FROM base AS dev

# Dev php.ini
COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-custom.ini
COPY docker/php/www.conf /usr/local/etc/php-fpm.d/www.conf

# Install dependencies first (cache layer)
COPY composer.json composer.lock* ./
RUN composer install --no-scripts --no-autoloader --no-interaction --prefer-dist 2>/dev/null || true

# Copy source
COPY . .

# Composer autoload (only if vendor exists)
RUN [ -d vendor ] && composer dump-autoload --optimize || true

# Permissions
RUN chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

EXPOSE 9000
CMD ["php-fpm"]

# ── Production stage ─────────────────────────────────────────
FROM base AS production

COPY docker/php/php-prod.ini /usr/local/etc/php/conf.d/99-custom.ini
COPY docker/php/www.conf /usr/local/etc/php-fpm.d/www.conf

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction \
    --no-scripts \
    --prefer-dist

COPY . .

RUN composer dump-autoload --optimize \
 && chown -R www-data:www-data storage bootstrap/cache \
 && php artisan config:cache \
 && php artisan route:cache \
 && php artisan view:cache

EXPOSE 9000
CMD ["php-fpm"]
