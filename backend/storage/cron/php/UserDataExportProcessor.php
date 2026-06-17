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

namespace App\Cron;

use App\App;
use App\Chat\Node;
use App\Chat\Backup;
use App\Chat\Ticket;
use App\Chat\Database;
use App\Chat\TimedTask;
use App\Chat\TicketStatus;
use App\Chat\TicketMessage;
use App\Chat\UserDataExport;
use App\Services\Wings\Wings;
use App\Chat\TicketAttachment;
use App\Config\ConfigInterface;
use App\Cli\Utils\MinecraftColorCodeSupport;
use App\Services\Tickets\TicketNotificationService;
use App\Services\UserDataExport\UserDataExportService;

/**
 * Processes queued user data export requests.
 */
class UserDataExportProcessor implements TimeTask
{
    private const TASK_NAME = 'user-data-export-processor';
    private const MAX_EXPORTS_PER_RUN = 3;
    private const MAX_ATTEMPTS = 3;
    private const EXPORT_RETENTION_HOURS = 24;
    private const CLEANUP_LIMIT = 25;

    /**
     * Entry point for the cron job.
     */
    public function run()
    {
        $cron = new Cron(self::TASK_NAME, '1M');
        $force = true;

        try {
            $ran = $cron->runIfDue(function () {
                $cleaned = $this->cleanupExpiredExports();
                $processed = $this->processExports();
                TimedTask::markRun(
                    self::TASK_NAME,
                    true,
                    'Processed ' . $processed . ' user data export(s), cleaned ' . $cleaned . ' expired export(s)'
                );
            }, $force);

            if (!$ran) {
                return;
            }
        } catch (\Exception $e) {
            App::getInstance(false, true)->getLogger()->error('Failed to process user data exports: ' . $e->getMessage());
            TimedTask::markRun(self::TASK_NAME, false, $e->getMessage());
        }
    }

    private function processExports(): int
    {
        $processed = 0;
        $service = new UserDataExportService();

        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing user data exports...');

        for ($i = 0; $i < self::MAX_EXPORTS_PER_RUN; ++$i) {
            $export = UserDataExport::claimNextPending(self::MAX_ATTEMPTS);
            if ($export === null) {
                break;
            }

            try {
                $this->processExport($service, $export);
                ++$processed;
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessed user data export: ' . $export['uuid']);
            } catch (\Throwable $e) {
                UserDataExport::markFailed((int) $export['id'], $e->getMessage());
                App::getInstance(false, true)->getLogger()->error('User data export failed (' . $export['uuid'] . '): ' . $e->getMessage());
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed user data export: ' . $e->getMessage());
            }
        }

        return $processed;
    }

    private function cleanupExpiredExports(): int
    {
        $cleaned = 0;
        $exports = UserDataExport::getExpiredForCleanup(self::EXPORT_RETENTION_HOURS, self::CLEANUP_LIMIT);
        if (empty($exports)) {
            return 0;
        }

        MinecraftColorCodeSupport::sendOutputWithNewLine('&aCleaning expired user data exports...');

        foreach ($exports as $export) {
            try {
                $this->cleanupExport($export);
                ++$cleaned;
            } catch (\Throwable $e) {
                App::getInstance(false, true)->getLogger()->warning(
                    'Failed to clean expired user data export ' . ($export['uuid'] ?? 'unknown') . ': ' . $e->getMessage()
                );
            }
        }

        return $cleaned;
    }

    private function cleanupExport(array $export): void
    {
        $ticketId = (int) ($export['ticket_id'] ?? 0);
        if ($ticketId > 0) {
            $this->deleteTicketAttachmentFiles($ticketId);
        }

        if (!empty($export['file_path']) && is_string($export['file_path'])) {
            $this->deleteAttachmentPath($export['file_path']);
        }

        $this->cleanupWingsExportBackups((string) ($export['uuid'] ?? ''));

        if ($ticketId > 0 && Ticket::getById($ticketId) !== null) {
            Ticket::delete($ticketId);
        } else {
            UserDataExport::deleteById((int) $export['id']);
        }
    }

    private function deleteTicketAttachmentFiles(int $ticketId): void
    {
        foreach (TicketAttachment::getAll($ticketId, null, 1000, 0) as $attachment) {
            if (isset($attachment['file_path']) && is_string($attachment['file_path'])) {
                $this->deleteAttachmentPath($attachment['file_path']);
            }
        }
    }

    private function deleteAttachmentPath(string $filePath): void
    {
        $resolvedPath = $this->resolveAttachmentPath($filePath);
        if ($resolvedPath !== null && is_file($resolvedPath) && !@unlink($resolvedPath)) {
            App::getInstance(false, true)->getLogger()->warning('Failed to delete user data export attachment: ' . $resolvedPath);
        }
    }

    private function resolveAttachmentPath(string $filePath): ?string
    {
        $normalized = ltrim($filePath, '/\\');
        if (strpos($normalized, 'attachments/') !== 0 || strpos($normalized, '..') !== false) {
            return null;
        }

        $relative = substr($normalized, strlen('attachments/'));
        if ($relative === '') {
            return null;
        }

        $attachmentsDir = $this->getAttachmentsDirectory();
        $realAttachmentsDir = realpath($attachmentsDir);
        if ($realAttachmentsDir === false) {
            return null;
        }

        $realPath = realpath($attachmentsDir . '/' . $relative);
        if ($realPath === false) {
            return null;
        }

        $realAttachmentsDir = rtrim($realAttachmentsDir, '/\\') . DIRECTORY_SEPARATOR;
        if (strpos($realPath, $realAttachmentsDir) !== 0) {
            return null;
        }

        return $realPath;
    }

    private function cleanupWingsExportBackups(string $exportUuid): void
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $exportUuid)) {
            return;
        }

        foreach ($this->getExportBackups($exportUuid) as $backup) {
            try {
                $node = Node::getNodeById((int) $backup['node_id']);
                if ($node !== null && !empty($backup['server_uuid']) && !empty($backup['uuid'])) {
                    $wings = new Wings(
                        $node['fqdn'],
                        (int) $node['daemonListen'],
                        $node['scheme'],
                        $node['daemon_token'],
                        30
                    );
                    $response = $wings->getServer()->deleteBackup((string) $backup['server_uuid'], (string) $backup['uuid']);
                    if (!$response->isSuccessful()) {
                        App::getInstance(false, true)->getLogger()->warning(
                            'Failed to delete user data export Wings backup ' . $backup['uuid'] . ': ' . $response->getError()
                        );
                    }
                }
            } catch (\Throwable $e) {
                App::getInstance(false, true)->getLogger()->warning(
                    'Failed to delete user data export Wings backup ' . ($backup['uuid'] ?? 'unknown') . ': ' . $e->getMessage()
                );
            }

            Backup::deleteBackup((int) $backup['id']);
        }
    }

    private function getExportBackups(string $exportUuid): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT backups.*, servers.uuid AS server_uuid, servers.node_id
             FROM featherpanel_server_backups backups
             INNER JOIN featherpanel_servers servers ON servers.id = backups.server_id
             WHERE backups.name = :name
               AND backups.deleted_at IS NULL'
        );
        $stmt->execute(['name' => 'Personal data export backup ' . $exportUuid]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    private function processExport(UserDataExportService $service, array $export): void
    {
        $ticket = Ticket::getById((int) $export['ticket_id']);
        if ($ticket === null) {
            throw new \RuntimeException('Ticket not found for export');
        }

        $result = $service->buildExport($export);
        $exportDir = $result['export_dir'];

        try {
            $filename = $this->buildAttachmentFilename((string) $ticket['uuid'], (string) $export['uuid']);
            $attachmentDir = $this->getAttachmentsDirectory();
            if (!is_dir($attachmentDir) && !mkdir($attachmentDir, 0755, true) && !is_dir($attachmentDir)) {
                throw new \RuntimeException('Failed to create attachments directory');
            }

            $zipPath = $attachmentDir . '/' . $filename;
            $service->zipExportDirectory($exportDir, $zipPath);

            $messageId = TicketMessage::create([
                'ticket_id' => (int) $ticket['id'],
                'user_uuid' => null,
                'message' => $this->buildSystemReplyMessage($filename),
                'is_internal' => false,
            ]);

            if (!$messageId) {
                throw new \RuntimeException('Failed to create system reply for export ticket');
            }

            $createdMessage = TicketMessage::getById($messageId);
            if ($createdMessage) {
                TicketNotificationService::notifyReply($ticket, $createdMessage);
            }

            $attachmentId = TicketAttachment::create([
                'ticket_id' => (int) $ticket['id'],
                'message_id' => $messageId,
                'file_name' => $filename,
                'file_path' => '/attachments/' . $filename,
                'file_size' => filesize($zipPath) ?: 0,
                'file_type' => 'application/zip',
                'user_downloadable' => 1,
            ]);

            if (!$attachmentId) {
                @unlink($zipPath);
                throw new \RuntimeException('Failed to create ticket attachment for export');
            }

            UserDataExport::markCompleted((int) $export['id'], '/attachments/' . $filename);

            $this->closeExportTicket($ticket);
        } finally {
            $service->removeDirectory($exportDir);
        }
    }

    private function closeExportTicket(array $ticket): void
    {
        if (!empty($ticket['closed_at'])) {
            return;
        }

        $closedStatusId = null;
        foreach (TicketStatus::getAll(null, 100, 0) as $status) {
            if (isset($status['name']) && strtolower((string) $status['name']) === 'closed') {
                $closedStatusId = (int) $status['id'];
                break;
            }
        }

        if ($closedStatusId === null) {
            App::getInstance(false, true)->getLogger()->warning(
                'Personal data export ticket could not be closed: no "closed" ticket status configured'
            );

            return;
        }

        $updated = Ticket::update((int) $ticket['id'], [
            'status_id' => $closedStatusId,
            'closed_at' => date('Y-m-d H:i:s'),
        ]);

        if (!$updated) {
            App::getInstance(false, true)->getLogger()->warning(
                'Failed to close personal data export ticket: ' . ($ticket['uuid'] ?? 'unknown')
            );

            return;
        }

        $updatedTicket = Ticket::getById((int) $ticket['id']);
        if ($updatedTicket) {
            TicketNotificationService::notifyClosed($updatedTicket);
        }
    }

    private function buildSystemReplyMessage(string $filename): string
    {
        $appName = App::getInstance(false, true)->getConfig()->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');

        return implode("\n", [
            'Your personal data export has been generated automatically by ' . $appName . '.',
            '',
            'The export is attached to this ticket as `' . $filename . '`.',
            'Sensitive credentials and tokens are represented as metadata only and raw secret values are not included.',
        ]);
    }

    private function buildAttachmentFilename(string $ticketUuid, string $exportUuid): string
    {
        $safeTicketUuid = preg_replace('/[^a-zA-Z0-9._-]/', '_', $ticketUuid) ?: 'ticket';
        $safeExportUuid = preg_replace('/[^a-zA-Z0-9._-]/', '_', $exportUuid) ?: bin2hex(random_bytes(8));

        return $safeTicketUuid . '_data_export_' . $safeExportUuid . '.zip';
    }

    private function getAttachmentsDirectory(): string
    {
        $appDir = defined('APP_DIR') ? rtrim((string) APP_DIR, '/') : dirname(__DIR__, 3);

        return $appDir . '/public/attachments';
    }
}
