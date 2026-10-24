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

namespace App\Services\Vm;

use App\App;
use App\Chat\VmInstance;
use App\Chat\VmInstanceActivity;
use App\Config\ConfigInterface;
use App\Services\Proxmox\Proxmox;
use App\Helpers\ModerationReasonHelper;
use App\Services\Notifications\InboxNotifier;

/**
 * Monthly VDS traffic accounting. ZVdsMonitor feeds the cumulative Proxmox netin/netout
 * counters into sample(); deltas are summed per calendar month (counter resets after a VM
 * restart are handled). When the limit is exceeded the configured action runs once per
 * month, and throttle/suspend done by this class are lifted at the next month.
 */
class Bandwidth
{
    public const GB = 1073741824;
    private const REASON_MARKER = 'Monthly bandwidth limit exceeded';

    public static function period(?int $ts = null): string
    {
        return date('Y-m', $ts ?? time());
    }

    /** Limit in bytes for a VDS, null = unlimited. */
    public static function limitBytes(array $instance): ?int
    {
        $gb = $instance['bandwidth_limit_gb'] ?? null;
        if ($gb === null || $gb === '') {
            $gb = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::VDS_BANDWIDTH_LIMIT_GB, '0');
        }
        $gb = (int) $gb;

        return $gb > 0 ? $gb * self::GB : null;
    }

    public static function counted(array $row): int
    {
        $mode = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::VDS_BANDWIDTH_COUNT, 'both');

        return match ($mode) {
            'out' => (int) $row['tx_bytes'],
            'in' => (int) $row['rx_bytes'],
            default => (int) $row['rx_bytes'] + (int) $row['tx_bytes'],
        };
    }

    public static function usage(\PDO $pdo, int $instanceId, int $months = 6): array
    {
        $stmt = $pdo->prepare('SELECT * FROM featherpanel_vm_bandwidth WHERE vm_instance_id = :id ORDER BY period DESC LIMIT ' . max(1, $months));
        $stmt->execute(['id' => $instanceId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Records one sample. $vm is the /cluster/resources entry (netin/netout cumulative bytes).
     * $client may be null when no enforcement is wanted.
     */
    public static function sample(\PDO $pdo, array $instance, array $vm, ?Proxmox $client): void
    {
        $id = (int) $instance['id'];
        $period = self::period();
        $netin = max(0, (int) ($vm['netin'] ?? 0));
        $netout = max(0, (int) ($vm['netout'] ?? 0));
        $running = ($vm['status'] ?? '') === 'running';

        $stmt = $pdo->prepare('SELECT * FROM featherpanel_vm_bandwidth WHERE vm_instance_id = :id AND period = :p');
        $stmt->execute(['id' => $id, 'p' => $period]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$row) {
            // New month: carry the counter baseline over and lift last month's actions.
            $prev = $pdo->prepare('SELECT * FROM featherpanel_vm_bandwidth WHERE vm_instance_id = :id AND period < :p ORDER BY period DESC LIMIT 1');
            $prev->execute(['id' => $id, 'p' => $period]);
            $last = $prev->fetch(\PDO::FETCH_ASSOC) ?: null;
            $row = ['vm_instance_id' => $id, 'period' => $period, 'rx_bytes' => 0, 'tx_bytes' => 0, 'last_netin' => $last['last_netin'] ?? null, 'last_netout' => $last['last_netout'] ?? null, 'warned' => 0, 'action_taken' => 'none', 'throttle_backup' => null];
            $pdo->prepare('INSERT INTO featherpanel_vm_bandwidth (vm_instance_id, period, last_netin, last_netout) VALUES (:id, :p, :i, :o)')
                ->execute(['id' => $id, 'p' => $period, 'i' => $row['last_netin'], 'o' => $row['last_netout']]);
            if ($last && $client) {
                self::lift($pdo, $instance, $last, $client, (string) ($vm['node'] ?? ''), (string) ($vm['type'] ?? 'qemu'));
            }
        }

        $rxDelta = 0;
        $txDelta = 0;
        if ($running) {
            // Counters restart at 0 when the VM restarts: then the whole current value is new traffic.
            $rxDelta = $row['last_netin'] !== null && $netin >= (int) $row['last_netin'] ? $netin - (int) $row['last_netin'] : $netin;
            $txDelta = $row['last_netout'] !== null && $netout >= (int) $row['last_netout'] ? $netout - (int) $row['last_netout'] : $netout;
        }
        $row['rx_bytes'] = (int) $row['rx_bytes'] + $rxDelta;
        $row['tx_bytes'] = (int) $row['tx_bytes'] + $txDelta;
        $pdo->prepare('UPDATE featherpanel_vm_bandwidth SET rx_bytes = :rx, tx_bytes = :tx, last_netin = :i, last_netout = :o WHERE vm_instance_id = :id AND period = :p')
            ->execute(['rx' => $row['rx_bytes'], 'tx' => $row['tx_bytes'], 'i' => $running ? $netin : null, 'o' => $running ? $netout : null, 'id' => $id, 'p' => $period]);

        if ($client) {
            self::enforce($pdo, $instance, $row, $client, (string) ($vm['node'] ?? ''), (string) ($vm['type'] ?? 'qemu'));
        }
    }

    private static function enforce(\PDO $pdo, array $instance, array $row, Proxmox $client, string $node, string $type): void
    {
        $limit = self::limitBytes($instance);
        if ($limit === null) {
            return;
        }
        $config = App::getInstance(true)->getConfig();
        $used = self::counted($row);
        $percent = (int) floor($used * 100 / $limit);
        $warnAt = max(0, min(100, (int) $config->getSetting(ConfigInterface::VDS_BANDWIDTH_WARN_PERCENT, '80')));
        $usedGb = number_format($used / self::GB, 1, '.', '');
        $limitGb = (string) (int) round($limit / self::GB);
        $set = static fn (array $f) => $pdo->prepare('UPDATE featherpanel_vm_bandwidth SET ' . implode(', ', array_map(static fn ($k) => "`$k` = :$k", array_keys($f))) . ' WHERE vm_instance_id = :id AND period = :p')
            ->execute($f + ['id' => $row['vm_instance_id'], 'p' => $row['period']]);

        if ($percent < 100) {
            if ($warnAt > 0 && $percent >= $warnAt && (int) $row['warned'] === 0) {
                $set(['warned' => 1]);
                InboxNotifier::vdsBandwidth($instance, $percent, $usedGb, $limitGb, '', $row['period']);
            }

            return;
        }
        if ($row['action_taken'] !== 'none') {
            return;
        }
        $action = $config->getSetting(ConfigInterface::VDS_BANDWIDTH_ACTION, 'notify');
        $label = '';
        $backup = null;
        if ($action === 'throttle' && $node !== '') {
            $mbit = max(1, (int) $config->getSetting(ConfigInterface::VDS_BANDWIDTH_THROTTLE_MBIT, '10'));
            $backup = self::throttle($client, $node, (int) $instance['vmid'], $type === 'lxc' ? 'lxc' : 'qemu', $mbit);
            $label = $backup !== null ? 'Network speed limited to ' . $mbit . ' Mbit/s until the end of the month.' : '';
            if ($backup === null) {
                $action = 'notify';
            }
        } elseif ($action === 'suspend') {
            $reason = ModerationReasonHelper::formatReason('resource_abuse', self::REASON_MARKER . ' (' . $usedGb . ' GB / ' . $limitGb . ' GB)');
            VmInstance::update((int) $instance['id'], ModerationReasonHelper::suspensionAppliedFields($reason, ['uuid' => 'system', 'username' => 'System']));
            if ($node !== '') {
                $client->stopVm($node, (int) $instance['vmid'], $type === 'lxc' ? 'lxc' : 'qemu');
            }
            $label = 'The VDS was suspended until the end of the month.';
        } else {
            $action = 'notify';
        }
        $set(['action_taken' => $action, 'warned' => 1, 'throttle_backup' => $backup !== null ? json_encode($backup) : null]);
        self::log($instance, 'vm:bandwidth.' . $action, ['used_gb' => $usedGb, 'limit_gb' => $limitGb]);
        InboxNotifier::vdsBandwidth($instance, $percent, $usedGb, $limitGb, $label, $row['period']);
    }

    /** Applies rate=<MB/s> to every net device; returns the original values or null on failure. */
    private static function throttle(Proxmox $client, string $node, int $vmid, string $type, int $mbit): ?array
    {
        $cfg = $client->getVmConfig($node, $vmid, $type);
        if (!$cfg['ok'] || !is_array($cfg['config'] ?? null)) {
            return null;
        }
        $rate = rtrim(rtrim(number_format($mbit / 8, 3, '.', ''), '0'), '.');
        $orig = [];
        $changes = [];
        foreach ($cfg['config'] as $k => $v) {
            if (preg_match('/^net\d+$/', (string) $k) && is_string($v)) {
                $orig[$k] = $v;
                $changes[$k] = preg_match('/(^|,)rate=[^,]*/', $v) ? preg_replace('/(^|,)rate=[^,]*/', '$1rate=' . $rate, $v) : $v . ',rate=' . $rate;
            }
        }
        if ($changes === [] || !$client->setVmConfig($node, $vmid, $type, $changes, [])['ok']) {
            return null;
        }

        return $orig;
    }

    /** Undo last month's throttle / bandwidth suspension. */
    private static function lift(\PDO $pdo, array $instance, array $last, Proxmox $client, string $node, string $type): void
    {
        if ($last['action_taken'] === 'throttle' && $node !== '' && !empty($last['throttle_backup'])) {
            $orig = json_decode((string) $last['throttle_backup'], true);
            if (is_array($orig) && $orig !== []) {
                $client->setVmConfig($node, (int) $instance['vmid'], $type === 'lxc' ? 'lxc' : 'qemu', $orig, []);
                self::log($instance, 'vm:bandwidth.unthrottle', ['period' => $last['period']]);
            }
        }
        if ($last['action_taken'] === 'suspend' && (int) ($instance['suspended'] ?? 0) === 1
            && str_contains((string) ($instance['suspension_reason'] ?? ''), self::REASON_MARKER)) {
            VmInstance::update((int) $instance['id'], ModerationReasonHelper::suspensionClearedFields());
            self::log($instance, 'vm:bandwidth.unsuspend', ['period' => $last['period']]);
        }
    }

    private static function log(array $instance, string $event, array $meta): void
    {
        try {
            VmInstanceActivity::createActivity([
                'vm_instance_id' => (int) $instance['id'],
                'vm_node_id' => (int) ($instance['vm_node_id'] ?? 0),
                'user_id' => null,
                'event' => $event,
                'metadata' => ['hostname' => $instance['hostname'] ?? null] + $meta,
                'ip' => null,
            ]);
        } catch (\Throwable) {
        }
    }
}
