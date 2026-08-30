<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

namespace App\Helpers;

/**
 * Bundled WebPlate catalog.
 *
 * Stable UUIDs so migrate/seed can upsert without breaking webspace FKs.
 * Only rows that still have author = "system" are overwritten — fork a plate
 * (change author) to keep local customizations.
 */
final class WebPlateDefaults
{
    public const AUTHOR = 'system';

    public const UUID_STATIC = 'f0a7e001-0001-4000-8000-000000000001';
    public const UUID_PHP_83 = 'f0a7e001-0001-4000-8000-000000000002';
    public const UUID_NODE_20 = 'f0a7e001-0001-4000-8000-000000000003';
    public const UUID_PYTHON_312 = 'f0a7e001-0001-4000-8000-000000000004';
    public const UUID_PHP_84 = 'f0a7e001-0001-4000-8000-000000000005';
    public const UUID_PHP_85 = 'f0a7e001-0001-4000-8000-000000000006';
    public const UUID_WORDPRESS = 'f0a7e001-0001-4000-8000-000000000007';
    public const UUID_LARAVEL = 'f0a7e001-0001-4000-8000-000000000008';
    public const UUID_NODE_22 = 'f0a7e001-0001-4000-8000-000000000009';
    public const UUID_BUN = 'f0a7e001-0001-4000-8000-00000000000a';
    public const UUID_NEXTJS = 'f0a7e001-0001-4000-8000-00000000000b';
    public const UUID_FASTAPI = 'f0a7e001-0001-4000-8000-00000000000c';
    public const UUID_DENO = 'f0a7e001-0001-4000-8000-00000000000d';
    public const UUID_WHMCS = 'f0a7e001-0001-4000-8000-00000000000e';
    public const UUID_JOOMLA = 'f0a7e001-0001-4000-8000-00000000000f';
    public const UUID_DRUPAL = 'f0a7e001-0001-4000-8000-000000000010';
    public const UUID_ASTRO = 'f0a7e001-0001-4000-8000-000000000011';
    public const UUID_PYTHON_313 = 'f0a7e001-0001-4000-8000-000000000012';

    /** @deprecated Use UUID_PHP_83 */
    public const UUID_PHP = self::UUID_PHP_83;

    /** @deprecated Use UUID_NODE_20 */
    public const UUID_NODE = self::UUID_NODE_20;

    /** @deprecated Use UUID_PYTHON_312 */
    public const UUID_PYTHON = self::UUID_PYTHON_312;

    /**
     * @return list<array<string, mixed>>
     */
    public static function definitions(): array
    {
        return [
            self::staticHtml(),
            self::phpApache(self::UUID_PHP_83, '8.3'),
            self::phpApache(self::UUID_PHP_84, '8.4'),
            self::phpApache(self::UUID_PHP_85, '8.5'),
            self::wordpress(),
            self::laravel(),
            self::whmcs(),
            self::joomla(),
            self::drupal(),
            self::nodeLts(self::UUID_NODE_20, '20', 'node:20-bookworm-slim'),
            self::nodeLts(self::UUID_NODE_22, '22', 'node:22-bookworm-slim'),
            self::bun(),
            self::nextJs(),
            self::astro(),
            self::deno(),
            self::pythonHttp(self::UUID_PYTHON_312, '3.12', 'python:3.12-slim'),
            self::pythonHttp(self::UUID_PYTHON_313, '3.13', 'python:3.13-slim'),
            self::fastapi(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function base(
        string $uuid,
        string $name,
        string $description,
        string $runtime,
        string $dockerImage,
        string $documentRoot,
        string $startup,
        int $containerPort,
        string $scriptContainer,
        string $scriptEntry,
        string $scriptInstall,
        array $defaultSchedules = [],
    ): array {
        return [
            'uuid' => $uuid,
            'author' => self::AUTHOR,
            'name' => $name,
            'description' => $description,
            'runtime' => $runtime,
            'docker_image' => $dockerImage,
            'document_root' => $documentRoot,
            'startup' => $startup,
            'container_port' => $containerPort,
            'script_container' => $scriptContainer,
            'script_entry' => $scriptEntry,
            'script_install' => $scriptInstall,
            'default_schedules' => $defaultSchedules,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function schedule(
        string $name,
        string $minute,
        string $hour,
        string $action,
        string $payload,
    ): array {
        return [
            'name' => $name,
            'cron_minute' => $minute,
            'cron_hour' => $hour,
            'cron_day_of_month' => '*',
            'cron_month' => '*',
            'cron_day_of_week' => '*',
            'timezone' => 'UTC',
            'is_active' => true,
            'is_locked' => true,
            'tasks' => [
                [
                    'action' => $action,
                    'payload' => $payload,
                    'sequence_id' => 1,
                    'time_offset' => 0,
                    'continue_on_failure' => false,
                ],
            ],
        ];
    }

    /** @return array<string, mixed> */
    private static function staticHtml(): array
    {
        return self::base(
            self::UUID_STATIC,
            'Static HTML',
            'Serve static files (HTML/CSS/JS) from the WebSpace root via the reverse proxy. No runtime container.',
            'static',
            '',
            '',
            '',
            0,
            'alpine:3.20',
            'ash',
            <<<'SH'
#!/bin/ash
set -e
cd /mnt/server
if [ ! -f index.html ]; then
  cat > index.html <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome</title>
</head>
<body>
  <h1>Static site ready</h1>
  <p>Upload your files into this WebSpace.</p>
</body>
</html>
EOF
fi
echo "Static WebPlate install complete."
SH,
        );
    }

    /** @return array<string, mixed> */
    private static function phpApache(string $uuid, string $version): array
    {
        return self::base(
            $uuid,
            "PHP {$version}",
            "PHP {$version} with Apache. Document root is the WebSpace root (/var/www/html).",
            'php',
            "php:{$version}-apache",
            '',
            '',
            80,
            "php:{$version}-cli",
            'bash',
            <<<SH
#!/bin/bash
set -e
cd /mnt/server
if [ ! -f index.php ]; then
  cat > index.php <<'EOF'
<?php
header('Content-Type: text/html; charset=utf-8');
?><!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PHP ready</title>
</head>
<body>
  <h1>PHP <?= PHP_VERSION ?> is running</h1>
  <p>Replace <code>index.php</code> with your application.</p>
</body>
</html>
EOF
fi
if [ -f composer.json ]; then
  if ! command -v composer >/dev/null 2>&1; then
    php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
    php composer-setup.php --install-dir=/usr/local/bin --filename=composer || true
    rm -f composer-setup.php
  fi
  composer install --no-interaction --prefer-dist || true
fi
echo "PHP {$version} WebPlate install complete."
SH,
        );
    }

    /** @return array<string, mixed> */
    private static function wordpress(): array
    {
        return self::base(
            self::UUID_WORDPRESS,
            'WordPress',
            'WordPress on PHP 8.3 + Apache. Downloads the latest WordPress release on install. Attach a MySQL database from the panel, then finish setup in the browser.',
            'php',
            'php:8.3-apache',
            '',
            '',
            80,
            'php:8.3-cli',
            'bash',
            <<<'SH'
#!/bin/bash
set -e
cd /mnt/server
if [ ! -f wp-config-sample.php ] && [ ! -f wp-config.php ] && [ ! -f index.php ]; then
  apt-get update -qq
  apt-get install -y -qq curl unzip ca-certificates >/dev/null
  curl -fsSL https://wordpress.org/latest.tar.gz -o /tmp/wordpress.tar.gz
  tar -xzf /tmp/wordpress.tar.gz -C /tmp
  cp -a /tmp/wordpress/. /mnt/server/
  rm -rf /tmp/wordpress /tmp/wordpress.tar.gz
fi
# Enable common Apache modules used by WordPress permalinks.
if command -v a2enmod >/dev/null 2>&1; then
  a2enmod rewrite >/dev/null 2>&1 || true
fi
if [ ! -f .htaccess ]; then
  cat > .htaccess <<'EOF'
# BEGIN WordPress
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
RewriteBase /
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
# END WordPress
EOF
fi
echo "WordPress WebPlate install complete. Configure the database in wp-config.php or via the installer."
SH,
            [
                self::schedule('WordPress Cron', '*/5', '*', 'command', 'php wp-cron.php'),
                self::schedule('Nightly Backup', '0', '3', 'backup', ''),
            ],
        );
    }

    /** @return array<string, mixed> */
    private static function laravel(): array
    {
        return self::base(
            self::UUID_LARAVEL,
            'Laravel',
            'Laravel on PHP 8.4. Uses the built-in PHP server with document root public/. Runs composer create-project when the space is empty.',
            'php',
            'php:8.4-cli',
            'public',
            'php -S 0.0.0.0:80 -t public',
            80,
            'composer:2',
            'sh',
            <<<'SH'
#!/bin/sh
set -e
cd /mnt/server
if [ ! -f artisan ] && [ ! -f composer.json ]; then
  composer create-project laravel/laravel tmp-laravel --no-interaction --prefer-dist
  cp -a tmp-laravel/. /mnt/server/
  rm -rf tmp-laravel
fi
if [ -f composer.json ]; then
  composer install --no-interaction --prefer-dist --optimize-autoloader || true
fi
if [ -f .env.example ] && [ ! -f .env ]; then
  cp .env.example .env
  php artisan key:generate --force || true
fi
echo "Laravel WebPlate install complete."
SH,
            [
                self::schedule('Laravel Scheduler', '*', '*', 'command', 'php artisan schedule:run'),
            ],
        );
    }

    /** @return array<string, mixed> */
    private static function whmcs(): array
    {
        return self::base(
            self::UUID_WHMCS,
            'WHMCS',
            'PHP 8.2 + Apache ready for a WHMCS upload. Place licensed WHMCS files in the WebSpace, then configure the database. Includes the standard WHMCS cron schedule.',
            'php',
            'php:8.2-apache',
            '',
            '',
            80,
            'php:8.2-cli',
            'bash',
            <<<'SH'
#!/bin/bash
set -e
cd /mnt/server
if [ ! -f index.php ] && [ ! -f crons/cron.php ]; then
  cat > index.php <<'EOF'
<?php
header('Content-Type: text/html; charset=utf-8');
?><!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>WHMCS ready</title></head>
<body>
  <h1>WHMCS WebSpace ready</h1>
  <p>Upload your licensed WHMCS files into this WebSpace (overwrite this placeholder).</p>
</body>
</html>
EOF
fi
if command -v a2enmod >/dev/null 2>&1; then
  a2enmod rewrite >/dev/null 2>&1 || true
fi
echo "WHMCS WebPlate install complete."
SH,
            [
                self::schedule('WHMCS Cron', '*/5', '*', 'command', 'php -q crons/cron.php'),
            ],
        );
    }

    /** @return array<string, mixed> */
    private static function joomla(): array
    {
        return self::base(
            self::UUID_JOOMLA,
            'Joomla',
            'Joomla CMS on PHP 8.3 + Apache. Downloads a stable Joomla 5 full package on install.',
            'php',
            'php:8.3-apache',
            '',
            '',
            80,
            'php:8.3-cli',
            'bash',
            <<<'SH'
#!/bin/bash
set -e
cd /mnt/server
if [ ! -f configuration.php ] && [ ! -f libraries/src/Version.php ]; then
  apt-get update -qq
  apt-get install -y -qq curl unzip ca-certificates >/dev/null
  curl -fsSL "https://github.com/joomla/joomla-cms/releases/download/5.2.3/Joomla_5.2.3-Stable-Full_Package.zip" -o /tmp/joomla.zip
  unzip -q /tmp/joomla.zip -d /mnt/server
  rm -f /tmp/joomla.zip
fi
if command -v a2enmod >/dev/null 2>&1; then
  a2enmod rewrite >/dev/null 2>&1 || true
fi
echo "Joomla WebPlate install complete."
SH,
        );
    }

    /** @return array<string, mixed> */
    private static function drupal(): array
    {
        return self::base(
            self::UUID_DRUPAL,
            'Drupal',
            'Drupal CMS on PHP 8.3 via Composer (drupal/recommended-project). Serves the web/ document root with PHP’s built-in server.',
            'php',
            'php:8.3-cli',
            'web',
            'php -S 0.0.0.0:80 -t web',
            80,
            'composer:2',
            'sh',
            <<<'SH'
#!/bin/sh
set -e
cd /mnt/server
if [ ! -f composer.json ]; then
  composer create-project drupal/recommended-project tmp-drupal --no-interaction --prefer-dist
  cp -a tmp-drupal/. /mnt/server/
  rm -rf tmp-drupal
fi
composer install --no-interaction --prefer-dist || true
echo "Drupal WebPlate install complete."
SH,
        );
    }

    /** @return array<string, mixed> */
    private static function nodeLts(string $uuid, string $version, string $image): array
    {
        return self::base(
            $uuid,
            "Node.js {$version}",
            "Node.js {$version} runtime. Default startup listens on port 3000.",
            'node',
            $image,
            '',
            'node index.js',
            3000,
            $image,
            'bash',
            <<<'SH'
#!/bin/bash
set -e
cd /mnt/server
if [ ! -f package.json ]; then
  cat > package.json <<'EOF'
{
  "name": "webspace",
  "version": "1.0.0",
  "private": true,
  "main": "index.js",
  "scripts": { "start": "node index.js" }
}
EOF
fi
if [ ! -f index.js ]; then
  cat > index.js <<'EOF'
const http = require('http');
const port = Number(process.env.PORT || 3000);
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>Node.js is running</h1><p>Edit index.js to build your app.</p>');
}).listen(port, '0.0.0.0', () => console.log(`Listening on ${port}`));
EOF
fi
if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then
  npm ci --omit=dev || npm install --omit=dev
else
  npm install --omit=dev
fi
echo "Node WebPlate install complete."
SH,
        );
    }

    /** @return array<string, mixed> */
    private static function bun(): array
    {
        return self::base(
            self::UUID_BUN,
            'Bun',
            'Bun JavaScript runtime. Fast installs and native TypeScript support.',
            'custom',
            'oven/bun:1-slim',
            '',
            'bun run index.ts',
            3000,
            'oven/bun:1-slim',
            'bash',
            <<<'SH'
#!/bin/bash
set -e
cd /mnt/server
if [ ! -f package.json ]; then
  cat > package.json <<'EOF'
{
  "name": "webspace",
  "version": "1.0.0",
  "private": true,
  "scripts": { "start": "bun run index.ts" }
}
EOF
fi
if [ ! -f index.ts ]; then
  cat > index.ts <<'EOF'
const port = Number(process.env.PORT || 3000);
Bun.serve({
  port,
  hostname: "0.0.0.0",
  fetch() {
    return new Response("<h1>Bun is running</h1>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});
console.log(`Listening on ${port}`);
EOF
fi
bun install || true
echo "Bun WebPlate install complete."
SH,
        );
    }

    /** @return array<string, mixed> */
    private static function nextJs(): array
    {
        return self::base(
            self::UUID_NEXTJS,
            'Next.js',
            'Next.js on Node.js 22. Scaffolds create-next-app when empty; production start on port 3000.',
            'node',
            'node:22-bookworm-slim',
            '',
            'npm run start -- -H 0.0.0.0 -p 3000',
            3000,
            'node:22-bookworm-slim',
            'bash',
            <<<'SH'
#!/bin/bash
set -e
cd /mnt/server
if [ ! -f package.json ]; then
  npx --yes create-next-app@latest . --ts --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
fi
npm ci || npm install
npm run build
echo "Next.js WebPlate install complete."
SH,
        );
    }

    /** @return array<string, mixed> */
    private static function astro(): array
    {
        return self::base(
            self::UUID_ASTRO,
            'Astro',
            'Astro static site on Node.js 22. Builds to dist/ and serves with astro preview (or switch runtime to static and set document root to dist).',
            'node',
            'node:22-bookworm-slim',
            'dist',
            'npx astro preview --host 0.0.0.0 --port 4321',
            4321,
            'node:22-bookworm-slim',
            'bash',
            <<<'SH'
#!/bin/bash
set -e
cd /mnt/server
if [ ! -f package.json ]; then
  npm create astro@latest . -- --template basics --install --no-git --typescript strict
fi
npm ci || npm install
npm run build
echo "Astro WebPlate install complete."
SH,
        );
    }

    /** @return array<string, mixed> */
    private static function deno(): array
    {
        return self::base(
            self::UUID_DENO,
            'Deno',
            'Deno JavaScript/TypeScript runtime with a simple HTTP server on port 8000.',
            'custom',
            'denoland/deno:2.1.4',
            '',
            'deno run --allow-net main.ts',
            8000,
            'denoland/deno:2.1.4',
            'bash',
            <<<'SH'
#!/bin/bash
set -e
cd /mnt/server
if [ ! -f main.ts ]; then
  cat > main.ts <<'EOF'
Deno.serve({ port: 8000, hostname: "0.0.0.0" }, () =>
  new Response("<h1>Deno is running</h1>", {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  }),
);
EOF
fi
echo "Deno WebPlate install complete."
SH,
        );
    }

    /** @return array<string, mixed> */
    private static function pythonHttp(string $uuid, string $version, string $image): array
    {
        return self::base(
            $uuid,
            "Python {$version}",
            "Python {$version} runtime. Default app listens on port 8000.",
            'python',
            $image,
            '',
            'python app.py',
            8000,
            $image,
            'bash',
            <<<'SH'
#!/bin/bash
set -e
cd /mnt/server
if [ ! -f app.py ]; then
  cat > app.py <<'EOF'
from http.server import BaseHTTPRequestHandler, HTTPServer

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = b"<h1>Python is running</h1><p>Edit app.py to build your app.</p>"
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args))

if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
EOF
fi
if [ -f requirements.txt ]; then
  pip install --no-cache-dir -r requirements.txt
fi
echo "Python WebPlate install complete."
SH,
        );
    }

    /** @return array<string, mixed> */
    private static function fastapi(): array
    {
        return self::base(
            self::UUID_FASTAPI,
            'FastAPI',
            'Python FastAPI + Uvicorn on port 8000. Scaffolds a minimal app and requirements.txt.',
            'python',
            'python:3.12-slim',
            '',
            'uvicorn app:app --host 0.0.0.0 --port 8000',
            8000,
            'python:3.12-slim',
            'bash',
            <<<'SH'
#!/bin/bash
set -e
cd /mnt/server
if [ ! -f requirements.txt ]; then
  cat > requirements.txt <<'EOF'
fastapi==0.115.6
uvicorn[standard]==0.34.0
EOF
fi
if [ ! -f app.py ]; then
  cat > app.py <<'EOF'
from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI()

@app.get("/", response_class=HTMLResponse)
def read_root():
    return "<h1>FastAPI is running</h1><p>Edit app.py to build your API.</p>"
EOF
fi
pip install --no-cache-dir -r requirements.txt
echo "FastAPI WebPlate install complete."
SH,
        );
    }
}
