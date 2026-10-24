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
use App\Chat\VmInstance;
use App\Chat\VmSchedule;
use App\Config\ConfigInterface;
use App\Chat\VmInstanceActivity;
use App\Services\Vm\VmInstanceUtil;
use App\Cli\Utils\MinecraftColorCodeSupport;
use App\Controllers\User\Vds\VmUserExtrasController;

/**
 * ZVdsSchedules - runs due VDS scheduled tasks (Admin → Settings → VDS → schedules):
 * reboot (only when running) and snapshot with rotation of the "auto_" snapshots.
 * Suspended VDS are skipped. Every run is written to the VDS activity log.
 */
class ZVdsSchedules implements TimeTask
{
    public const AUTO_PREFIX = 'auto_';

    public function run()
    {
        $cron = new Cron('vds-schedules', '1M');
        try {
            $cron->runIfDue(function () {
                $this->processTask();
            }, getenv('FP_CRON_FORCE') === '1');
        } catch (\Exception $e) {
            App::getInstance(false, true)->getLogger()->error('Failed to process VdsSchedules: ' . $e->getMessage());
        }
    }

    private function processTask(): void
    {
        $config = App::getInstance(false, true)->getConfig();
        if ($config->getSetting(ConfigInterface::MODULE_VDS_ENABLED, 'true') === 'false'
            || $config->getSetting(ConfigInterface::VDS_SCHEDULES_ENABLED, 'true') !== 'true') {
            return;
        }
        $allowed = array_map('trim', explode(',', strtolower($config->getSetting(ConfigInterface::VDS_SCHEDULES_ACTIONS, 'reboot,snapshot'))));
        $due = VmSchedule::due();
        if ($due === []) {
            return;
        }
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing VdsSchedules (' . count($due) . ' due)...');
        foreach ($due as $s) {
            [$status, $error] = in_array($s['action'], $allowed, true) ? $this->execute($s) : ['skipped', 'Action disabled by the administrator'];
            VmSchedule::update((int) $s['id'], [
                'last_run_at' => date('Y-m-d H:i:s'),
                'last_status' => $status,
                'last_error' => $error !== null ? mb_substr($error, 0, 500) : null,
                'next_run_at' => VmSchedule::nextRun($s),
            ]);
        }
    }

    /** @return array{0: string, 1: ?string} */
    private function execute(array $s): array
    {
        $instance = VmInstance::getById((int) $s['vm_instance_id']);
        if (!$instance) {
            return ['skipped', 'VDS not found'];
        }
        if ((int) ($instance['suspended'] ?? 0) === 1) {
            return ['skipped', 'VDS is suspended'];
        }
        $vmNode = VmNode::getVmNodeById((int) ($instance['vm_node_id'] ?? 0));
        if (!$vmNode) {
            return ['failed', 'VDS node not found'];
        }
        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ['failed', 'Failed to connect to Proxmox'];
        }
        $type = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $node = (string) ($instance['pve_node'] ?? '');
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            $node = $find['ok'] ? (string) $find['node'] : '';
        }
        if ($node === '') {
            return ['failed', 'Could not determine Proxmox node'];
        }
        $base = sprintf('/api2/json/nodes/%s/%s/%d', rawurlencode($node), $type, (int) $instance['vmid']);

        if ($s['action'] === 'reboot') {
            $st = $client->apiGet($base . '/status/current');
            if (!is_array($st['data'] ?? null) || ($st['data']['status'] ?? '') !== 'running') {
                return ['skipped', 'VDS is not running'];
            }
            $res = $client->apiPost($base . '/status/reboot');
            $this->log($instance, 'vm:schedule.reboot', $s, $res['ok']);

            return $res['ok'] ? ['ok', null] : ['failed', 'Proxmox rejected the reboot'];
        }

        // snapshot with rotation
        $list = $client->apiGet($base . '/snapshot');
        if (!$list['ok'] || !is_array($list['data'] ?? null)) {
            return ['failed', 'Failed to list snapshots'];
        }
        $snaps = array_values(array_filter($list['data'], static fn ($x) => is_array($x) && ($x['name'] ?? '') !== 'current'));
        $auto = array_values(array_filter($snaps, static fn ($x) => str_starts_with((string) $x['name'], self::AUTO_PREFIX)));
        usort($auto, static fn ($a, $b) => (int) ($a['snaptime'] ?? 0) <=> (int) ($b['snaptime'] ?? 0));
        $keep = max(1, (int) $s['keep']);
        $limit = VmUserExtrasController::snapshotLimit($instance);
        $deleted = 0;
        // Make room: keep-1 old auto snapshots remain, plus the new one; also respect the VDS limit.
        while ($auto !== [] && (count($auto) >= $keep || count($snaps) - $deleted >= $limit)) {
            $old = array_shift($auto);
            $del = $client->apiDelete($base . '/snapshot/' . rawurlencode((string) $old['name']));
            if (!$del['ok']) {
                return ['failed', 'Failed to delete old snapshot ' . $old['name']];
            }
            ++$deleted;
            $this->waitTask($client, $node, $del['data'] ?? null);
        }
        if (count($snaps) - $deleted >= $limit) {
            return ['skipped', 'Snapshot limit reached by manual snapshots'];
        }
        $name = self::AUTO_PREFIX . date('Ymd_His');
        $res = $client->apiPost($base . '/snapshot', ['snapname' => $name, 'description' => 'Scheduled: ' . $s['name']]);
        $this->log($instance, 'vm:schedule.snapshot', $s + ['snapshot' => $name, 'rotated' => $deleted], $res['ok']);

        return $res['ok'] ? ['ok', null] : ['failed', 'Proxmox rejected the snapshot'];
    }

    private function waitTask(\App\Services\Proxmox\Proxmox $client, string $node, mixed $upid): void
    {
        if (!is_string($upid) || $upid === '') {
            return;
        }
        for ($i = 0; $i < 30; ++$i) {
            $st = $client->getTaskStatus($node, $upid);
            if (($st['status'] ?? '') === 'stopped' || !$st['ok']) {
                return;
            }
            sleep(2);
        }
    }

    private function log(array $instance, string $event, array $s, bool $ok): void
    {
        try {
            VmInstanceActivity::createActivity([
                'vm_instance_id' => (int) $instance['id'],
                'vm_node_id' => (int) $instance['vm_node_id'],
                'user_id' => null,
                'event' => $event,
                'metadata' => ['hostname' => $instance['hostname'] ?? null, 'schedule' => $s['name'], 'ok' => $ok] + array_intersect_key($s, ['snapshot' => 1, 'rotated' => 1]),
                'ip' => null,
            ]);
        } catch (\Throwable) {
        }
    }
}
