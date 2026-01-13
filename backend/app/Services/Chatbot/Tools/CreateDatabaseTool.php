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

namespace App\Services\Chatbot\Tools;

use App\App;
use App\Chat\Server;
use App\Chat\ServerDatabase;
use App\Chat\DatabaseInstance;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerEvent;

/**
 * Tool to create a database for a server.
 */
class CreateDatabaseTool implements ToolInterface
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        // Get server identifier
        $serverIdentifier = $params['server_uuid'] ?? $params['server_name'] ?? null;
        $server = null;

        // If no identifier provided, try to get server from pageContext
        if (!$serverIdentifier && isset($pageContext['server'])) {
            $contextServer = $pageContext['server'];
            $serverUuidShort = $contextServer['uuidShort'] ?? null;

            if ($serverUuidShort) {
                $server = Server::getServerByUuidShort($serverUuidShort);
            }
        }

        // Resolve server if identifier provided
        if ($serverIdentifier && !$server) {
            // Try by UUID first (full UUID)
            $server = Server::getServerByUuid($serverIdentifier);

            // Try by UUID Short if full UUID didn't work
            if (!$server) {
                $server = Server::getServerByUuidShort($serverIdentifier);
            }

            // Try by name if UUID didn't work
            if (!$server) {
                $servers = Server::searchServers(
                    page: 1,
                    limit: 10,
                    search: $serverIdentifier,
                    ownerId: $user['id']
                );
                if (!empty($servers)) {
                    $server = $servers[0];
                }
            }
        }

        if (!$server) {
            return [
                'error' => 'Server not found. Please specify a server UUID or name, or ensure you are viewing a server page.',
                'success' => false,
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'error' => 'Access denied to server',
                'success' => false,
            ];
        }

        // Get database host ID
        $databaseHostId = $params['database_host_id'] ?? null;
        if (!$databaseHostId) {
            // Try to get first available database host
            $databaseHosts = DatabaseInstance::getAllDatabases();
            if (empty($databaseHosts)) {
                return [
                    'error' => 'No database hosts available',
                    'success' => false,
                ];
            }
            $databaseHostId = (int) $databaseHosts[0]['id'];
        }

        // Verify database host exists
        $databaseHost = DatabaseInstance::getDatabaseById((int) $databaseHostId);
        if (!$databaseHost) {
            return [
                'error' => 'Database host not found',
                'success' => false,
            ];
        }

        // Get database name (optional, will be generated if not provided)
        $databaseName = $params['database_name'] ?? null;

        // Check database limit
        $currentDatabases = count(ServerDatabase::getServerDatabasesWithDetailsByServerId((int) $server['id']));
        $databaseLimit = (int) ($server['database_limit'] ?? 1);

        if ($currentDatabases >= $databaseLimit) {
            return [
                'error' => 'Database limit reached for this server',
                'success' => false,
                'current_count' => $currentDatabases,
                'limit' => $databaseLimit,
            ];
        }

        // Generate database name if not provided
        if (!$databaseName) {
            $databaseName = 'db_' . time();
        }

        // Generate full database name: s{server_id}_{database_name}
        $fullDatabaseName = 's' . $server['id'] . '_' . $databaseName;

        // Generate username: u{server_id}_{random_string}
        $username = 'u' . $server['id'] . '_' . $this->generateRandomString(10);

        // Generate password
        $password = $this->generateRandomString(16);

        try {
            // Create database on host
            $this->createDatabaseOnHost($databaseHost, $fullDatabaseName, $username, $password);

            // Create server database record
            $databaseData = [
                'server_id' => $server['id'],
                'database_host_id' => $databaseHostId,
                'database' => $fullDatabaseName,
                'username' => $username,
                'password' => $password,
                'remote' => $params['remote'] ?? '%',
                'max_connections' => $params['max_connections'] ?? 0,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $databaseId = ServerDatabase::createServerDatabase($databaseData);
            if (!$databaseId) {
                // Rollback: delete the created database and user
                $this->deleteDatabaseFromHost($databaseHost, $fullDatabaseName, $username);

                return [
                    'error' => 'Failed to create server database record',
                    'success' => false,
                ];
            }

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerEvent::onServerDatabaseCreated(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'database_id' => $databaseId,
                    ]
                );
            }

            return [
                'success' => true,
                'database_id' => $databaseId,
                'database_name' => $fullDatabaseName,
                'username' => $username,
                'password' => $password,
                'database_host' => $databaseHost['database_host'],
                'database_port' => (int) $databaseHost['database_port'],
                'database_type' => $databaseHost['database_type'],
            ];
        } catch (\Exception $e) {
            $this->app->getLogger()->error('CreateDatabaseTool error: ' . $e->getMessage());

            return [
                'error' => 'Failed to create database: ' . $e->getMessage(),
                'success' => false,
            ];
        }
    }

    public function getDescription(): string
    {
        return 'Create a new database for a server. Generates database name, username, and password automatically. Returns the created database credentials.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'database_host_id' => 'Database host ID (optional, uses first available if not specified)',
            'database_name' => 'Database name base (optional, will be auto-generated if not provided)',
            'remote' => 'Remote access pattern (optional, default: %)',
            'max_connections' => 'Maximum connections (optional, default: 0)',
        ];
    }

    /**
     * Generate random string.
     */
    private function generateRandomString(int $length = 16): string
    {
        $characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $randomString = '';
        for ($i = 0; $i < $length; ++$i) {
            $randomString .= $characters[random_int(0, strlen($characters) - 1)];
        }

        return $randomString;
    }

    /**
     * Create database and user on the database host.
     */
    private function createDatabaseOnHost(array $databaseHost, string $databaseName, string $username, string $password): void
    {
        $options = [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_TIMEOUT => 10,
        ];

        switch ($databaseHost['database_type']) {
            case 'mysql':
            case 'mariadb':
                $safeDbName = '`' . str_replace('`', '``', $databaseName) . '`';
                $safeUser = '`' . str_replace('`', '``', $username) . '`';
                $dsn = "mysql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}";
                $pdo = new \PDO($dsn, $databaseHost['database_username'], $databaseHost['database_password'], $options);

                $pdo->exec("CREATE DATABASE IF NOT EXISTS {$safeDbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $pdo->exec("CREATE USER IF NOT EXISTS {$safeUser}@'%' IDENTIFIED BY '{$password}'");
                $pdo->exec("GRANT ALL PRIVILEGES ON {$safeDbName}.* TO {$safeUser}@'%'");
                $pdo->exec('FLUSH PRIVILEGES');
                break;

            case 'postgresql':
                $dsn = "pgsql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}";
                $pdo = new \PDO($dsn, $databaseHost['database_username'], $databaseHost['database_password'], $options);

                $pdo->exec("CREATE DATABASE {$databaseName}");
                $pdo->exec("CREATE USER {$username} WITH PASSWORD '{$password}'");
                $pdo->exec("GRANT ALL PRIVILEGES ON DATABASE {$databaseName} TO {$username}");
                break;

            default:
                throw new \Exception('Unsupported database type: ' . $databaseHost['database_type']);
        }
    }

    /**
     * Delete database and user from host (rollback).
     */
    private function deleteDatabaseFromHost(array $databaseHost, string $databaseName, string $username): void
    {
        try {
            $options = [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 10,
            ];

            switch ($databaseHost['database_type']) {
                case 'mysql':
                case 'mariadb':
                    $safeDbName = '`' . str_replace('`', '``', $databaseName) . '`';
                    $safeUser = '`' . str_replace('`', '``', $username) . '`';
                    $dsn = "mysql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}";
                    $pdo = new \PDO($dsn, $databaseHost['database_username'], $databaseHost['database_password'], $options);

                    $pdo->exec("DROP DATABASE IF EXISTS {$safeDbName}");
                    $pdo->exec("DROP USER IF EXISTS {$safeUser}@'%'");
                    break;

                case 'postgresql':
                    $dsn = "pgsql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}";
                    $pdo = new \PDO($dsn, $databaseHost['database_username'], $databaseHost['database_password'], $options);

                    $pdo->exec("DROP DATABASE IF EXISTS {$databaseName}");
                    $pdo->exec("DROP USER IF EXISTS {$username}");
                    break;
            }
        } catch (\Exception $e) {
            // Log but don't throw - rollback failure is not critical
            $this->app->getLogger()->warning('Failed to rollback database creation: ' . $e->getMessage());
        }
    }
}
