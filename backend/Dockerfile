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

# Install system dependencies (no nginx; supervisor for frankenphp + cron, plus unzip for addons)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y \
    git \
    curl \
    zip \
    unzip \
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
    redis \
    ldap \ 
	bz2 \ 
	yaml \
	gmp \ 
	imagick \
	mongodb

# Reset environment variables
ENV DEBIAN_FRONTEND=

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy only composer files first for better caching
COPY --chown=www-data:www-data composer.json composer.lock ./

# Install PHP dependencies with BuildKit cache mount (retry on transient GitHub/Packagist 5xx)
RUN --mount=type=cache,target=/root/.composer/cache \
    export COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_PROCESS_TIMEOUT=600; \
    composer install --no-dev --optimize-autoloader --no-interaction \
    || (echo "composer install failed, retry 1/4..." && sleep 20 && composer install --no-dev --optimize-autoloader --no-interaction) \
    || (echo "composer install failed, retry 2/4..." && sleep 20 && composer install --no-dev --optimize-autoloader --no-interaction) \
    || (echo "composer install failed, retry 3/4..." && sleep 20 && composer install --no-dev --optimize-autoloader --no-interaction) \
    || (echo "composer install failed, retry 4/4..." && sleep 20 && composer install --no-dev --optimize-autoloader --no-interaction)

# Copy remaining application files with correct ownership
COPY --chown=www-data:www-data . .

# Custom PHP configuration (same limits as before)
# memory_limit stays unlimited for the CLI and cron; web requests get the
# bounded PHP_MEMORY_LIMIT from the Caddyfile (FrankenPHP php_ini).
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
realpath_cache_size = 4096K\n\
realpath_cache_ttl = 600\n\
opcache.enable = 1\n\
opcache.enable_cli = 0\n\
opcache.memory_consumption = 256\n\
opcache.interned_strings_buffer = 32\n\
opcache.max_accelerated_files = 20000\n\
opcache.validate_timestamps = 1\n\
opcache.revalidate_freq = 2' > /usr/local/etc/php/conf.d/custom.ini

# Web runtime defaults (see the Caddyfile header). FEATHERPANEL_WORKER_MODE=true
# switches /api/* to the FrankenPHP worker (boot/worker.php).
ENV PHP_MEMORY_LIMIT=512M \
    FRANKENPHP_MAX_THREADS=auto \
    FRANKENPHP_MAX_WAIT_TIME=30s \
    FEATHERPANEL_WORKER_MODE=false \
    FEATHERPANEL_WORKER_MAX_REQUESTS=1000

# Caddy/FrankenPHP configuration (replaces nginx.conf)
COPY Caddyfile /etc/caddy/Caddyfile
COPY caddy/ /etc/caddy/caddy/

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

# Liveness: PHP answers and the database is reachable (start period covers
# composer install and migrations in init.sh).
HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=5 \
    CMD curl -fsS -o /dev/null http://127.0.0.1/api/system/health || exit 1

# Start with init script (migrations, then supervisord runs frankenphp + cron)
CMD ["/usr/local/bin/init.sh"]
