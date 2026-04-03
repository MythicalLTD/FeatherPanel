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

namespace App\Services\Backup;

use App\App;
use App\Chat\Backup;
use App\Services\Wings\Wings;
use App\Chat\VmInstanceBackup;
use App\Config\ConfigInterface;
use App\Services\Proxmox\Proxmox;

/**
 * Backup retention: panel default plus optional per-server / per-VM override.
 */
final class BackupFifoEviction
{
    public const MODE_HARD_LIMIT = 'hard_limit';

    public const MODE_FIFO_ROLLING = 'fifo_rolling';

    public static function getPanelRetentionMode(): string
    {
        $app = App::getInstance(true);
        $mode = $app->getConfig()->getSetting(ConfigInterface::SERVER_BACKUP_RETENTION_MODE, self::MODE_HARD_LIMIT);

        return $mode === self::MODE_FIFO_ROLLING ? self::MODE_FIFO_ROLLING : self::MODE_HARD_LIMIT;
    }

    /**
     * @param mixed $value DB value or API payload (null / empty / inherit => no override)
     *
     * @return self::MODE_HARD_LIMIT|self::MODE_FIFO_ROLLING|null
     */
    public static function normalizeEntityOverride(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        if (!is_string($value)) {
            return null;
        }
        $v = trim($value);
        if ($v === '' || strcasecmp($v, 'inherit') === 0 || strcasecmp($v, 'panel') === 0) {
            return null;
        }
        if ($v === self::MODE_FIFO_ROLLING) {
            return self::MODE_FIFO_ROLLING;
        }
        if ($v === self::MODE_HARD_LIMIT) {
            return self::MODE_HARD_LIMIT;
        }

        return null;
    }

    /**
     * @param array<string, mixed> $server Row from featherpanel_servers
     *
     * @return array{
     *   panel_backup_retention_mode: string,
     *   backup_retention_mode_override: string|null,
     *   effective_backup_retention_mode: string,
     *   fifo_rolling_enabled: bool
     * }
     */
    public static function retentionMetaForServer(array $server): array
    {
        $panel = self::getPanelRetentionMode();
        $override = self::normalizeEntityOverride($server['backup_retention_mode'] ?? null);
        $effective = $override ?? $panel;

        return [
            'panel_backup_retention_mode' => $panel,
            'backup_retention_mode_override' => $override,
            'effective_backup_retention_mode' => $effective,
            'fifo_rolling_enabled' => $effective === self::MODE_FIFO_ROLLING,
        ];
    }

    /**
     * @param array<string, mixed> $instance Row from featherpanel_vm_instances
     *
     * @return array{
     *   panel_backup_retention_mode: string,
     *   backup_retention_mode_override: string|null,
     *   effective_backup_retention_mode: string,
     *   fifo_rolling_enabled: bool
     * }
     */
    public static function retentionMetaForVm(array $instance): array
    {
        $panel = self::getPanelRetentionMode();
        $override = self::normalizeEntityOverride($instance['backup_retention_mode'] ?? null);
        $effective = $override ?? $panel;

        return [
            'panel_backup_retention_mode' => $panel,
            'backup_retention_mode_override' => $override,
            'effective_backup_retention_mode' => $effective,
            'fifo_rolling_enabled' => $effective === self::MODE_FIFO_ROLLING,
        ];
    }

    public static function isFifoRollingForServer(array $server): bool
    {
        return self::retentionMetaForServer($server)['fifo_rolling_enabled'];
    }

    public static function isFifoRollingForVm(array $instance): bool
    {
        return self::retentionMetaForVm($instance)['fifo_rolling_enabled'];
    }

    /**
     * Delete the oldest unlocked Wings backup for a server (Wings + soft-delete row).
     *
     * @return array{message: string, code: string, status: int}|null
     */
    public static function evictOldestWingsBackup(int $serverId, string $serverUuid, Wings $wings): ?array
    {
        $app = App::getInstance(true);
        $victim = Backup::getOldestUnlockedBackupForServer($serverId);
        if ($victim === null) {
            return [
                'message' => 'Backup limit reached. FIFO rotation needs at least one unlocked backup; unlock or delete one manually.',
                'code' => 'BACKUP_LIMIT_REACHED',
                'status' => 400,
            ];
        }

        $response = $wings->getServer()->deleteBackup($serverUuid, (string) $victim['uuid']);
        if (!$response->isSuccessful()) {
            return [
                'message' => 'Failed to remove oldest backup for rotation: ' . $response->getError(),
                'code' => 'FIFO_EVICTION_FAILED',
                'status' => $response->getStatusCode() >= 400 ? $response->getStatusCode() : 500,
            ];
        }

        if (!Backup::deleteBackup((int) $victim['id'])) {
            $app->getLogger()->error('FIFO eviction: Wings deleted backup ' . $victim['uuid'] . ' but DB soft-delete failed');

            return [
                'message' => 'Removed backup from node but failed to update backup record',
                'code' => 'FIFO_EVICTION_DB_FAILED',
                'status' => 500,
            ];
        }

        $app->getLogger()->info('FIFO backup rotation evicted Wings backup ' . $victim['uuid'] . ' for server ' . $serverUuid);

        return null;
    }

    /**
     * Delete the oldest stored VM backup volume (Proxmox + DB row).
     *
     * @param array<string, mixed> $instance VM instance row (needs id, pve_node)
     *
     * @return array{message: string, code: string, status: int}|null
     */
    public static function evictOldestVmBackup(array $instance, Proxmox $client): ?array
    {
        $app = App::getInstance(true);
        $instanceId = (int) ($instance['id'] ?? 0);
        if ($instanceId <= 0) {
            return [
                'message' => 'Invalid VM instance',
                'code' => 'INVALID_INSTANCE',
                'status' => 400,
            ];
        }

        $victim = VmInstanceBackup::getOldestForInstanceId($instanceId);
        if ($victim === null) {
            return [
                'message' => 'Backup limit reached and no existing backup volume could be rotated.',
                'code' => 'BACKUP_LIMIT_REACHED',
                'status' => 422,
            ];
        }

        $node = isset($instance['pve_node']) && is_string($instance['pve_node']) ? trim($instance['pve_node']) : '';
        $vmid = (int) ($instance['vmid'] ?? 0);
        if ($node === '' && $vmid > 0) {
            $find = $client->findNodeByVmid($vmid);
            $node = $find['ok'] ? (string) $find['node'] : '';
        }
        if ($node === '') {
            return [
                'message' => 'Cannot rotate VM backup: could not resolve Proxmox node',
                'code' => 'FIFO_EVICTION_NO_NODE',
                'status' => 400,
            ];
        }

        $res = $client->deleteBackupVolume($node, (string) $victim['storage'], (string) $victim['volid']);
        if (!$res['ok']) {
            return [
                'message' => $res['error'] ?? 'Failed to delete oldest VM backup for rotation',
                'code' => 'FIFO_EVICTION_FAILED',
                'status' => 500,
            ];
        }

        if (!VmInstanceBackup::deleteById((int) $victim['id'])) {
            $app->getLogger()->error('FIFO VM eviction: Proxmox deleted volid ' . $victim['volid'] . ' but DB delete failed');

            return [
                'message' => 'Removed backup from storage but failed to update backup record',
                'code' => 'FIFO_EVICTION_DB_FAILED',
                'status' => 500,
            ];
        }

        $app->getLogger()->info('FIFO VM backup rotation evicted ' . $victim['volid'] . ' for instance id ' . $instanceId);

        return null;
    }
}
