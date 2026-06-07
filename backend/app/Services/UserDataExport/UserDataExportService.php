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

namespace App\Services\UserDataExport;

use App\App;
use App\Chat\Node;
use App\Chat\Backup;
use App\Chat\Database;
use GuzzleHttp\Client;
use App\Helpers\WingsUrlHelper;
use App\Services\Wings\Wings;
use App\Config\ConfigInterface;
use App\Services\Wings\Services\JwtService;

/**
 * Builds per-user database exports with secret values represented as metadata.
 */
class UserDataExportService
{
    private const EXPORT_SCHEMA_VERSION = 1;
    private const BACKUP_WAIT_SECONDS = 60;
    private const BACKUP_WAIT_INTERVAL_SECONDS = 5;

    private array $secretColumns = [
        'password',
        'remember_token',
        'two_fa_key',
        'private_key',
        'secret',
        'token',
        'access_token',
        'refresh_token',
        'id_token',
        'api_key',
        'key',
        'credential_id',
        'credential_public_key',
        'root_password',
        'database_encryption_key',
    ];

    private array $tableCache = [];
    private array $columnCache = [];

    /**
     * Generate the export folder and return its path plus metadata.
     */
    public function buildExport(array $export): array
    {
        $pdo = Database::getPdoConnection();
        $user = $this->fetchUser($pdo, (string) $export['user_uuid']);
        if ($user === null) {
            throw new \RuntimeException('User not found for data export');
        }

        $rootDir = $this->getStorageRoot();
        $exportDir = $rootDir . '/' . $this->sanitizePathSegment((string) $export['uuid']);
        $dataDir = $exportDir . '/featherpanel/database/tables';

        $this->prepareDirectory($dataDir);

        $context = $this->buildContext($pdo, $user, (int) $export['ticket_id']);
        $tables = $this->collectTableData($pdo, $context);
        $attachmentSummary = $this->exportAttachments($pdo, $context, $exportDir);
        $serverSummary = $this->exportServers($pdo, $context, $exportDir, (string) $export['uuid']);

        $summary = [];
        foreach ($tables as $table => $rows) {
            $summary[$table] = count($rows);
            $this->writeJson($dataDir . '/' . $table . '.json', [
                'table' => $table,
                'row_count' => count($rows),
                'rows' => $this->sanitizeRows($rows),
            ]);
        }

        $manifest = [
            'schema_version' => self::EXPORT_SCHEMA_VERSION,
            'export_uuid' => $export['uuid'],
            'requested_at' => $export['requested_at'] ?? null,
            'generated_at' => gmdate('c'),
            'user' => [
                'id' => (int) $user['id'],
                'uuid' => $user['uuid'],
                'username' => $user['username'] ?? null,
                'email' => $user['email'] ?? null,
            ],
            'ticket_id' => (int) $export['ticket_id'],
            'secret_handling' => 'Sensitive columns are metadata-only. Raw values are not included.',
            'tables' => $summary,
            'folders' => [
                'database' => 'featherpanel/database/tables',
                'attachments' => 'featherpanel/attachments',
                'servers' => 'featherpanel/servers',
            ],
            'attachments' => $attachmentSummary,
            'servers' => $serverSummary,
            'relation_ids' => [
                'servers' => $context['server_ids'],
                'database_dump_servers' => $context['database_dump_server_ids'],
                'database_hosts' => $context['database_host_ids'],
                'tickets' => $context['ticket_ids'],
                'excluded_export_tickets' => $context['excluded_ticket_ids'],
                'ticket_messages' => $context['message_ids'],
                'vm_instances' => $context['vm_instance_ids'],
                'subdomain_domains' => $context['domain_ids'],
                'spells' => $context['spell_ids'],
                'chatbot_conversations' => $context['conversation_ids'],
                'server_schedules' => $context['schedule_ids'],
            ],
        ];

        $this->prepareDirectory($exportDir . '/featherpanel/profile');
        $this->writeJson($exportDir . '/manifest.json', $manifest);
        $this->writeJson($exportDir . '/featherpanel/profile/user.json', [
            'user' => $this->sanitizeRows([$user])[0],
            'export_uuid' => $export['uuid'],
            'generated_at' => $manifest['generated_at'],
        ]);

        return [
            'export_dir' => $exportDir,
            'manifest' => $manifest,
        ];
    }

    /**
     * Create a zip file from an export directory.
     */
    public function zipExportDirectory(string $exportDir, string $zipPath): void
    {
        if (!class_exists(\ZipArchive::class)) {
            throw new \RuntimeException('PHP ZipArchive extension is not available');
        }

        $zipDir = dirname($zipPath);
        if (!is_dir($zipDir) && !mkdir($zipDir, 0755, true) && !is_dir($zipDir)) {
            throw new \RuntimeException('Failed to create zip output directory');
        }

        $zip = new \ZipArchive();
        $opened = $zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
        if ($opened !== true) {
            throw new \RuntimeException('Failed to open zip archive for writing. Code: ' . $opened);
        }

        $basePath = rtrim($exportDir, '/') . '/';
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($exportDir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $file) {
            $fullPath = $file->getPathname();
            $relativePath = substr($fullPath, strlen($basePath));

            if ($file->isDir()) {
                $zip->addEmptyDir($relativePath);
                continue;
            }

            $zip->addFile($fullPath, $relativePath);
        }

        $zip->close();
        @chmod($zipPath, 0644);
    }

    /**
     * Remove an export working directory.
     */
    public function removeDirectory(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $file) {
            if ($file->isDir()) {
                @rmdir($file->getPathname());
            } else {
                @unlink($file->getPathname());
            }
        }

        @rmdir($path);
    }

    private function fetchUser(\PDO $pdo, string $userUuid): ?array
    {
        $stmt = $pdo->prepare('SELECT * FROM `featherpanel_users` WHERE `uuid` = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $userUuid]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    private function buildContext(\PDO $pdo, array $user, int $ticketId): array
    {
        $context = [
            'user_id' => (int) $user['id'],
            'user_uuid' => (string) $user['uuid'],
            'email' => (string) ($user['email'] ?? ''),
            'username' => (string) ($user['username'] ?? ''),
            'ticket_ids' => [],
            'excluded_ticket_ids' => [],
            'message_ids' => [],
            'server_ids' => [],
            'database_dump_server_ids' => [],
            'database_host_ids' => [],
            'vm_instance_ids' => [],
            'domain_ids' => [],
            'spell_ids' => [],
            'conversation_ids' => [],
            'schedule_ids' => [],
        ];

        $context['excluded_ticket_ids'] = $this->selectIds($pdo, 'featherpanel_user_data_exports', ['user_uuid' => $context['user_uuid']], 'ticket_id');
        $context['excluded_ticket_ids'][] = $ticketId;
        $context['excluded_ticket_ids'] = $this->uniqueInts($context['excluded_ticket_ids']);

        $context['ticket_ids'] = array_values(array_diff(
            $this->selectIds($pdo, 'featherpanel_tickets', ['user_uuid' => $context['user_uuid']]),
            $context['excluded_ticket_ids']
        ));
        $context['ticket_ids'] = $this->uniqueInts($context['ticket_ids']);

        $ownedServerIds = $this->selectIds($pdo, 'featherpanel_servers', ['owner_id' => $context['user_id']]);
        $subuserServerIds = $this->selectIds($pdo, 'featherpanel_server_subusers', ['user_id' => $context['user_id']], 'server_id');
        $context['server_ids'] = $this->uniqueInts(array_merge($ownedServerIds, $subuserServerIds));
        $context['database_dump_server_ids'] = $this->uniqueInts(array_merge(
            $ownedServerIds,
            $this->selectSubuserServerIdsWithPermission($pdo, $context['user_id'], 'database.view_password')
        ));

        $ownedVmInstanceIds = $this->selectIds($pdo, 'featherpanel_vm_instances', ['user_uuid' => $context['user_uuid']]);
        $subuserVmInstanceIds = $this->selectIds($pdo, 'featherpanel_vm_subusers', ['user_id' => $context['user_id']], 'vm_instance_id');
        $context['vm_instance_ids'] = $this->uniqueInts(array_merge($ownedVmInstanceIds, $subuserVmInstanceIds));
        $context['conversation_ids'] = $this->selectIds($pdo, 'featherpanel_chatbot_conversations', ['user_uuid' => $context['user_uuid']]);

        if (!empty($context['ticket_ids'])) {
            $context['message_ids'] = $this->selectVisibleTicketMessageIds($pdo, $context['ticket_ids']);
        }

        if (!empty($context['server_ids'])) {
            $context['schedule_ids'] = $this->selectIdsIn($pdo, 'featherpanel_server_schedules', 'server_id', $context['server_ids']);
            $context['database_host_ids'] = $this->selectIdsIn($pdo, 'featherpanel_server_databases', 'server_id', $context['server_ids'], 'database_host_id');
            $context['domain_ids'] = $this->selectIdsIn($pdo, 'featherpanel_subdomain_manager_subdomains', 'server_id', $context['server_ids'], 'domain_id');
            $context['spell_ids'] = $this->uniqueInts(array_merge(
                $this->selectIdsIn($pdo, 'featherpanel_servers', 'id', $context['server_ids'], 'spell_id'),
                $this->selectIdsIn($pdo, 'featherpanel_subdomain_manager_subdomains', 'server_id', $context['server_ids'], 'spell_id')
            ));
        }

        return $context;
    }

    private function collectTableData(\PDO $pdo, array $context): array
    {
        $tables = [];
        foreach ($this->getTables($pdo) as $table) {
            if (!str_starts_with($table, 'featherpanel_')) {
                continue;
            }

            $columns = $this->getColumns($pdo, $table);
            if (empty($columns)) {
                continue;
            }

            $rows = $this->fetchRowsForContext($pdo, $table, $columns, $context);
            if (!empty($rows)) {
                $tables[$table] = $rows;
            }
        }

        ksort($tables);

        return $tables;
    }

    private function fetchRowsForContext(\PDO $pdo, string $table, array $columns, array $context): array
    {
        if ($table === 'featherpanel_ticket_attachments') {
            return $this->fetchTicketAttachments($pdo, $context, false);
        }
        if ($table === 'featherpanel_user_data_exports') {
            return [];
        }

        $clauses = [];
        $params = [];

        $this->addEqualsFilter($clauses, $params, $columns, 'user_uuid', $context['user_uuid']);
        $this->addEqualsFilter($clauses, $params, $columns, 'uuid', $context['user_uuid'], $table === 'featherpanel_users');
        $this->addEqualsFilter($clauses, $params, $columns, 'user_id', $context['user_id']);
        $this->addEqualsFilter($clauses, $params, $columns, 'owner_id', $context['user_id']);
        $this->addEqualsFilter($clauses, $params, $columns, 'created_by', $context['user_id']);
        $this->addEqualsFilter($clauses, $params, $columns, 'updated_by', $context['user_id']);
        $this->addEqualsFilter($clauses, $params, $columns, 'email', $context['email']);
        $this->addEqualsFilter($clauses, $params, $columns, 'user_email', $context['email']);
        $this->addEqualsFilter($clauses, $params, $columns, 'username', $context['username']);

        $this->addInFilter($clauses, $params, $columns, 'ticket_id', $context['ticket_ids']);
        $this->addInFilter($clauses, $params, $columns, 'message_id', $context['message_ids']);
        $this->addInFilter($clauses, $params, $columns, 'server_id', $context['server_ids']);
        $this->addInFilter($clauses, $params, $columns, 'vm_instance_id', $context['vm_instance_ids']);
        $this->addInFilter($clauses, $params, $columns, 'instance_id', $context['vm_instance_ids']);
        $this->addInFilter($clauses, $params, $columns, 'conversation_id', $context['conversation_ids']);
        $this->addInFilter($clauses, $params, $columns, 'schedule_id', $context['schedule_ids']);
        $this->addExactIdFilter($clauses, $params, $table, $columns, 'featherpanel_servers', $context['server_ids']);
        $this->addExactIdFilter($clauses, $params, $table, $columns, 'featherpanel_vm_instances', $context['vm_instance_ids']);
        $this->addExactIdFilter($clauses, $params, $table, $columns, 'featherpanel_databases', $context['database_host_ids']);
        $this->addExactIdFilter($clauses, $params, $table, $columns, 'featherpanel_subdomain_manager_domains', $context['domain_ids']);
        $this->addExactIdFilter($clauses, $params, $table, $columns, 'featherpanel_spells', $context['spell_ids']);
        if ($table === 'featherpanel_subdomain_manager_domain_spells') {
            $this->addInFilter($clauses, $params, $columns, 'domain_id', $context['domain_ids']);
        }

        if (empty($clauses)) {
            return [];
        }

        $sql = 'SELECT * FROM `' . $table . '` WHERE (' . implode(' OR ', $clauses) . ')';
        if ($table === 'featherpanel_ticket_messages' && in_array('is_internal', $columns, true)) {
            $sql .= ' AND `is_internal` = 0';
        }
        $sql .= $this->buildOrderByClause($columns) . ' LIMIT 10000';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    private function fetchTicketAttachments(\PDO $pdo, array $context, bool $userDownloadableOnly = false): array
    {
        if (!$this->tableExists($pdo, 'featherpanel_ticket_attachments')) {
            return [];
        }

        $clauses = [];
        $params = [];
        $columns = $this->getColumns($pdo, 'featherpanel_ticket_attachments');
        $this->addInFilter($clauses, $params, $columns, 'message_id', $context['message_ids']);
        if (in_array('ticket_id', $columns, true) && !empty($context['ticket_ids'])) {
            $placeholders = [];
            foreach ($context['ticket_ids'] as $ticketId) {
                $param = 'p' . count($params);
                $placeholders[] = ':' . $param;
                $params[$param] = $ticketId;
            }
            $ticketClause = '`ticket_id` IN (' . implode(', ', $placeholders) . ')';
            if ($userDownloadableOnly && in_array('user_downloadable', $columns, true)) {
                $ticketClause = '(' . $ticketClause . ' AND `user_downloadable` = 1)';
            }
            $clauses[] = $ticketClause;
        }

        if (empty($clauses)) {
            return [];
        }

        $stmt = $pdo->prepare('SELECT * FROM `featherpanel_ticket_attachments` WHERE ' . implode(' OR ', $clauses) . $this->buildOrderByClause($columns) . ' LIMIT 10000');
        $stmt->execute($params);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    private function exportAttachments(\PDO $pdo, array $context, string $exportDir): array
    {
        $attachmentsDir = $exportDir . '/featherpanel/attachments';
        $this->prepareDirectory($attachmentsDir);

        $attachments = $this->fetchTicketAttachments($pdo, $context, false);
        $ticketMap = $this->fetchRowsByIds($pdo, 'featherpanel_tickets', $context['ticket_ids']);
        $messageMap = $this->fetchRowsByIds($pdo, 'featherpanel_ticket_messages', $context['message_ids']);

        $summary = [
            'total_records' => count($attachments),
            'copied_files' => 0,
            'skipped_files' => [],
            'files' => [],
        ];

        foreach ($attachments as $attachment) {
            $ticketId = (int) ($attachment['ticket_id'] ?? 0);
            $messageId = (int) ($attachment['message_id'] ?? 0);
            if ($ticketId <= 0 && $messageId > 0 && isset($messageMap[$messageId])) {
                $ticketId = (int) $messageMap[$messageId]['ticket_id'];
            }

            $ticketUuid = $ticketMap[$ticketId]['uuid'] ?? 'unknown-ticket';
            $targetFolder = $attachmentsDir . '/tickets/' . $this->sanitizePathSegment((string) $ticketUuid);
            $this->prepareDirectory($targetFolder);

            $sourcePath = $this->resolvePublicFilePath((string) ($attachment['file_path'] ?? ''));
            $targetName = $this->sanitizePathSegment((string) ($attachment['file_name'] ?? ('attachment-' . ($attachment['id'] ?? uniqid()))));
            $targetPath = $targetFolder . '/' . $targetName;
            $relativeTarget = 'featherpanel/attachments/tickets/' . $this->sanitizePathSegment((string) $ticketUuid) . '/' . $targetName;

            $entry = [
                'attachment' => $this->sanitizeRows([$attachment])[0],
                'ticket_uuid' => $ticketUuid,
                'message_id' => $messageId > 0 ? $messageId : null,
                'export_path' => $relativeTarget,
                'copied' => false,
            ];

            if ($sourcePath !== null && is_file($sourcePath) && @copy($sourcePath, $targetPath)) {
                $entry['copied'] = true;
                ++$summary['copied_files'];
            } else {
                $summary['skipped_files'][] = [
                    'attachment_id' => (int) ($attachment['id'] ?? 0),
                    'file_path' => $attachment['file_path'] ?? null,
                    'reason' => 'File missing or not readable',
                ];
            }

            $summary['files'][] = $entry;
        }

        $this->writeJson($attachmentsDir . '/index.json', $summary);

        return [
            'total_records' => $summary['total_records'],
            'copied_files' => $summary['copied_files'],
            'skipped_files' => count($summary['skipped_files']),
        ];
    }

    private function exportServers(\PDO $pdo, array $context, string $exportDir, string $exportUuid): array
    {
        $serversDir = $exportDir . '/featherpanel/servers';
        $this->prepareDirectory($serversDir);

        $summary = [
            'total_servers' => count($context['server_ids']),
            'file_exports' => [],
            'backup_requests' => [],
            'database_dumps' => [],
            'skipped' => [],
        ];

        foreach ($context['server_ids'] as $serverId) {
            $server = $this->fetchRowById($pdo, 'featherpanel_servers', (int) $serverId);
            if ($server === null) {
                $summary['skipped'][] = ['server_id' => (int) $serverId, 'reason' => 'Server row not found'];
                continue;
            }

            $serverFolderName = $this->sanitizePathSegment((string) ($server['uuid'] ?? $server['uuidShort'] ?? $server['id']));
            $serverDir = $serversDir . '/' . $serverFolderName;
            $this->prepareDirectory($serverDir);

            $this->writeJson($serverDir . '/server.json', ['server' => $this->sanitizeRows([$server])[0]]);
            $this->writeJson($serverDir . '/existing_backups.json', [
                'backups' => $this->sanitizeRows($this->fetchRowsByColumn($pdo, 'featherpanel_server_backups', 'server_id', (int) $server['id'])),
            ]);
            $fileExport = $this->exportServerFilesFromBackup($server, $serverDir, $exportUuid);
            $summary['file_exports'][] = $fileExport;
            $this->writeJson($serverDir . '/files_index.json', $fileExport);

            $databaseDump = $this->exportServerDatabases($pdo, $server, $serverDir, $context);
            $summary['database_dumps'][] = $databaseDump;
            $this->writeJson($serverDir . '/databases/index.json', $databaseDump);

            $backupResult = $fileExport['backup'] ?? [
                'status' => 'failed',
                'message' => 'Backup export did not return backup metadata',
            ];
            $summary['backup_requests'][] = $backupResult;
            $this->writeJson($serverDir . '/export_backup_request.json', $backupResult);
        }

        $this->writeJson($serversDir . '/index.json', $summary);

        return [
            'total_servers' => $summary['total_servers'],
            'file_exports' => count($summary['file_exports']),
            'backup_requests' => count($summary['backup_requests']),
            'database_dumps' => array_sum(array_map(fn (array $entry): int => (int) ($entry['dumped_databases'] ?? 0), $summary['database_dumps'])),
            'skipped' => count($summary['skipped']),
        ];
    }

    private function exportServerFilesFromBackup(array $server, string $serverDir, string $exportUuid): array
    {
        $filesDir = $serverDir . '/files';
        $archiveDir = $serverDir . '/backup_archive';
        $this->prepareDirectory($filesDir);
        $this->prepareDirectory($archiveDir);

        $index = [
            'server_id' => (int) $server['id'],
            'server_uuid' => $server['uuid'] ?? null,
            'method' => 'wings_backup_download_extract',
            'export_path' => 'files',
            'archive_path' => null,
            'backup' => null,
            'extracted' => false,
            'skipped' => [],
        ];

        $backup = $this->requestServerBackup($server, $exportUuid);
        $index['backup'] = $backup;

        if (($backup['status'] ?? '') !== 'requested') {
            $index['skipped'][] = ['path' => '/', 'reason' => $backup['message'] ?? 'Backup request failed'];

            return $index;
        }

        $completedBackup = $this->waitForBackupCompletion((string) $backup['backup_uuid']);
        if ($completedBackup === null) {
            $index['skipped'][] = [
                'path' => '/',
                'reason' => 'Backup was requested but did not finish within ' . self::BACKUP_WAIT_SECONDS . ' seconds',
            ];

            return $index;
        }

        try {
            $archivePath = $archiveDir . '/' . $this->sanitizePathSegment((string) $backup['backup_uuid']) . '.tar.gz';
            $this->downloadBackupArchive($server, $completedBackup, $archivePath);
            $index['archive_path'] = 'backup_archive/' . basename($archivePath);

            $extractResult = $this->extractBackupArchive($archivePath, $filesDir);
            $index['extracted'] = $extractResult['success'];
            $index['extraction'] = $extractResult;
            if (!$extractResult['success']) {
                $index['skipped'][] = ['path' => '/', 'reason' => $extractResult['message']];
            }
        } catch (\Throwable $e) {
            $index['skipped'][] = ['path' => '/', 'reason' => $e->getMessage()];
        }

        return $index;
    }

    private function exportServerDatabases(\PDO $appPdo, array $server, string $serverDir, array $context): array
    {
        $databasesDir = $serverDir . '/databases';
        $this->prepareDirectory($databasesDir);

        $summary = [
            'server_id' => (int) $server['id'],
            'server_uuid' => $server['uuid'] ?? null,
            'dump_allowed' => in_array((int) $server['id'], $context['database_dump_server_ids'], true),
            'total_databases' => 0,
            'dumped_databases' => 0,
            'skipped' => [],
            'files' => [],
        ];

        $databases = $this->fetchServerDatabasesWithDetails($appPdo, (int) $server['id']);
        $summary['total_databases'] = count($databases);

        if (!$summary['dump_allowed']) {
            foreach ($databases as $database) {
                $summary['skipped'][] = [
                    'database_id' => (int) ($database['id'] ?? 0),
                    'database' => $database['database'] ?? null,
                    'reason' => 'The user can access this server, but does not have database password/export access.',
                ];
            }

            return $summary;
        }

        foreach ($databases as $database) {
            $databaseName = (string) ($database['database'] ?? ('database_' . ($database['id'] ?? uniqid())));
            $targetName = $this->sanitizePathSegment($databaseName) . '.sql';
            $targetPath = $databasesDir . '/' . $targetName;

            try {
                $result = $this->buildMysqlDatabaseDump($database, $targetPath);
                ++$summary['dumped_databases'];
                $summary['files'][] = [
                    'database_id' => (int) ($database['id'] ?? 0),
                    'database' => $databaseName,
                    'export_path' => 'databases/' . $targetName,
                    'table_count' => $result['table_count'],
                    'row_limit_per_table' => $result['row_limit_per_table'],
                    'chunk_size' => $result['chunk_size'],
                ];
            } catch (\Throwable $e) {
                $summary['skipped'][] = [
                    'database_id' => (int) ($database['id'] ?? 0),
                    'database' => $databaseName,
                    'reason' => $e->getMessage(),
                ];
            }
        }

        return $summary;
    }

    private function fetchServerDatabasesWithDetails(\PDO $pdo, int $serverId): array
    {
        if (!$this->tableExists($pdo, 'featherpanel_server_databases') || !$this->tableExists($pdo, 'featherpanel_databases')) {
            return [];
        }

        $stmt = $pdo->prepare(
            'SELECT server_databases.*, database_hosts.database_type, database_hosts.database_host, database_hosts.database_port
             FROM `featherpanel_server_databases` server_databases
             INNER JOIN `featherpanel_databases` database_hosts ON database_hosts.id = server_databases.database_host_id
             WHERE server_databases.server_id = :server_id
             ORDER BY server_databases.id ASC'
        );
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    private function buildMysqlDatabaseDump(array $database, string $targetPath): array
    {
        $databaseType = strtolower((string) ($database['database_type'] ?? ''));
        if (!in_array($databaseType, ['mysql', 'mariadb'], true)) {
            throw new \RuntimeException('SQL dump export is only supported for MySQL/MariaDB databases');
        }

        $dbName = (string) ($database['database'] ?? '');
        $host = (string) ($database['database_host'] ?? '');
        $username = (string) ($database['username'] ?? '');
        $password = (string) ($database['password'] ?? '');
        $port = (int) ($database['database_port'] ?? 3306);

        if ($dbName === '' || $host === '' || $username === '') {
            throw new \RuntimeException('Database connection details are incomplete');
        }

        $pdo = new \PDO(
            "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4",
            $username,
            $password,
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION, \PDO::ATTR_TIMEOUT => 30]
        );

        $tables = $pdo->query('SHOW TABLES')->fetchAll(\PDO::FETCH_COLUMN);
        $chunkSize = 250;
        $handle = fopen($targetPath, 'wb');
        if ($handle === false) {
            throw new \RuntimeException('Failed to open SQL dump for writing');
        }

        $write = static function (string $line = '') use ($handle): void {
            if (fwrite($handle, $line . "\n") === false) {
                throw new \RuntimeException('Failed to write SQL dump');
            }
        };

        try {
            $write('-- FeatherPanel SQL Dump');
            $write('-- Database: ' . $dbName);
            $write('-- Generated: ' . gmdate('Y-m-d H:i:s') . ' UTC');
            $write('-- Host: ' . $host . ':' . $port);
            $write();
            $write('SET FOREIGN_KEY_CHECKS=0;');
            $write("SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';");
            $write("SET time_zone='+00:00';");
            $write();

            foreach ($tables as $table) {
                $safeTable = $this->quoteMysqlIdentifier((string) $table);
                $write('-- Table: ' . $table);
                $write('DROP TABLE IF EXISTS ' . $safeTable . ';');

                $createRow = $pdo->query('SHOW CREATE TABLE ' . $safeTable)->fetch(\PDO::FETCH_NUM);
                $write(((string) ($createRow[1] ?? '')) . ';');
                $write();

                $offset = 0;
                while (true) {
                    $rows = $pdo->query('SELECT * FROM ' . $safeTable . ' LIMIT ' . $chunkSize . ' OFFSET ' . $offset)->fetchAll(\PDO::FETCH_ASSOC);
                    if (empty($rows)) {
                        break;
                    }

                    $columns = '(' . implode(', ', array_map(fn ($column): string => $this->quoteMysqlIdentifier((string) $column), array_keys($rows[0]))) . ')';
                    $valuesList = array_map(function (array $row) use ($pdo): string {
                        $values = array_map(function ($value) use ($pdo): string {
                            if ($value === null) {
                                return 'NULL';
                            }

                            return $pdo->quote((string) $value);
                        }, array_values($row));

                        return '(' . implode(', ', $values) . ')';
                    }, $rows);

                    $write('INSERT INTO ' . $safeTable . ' ' . $columns . ' VALUES');
                    $write(implode(",\n", $valuesList) . ';');
                    $offset += $chunkSize;
                }

                if ($offset > 0) {
                    $write();
                }
            }

            $write('SET FOREIGN_KEY_CHECKS=1;');
        } finally {
            fclose($handle);
        }

        return [
            'table_count' => count($tables),
            'row_limit_per_table' => null,
            'chunk_size' => $chunkSize,
        ];
    }

    private function quoteMysqlIdentifier(string $identifier): string
    {
        return '`' . str_replace('`', '``', $identifier) . '`';
    }

    private function requestServerBackup(array $server, string $exportUuid): array
    {
        $backupUuid = $this->generateUuid();
        $result = [
            'server_id' => (int) $server['id'],
            'server_uuid' => $server['uuid'] ?? null,
            'backup_uuid' => $backupUuid,
            'status' => 'skipped',
            'message' => null,
        ];

        try {
            $node = Node::getNodeById((int) $server['node_id']);
            if (!$node) {
                $result['message'] = 'Node not found';

                return $result;
            }

            $backupId = Backup::createBackup([
                'server_id' => (int) $server['id'],
                'uuid' => $backupUuid,
                'name' => 'Personal data export backup ' . $exportUuid,
                'ignored_files' => '[]',
                'disk' => 'wings',
                'is_successful' => 0,
                'is_locked' => 1,
            ]);

            if (!$backupId) {
                $result['status'] = 'failed';
                $result['message'] = 'Failed to create backup database record';

                return $result;
            }

            $wings = new Wings(
                $node['fqdn'],
                (int) $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30
            );
            $response = $wings->getServer()->createBackup((string) $server['uuid'], 'wings', $backupUuid, '[]');

            if (!$response->isSuccessful()) {
                Backup::deleteBackup((int) $backupId);
                $result['status'] = 'failed';
                $result['message'] = $response->getError();

                return $result;
            }

            $result['status'] = 'requested';
            $result['backup_id'] = (int) $backupId;
            $result['message'] = 'Wings backup requested. The export worker will wait briefly for it, download it, and extract it into this export.';

            return $result;
        } catch (\Throwable $e) {
            $result['status'] = 'failed';
            $result['message'] = $e->getMessage();

            return $result;
        }
    }

    private function waitForBackupCompletion(string $backupUuid): ?array
    {
        $deadline = time() + self::BACKUP_WAIT_SECONDS;
        while (true) {
            $backup = Backup::getBackupByUuid($backupUuid);
            if ($backup && (int) ($backup['is_successful'] ?? 0) === 1) {
                return $backup;
            }

            if (time() >= $deadline) {
                break;
            }

            sleep(self::BACKUP_WAIT_INTERVAL_SECONDS);
        }

        return null;
    }

    private function downloadBackupArchive(array $server, array $backup, string $archivePath): void
    {
        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            throw new \RuntimeException('Node not found for backup download');
        }

        $owner = $this->fetchRowById(Database::getPdoConnection(), 'featherpanel_users', (int) $server['owner_id']);
        $ownerUuid = (string) ($owner['uuid'] ?? '');
        if ($ownerUuid === '') {
            throw new \RuntimeException('Server owner not found for backup download token');
        }

        $baseWingsUrl = rtrim(WingsUrlHelper::buildFromNode($node), '/');
        $jwtService = new JwtService(
            (string) $node['daemon_token'],
            App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.local'),
            $baseWingsUrl
        );

        $jwtToken = $jwtService->generateBackupToken(
            (string) $server['uuid'],
            $ownerUuid,
            ['backup.download'],
            (string) $backup['uuid'],
            'download'
        );

        $downloadUrl = $baseWingsUrl . '/download/backup?token=' . rawurlencode($jwtToken)
            . '&server=' . rawurlencode((string) $server['uuid'])
            . '&backup=' . rawurlencode((string) $backup['uuid']);

        $client = new Client([
            'timeout' => 300,
            'verify' => false,
            'http_errors' => false,
        ]);
        $response = $client->get($downloadUrl, ['sink' => $archivePath]);
        $statusCode = $response->getStatusCode();
        if ($statusCode < 200 || $statusCode >= 300) {
            @unlink($archivePath);
            throw new \RuntimeException('Backup archive download failed with HTTP status ' . $statusCode);
        }
        if (!is_file($archivePath) || filesize($archivePath) === 0) {
            @unlink($archivePath);
            throw new \RuntimeException('Backup archive download produced an empty file');
        }
    }

    private function extractBackupArchive(string $archivePath, string $targetDir): array
    {
        $this->prepareDirectory($targetDir);

        $zip = new \ZipArchive();
        $opened = $zip->open($archivePath);
        if ($opened === true) {
            $extractedFiles = 0;
            for ($i = 0; $i < $zip->numFiles; ++$i) {
                $name = $zip->getNameIndex($i);
                if (!is_string($name) || !$this->isSafeArchivePath($name)) {
                    continue;
                }
                $zip->extractTo($targetDir, $name);
                ++$extractedFiles;
            }
            $zip->close();

            return [
                'success' => true,
                'format' => 'zip',
                'message' => 'Backup archive extracted',
                'entries' => $extractedFiles,
            ];
        }

        try {
            $tarPath = $archivePath;
            if (str_ends_with($archivePath, '.gz')) {
                $phar = new \PharData($archivePath);
                $tarPath = substr($archivePath, 0, -3);
                if (!is_file($tarPath)) {
                    $phar->decompress();
                }
            }

            $phar = new \PharData($tarPath);
            $phar->extractTo($targetDir, null, true);

            return [
                'success' => true,
                'format' => str_ends_with($archivePath, '.gz') ? 'tar.gz' : 'tar',
                'message' => 'Backup archive extracted',
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'format' => 'unknown',
                'message' => 'Failed to extract backup archive: ' . $e->getMessage(),
            ];
        }
    }

    private function isSafeArchivePath(string $path): bool
    {
        $normalized = str_replace('\\', '/', $path);

        return !str_starts_with($normalized, '/')
            && !str_contains($normalized, '../')
            && !str_contains($normalized, '..\\')
            && $normalized !== '..';
    }

    private function buildOrderByClause(array $columns): string
    {
        if (in_array('id', $columns, true)) {
            return ' ORDER BY `id` ASC';
        }

        if (in_array('created_at', $columns, true)) {
            return ' ORDER BY `created_at` ASC';
        }

        return '';
    }

    private function fetchRowById(\PDO $pdo, string $table, int $id): ?array
    {
        if ($id <= 0 || !$this->tableExists($pdo, $table)) {
            return null;
        }

        $columns = $this->getColumns($pdo, $table);
        if (!in_array('id', $columns, true)) {
            return null;
        }

        $stmt = $pdo->prepare('SELECT * FROM `' . $table . '` WHERE `id` = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    private function fetchRowsByIds(\PDO $pdo, string $table, array $ids): array
    {
        $ids = $this->uniqueInts($ids);
        if (empty($ids) || !$this->tableExists($pdo, $table)) {
            return [];
        }

        $columns = $this->getColumns($pdo, $table);
        if (!in_array('id', $columns, true)) {
            return [];
        }

        $params = [];
        $placeholders = [];
        foreach ($ids as $id) {
            $param = 'p' . count($params);
            $placeholders[] = ':' . $param;
            $params[$param] = $id;
        }

        $stmt = $pdo->prepare('SELECT * FROM `' . $table . '` WHERE `id` IN (' . implode(', ', $placeholders) . ')');
        $stmt->execute($params);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $mapped = [];
        foreach ($rows as $row) {
            $mapped[(int) $row['id']] = $row;
        }

        return $mapped;
    }

    private function fetchRowsByColumn(\PDO $pdo, string $table, string $column, mixed $value): array
    {
        if (!$this->tableExists($pdo, $table)) {
            return [];
        }

        $columns = $this->getColumns($pdo, $table);
        if (!in_array($column, $columns, true)) {
            return [];
        }

        $stmt = $pdo->prepare('SELECT * FROM `' . $table . '` WHERE `' . $column . '` = :value' . $this->buildOrderByClause($columns));
        $stmt->execute(['value' => $value]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    private function resolvePublicFilePath(string $filePath): ?string
    {
        $normalizedPath = ltrim($filePath, '/');
        if ($normalizedPath === '') {
            return null;
        }

        $publicRoot = $this->getPublicRoot();
        $fullPath = realpath($publicRoot . '/' . $normalizedPath);
        $publicRealPath = realpath($publicRoot);

        if ($fullPath === false || $publicRealPath === false || !str_starts_with($fullPath, $publicRealPath . DIRECTORY_SEPARATOR)) {
            return null;
        }

        return $fullPath;
    }

    private function generateUuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr(ord($bytes[6]) & 0x0F | 0x40);
        $bytes[8] = chr(ord($bytes[8]) & 0x3F | 0x80);
        $hex = bin2hex($bytes);

        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 12, 4),
            substr($hex, 16, 4),
            substr($hex, 20, 12)
        );
    }

    private function addEqualsFilter(array &$clauses, array &$params, array $columns, string $column, mixed $value, bool $enabled = true): void
    {
        if (!$enabled || !in_array($column, $columns, true) || $value === null || $value === '') {
            return;
        }

        $param = 'p' . count($params);
        $clauses[] = '`' . $column . '` = :' . $param;
        $params[$param] = $value;
    }

    private function addInFilter(array &$clauses, array &$params, array $columns, string $column, array $values): void
    {
        if (!in_array($column, $columns, true) || empty($values)) {
            return;
        }

        $placeholders = [];
        foreach ($values as $value) {
            $param = 'p' . count($params);
            $placeholders[] = ':' . $param;
            $params[$param] = $value;
        }

        $clauses[] = '`' . $column . '` IN (' . implode(', ', $placeholders) . ')';
    }

    private function addExactIdFilter(array &$clauses, array &$params, string $table, array $columns, string $targetTable, array $ids): void
    {
        if ($table !== $targetTable || !in_array('id', $columns, true) || empty($ids)) {
            return;
        }

        $this->addInFilter($clauses, $params, $columns, 'id', $ids);
    }

    private function selectIds(\PDO $pdo, string $table, array $conditions, string $idColumn = 'id'): array
    {
        if (!$this->tableExists($pdo, $table)) {
            return [];
        }

        $columns = $this->getColumns($pdo, $table);
        if (!in_array($idColumn, $columns, true)) {
            return [];
        }

        $where = [];
        $params = [];
        foreach ($conditions as $column => $value) {
            if (!in_array($column, $columns, true) || $value === null || $value === '') {
                return [];
            }
            $where[] = '`' . $column . '` = :' . $column;
            $params[$column] = $value;
        }

        $stmt = $pdo->prepare('SELECT `' . $idColumn . '` FROM `' . $table . '` WHERE ' . implode(' AND ', $where));
        $stmt->execute($params);

        return $this->uniqueInts($stmt->fetchAll(\PDO::FETCH_COLUMN));
    }

    private function selectIdsIn(\PDO $pdo, string $table, string $column, array $values, string $idColumn = 'id'): array
    {
        if (!$this->tableExists($pdo, $table) || empty($values)) {
            return [];
        }

        $columns = $this->getColumns($pdo, $table);
        if (!in_array($idColumn, $columns, true) || !in_array($column, $columns, true)) {
            return [];
        }

        $params = [];
        $placeholders = [];
        foreach ($values as $value) {
            $param = 'p' . count($params);
            $placeholders[] = ':' . $param;
            $params[$param] = $value;
        }

        $stmt = $pdo->prepare('SELECT `' . $idColumn . '` FROM `' . $table . '` WHERE `' . $column . '` IN (' . implode(', ', $placeholders) . ')');
        $stmt->execute($params);

        return $this->uniqueInts($stmt->fetchAll(\PDO::FETCH_COLUMN));
    }

    private function selectSubuserServerIdsWithPermission(\PDO $pdo, int $userId, string $permission): array
    {
        if (!$this->tableExists($pdo, 'featherpanel_server_subusers') || $userId <= 0 || $permission === '') {
            return [];
        }

        $stmt = $pdo->prepare('SELECT `server_id`, `permissions` FROM `featherpanel_server_subusers` WHERE `user_id` = :user_id');
        $stmt->execute(['user_id' => $userId]);

        $serverIds = [];
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
            $permissions = json_decode((string) ($row['permissions'] ?? '[]'), true);
            if (!is_array($permissions)) {
                continue;
            }
            if (in_array('*', $permissions, true) || in_array($permission, $permissions, true)) {
                $serverIds[] = (int) $row['server_id'];
            }
        }

        return $this->uniqueInts($serverIds);
    }

    private function selectVisibleTicketMessageIds(\PDO $pdo, array $ticketIds): array
    {
        if (!$this->tableExists($pdo, 'featherpanel_ticket_messages') || empty($ticketIds)) {
            return [];
        }

        $params = [];
        $placeholders = [];
        foreach ($ticketIds as $ticketId) {
            $param = 'p' . count($params);
            $placeholders[] = ':' . $param;
            $params[$param] = $ticketId;
        }

        $stmt = $pdo->prepare(
            'SELECT `id` FROM `featherpanel_ticket_messages`
             WHERE `ticket_id` IN (' . implode(', ', $placeholders) . ')
               AND `is_internal` = 0'
        );
        $stmt->execute($params);

        return $this->uniqueInts($stmt->fetchAll(\PDO::FETCH_COLUMN));
    }

    private function sanitizeRows(array $rows): array
    {
        return array_map(function (array $row): array {
            foreach ($row as $column => $value) {
                if ($this->isSecretColumn((string) $column)) {
                    $row[$column] = $this->secretMetadata($value);
                }
            }

            return $row;
        }, $rows);
    }

    private function isSecretColumn(string $column): bool
    {
        $normalized = strtolower($column);

        foreach ($this->secretColumns as $secretColumn) {
            if ($normalized === $secretColumn || str_contains($normalized, $secretColumn)) {
                return true;
            }
        }

        return false;
    }

    private function secretMetadata(mixed $value): array
    {
        if ($value === null || $value === '') {
            return [
                'present' => false,
                'length' => 0,
            ];
        }

        return [
            'present' => true,
            'length' => strlen((string) $value),
            'sha256' => hash('sha256', (string) $value),
            'redacted' => true,
        ];
    }

    private function writeJson(string $path, array $data): void
    {
        $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($encoded === false) {
            throw new \RuntimeException('Failed to encode export JSON');
        }

        if (file_put_contents($path, $encoded . PHP_EOL) === false) {
            throw new \RuntimeException('Failed to write export JSON: ' . $path);
        }
    }

    private function getTables(\PDO $pdo): array
    {
        if (!empty($this->tableCache)) {
            return $this->tableCache;
        }

        $stmt = $pdo->query('SHOW TABLES');
        $this->tableCache = $stmt->fetchAll(\PDO::FETCH_COLUMN);

        return $this->tableCache;
    }

    private function tableExists(\PDO $pdo, string $table): bool
    {
        return in_array($table, $this->getTables($pdo), true);
    }

    private function getColumns(\PDO $pdo, string $table): array
    {
        if (isset($this->columnCache[$table])) {
            return $this->columnCache[$table];
        }

        if (!$this->tableExists($pdo, $table)) {
            return [];
        }

        $stmt = $pdo->query('DESCRIBE `' . $table . '`');
        $this->columnCache[$table] = array_map(
            fn (array $column): string => $column['Field'],
            $stmt->fetchAll(\PDO::FETCH_ASSOC)
        );

        return $this->columnCache[$table];
    }

    private function uniqueInts(array $values): array
    {
        $ints = array_map('intval', $values);
        $ints = array_filter($ints, fn (int $value): bool => $value > 0);

        return array_values(array_unique($ints));
    }

    private function getStorageRoot(): string
    {
        if (defined('APP_STORAGE_DIR')) {
            $base = realpath((string) APP_STORAGE_DIR);
            if ($base === false) {
                $base = $this->normalizePath((string) APP_STORAGE_DIR);
            }
        } else {
            $base = dirname(__DIR__, 4) . '/storage';
        }

        return rtrim($base, '/\\') . '/user-data-exports';
    }

    private function getPublicRoot(): string
    {
        if (defined('APP_DIR')) {
            $publicRoot = realpath(rtrim((string) APP_DIR, '/\\') . '/public');
            if ($publicRoot !== false) {
                return $publicRoot;
            }

            return $this->normalizePath(rtrim((string) APP_DIR, '/\\') . '/public');
        }

        return dirname(__DIR__, 4) . '/public';
    }

    private function normalizePath(string $path): string
    {
        $path = str_replace('\\', '/', $path);
        $isAbsolute = str_starts_with($path, '/');
        $parts = [];

        foreach (explode('/', $path) as $part) {
            if ($part === '' || $part === '.') {
                continue;
            }
            if ($part === '..') {
                array_pop($parts);
                continue;
            }
            $parts[] = $part;
        }

        return ($isAbsolute ? '/' : '') . implode('/', $parts);
    }

    private function prepareDirectory(string $path): void
    {
        if (is_dir($path)) {
            if (!is_writable($path)) {
                throw new \RuntimeException('Export directory is not writable: ' . $path);
            }

            return;
        }

        $parent = dirname($path);
        if (is_dir($parent) && !is_writable($parent)) {
            throw new \RuntimeException('Export directory parent is not writable: ' . $parent);
        }

        $previousError = error_get_last();
        if (!@mkdir($path, 0770, true) && !is_dir($path)) {
            $error = error_get_last();
            $message = is_array($error) && $error !== $previousError && isset($error['message'])
                ? ' (' . $error['message'] . ')'
                : '';

            throw new \RuntimeException('Failed to create export directory: ' . $path . $message);
        }

        @chmod($path, 0770);
        clearstatcache(true, $path);
        if (!is_writable($path)) {
            throw new \RuntimeException('Created export directory is not writable: ' . $path);
        }
    }

    private function sanitizePathSegment(string $segment): string
    {
        return preg_replace('/[^a-zA-Z0-9._-]/', '_', $segment) ?: 'export';
    }
}
