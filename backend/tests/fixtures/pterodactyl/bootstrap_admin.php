<?php

/*
 * CI helper: ensure a single admin user + API client for feathercli migrate.
 * Writes the private API key to the path in argv[1] (default: /tmp/feathercli-api-key).
 */

declare(strict_types=1);

require dirname(__DIR__, 3) . '/storage/packages/autoload.php';

use App\App;
use App\Chat\User;
use App\Chat\ApiClient;

$outFile = $argv[1] ?? '/tmp/feathercli-api-key';

App::getInstance(false, true, true);

$adminUuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
$adminEmail = 'ci-admin@featherpanel.test';

$existing = User::getUserByUuid($adminUuid);
if (!$existing) {
    $id = User::createUser([
        'uuid' => $adminUuid,
        'username' => 'ciadmin',
        'first_name' => 'CI',
        'last_name' => 'Admin',
        'email' => $adminEmail,
        'password' => password_hash('CiAdminPassword123!', PASSWORD_BCRYPT),
        'role_id' => 4,
        'avatar' => 'https://cdn.mythical.systems/featherpanel/logo.png',
        'remember_token' => bin2hex(random_bytes(16)),
    ]);
    if (!$id) {
        fwrite(STDERR, "Failed to create admin user\n");
        exit(1);
    }
}

$publicKey = 'fpci_pub_' . bin2hex(random_bytes(16));
$privateKey = 'fpci_prv_' . bin2hex(random_bytes(24));

$clientId = ApiClient::createApiClient([
    'user_uuid' => $adminUuid,
    'name' => 'CI Migration Agent',
    'public_key' => $publicKey,
    'private_key' => $privateKey,
    'permissions' => null,
]);

if (!$clientId) {
    fwrite(STDERR, "Failed to create API client\n");
    exit(1);
}

file_put_contents($outFile, $privateKey);
echo "Wrote API key to {$outFile}\n";
exit(0);
