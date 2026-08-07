#!/bin/bash

# Ensure storage/.env matches container networking and generate encryption key if missing
ENV_FILE="/var/www/html/storage/config/.env"
mkdir -p /var/www/html/storage/config

generate_encryption_key() {
	head -c 32 /dev/urandom | base64
}

if [ -f "$ENV_FILE" ]; then
	# Update existing keys or append if missing
	grep -q '^REDIS_HOST=' "$ENV_FILE" && sed -i 's/^REDIS_HOST=.*/REDIS_HOST=redis/' "$ENV_FILE" || echo 'REDIS_HOST=redis' >>"$ENV_FILE"
	[ -n "$REDIS_PASSWORD" ] && (grep -q '^REDIS_PASSWORD=' "$ENV_FILE" && sed -i "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=${REDIS_PASSWORD}/" "$ENV_FILE" || echo "REDIS_PASSWORD=${REDIS_PASSWORD}" >>"$ENV_FILE")
	grep -q '^DATABASE_HOST=' "$ENV_FILE" && sed -i 's/^DATABASE_HOST=.*/DATABASE_HOST=mysql/' "$ENV_FILE" || echo 'DATABASE_HOST=mysql' >>"$ENV_FILE"
	grep -q '^DATABASE_PORT=' "$ENV_FILE" && sed -i 's/^DATABASE_PORT=.*/DATABASE_PORT=3306/' "$ENV_FILE" || echo 'DATABASE_PORT=3306' >>"$ENV_FILE"
	[ -n "$DATABASE_DATABASE" ] && (grep -q '^DATABASE_DATABASE=' "$ENV_FILE" && sed -i "s/^DATABASE_DATABASE=.*/DATABASE_DATABASE=${DATABASE_DATABASE}/" "$ENV_FILE" || echo "DATABASE_DATABASE=${DATABASE_DATABASE}" >>"$ENV_FILE")
	[ -n "$DATABASE_USER" ] && (grep -q '^DATABASE_USER=' "$ENV_FILE" && sed -i "s/^DATABASE_USER=.*/DATABASE_USER=${DATABASE_USER}/" "$ENV_FILE" || echo "DATABASE_USER=${DATABASE_USER}" >>"$ENV_FILE")
	[ -n "$DATABASE_PASSWORD" ] && (grep -q '^DATABASE_PASSWORD=' "$ENV_FILE" && sed -i "s/^DATABASE_PASSWORD=.*/DATABASE_PASSWORD=${DATABASE_PASSWORD}/" "$ENV_FILE" || echo "DATABASE_PASSWORD=${DATABASE_PASSWORD}" >>"$ENV_FILE")
	# Ensure DATABASE_ENCRYPTION is set
	grep -q '^DATABASE_ENCRYPTION=' "$ENV_FILE" && sed -i 's/^DATABASE_ENCRYPTION=.*/DATABASE_ENCRYPTION="xchacha20"/' "$ENV_FILE" || echo 'DATABASE_ENCRYPTION="xchacha20"' >>"$ENV_FILE"
	# Ensure DATABASE_ENCRYPTION_KEY is set
	if grep -q '^DATABASE_ENCRYPTION_KEY=' "$ENV_FILE"; then
		# If the key is empty, generate a new one
		if [ -z "$(grep '^DATABASE_ENCRYPTION_KEY=' "$ENV_FILE" | cut -d'=' -f2-)" ]; then
			ENC_KEY=$(generate_encryption_key)
			sed -i "s|^DATABASE_ENCRYPTION_KEY=.*|DATABASE_ENCRYPTION_KEY=\"$ENC_KEY\"|" "$ENV_FILE"
		fi
	else
		ENC_KEY=$(generate_encryption_key)
		echo "DATABASE_ENCRYPTION_KEY=\"$ENC_KEY\"" >>"$ENV_FILE"
	fi
else
	ENC_KEY=$(generate_encryption_key)
	cat >"$ENV_FILE" <<EOF
DATABASE_HOST=mysql
DATABASE_PORT=3306
DATABASE_DATABASE=${DATABASE_DATABASE:-featherpanel}
DATABASE_USER=${DATABASE_USER:-featherpanel}
DATABASE_PASSWORD=${DATABASE_PASSWORD:-featherpanel_password}
DATABASE_ENCRYPTION="xchacha20"
DATABASE_ENCRYPTION_KEY="$ENC_KEY"
REDIS_HOST=redis
REDIS_PASSWORD=${REDIS_PASSWORD:-featherpanel_redis}
EOF
fi

# Brief TCP wait (no auth)
echo "Waiting for MariaDB (tcp://mysql:3306) to be reachable..."
max_attempts=10
attempt=0
while [ $attempt -lt $max_attempts ]; do
	if bash -c "</dev/tcp/mysql/3306" 2>/dev/null; then
		echo "MariaDB TCP is reachable!"
		break
	fi
	attempt=$((attempt + 1))
	echo "MariaDB not reachable yet. Waiting... (attempt $attempt/$max_attempts)"
	sleep 3
done

# Make sure composer packages are installed
echo "Installing composer packages..."
COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader
composer_exit_code=$?
if [ $composer_exit_code -ne 0 ]; then
	echo "Composer packages failed with exit code $composer_exit_code"
	exit $composer_exit_code
fi
echo "Composer packages installed."

# Run migrations
echo "Running migrations..."
php /var/www/html/cli migrate
migration_exit_code=$?
if [ $migration_exit_code -ne 0 ]; then
	echo "Migrations failed with exit code $migration_exit_code"
	exit $migration_exit_code
fi
echo "Migrations finished."

#echo "Setting up ownership and permissions..."
#echo "Please note that this may take a while..."
#
#chown -R www-data:www-data /var/www/html
#chmod -R 777 /var/www/html
#echo "Ownership and permissions set."

# Set ownership and permissions (first run only, and only where needed)

# Regenerate addon public symlinks from storage/addons (deterministic on every boot)
# Source of truth is storage/addons (persisted via volume); public/addons and
# public/components are derived state and live inside the image layer, so we
# rebuild them here to guarantee they match disk reality after every restart
# or panel image upgrade.
echo "Resyncing addon public symlinks..."
ADDONS_DIR="/var/www/html/storage/addons"
PUBLIC_ADDONS="/var/www/html/public/addons"
PUBLIC_COMPONENTS="/var/www/html/public/components"

mkdir -p "$PUBLIC_ADDONS" "$PUBLIC_COMPONENTS"

find "$PUBLIC_ADDONS" -mindepth 1 -maxdepth 1 ! -name '.gitkeep' -exec rm -rf {} + 2>/dev/null || true
find "$PUBLIC_COMPONENTS" -mindepth 1 -maxdepth 1 ! -name '.gitkeep' -exec rm -rf {} + 2>/dev/null || true

if [ -d "$ADDONS_DIR" ]; then
	for addon_path in "$ADDONS_DIR"/*/; do
		[ -d "$addon_path" ] || continue
		id="$(basename "$addon_path")"
		case "$id" in
			.|..|'') continue ;;
		esac

		if [ -d "${addon_path}Public" ]; then
			ln -s "${addon_path%/}/Public" "$PUBLIC_ADDONS/$id" 2>/dev/null || true
		fi
		if [ -d "${addon_path}Frontend/Components" ]; then
			ln -s "${addon_path%/}/Frontend/Components" "$PUBLIC_COMPONENTS/$id" 2>/dev/null || true
		fi
	done
fi

chown -R www-data:www-data "$PUBLIC_ADDONS" "$PUBLIC_COMPONENTS" 2>/dev/null || true
echo "Addon symlinks resynced."

# Restore phpMyAdmin if it was installed before an image recreate wiped public/pma
echo "Ensuring phpMyAdmin installation..."
if php /var/www/html/cli module ensure pma; then
	echo "phpMyAdmin ensure completed."
else
	echo "phpMyAdmin ensure skipped."
fi

# Setup cron jobs (fallback method)
echo "Setting up cron jobs..."
/usr/local/bin/setup-cron.sh
echo "Cron jobs setup completed."

# Note: The main cron execution will be handled by supervisord using cron-runner.sh

echo ""
echo "🚀 FeatherPanel Docker is ready to work! 🚀"
echo ""

# Start FrankenPHP (Caddy + PHP) and cron via supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
