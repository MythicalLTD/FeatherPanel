# FrankenPHP = Caddy + PHP in one (replaces nginx + php-fpm)
# PHP 8.5 variant when available; use php8.4 if the build fails
FROM dunglas/frankenphp:php8.5

# Set working directory (app lives here; Caddyfile serves from public/)
WORKDIR /var/www/html

# Set environment variables to avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV TERM=xterm

# Disable HTTPS in container (reverse proxy handles TLS)
ENV SERVER_NAME=:80

# Install system dependencies (no nginx; supervisor for frankenphp + cron)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y \
    git \
    curl \
    supervisor \
    mariadb-client \
    cron \
    && rm -rf /var/lib/apt/lists/*

# PHP extensions (match previous FPM setup: DB, Redis, GD, intl, etc.)
# install-php-extensions pulls build deps per extension
RUN install-php-extensions \
    pdo_mysql \
    pdo_pgsql \
    pgsql \
    mysqli \
    mbstring \
    gd \
    intl \
    bcmath \
    zip \
    redis

# Reset environment variables
ENV DEBIAN_FRONTEND=

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy only composer files first for better caching
COPY --chown=www-data:www-data composer.json composer.lock ./

# Install PHP dependencies with BuildKit cache mount
RUN --mount=type=cache,target=/root/.composer/cache \
    COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader --no-interaction

# Copy remaining application files with correct ownership
COPY --chown=www-data:www-data . .

# Custom PHP configuration (same limits as before)
RUN echo 'memory_limit = -1\n\
upload_max_filesize = 100M\n\
post_max_size = 100M\n\
max_execution_time = 300\n\
max_input_vars = 3000\n\
max_file_uploads = 20\n\
display_errors = Off\n\
expose_php = Off\n\
log_errors = On\n\
error_log = /var/log/php_errors.log\n\
allow_url_fopen = On\n\
date.timezone = UTC\n\
opcache.enable = 1\n\
opcache.memory_consumption = 128\n\
opcache.interned_strings_buffer = 8\n\
opcache.max_accelerated_files = 4000\n\
opcache.revalidate_freq = 2\n\
opcache.fast_shutdown = 1' > /usr/local/etc/php/conf.d/custom.ini

# Caddy/FrankenPHP configuration (replaces nginx.conf)
COPY Caddyfile /etc/caddy/Caddyfile

# Configure supervisor (frankenphp + cron only)
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create necessary directories
RUN mkdir -p /var/log/supervisor \
    && mkdir -p /var/www/html/storage/logs \
    && mkdir -p /var/www/html/storage/cache \
    && mkdir -p /var/www/html/storage/uploads \
    && mkdir -p /var/www/html/storage/temp \
    && mkdir -p /var/log/cron

# Copy and make init script executable
COPY init.sh /usr/local/bin/init.sh
RUN chmod +x /usr/local/bin/init.sh

# Create cron directory
RUN mkdir -p /var/spool/cron/crontabs \
    && mkdir -p /var/www/html/storage/cron

# Copy and make cron scripts executable
COPY setup-cron.sh /usr/local/bin/setup-cron.sh
RUN chmod +x /usr/local/bin/setup-cron.sh
COPY cron-runner.sh /usr/local/bin/cron-runner.sh
RUN chmod +x /usr/local/bin/cron-runner.sh

# Expose port 80
EXPOSE 80

# Start with init script (migrations, then supervisord runs frankenphp + cron)
CMD ["/usr/local/bin/init.sh"]
