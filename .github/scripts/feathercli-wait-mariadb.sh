#!/usr/bin/env bash
set -euo pipefail
php -r "
\$env = parse_ini_file('storage/config/.env');
\$dsn = 'mysql:host=' . \$env['DATABASE_HOST'] . ';port=' . \$env['DATABASE_PORT'];
for (\$i = 1; \$i <= 30; ++\$i) {
  try {
    \$pdo = new PDO(\$dsn, \$env['DATABASE_USER'], \$env['DATABASE_PASSWORD'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]);
    \$pdo->exec('CREATE DATABASE IF NOT EXISTS featherpanel');
    \$pdo->exec('CREATE DATABASE IF NOT EXISTS pterodactyl_source');
    \$pdo->exec('CREATE DATABASE IF NOT EXISTS pterodactyl_staging');
    echo \"ready after \$i attempts\n\";
    exit(0);
  } catch (Exception \$e) {
    echo \$e->getMessage() . PHP_EOL;
    sleep(2);
  }
}
exit(1);
"
