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
use App\Chat\VmNode;
use App\Chat\Database;
use App\Config\ConfigInterface;
use App\Services\Vm\Bandwidth;
use App\Services\Vm\VmInstanceUtil;
use App\Cli\Utils\MinecraftColorCodeSupport;
use App\Services\Notifications\InboxNotifier;

/**
 * ZVdsMonitor - polls Proxmox once per VDS node (/cluster/resources) and raises inbox,
 * email and Discord notifications for: a VDS that stopped without a panel power action,
 * sustained high CPU, and failed VDS backup tasks. Everything is controlled by the
 * admin settings in the "vds" category; users opt out per event under Account > Notifications.
 */
class ZVdsMonitor implements TimeTask
{
    /** Panel actions within this window before a stop mean the stop was expected. */
    private const EXPECTED_STOP_GRACE = 120;

    public function run()
    {
        $config = App::getInstance(false, true)->getConfig();
        $minutes = max(1, min(60, (int) $config->getSetting(ConfigInterface::VDS_MONITOR_INTERVAL_MINUTES, '5')));
        $cron = new Cron('vds-monitor', $minutes . 'M');
        $force = getenv('FP_CRON_FORCE') === '1';
        try {
            $cron->runIfDue(function () {
                $this->processTask();
            }, $force);
        } catch (\Exception $e) {
            App::getInstance(false, true)->getLogger()->error('Failed to process VdsMonitor: ' . $e->getMessage());
        }
    }

    private function processTask(): void
    {
        $config = App::getInstance(false, true)->getConfig();
        if ($config->getSetting(ConfigInterface::MODULE_VDS_ENABLED, 'true') === 'false'
            || $config->getSetting(ConfigInterface::VDS_MONITOR_ENABLED, 'true') !== 'true') {
            return;
        }
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing VdsMonitor...');

        $notifyDown = $config->getSetting(ConfigInterface::VDS_NOTIFY_DOWN_ENABLED, 'true') === 'true';
        $notifyCpu = $config->getSetting(ConfigInterface::VDS_NOTIFY_HIGH_CPU_ENABLED, 'true') === 'true';
        $notifyBackup = $config->getSetting(ConfigInterface::VDS_NOTIFY_BACKUP_FAILED_ENABLED, 'true') === 'true';
        $threshold = max(1, min(100, (int) $config->getSetting(ConfigInterface::VDS_HIGH_CPU_THRESHOLD, '90')));
        $duration = max(1, (int) $config->getSetting(ConfigInterface::VDS_HIGH_CPU_DURATION_MINUTES, '15'));
        $cooldown = max(1, (int) $config->getSetting(ConfigInterface::VDS_NOTIFY_COOLDOWN_HOURS, '6')) * 3600;

        $pdo = Database::getPdoConnection();

        $bandwidth = $config->getSetting(ConfigInterface::VDS_BANDWIDTH_ENABLED, 'true') === 'true';
        if ($notifyDown || $notifyCpu || $bandwidth) {
            $this->checkStates($pdo, $notifyDown, $notifyCpu, $threshold, $duration, $cooldown, $bandwidth);
        }
        if ($notifyBackup) {
            $this->checkFailedBackups($pdo);
        }
    }

    private function checkStates(\PDO $pdo, bool $notifyDown, bool $notifyCpu, int $threshold, int $duration, int $cooldown, bool $bandwidth = false): void
    {
        $rows = $pdo->query(
            'SELECT i.id, i.vmid, i.vm_node_id, i.hostname, i.user_uuid, i.status, i.suspended, i.suspension_reason, i.vm_type, i.bandwidth_limit_gb,
                    s.last_status, s.cpu_high_since, s.last_checked_at
             FROM featherpanel_vm_instances i
             LEFT JOIN featherpanel_vm_monitor_state s ON s.vm_instance_id = i.id
             WHERE i.vm_node_id IS NOT NULL'
        )->fetchAll(\PDO::FETCH_ASSOC);

        $byNode = [];
        foreach ($rows as $row) {
            $byNode[(int) $row['vm_node_id']][] = $row;
        }

        $upsert = $pdo->prepare(
            'INSERT INTO featherpanel_vm_monitor_state (vm_instance_id, last_status, cpu_high_since, last_checked_at)
             VALUES (:id, :status, :since, NOW())
             ON DUPLICATE KEY UPDATE last_status = VALUES(last_status), cpu_high_since = VALUES(cpu_high_since), last_checked_at = NOW()'
        );
        $recentAction = $pdo->prepare(
            "SELECT (SELECT COUNT(*) FROM featherpanel_vm_tasks WHERE instance_id = :id1 AND created_at >= :since1)
                  + (SELECT COUNT(*) FROM featherpanel_vm_instance_activities WHERE vm_instance_id = :id2 AND created_at >= :since2 AND event NOT LIKE '%console%')"
        );

        foreach ($byNode as $nodeId => $instances) {
            $vmNode = VmNode::getVmNodeById($nodeId);
            if (!$vmNode) {
                continue;
            }
            try {
                $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
                $res = $client->apiGet('/api2/json/cluster/resources', ['type' => 'vm']);
            } catch (\Throwable $e) {
                $res = ['ok' => false, 'error' => $e->getMessage()];
            }
            if (!$res['ok'] || !is_array($res['data'] ?? null)) {
                // Node unreachable: keep the previous state so we don't report false "down" events.
                MinecraftColorCodeSupport::sendOutputWithNewLine('&eVdsMonitor: node ' . $nodeId . ' unreachable, skipped');
                continue;
            }
            $byVmid = [];
            foreach ($res['data'] as $vm) {
                if (is_array($vm) && isset($vm['vmid'])) {
                    $byVmid[(int) $vm['vmid']] = $vm;
                }
            }

            foreach ($instances as $inst) {
                $vm = $byVmid[(int) $inst['vmid']] ?? null;
                if ($vm === null) {
                    continue;
                }
                $status = (string) ($vm['status'] ?? 'unknown');
                $cpuPct = (int) round(((float) ($vm['cpu'] ?? 0)) * 100);
                $since = $inst['cpu_high_since'];
                $now = time();

                if ($notifyDown && $inst['last_status'] === 'running' && $status === 'stopped' && (int) $inst['suspended'] === 0) {
                    $windowStart = date('Y-m-d H:i:s', ($inst['last_checked_at'] ? strtotime((string) $inst['last_checked_at']) : $now) - self::EXPECTED_STOP_GRACE);
                    $recentAction->execute(['id1' => $inst['id'], 'since1' => $windowStart, 'id2' => $inst['id'], 'since2' => $windowStart]);
                    if ((int) $recentAction->fetchColumn() === 0) {
                        InboxNotifier::vdsDown($inst, $cooldown);
                    }
                }

                if ($status === 'running' && $cpuPct >= $threshold) {
                    if ($since === null) {
                        $since = date('Y-m-d H:i:s', $now);
                    } elseif ($notifyCpu && ($now - strtotime((string) $since)) >= $duration * 60) {
                        InboxNotifier::vdsHighCpu($inst, $cpuPct, $duration, $cooldown);
                    }
                } else {
                    $since = null;
                }

                $upsert->execute(['id' => $inst['id'], 'status' => mb_substr($status, 0, 16), 'since' => $since]);

                if ($bandwidth) {
                    try {
                        Bandwidth::sample($pdo, $inst, $vm, $client);
                    } catch (\Throwable $e) {
                        App::getInstance(false, true)->getLogger()->warning('VDS bandwidth sample failed: ' . $e->getMessage());
                    }
                }
            }
        }
    }

    private function checkFailedBackups(\PDO $pdo): void
    {
        $tasks = $pdo->query(
            "SELECT t.task_id, t.error, i.id, i.hostname, i.user_uuid
             FROM featherpanel_vm_tasks t
             JOIN featherpanel_vm_instances i ON i.id = t.instance_id
             WHERE t.task_type = 'backup' AND t.status = 'failed' AND t.updated_at >= NOW() - INTERVAL 1 DAY"
        )->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($tasks as $task) {
            // Group key is per task with a 30 day window, so each failure is sent once.
            InboxNotifier::vdsBackupFailed($task, (string) $task['task_id'], (string) ($task['error'] ?? ''));
        }
    }
}
