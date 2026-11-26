#!/usr/bin/env bash
set -euo pipefail
: "${SEED_VARIANT:?}"
: "${MIN_USERS:?}"
: "${MIN_NODES:?}"
: "${MIN_SERVERS:?}"
: "${MIN_SPELLS:?}"
: "${MIN_BACKUPS:?}"
: "${MIN_SCHEDULES:?}"
: "${MIN_DATABASES:?}"

php -r "
\$env = parse_ini_file('storage/config/.env');
\$pdo = new PDO(
  'mysql:host=' . \$env['DATABASE_HOST'] . ';port=' . \$env['DATABASE_PORT'] . ';dbname=' . \$env['DATABASE_DATABASE'],
  \$env['DATABASE_USER'],
  \$env['DATABASE_PASSWORD'],
  [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
\$users = (int) \$pdo->query('SELECT COUNT(*) FROM featherpanel_users')->fetchColumn();
\$nodes = (int) \$pdo->query('SELECT COUNT(*) FROM featherpanel_nodes')->fetchColumn();
\$servers = (int) \$pdo->query('SELECT COUNT(*) FROM featherpanel_servers')->fetchColumn();
\$spells = (int) \$pdo->query('SELECT COUNT(*) FROM featherpanel_spells')->fetchColumn();
\$backups = (int) \$pdo->query('SELECT COUNT(*) FROM featherpanel_server_backups')->fetchColumn();
\$schedules = (int) \$pdo->query('SELECT COUNT(*) FROM featherpanel_server_schedules')->fetchColumn();
\$databases = (int) \$pdo->query('SELECT COUNT(*) FROM featherpanel_server_databases')->fetchColumn();
\$minUsers = (int) getenv('MIN_USERS');
\$minNodes = (int) getenv('MIN_NODES');
\$minServers = (int) getenv('MIN_SERVERS');
\$minSpells = (int) getenv('MIN_SPELLS');
\$minBackups = (int) getenv('MIN_BACKUPS');
\$minSchedules = (int) getenv('MIN_SCHEDULES');
\$minDatabases = (int) getenv('MIN_DATABASES');
\$seed = getenv('SEED_VARIANT') ?: 'unknown';
echo \"seed=\$seed users=\$users nodes=\$nodes servers=\$servers spells=\$spells backups=\$backups schedules=\$schedules databases=\$databases\n\";
if (\$users < \$minUsers) { fwrite(STDERR, \"expected >={\$minUsers} users\n\"); exit(1); }
if (\$nodes < \$minNodes) { fwrite(STDERR, \"expected >={\$minNodes} nodes\n\"); exit(1); }
if (\$servers < \$minServers) { fwrite(STDERR, \"expected >={\$minServers} servers\n\"); exit(1); }
if (\$spells < \$minSpells) { fwrite(STDERR, \"expected >={\$minSpells} spells\n\"); exit(1); }
if (\$backups < \$minBackups) { fwrite(STDERR, \"expected >={\$minBackups} backups\n\"); exit(1); }
if (\$schedules < \$minSchedules) { fwrite(STDERR, \"expected >={\$minSchedules} schedules\n\"); exit(1); }
if (\$databases < \$minDatabases) { fwrite(STDERR, \"expected >={\$minDatabases} databases\n\"); exit(1); }
echo \"migration assertions passed for \$seed\n\";
"
